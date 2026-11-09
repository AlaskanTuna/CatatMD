import type { IncomingMessage, Server } from 'node:http'
import type { Duplex } from 'node:stream'
import { LIVE_ASR_RELAY_PATH, type LiveAsrMode } from '@shared/types'
import { type RawData, WebSocket, WebSocketServer } from 'ws'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { logger } from '../logger.js'
import { type RelayClaims, verifyRelayToken } from './live-relay-token.js'
import {
  type OpenQwenRealtime,
  openQwenRealtime,
  PCM_BYTES_PER_MS,
  type QwenRealtimeHandlers,
  type QwenRealtimeSession,
  qwenLiveSessionConfig,
} from './qwen-realtime.js'
import { MAX_SESSION_DURATION_SECONDS } from './soniox.js'

/**
 * The live relay (#487): a WebSocket on the API that carries one browser's
 * microphone to Qwen3-ASR realtime and answers in the shape Soniox does, so the
 * SPA's token handling is reused unchanged. `docs/TRD.md` §20 holds the wire
 * contract; `qwen-realtime.ts` holds the vendor half.
 *
 * **This is the API holding the audio, which the Soniox path never did.** It is
 * why the relay is built as a policy point rather than a pipe:
 *
 * - **Who may open it.** Only the configured SPA origin, on one path, presenting
 *   a token the API minted sixty seconds ago and has not seen before. A socket
 *   that does not authenticate in ten seconds is closed.
 * - **What the session is.** Built from the token's `mode` and from nothing the
 *   browser sends: the config frame's recognition settings are ignored, so the
 *   vocabulary and the cap that cross the egress are the API's, never a client's.
 * - **How much.** Frames are 32 KiB at most, the session ends at the per-mode
 *   cap, and the audio forwarded is bounded to that cap in bytes as well as in
 *   seconds, so a client cannot buy more recognition than it was minted by
 *   sending faster than real time.
 * - **What is written down.** Event types, ids, byte counts, durations and close
 *   codes. Never a token, a transcript or audio: every logged field passes the
 *   allowlist in `logger.ts`, and `live-relay.test.ts` pins that a distinctive
 *   phrase never reaches a log line.
 *
 * A pending upstream socket is always closed, whichever side ends the session.
 */

/** The largest frame the relay accepts, text or binary. `ws` enforces it, so a longer one never buffers. */
const MAX_FRAME_BYTES = 32 * 1024

/** Seconds of audio beyond the cap a client may have buffered while its socket opened. */
const AUDIO_OVERRUN_SECONDS = 10

export interface LiveRelayLimits {
  /** How long a socket may stay open without presenting its token. */
  authTimeoutMs: number
  /** How long to wait for the vendor to settle the last phrase after end of audio. */
  drainTimeoutMs: number
  /** Liveness probe interval. A client that misses one is dropped, which closes its upstream. */
  pingIntervalMs: number
  maxSessionSeconds: Record<LiveAsrMode, number>
}

const DEFAULT_LIMITS: LiveRelayLimits = {
  authTimeoutMs: 10_000,
  drainTimeoutMs: 8_000,
  pingIntervalMs: 20_000,
  maxSessionSeconds: MAX_SESSION_DURATION_SECONDS,
}

export interface LiveRelayOptions {
  /**
   * The upstream connector. Production passes nothing and gets the pinned Qwen
   * address; the tests pass one that points at a local server.
   */
  openUpstream?: OpenQwenRealtime
  limits?: Partial<LiveRelayLimits>
}

/** The first frame: the one field the relay reads from it. */
const CredentialFrameSchema = z.object({ api_key: z.string().min(1).max(2048) })

/** What the browser says it will send. The relay forwards PCM only, so anything else is refused. */
const AudioFormatFrameSchema = z.object({
  audio_format: z.literal('pcm_s16le'),
  sample_rate: z.literal(16_000),
  num_channels: z.literal(1),
})

type WireToken = { text: string; start_ms?: number; end_ms?: number; is_final: boolean }

const END_TOKEN: WireToken = { text: '<end>', is_final: true }

/** A phrase with nothing to read in it is a breath or a click, and the vendor reports those as text. */
const hasContent = (text: string) => /[\p{L}\p{N}]/u.test(text)

type Phrase = {
  id: string
  startMs: number
  endMs: number | null
  /** The vendor's text so far, and its transcript once completed. */
  live: string
  final: string | null
  emitted: boolean
}

