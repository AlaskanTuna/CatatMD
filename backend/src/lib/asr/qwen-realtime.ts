import type { LiveAsrMode, LiveSessionConfig } from '@shared/types'
import { WebSocket } from 'ws'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { liveSessionConfig } from './soniox.js'

/**
 * The only module that opens a socket to Qwen3-ASR realtime, and the audio
 * egress of the live relay (#487, `live-relay.ts`).
 *
 * **Audio crosses here, and audio cannot be de-identified.** That is the same
 * position the Soniox and ILMU adapters are in, and the controls are the same
 * kind: a pinned destination, a credential that never reaches the browser, a
 * bounded session, an audit row, and nothing written down. The relay's
 * Qwen-specific wire format lives here and its Soniox-shaped output lives next
 * door, so this file carries the vendor and `live-relay.ts` carries the policy.
 *
 * **The address is a literal, and no setting reaches it.** Alibaba Cloud Model
 * Studio, international region, Singapore: the host `QWEN_BASE_URL` already
 * names for the text model. Only the model id, which `env.ts` constrains to a
 * plain identifier, is a query value. `no-stray-fetch.test.ts` pins this file
 * and the relay as the only places a `dashscope` host or a `ws` import may
 * appear outside the text adapter's configuration.
 *
 * **Nothing the vendor says is repeated.** Its `error` events can name a request
 * or a credential, so a failure is a bare callback with no payload, and the
 * transcript text only ever leaves this module through a handler.
 */
export const QWEN_REALTIME_ENDPOINT = 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime'

export const qwenRealtimeUrl = (model: string) =>
  `${QWEN_REALTIME_ENDPOINT}?model=${encodeURIComponent(model)}`

const SAMPLE_RATE = 16_000

/** 16-bit mono PCM: the unit both the browser and the vendor count audio in. */
export const PCM_BYTES_PER_MS = (SAMPLE_RATE * 2) / 1000

/** Languages the live relay is biased toward. The vendor takes one, and `en` is the measured one. */
const LANGUAGE_HINTS = ['en', 'ms'] as const

/**
 * Whether the browser should expect turn boundaries from the recogniser.
 *
 * Written out per mode, for the reason `MODE_SETTINGS` in `soniox.ts` gives: a
 * third mode is a compile error until someone decides what it sends. Dictation
 * is one voice reading a prescription and wants each phrase settled promptly;
 * ambient is a whole consultation, where the relay still marks phrase ends but
 * the doctor is not waiting on them.
 */
const ENDPOINT_DETECTION: Record<LiveAsrMode, boolean> = {
  ambient: false,
  dictation: true,
}

/**
 * The settings the browser is told to use for a live session, and what the relay
 * sends upstream.
 *
 * **Reuses the Soniox per-mode context rather than restating it**, so the
 * vocabulary is written once and a change to it moves both providers.
 * `liveSessionConfig` is a table lookup on a closed enum that throws on anything
 * else, which is what keeps a caller from influencing what crosses the egress.
 * Nothing here is a function of a request.
 */
export function qwenLiveSessionConfig(mode: LiveAsrMode): LiveSessionConfig {
  const { context } = liveSessionConfig(mode)

  return {
    model: env.QWEN_ASR_RT_MODEL,
    languageHints: [...LANGUAGE_HINTS],
    languageIdentification: false,
    speakerDiarization: false,
    endpointDetection: ENDPOINT_DETECTION[mode],
    context,
    audioFormat: 'pcm_s16le',
    sampleRate: SAMPLE_RATE,
  }
}

/** Provider, model and region for audit stamps, mirroring `getLiveAsrDescriptor` in `soniox.ts`. */
export function getQwenLiveDescriptor(): { provider: 'qwen'; model: string; region: 'sg' } {
  return { provider: 'qwen', model: env.QWEN_ASR_RT_MODEL, region: 'sg' }
}

/**
 * What the relay needs to hear about, with the vendor's wire names stripped.
 * Every callback is optional-free on purpose: a handler a future event forgets to
 * wire is a compile error rather than a silent drop.
 */