/**
 * Turns the vendor's phrase events into Soniox's token messages.
 *
 * Each message carries the finals newly settled, strictly in phrase order, then
 * the whole interim tail: the SPA appends finals and replaces its interim words
 * with the tail, so a message that carried only a delta would lose words.
 *
 * The vendor times phrases and not words, so a phrase's words are spread evenly
 * across its span. Spread times are an estimate and the SPA only uses them to
 * order and to place pauses. No `speaker`, `language` or `confidence` is ever
 * set: the vendor reports none of them, and a made-up confidence would read as
 * certainty to the code that marks uncertain words.
 */
class TranscriptShaper {
  private readonly phrases: Phrase[] = []
  /** Ids already settled, so a repeated event cannot resurrect a phrase and duplicate its words. */
  private readonly settled = new Set<string>()
  private firstFinalWordDone = false

  private phraseFor(id: string): Phrase | undefined {
    if (this.settled.has(id)) return undefined
    let phrase = this.phrases.find((candidate) => candidate.id === id)
    if (phrase === undefined) {
      const previous = this.phrases.at(-1)
      phrase = {
        id,
        startMs: previous?.endMs ?? previous?.startMs ?? 0,
        endMs: null,
        live: '',
        final: null,
        emitted: false,
      }
      this.phrases.push(phrase)
    }
    return phrase
  }

  speechStarted(id: string, startMs: number) {
    const phrase = this.phraseFor(id)
    if (phrase) phrase.startMs = startMs
  }

  interim(id: string, text: string) {
    const phrase = this.phraseFor(id)
    if (phrase && phrase.final === null) phrase.live = text
  }

  speechStopped(id: string, endMs: number) {
    const phrase = this.phraseFor(id)
    if (phrase) phrase.endMs = endMs
  }

  completed(id: string, transcript: string) {
    const phrase = this.phraseFor(id)
    if (!phrase) return
    phrase.final = transcript.trim()
    phrase.live = phrase.final
  }

  /** Whether any phrase has yet to be sent as a final. */
  get pending() {
    return this.phrases.length > 0
  }

  /** At the end of a session, text the vendor never confirmed is kept rather than lost. */
  settleAll() {
    for (const phrase of this.phrases) if (phrase.final === null) phrase.final = phrase.live.trim()
  }

  private words(text: string, startMs: number, endMs: number, isFinal: boolean): WireToken[] {
    const list = text.split(/\s+/).filter(Boolean)
    const span = Math.max(1, endMs - startMs)
    return list.map((word, index) => {
      const lead = isFinal && !this.firstFinalWordDone ? '' : ' '
      if (isFinal) this.firstFinalWordDone = true
      return {
        text: `${lead}${word}`,
        start_ms: Math.round(startMs + (span * index) / list.length),
        end_ms: Math.round(startMs + (span * (index + 1)) / list.length),
        is_final: isFinal,
      }
    })
  }

  /** `audioMs` is the audio received so far, which is where an unfinished phrase's span ends. */
  tokens(audioMs: number): WireToken[] {
    const tokens: WireToken[] = []

    for (const phrase of this.phrases) {
      if (phrase.emitted) continue
      if (phrase.final === null) break
      if (hasContent(phrase.final)) {
        const end = phrase.endMs ?? audioMs
        tokens.push(...this.words(phrase.final, phrase.startMs, end, true), END_TOKEN)
      }
      phrase.emitted = true
      this.settled.add(phrase.id)
    }
    while (this.phrases[0]?.emitted) this.phrases.shift()

    for (const phrase of this.phrases) {
      tokens.push(...this.words(phrase.live, phrase.startMs, audioMs, false))
    }
    return tokens
  }
}

const toBuffer = (data: RawData): Buffer =>
  Buffer.isBuffer(data) ? data : Array.isArray(data) ? Buffer.concat(data) : Buffer.from(data)

type Stage = 'awaiting_auth' | 'streaming' | 'draining' | 'closed'