export interface QwenRealtimeHandlers {
  onSpeechStarted(event: { itemId: string; audioStartMs: number }): void
  /** The phrase so far: the vendor's confirmed `text` and its unconfirmed `stash`, joined. */
  onInterim(event: { itemId: string; text: string }): void
  onSpeechStopped(event: { itemId: string; audioEndMs: number }): void
  onCompleted(event: { itemId: string; transcript: string }): void
  /** The vendor has answered `finish()`: every phrase it will settle is settled. */
  onFinished(): void
  /** Any failure, with no payload. The cause is never repeated. */
  onError(): void
  /** The socket is gone, for any reason but our own `close()`. */
  onClose(code: number): void
}

export interface QwenRealtimeSession {
  /** Raw 16 kHz 16-bit mono PCM. Held until the socket opens, within a bound. */
  sendAudio(pcm: Buffer): void
  /** End of audio. Asks the vendor to settle what it has heard and answer with `onFinished`. */
  finish(): void
  /** Tears the socket down now. Idempotent, and silences every handler. */
  close(): void
}

/**
 * Qwen's VAD closes a phrase on silence, and `session.finish` was measured on
 * 10/11/26 to answer only when audio had just been sent: sent alone after speech
 * that was still open, it drew no `session.finished` and the phrase never
 * completed. One second of silence first lets the VAD close the open phrase,
 * and the vendor then answers within about 100 ms of the finish.
 */
const FINISH_SILENCE_BYTES = SAMPLE_RATE * 2

/**
 * Audio held while the socket opens. The browser sends the first frames the
 * instant its own socket opens, so a few hundred milliseconds queue here; ten
 * seconds is far beyond a healthy connect and means the upstream is not coming.
 */
const MAX_QUEUED_BYTES = 10_000 * PCM_BYTES_PER_MS

/** What the vendor may have unsent before the session is treated as stalled. */
const MAX_UNSENT_BYTES = 1_048_576

const HANDSHAKE_TIMEOUT_MS = 10_000

/** Vendor events are small JSON. A megabyte is a protocol violation, not a transcript. */
const MAX_EVENT_BYTES = 1_048_576

/**
 * The events the relay acts on. Every other `type` the vendor sends
 * (`session.created`, `conversation.item.created`, `input_audio_buffer.committed`
 * and so on) carries nothing the relay needs and is ignored.
 *
 * A failed transcription is deliberately **not** ignored. The relay settles
 * phrases strictly in order, so one that never completes would hold every later
 * one back, and dropping it quietly would leave a hole in a clinical transcript
 * that nobody could see. It is reported as a failure so the doctor is told.
 */
const QwenEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('input_audio_buffer.speech_started'),
    item_id: z.string(),
    audio_start_ms: z.number(),
  }),
  z.object({
    type: z.literal('conversation.item.input_audio_transcription.text'),
    item_id: z.string(),
    text: z.string().default(''),
    stash: z.string().default(''),
  }),
  z.object({
    type: z.literal('input_audio_buffer.speech_stopped'),
    item_id: z.string(),
    audio_end_ms: z.number(),
  }),
  z.object({
    type: z.literal('conversation.item.input_audio_transcription.completed'),
    item_id: z.string(),
    transcript: z.string(),
  }),
  z.object({ type: z.literal('conversation.item.input_audio_transcription.failed') }),
  z.object({ type: z.literal('session.finished') }),
  z.object({ type: z.literal('error') }),
])

/** A known event with the wrong shape is a vendor change, which is a failure, not noise. */
const KNOWN_TYPES: ReadonlySet<string> = new Set(
  QwenEventSchema.options.map((option) => option.shape.type.value),
)

/**
 * Opens one realtime session to Qwen and speaks its wire format.
 *
 * The second parameter exists so the relay's tests can point this at a local
 * server; no production caller passes it, and nothing in `env` can. The key is
 * read here, from `env`, and goes only into the handshake's `Authorization`
 * header: it is never logged, never put in an error, and never sent to the
 * browser.
 */