function runSession(client: WebSocket, openUpstream: OpenQwenRealtime, limits: LiveRelayLimits) {
  const startedAt = performance.now()
  let stage: Stage = 'awaiting_auth'
  let claims: RelayClaims | undefined
  let upstream: QwenRealtimeSession | undefined
  let shaper: TranscriptShaper | undefined
  let audioCapBytes = 0
  let audioBytes = 0
  // An odd byte split across two frames would shift every sample after it.
  let carry: Buffer = Buffer.alloc(0)
  let alive = true
  let authTimer: NodeJS.Timeout | undefined = setTimeout(() => refuse(), limits.authTimeoutMs)
  let capTimer: NodeJS.Timeout | undefined
  let drainTimer: NodeJS.Timeout | undefined
  let pingTimer: NodeJS.Timeout | undefined

  const send = (message: object) => {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(message))
  }

  /** Idempotent: every way a session ends passes through here exactly once. */
  const finalize = (code: number) => {
    if (stage === 'closed') return
    stage = 'closed'
    clearTimeout(authTimer)
    clearTimeout(capTimer)
    clearTimeout(drainTimer)
    clearInterval(pingTimer)
    upstream?.close()
    // 1001 is a browser tab going away, which is the doctor's choice and no fault.
    const normal = code === 1000 || code === 1001
    logger[normal ? 'info' : 'warn']('live relay session closed', {
      requestId: claims?.jti,
      actorId: claims?.sub,
      outcome: normal ? 'ok' : 'error',
      status: code,
      durationMs: performance.now() - startedAt,
      // Bytes of audio accepted. The log allowlist has no field for a byte
      // count, and a number is all this needs.
      count: audioBytes,
    })
  }

  const end = (code: number, reason: string) => {
    if (stage === 'closed') return
    finalize(code)
    client.close(code, reason)
  }

  function refuse() {
    if (stage === 'closed') return
    send({ error_code: 401 })
    end(4401, 'unauthorized')
  }

  const protocolError = () => {
    if (stage === 'closed') return
    send({ error_code: 400 })
    end(1002, 'protocol_error')
  }

  const upstreamFailed = () => {
    if (stage === 'closed') return
    send({ error_code: 502 })
    end(1011, 'upstream_failed')
  }

  const emit = () => {
    if (stage === 'closed' || !shaper) return
    send({ tokens: shaper.tokens(Math.floor(audioBytes / PCM_BYTES_PER_MS)) })
  }

  const settle = () => {
    if (stage !== 'draining' || !shaper) return
    const hadPending = shaper.pending
    shaper.settleAll()
    if (hadPending) emit()
    send({ tokens: [], finished: true })
    end(1000, 'finished')
  }

  /** The `''` frame, the per-mode cap and the audio cap all end the session the same way. */
  const startDraining = () => {
    if (stage !== 'streaming' || !upstream) return
    stage = 'draining'
    clearTimeout(capTimer)
    drainTimer = setTimeout(settle, limits.drainTimeoutMs)
    upstream.finish()
  }

  const handlers = (): QwenRealtimeHandlers => ({
    onSpeechStarted: ({ itemId, audioStartMs }) => shaper?.speechStarted(itemId, audioStartMs),
    onInterim: ({ itemId, text }) => {
      shaper?.interim(itemId, text)
      emit()
    },
    onSpeechStopped: ({ itemId, audioEndMs }) => shaper?.speechStopped(itemId, audioEndMs),
    onCompleted: ({ itemId, transcript }) => {
      shaper?.completed(itemId, transcript)
      emit()
    },
    onFinished: settle,
    onError: upstreamFailed,
    onClose: () => {
      // The vendor hanging up after we asked it to finish is the normal end;
      // hanging up while the doctor is still talking is not.
      if (stage === 'draining') settle()
      else upstreamFailed()
    },
  })

  const authenticate = (data: RawData, isBinary: boolean) => {
    clearTimeout(authTimer)
    authTimer = undefined
    if (isBinary) {
      protocolError()
      return
    }

    let frame: unknown
    try {
      frame = JSON.parse(toBuffer(data).toString('utf8'))
    } catch {
      refuse()
      return
    }
    const credential = CredentialFrameSchema.safeParse(frame)
    // Every failure of the token looks the same from outside.
    const verified = credential.success ? verifyRelayToken(credential.data.api_key) : null
    if (verified === null) {
      refuse()
      return
    }
    claims = verified

    // Checked after the token so a stale SPA, which says `auto`, gets a protocol
    // error rather than audio the vendor cannot decode.
    if (!AudioFormatFrameSchema.safeParse(frame).success) {
      protocolError()
      return
    }

    const { context } = qwenLiveSessionConfig(verified.mode)
    const maxSeconds = limits.maxSessionSeconds[verified.mode]
    audioCapBytes = (maxSeconds + AUDIO_OVERRUN_SECONDS) * 1000 * PCM_BYTES_PER_MS
    shaper = new TranscriptShaper()
    stage = 'streaming'

    try {
      upstream = openUpstream({ terms: context.terms ?? [], handlers: handlers() })
    } catch {
      upstreamFailed()
      return
    }

    capTimer = setTimeout(startDraining, maxSeconds * 1000)
    pingTimer = setInterval(() => {
      if (!alive) {
        client.terminate()
        return
      }
      alive = false
      client.ping()
    }, limits.pingIntervalMs)

    logger.info('live relay session opened', {
      requestId: verified.jti,
      actorId: verified.sub,
      provider: 'qwen',
      model: env.QWEN_ASR_RT_MODEL,
    })
  }

  const forward = (frame: Buffer) => {
    if (frame.length === 0 || !upstream) return
    if (audioBytes + frame.length > audioCapBytes) {
      startDraining()
      return
    }
    audioBytes += frame.length

    const joined = carry.length > 0 ? Buffer.concat([carry, frame]) : frame
    const even = joined.length - (joined.length % 2)
    carry = joined.subarray(even)
    if (even > 0) upstream.sendAudio(joined.subarray(0, even))
  }

  client.on('message', (data, isBinary) => {
    if (stage === 'awaiting_auth') {
      authenticate(data, isBinary)
      return
    }
    // After end of audio nothing the client says matters; the session is settling.
    if (stage !== 'streaming') return

    if (isBinary) {
      forward(toBuffer(data))
      return
    }
    if (toBuffer(data).length === 0) startDraining()
    else protocolError()
  })

  client.on('pong', () => {
    alive = true
  })

  // A frame over the limit ends in an error here, then a 1009 close.
  client.on('error', (error) => {
    logger.warn('live relay client socket error', {
      requestId: claims?.jti,
      errorName: error.name,
    })
  })

  client.on('close', (code) => finalize(code))
}