export function openQwenRealtime(
  options: { terms: readonly string[]; handlers: QwenRealtimeHandlers },
  endpoint: string = qwenRealtimeUrl(env.QWEN_ASR_RT_MODEL),
): QwenRealtimeSession {
  const apiKey = env.QWEN_API_KEY
  if (!apiKey) throw new Error('QWEN_API_KEY is not set')

  const { terms, handlers } = options
  let state: 'connecting' | 'open' | 'closed' = 'connecting'
  const queue: string[] = []
  let queuedBytes = 0

  const socket = new WebSocket(endpoint, {
    headers: { Authorization: `Bearer ${apiKey}` },
    handshakeTimeout: HANDSHAKE_TIMEOUT_MS,
    maxPayload: MAX_EVENT_BYTES,
    // The handshake carries the account credential. Following a redirect would
    // present it to whatever host answered.
    followRedirects: false,
  })

  const fail = () => {
    if (state === 'closed') return
    state = 'closed'
    socket.terminate()
    handlers.onError()
  }

  const transmit = (message: string) => {
    // A successful write calls back with `null` at runtime although the type
    // says `undefined`, so this tests for an error rather than for its absence.
    socket.send(message, (error) => {
      if (error) fail()
    })
  }

  /** Audio and control frames share one path so their order survives a slow connect. */
  const submit = (message: string, bytes: number) => {
    if (state === 'closed') return
    if (state === 'connecting') {
      queuedBytes += bytes
      if (queuedBytes > MAX_QUEUED_BYTES) {
        fail()
        return
      }
      queue.push(message)
      return
    }
    if (socket.bufferedAmount > MAX_UNSENT_BYTES) {
      fail()
      return
    }
    transmit(message)
  }

  const append = (pcm: Buffer) =>
    JSON.stringify({ type: 'input_audio_buffer.append', audio: pcm.toString('base64') })

  socket.on('open', () => {
    if (state !== 'connecting') return
    state = 'open'
    transmit(
      JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text'],
          input_audio_format: 'pcm',
          sample_rate: SAMPLE_RATE,
          input_audio_transcription: {
            language: 'en',
            ...(terms.length > 0 ? { corpus: { text: `Terms: ${terms.join(', ')}.` } } : {}),
          },
          turn_detection: { type: 'server_vad', threshold: 0.2, silence_duration_ms: 500 },
        },
      }),
    )
    for (const message of queue.splice(0)) transmit(message)
    queuedBytes = 0
  })

  socket.on('message', (data, isBinary) => {
    if (state === 'closed' || isBinary) return

    let json: unknown
    try {
      json = JSON.parse(data.toString())
    } catch {
      fail()
      return
    }

    const parsed = QwenEventSchema.safeParse(json)
    if (!parsed.success) {
      const type = typeof json === 'object' && json !== null ? Reflect.get(json, 'type') : undefined
      if (typeof type === 'string' && KNOWN_TYPES.has(type)) fail()
      return
    }

    const event = parsed.data
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        handlers.onSpeechStarted({ itemId: event.item_id, audioStartMs: event.audio_start_ms })
        return
      case 'conversation.item.input_audio_transcription.text':
        handlers.onInterim({ itemId: event.item_id, text: `${event.text}${event.stash}` })
        return
      case 'input_audio_buffer.speech_stopped':
        handlers.onSpeechStopped({ itemId: event.item_id, audioEndMs: event.audio_end_ms })
        return
      case 'conversation.item.input_audio_transcription.completed':
        handlers.onCompleted({ itemId: event.item_id, transcript: event.transcript })
        return
      case 'session.finished':
        handlers.onFinished()
        return
      case 'conversation.item.input_audio_transcription.failed':
      case 'error':
        fail()
        return
    }
  })

  // The message of a socket error can quote the handshake response. It is never read.
  socket.on('error', fail)

  socket.on('close', (code) => {
    if (state === 'closed') return
    state = 'closed'
    handlers.onClose(code)
  })

  return {
    sendAudio(pcm) {
      submit(append(pcm), pcm.length)
    },
    finish() {
      submit(append(Buffer.alloc(FINISH_SILENCE_BYTES)), FINISH_SILENCE_BYTES)
      submit(JSON.stringify({ type: 'session.finish' }), 0)
    },
    close() {
      if (state === 'closed') return
      state = 'closed'
      socket.terminate()
    },
  }
}

export type OpenQwenRealtime = typeof openQwenRealtime