export interface LiveRelay {
  /** The `upgrade` listener. */
  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void
  /** Drops every open session, which closes each one's upstream. */
  close(): void
}

const reject = (socket: Duplex, status: string) => {
  socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`, () =>
    socket.destroy(),
  )
}

export function createLiveRelay(options: LiveRelayOptions = {}): LiveRelay {
  const openUpstream = options.openUpstream ?? openQwenRealtime
  const limits: LiveRelayLimits = { ...DEFAULT_LIMITS, ...options.limits }
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES })

  // Between the upgrade event and the handshake finishing, nothing else owns the socket.
  const onSocketError = (error: Error) => {
    logger.warn('live relay upgrade socket error', { errorName: error.name })
  }

  return {
    handleUpgrade(req, socket, head) {
      socket.on('error', onSocketError)

      // The path is compared as written. A URL parser would read `//host/path`
      // as a host and a path, which is not a distinction worth having here.
      const path = (req.url ?? '').split('?', 1)[0]
      if (path !== LIVE_ASR_RELAY_PATH) {
        reject(socket, '404 Not Found')
        return
      }
      // A browser always sends Origin on a WebSocket, so a missing one is not a
      // browser and is refused with the rest.
      if (req.headers.origin !== env.CORS_ORIGIN) {
        logger.warn('live relay upgrade refused', { status: 403 })
        reject(socket, '403 Forbidden')
        return
      }

      wss.handleUpgrade(req, socket, head, (client) => {
        socket.removeListener('error', onSocketError)
        runSession(client, openUpstream, limits)
      })
    },
    close() {
      for (const client of wss.clients) client.terminate()
      wss.close()
    },
  }
}

/**
 * Mounts the relay on the HTTP server `listen` returned. Without
 * `LIVE_ASR_PROVIDER=qwen` it mounts nothing, so a Soniox deployment has no
 * socket endpoint and an upgrade request is answered as an ordinary one.
 */
export function attachLiveRelay(server: Server, options?: LiveRelayOptions): LiveRelay | undefined {
  if (env.LIVE_ASR_PROVIDER !== 'qwen') return undefined

  const relay = createLiveRelay(options)
  server.on('upgrade', relay.handleUpgrade)
  return relay
}

/**
 * The address the browser opens. `LIVE_RELAY_PUBLIC_URL` when set, otherwise the
 * API's own public address with its scheme swapped: the browser reaches it
 * directly because a WebSocket cannot pass the Vercel rewrite.
 */
export function liveRelayUrl(): string {
  if (env.LIVE_RELAY_PUBLIC_URL) return env.LIVE_RELAY_PUBLIC_URL
  const { protocol, host } = new URL(env.BETTER_AUTH_URL)
  return `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}${LIVE_ASR_RELAY_PATH}`
}
