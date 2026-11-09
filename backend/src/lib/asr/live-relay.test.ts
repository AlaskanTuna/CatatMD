import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Duplex } from 'node:stream'
import { LIVE_ASR_RELAY_PATH } from '@shared/types'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { type RawData, WebSocket, WebSocketServer } from 'ws'

const testEnv = vi.hoisted(() => ({
  NODE_ENV: 'test',
  CORS_ORIGIN: 'http://localhost:5173',
  BETTER_AUTH_SECRET: 'x'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3001',
  LIVE_ASR_PROVIDER: 'qwen' as 'soniox' | 'qwen',
  QWEN_API_KEY: 'test-qwen-key-do-not-log' as string | undefined,
  QWEN_ASR_RT_MODEL: 'qwen3-asr-flash-realtime',
  SONIOX_RT_MODEL: 'stt-rt-v5',
  LOG_LEVEL: 'info',
  DEID_FAIL_CLOSED: true,
}))

vi.mock('../../config/env.js', () => ({ env: testEnv }))

import { attachLiveRelay, type LiveRelay } from './live-relay.js'
import { mintRelayToken } from './live-relay-token.js'
import { openQwenRealtime, qwenLiveSessionConfig } from './qwen-realtime.js'

/**
 * The live relay against a fake Qwen (#487).
 *
 * The upstream is a local `ws` server that the relay is pointed at through the
 * connector it is given, so nothing here touches the network and the wire
 * format of `qwen-realtime.ts` is exercised for real. The browser side is a
 * real `ws` client over a real HTTP server, so the upgrade, the origin check
 * and the frame limit are the library's own.
 */
const ORIGIN = 'http://localhost:5173'

type Json = Record<string, unknown>

/** A scripted stand-in for the vendor: it records what arrives and says what it is told to. */
class FakeQwen {
  readonly server: WebSocketServer
  readonly sockets: WebSocket[] = []
  readonly headers: Record<string, string | string[] | undefined>[] = []
  readonly urls: (string | undefined)[] = []
  readonly received: Json[] = []
  closed = 0

  constructor() {
    this.server = new WebSocketServer({ port: 0, host: '127.0.0.1' })
    this.server.on('connection', (socket, request) => {
      this.sockets.push(socket)
      this.headers.push(request.headers)
      this.urls.push(request.url)
      socket.on('message', (data: RawData) => {
        this.received.push(JSON.parse(data.toString()) as Json)
      })
      socket.on('close', () => {
        this.closed += 1
      })
    })
  }

  get url() {
    return `ws://127.0.0.1:${(this.server.address() as AddressInfo).port}`
  }

  get connections() {
    return this.sockets.length
  }

  /** Every `input_audio_buffer.append` payload so far, decoded. */
  audio(): Buffer[] {
    return this.received
      .filter((message) => message.type === 'input_audio_buffer.append')
      .map((message) => Buffer.from(String(message.audio), 'base64'))
  }

  say(event: Json) {
    this.sockets.at(-1)?.send(JSON.stringify(event))
  }

  stop() {
    for (const socket of this.sockets) socket.terminate()
    this.server.close()
  }
}

type WireToken = {
  text: string
  start_ms?: number
  end_ms?: number
  is_final: boolean
  [key: string]: unknown
}
type WireMessage = { tokens?: WireToken[]; finished?: boolean; error_code?: number }

interface Client {
  ws: WebSocket
  messages: WireMessage[]
  closed: Promise<number>
  errors: Error[]
}

let qwen: FakeQwen
let http: Server
let relay: LiveRelay | undefined
let relayPort: number
const clients: WebSocket[] = []

const stdout = vi.spyOn(process.stdout, 'write')
/** Only the logger's own lines: one JSON object each. */
const logged = () =>
  stdout.mock.calls.map(([chunk]) => String(chunk)).filter((line) => line.startsWith('{"level"'))

async function startRelay(options: Parameters<typeof attachLiveRelay>[1] = {}) {
  http = createServer()
  relay = attachLiveRelay(http, {
    openUpstream: (upstream) => openQwenRealtime(upstream, qwen.url),
    ...options,
  })
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve))
  relayPort = (http.address() as AddressInfo).port
}

/** The same relay with other limits, or another upstream, for the tests that need one. */
async function restart(options: Parameters<typeof attachLiveRelay>[1]) {
  relay?.close()
  await new Promise((resolve) => http.close(resolve))
  await startRelay(options)
}

beforeAll(() => {
  stdout.mockImplementation(() => true)
})

afterAll(() => {
  stdout.mockRestore()
})

beforeEach(async () => {
  testEnv.LIVE_ASR_PROVIDER = 'qwen'
  testEnv.QWEN_API_KEY = 'test-qwen-key-do-not-log'
  stdout.mockClear()
  qwen = new FakeQwen()
  await startRelay()
})

afterEach(async () => {
  for (const ws of clients.splice(0)) ws.terminate()
  relay?.close()
  qwen.stop()
  await new Promise((resolve) => http.close(resolve))
})

function connect(options: { origin?: string | null; path?: string } = {}): Client {
  const ws = new WebSocket(`ws://127.0.0.1:${relayPort}${options.path ?? LIVE_ASR_RELAY_PATH}`, {
    origin: options.origin === null ? undefined : (options.origin ?? ORIGIN),
  })
  clients.push(ws)
  const messages: WireMessage[] = []
  ws.on('message', (data: RawData, isBinary: boolean) => {
    if (!isBinary) messages.push(JSON.parse(data.toString()) as WireMessage)
  })
  const closed = new Promise<number>((resolve) => ws.on('close', resolve))
  // A client torn down before its handshake finished reports it, and the tests
  // that do that on purpose are not interested.
  const errors: Error[] = []
  ws.on('error', (error) => errors.push(error))
  return { ws, messages, closed, errors }
}

const opened = (client: Client) =>
  new Promise<void>((resolve, reject) => {
    client.ws.once('open', resolve)
    client.ws.once('error', reject)
  })

/** The status a refused upgrade was answered with. */
const refusedWith = (client: Client) =>
  new Promise<number>((resolve) =>
    client.ws.on('unexpected-response', (_req, res) => resolve(res.statusCode ?? 0)),
  )

/** What the SPA sends first when the session asked for PCM. */
const configFrame = (token: string, extra: Json = {}) =>
  JSON.stringify({
    api_key: token,
    audio_format: 'pcm_s16le',
    sample_rate: 16000,
    num_channels: 1,
    // What a client says about recognition is ignored: the token's mode decides.
    model: 'client-chosen',
    language_hints: ['zh'],
    context: { general: [{ key: 'domain', value: 'client-chosen' }] },
    ...extra,
  })

const token = (mode: 'ambient' | 'dictation' = 'dictation') =>
  mintRelayToken({ userId: 'doctor-1', mode, consent: mode === 'ambient' }).token

/** Connects, authenticates, and waits for the relay to have opened its upstream. */
async function session(mode: 'ambient' | 'dictation' = 'dictation') {
  const client = connect()
  await opened(client)
  client.ws.send(configFrame(token(mode)))
  await vi.waitFor(() => expect(qwen.received.length).toBeGreaterThan(0))
  return client
}

const frame = (bytes = 3200, fill = 1) => Buffer.alloc(bytes, fill)

/** Sends `count` 100 ms frames and waits until the vendor has them all. */
async function stream(client: Client, count: number) {
  const before = qwen.audio().length
  for (let i = 0; i < count; i++) client.ws.send(frame())
  await vi.waitFor(() => expect(qwen.audio().length).toBe(before + count))
}

const wordsOf = (message: WireMessage, final: boolean) =>
  (message.tokens ?? []).filter((t) => t.is_final === final).map((t) => t.text)

describe('the upgrade, which only a browser on our own origin may complete', () => {
  it('refuses another origin without opening anything upstream', async () => {
    const client = connect({ origin: 'https://evil.example' })

    const status = await refusedWith(client)

    expect(status).toBe(403)
    expect(qwen.connections).toBe(0)
  })

  it('refuses an upgrade that names no origin, which is not a browser', async () => {
    const client = connect({ origin: null })

    const status = await refusedWith(client)

    expect(status).toBe(403)
  })

  it('refuses a near miss of the origin', async () => {
    for (const origin of [
      'http://localhost:5173/',
      'http://localhost:5174',
      'HTTP://localhost:5173',
    ]) {
      const client = connect({ origin })
      const status = await refusedWith(client)
      expect(status, origin).toBe(403)
    }
  })

  it('refuses every other path', async () => {
    for (const path of ['/', '/api/asr/live-relay/extra', '/api/asr', '//api/asr/live-relay']) {
      const client = connect({ path })
      const status = await refusedWith(client)
      expect(status, path).toBe(404)
    }
  })

  it('accepts the path with a query string', async () => {
    const client = connect({ path: `${LIVE_ASR_RELAY_PATH}?x=1` })

    await expect(opened(client)).resolves.toBeUndefined()
  })

  it('mounts nothing unless the provider is qwen', () => {
    testEnv.LIVE_ASR_PROVIDER = 'soniox'
    const bare = createServer()

    expect(attachLiveRelay(bare)).toBeUndefined()
    expect(bare.listenerCount('upgrade')).toBe(0)
  })
})

describe('the first frame, which has to authenticate', () => {
  it('opens one upstream session for a valid token, built from the token and not from the frame', async () => {
    await session('dictation')

    expect(qwen.connections).toBe(1)
    expect(qwen.headers[0]?.authorization).toBe('Bearer test-qwen-key-do-not-log')

    const update = qwen.received[0] as { type: string; session: Json }
    const terms = qwenLiveSessionConfig('dictation').context.terms ?? []
    expect(update).toEqual({
      type: 'session.update',
      session: {
        modalities: ['text'],
        input_audio_format: 'pcm',
        sample_rate: 16000,
        input_audio_transcription: {
          language: 'en',
          corpus: { text: `Terms: ${terms.join(', ')}.` },
        },
        turn_detection: { type: 'server_vad', threshold: 0.2, silence_duration_ms: 500 },
      },
    })
    // Nothing the client put in its frame reaches the vendor.
    expect(JSON.stringify(update)).not.toContain('client-chosen')
    expect(terms.length).toBeGreaterThan(0)
  })

  it('takes the vocabulary from the mode the token was minted for', async () => {
    await session('ambient')

    const update = qwen.received[0] as {
      session: { input_audio_transcription: { corpus: { text: string } } }
    }
    const ambient = qwenLiveSessionConfig('ambient').context.terms ?? []
    const dictation = qwenLiveSessionConfig('dictation').context.terms ?? []
    expect(update.session.input_audio_transcription.corpus.text).toBe(
      `Terms: ${ambient.join(', ')}.`,
    )
    expect(ambient).not.toEqual(dictation)
  })

  it.each([
    ['text that is not JSON', 'hello'],
    ['JSON without a key', JSON.stringify({ audio_format: 'pcm_s16le' })],
    ['an empty key', JSON.stringify({ api_key: '' })],
    ['a key that is not a token', JSON.stringify({ api_key: 'temp-key-from-somewhere' })],
    ['the end-of-audio frame', ''],
  ])('refuses %s with 401 and closes 4401', async (_label, first) => {
    const client = connect()
    await opened(client)
    client.ws.send(first)

    expect(await client.closed).toBe(4401)
    expect(client.messages).toEqual([{ error_code: 401 }])
    expect(qwen.connections).toBe(0)
  })

  it('refuses a token it has already accepted', async () => {
    const used = token()
    const first = connect()
    await opened(first)
    first.ws.send(configFrame(used))
    await vi.waitFor(() => expect(qwen.connections).toBe(1))

    const second = connect()
    await opened(second)
    second.ws.send(configFrame(used))

    expect(await second.closed).toBe(4401)
    expect(qwen.connections).toBe(1)
  })

  it('refuses a forged signature', async () => {
    const [payload] = token().split('.')
    const client = connect()
    await opened(client)
    client.ws.send(configFrame(`${payload}.${Buffer.alloc(32).toString('base64url')}`))

    expect(await client.closed).toBe(4401)
    expect(qwen.connections).toBe(0)
  })

  it('treats audio before the token as a protocol error', async () => {
    const client = connect()
    await opened(client)
    client.ws.send(frame())

    expect(await client.closed).toBe(1002)
    expect(client.messages).toEqual([{ error_code: 400 }])
    expect(qwen.connections).toBe(0)
  })

  it('refuses a client that still says it will send a container, not PCM', async () => {
    const client = connect()
    await opened(client)
    client.ws.send(configFrame(token(), { audio_format: 'auto' }))

    expect(await client.closed).toBe(1002)
    expect(client.messages).toEqual([{ error_code: 400 }])
    expect(qwen.connections).toBe(0)
  })

  it('closes a socket that never authenticates', async () => {
    await restart({ limits: { authTimeoutMs: 60 } })

    const client = connect()

    expect(await client.closed).toBe(4401)
    expect(client.messages).toEqual([{ error_code: 401 }])
  })

  it('answers 502 when the vendor key is missing, without a socket', async () => {
    testEnv.QWEN_API_KEY = undefined
    const client = connect()
    await opened(client)
    client.ws.send(configFrame(token()))

    expect(await client.closed).toBe(1011)
    expect(client.messages).toEqual([{ error_code: 502 }])
    expect(qwen.connections).toBe(0)
  })
})

describe('audio, which is forwarded as PCM and bounded', () => {
  it('base64s each frame into an append, in order', async () => {
    const client = await session()

    client.ws.send(frame(3200, 1))
    client.ws.send(frame(3200, 2))
    await vi.waitFor(() => expect(qwen.audio().length).toBe(2))

    expect(qwen.audio()).toEqual([frame(3200, 1), frame(3200, 2)])
    expect(qwen.received.filter((m) => m.type === 'input_audio_buffer.append')[0]).toEqual({
      type: 'input_audio_buffer.append',
      audio: frame(3200, 1).toString('base64'),
    })
  })

  it('holds back an odd byte so the next frame stays aligned', async () => {
    const client = await session()

    client.ws.send(frame(3201, 7))
    client.ws.send(frame(3199, 9))
    await vi.waitFor(() => expect(qwen.audio().length).toBe(2))

    const [first, second] = qwen.audio()
    expect(first?.length).toBe(3200)
    expect(second?.length).toBe(3200)
    // The held byte leads the next frame.
    expect(second?.[0]).toBe(7)
    expect(second?.[1]).toBe(9)
  })

  it('accepts a frame of exactly 32 KiB', async () => {
    const client = await session()

    client.ws.send(frame(32 * 1024))
    await vi.waitFor(() => expect(qwen.audio().length).toBe(1))

    expect(qwen.audio()[0]?.length).toBe(32 * 1024)
  })

  it('refuses a frame over 32 KiB by closing 1009, and forwards none of it', async () => {
    const client = await session()

    client.ws.send(frame(32 * 1024 + 2))

    expect(await client.closed).toBe(1009)
    expect(qwen.audio()).toEqual([])
    await vi.waitFor(() => expect(qwen.closed).toBe(1))
  })

  it('treats a stray text frame after authenticating as a protocol error', async () => {
    const client = await session()

    client.ws.send(JSON.stringify({ type: 'keepalive' }))

    expect(await client.closed).toBe(1002)
    expect(client.messages.at(-1)).toEqual({ error_code: 400 })
    await vi.waitFor(() => expect(qwen.closed).toBe(1))
  })

  it('stops forwarding once a client has sent more audio than the session allows', async () => {
    // A one-second cap plus the ten-second allowance is 352,000 bytes of audio.
    await restart({ limits: { maxSessionSeconds: { ambient: 1, dictation: 1 } } })
    const client = await session()
    const sentAt = performance.now()

    for (let i = 0; i < 12; i++) client.ws.send(frame(32 * 1024))
    await vi.waitFor(() =>
      expect(qwen.received.some((m) => m.type === 'session.finish')).toBe(true),
    )

    // The byte cap fired, not the one-second timer.
    expect(performance.now() - sentAt).toBeLessThan(900)
    const forwarded = qwen.audio().reduce((sum, chunk) => sum + chunk.length, 0)
    // Ten frames fit, the eleventh would pass the cap, and the last 32,000 bytes are our own silence.
    expect(forwarded).toBe(10 * 32 * 1024 + 32_000)
  })
})

describe('what the browser is sent', () => {
  it('replaces the interim tail on every message, with the audio so far as its end', async () => {
    const client = await session()
    await stream(client, 20) // 2,000 ms

    qwen.say({ type: 'input_audio_buffer.speech_started', item_id: 'a', audio_start_ms: 1000 })
    qwen.say({
      type: 'conversation.item.input_audio_transcription.text',
      item_id: 'a',
      text: 'one',
      stash: ' two',
    })
    await vi.waitFor(() => expect(client.messages.length).toBe(1))

    expect(client.messages[0]).toEqual({
      tokens: [
        { text: ' one', start_ms: 1000, end_ms: 1500, is_final: false },
        { text: ' two', start_ms: 1500, end_ms: 2000, is_final: false },
      ],
    })

    qwen.say({
      type: 'conversation.item.input_audio_transcription.text',
      item_id: 'a',
      text: 'one two',
      stash: ' three',
    })
    await vi.waitFor(() => expect(client.messages.length).toBe(2))

    expect(wordsOf(client.messages[1] as WireMessage, false)).toEqual([' one', ' two', ' three'])
    expect(wordsOf(client.messages[1] as WireMessage, true)).toEqual([])
  })

  it('settles a phrase once, then the complete tail, with the first word unspaced and an end marker', async () => {
    const client = await session()
    await stream(client, 40) // 4,000 ms

    qwen.say({ type: 'input_audio_buffer.speech_started', item_id: 'a', audio_start_ms: 1000 })
    qwen.say({ type: 'input_audio_buffer.speech_started', item_id: 'b', audio_start_ms: 3000 })
    qwen.say({
      type: 'conversation.item.input_audio_transcription.text',
      item_id: 'b',
      text: '',
      stash: 'three',
    })
    qwen.say({ type: 'input_audio_buffer.speech_stopped', item_id: 'a', audio_end_ms: 3000 })
    qwen.say({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'a',
      transcript: ' Hello world. ',
    })
    await vi.waitFor(() => expect(client.messages.length).toBe(2))

    // Finals first, in order, then the tail that is still being spoken.
    expect(client.messages[1]).toEqual({
      tokens: [
        { text: 'Hello', start_ms: 1000, end_ms: 2000, is_final: true },
        { text: ' world.', start_ms: 2000, end_ms: 3000, is_final: true },
        { text: '<end>', is_final: true },
        { text: ' three', start_ms: 3000, end_ms: 4000, is_final: false },
      ],
    })

    // The next phrase settles without repeating the first, and every word of it carries a space.
    qwen.say({ type: 'input_audio_buffer.speech_stopped', item_id: 'b', audio_end_ms: 3800 })
    qwen.say({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'b',
      transcript: 'Three more',
    })
    await vi.waitFor(() => expect(client.messages.length).toBe(3))

    expect(client.messages[2]).toEqual({
      tokens: [
        { text: ' Three', start_ms: 3000, end_ms: 3400, is_final: true },
        { text: ' more', start_ms: 3400, end_ms: 3800, is_final: true },
        { text: '<end>', is_final: true },
      ],
    })
  })

  it('holds a phrase back until the one before it has settled, so finals keep their order', async () => {
    const client = await session()

    qwen.say({ type: 'input_audio_buffer.speech_started', item_id: 'a', audio_start_ms: 0 })
    qwen.say({ type: 'input_audio_buffer.speech_started', item_id: 'b', audio_start_ms: 1000 })
    qwen.say({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'b',
      transcript: 'second',
    })
    await vi.waitFor(() => expect(client.messages.length).toBe(1))

    // `b` is complete but `a` is not, so `b` is still only an interim word.
    expect(wordsOf(client.messages[0] as WireMessage, true)).toEqual([])
    expect(wordsOf(client.messages[0] as WireMessage, false)).toEqual([' second'])

    qwen.say({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'a',
      transcript: 'first',
    })
    await vi.waitFor(() => expect(client.messages.length).toBe(2))

    expect(wordsOf(client.messages[1] as WireMessage, true)).toEqual([
      'first',
      '<end>',
      ' second',
      '<end>',
    ])
    expect(wordsOf(client.messages[1] as WireMessage, false)).toEqual([])
  })

  it('drops a final with no letters or digits, and clears the interim it leaves behind', async () => {
    const client = await session()

    qwen.say({ type: 'input_audio_buffer.speech_started', item_id: 'a', audio_start_ms: 0 })
    qwen.say({
      type: 'conversation.item.input_audio_transcription.text',
      item_id: 'a',
      text: '',
      stash: 'ah',
    })
    await vi.waitFor(() => expect(client.messages.length).toBe(1))
    qwen.say({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'a',
      transcript: '...',
    })
    await vi.waitFor(() => expect(client.messages.length).toBe(2))

    expect(client.messages[1]).toEqual({ tokens: [] })
  })

  it('keeps a final made only of digits', async () => {
    const client = await session()

    qwen.say({ type: 'input_audio_buffer.speech_started', item_id: 'a', audio_start_ms: 0 })
    qwen.say({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'a',
      transcript: '500',
    })
    await vi.waitFor(() => expect(client.messages.length).toBe(1))

    expect(wordsOf(client.messages[0] as WireMessage, true)).toEqual(['500', '<end>'])
  })

  it('never sets a speaker, a language or a confidence the vendor did not give', async () => {
    const client = await session()

    qwen.say({ type: 'input_audio_buffer.speech_started', item_id: 'a', audio_start_ms: 0 })
    qwen.say({
      type: 'conversation.item.input_audio_transcription.text',
      item_id: 'a',
      text: 'hello',
      stash: ' there',
    })
    qwen.say({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'a',
      transcript: 'hello there',
    })
    await vi.waitFor(() => expect(client.messages.length).toBe(2))

    for (const message of client.messages) {
      for (const tok of message.tokens ?? []) {
        expect(
          Object.keys(tok).filter(
            (key) => !['text', 'start_ms', 'end_ms', 'is_final'].includes(key),
          ),
        ).toEqual([])
      }
    }
  })

  it('ignores a repeated completion, so a phrase is never written twice', async () => {
    const client = await session()

    qwen.say({ type: 'input_audio_buffer.speech_started', item_id: 'a', audio_start_ms: 0 })
    const done = {
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'a',
      transcript: 'once',
    }
    qwen.say(done)
    qwen.say(done)
    await vi.waitFor(() => expect(client.messages.length).toBeGreaterThan(0))
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(
      client.messages.flatMap((m) => wordsOf(m, true)).filter((t) => t === 'once'),
    ).toHaveLength(1)
  })

  it('ignores vendor events it has no use for', async () => {
    const client = await session()

    qwen.say({ type: 'session.created', session: { id: 's' } })
    qwen.say({ type: 'conversation.item.created', item: { id: 'i' } })
    qwen.say({ type: 'input_audio_buffer.committed', item_id: 'i' })
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(client.messages).toEqual([])
    expect(client.ws.readyState).toBe(WebSocket.OPEN)
  })
})

describe('the end of a session', () => {
  it('on an empty frame, finishes the vendor, settles what is pending, then says finished and closes 1000', async () => {
    const client = await session()
    await stream(client, 10)
    qwen.say({ type: 'input_audio_buffer.speech_started', item_id: 'a', audio_start_ms: 0 })
    qwen.say({
      type: 'conversation.item.input_audio_transcription.text',
      item_id: 'a',
      text: 'last',
      stash: ' words',
    })
    await vi.waitFor(() => expect(client.messages.length).toBe(1))

    client.ws.send('')
    await vi.waitFor(() =>
      expect(qwen.received.some((m) => m.type === 'session.finish')).toBe(true),
    )

    // A second of silence first, so the vendor's VAD closes the phrase in progress.
    const tail = qwen.audio().at(-1)
    expect(tail?.length).toBe(32_000)
    expect(tail?.every((byte) => byte === 0)).toBe(true)
    expect(qwen.received.at(-1)).toEqual({ type: 'session.finish' })

    qwen.say({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'a',
      transcript: 'last words',
    })
    qwen.say({ type: 'session.finished' })

    expect(await client.closed).toBe(1000)
    expect(client.messages.slice(1)).toEqual([
      {
        tokens: [
          { text: 'last', start_ms: 0, end_ms: 500, is_final: true },
          { text: ' words', start_ms: 500, end_ms: 1000, is_final: true },
          { text: '<end>', is_final: true },
        ],
      },
      { tokens: [], finished: true },
    ])
    await vi.waitFor(() => expect(qwen.closed).toBe(1))
  })

  it('keeps unconfirmed words rather than losing them when the vendor never answers', async () => {
    await restart({ limits: { drainTimeoutMs: 80 } })
    const client = await session()
    qwen.say({ type: 'input_audio_buffer.speech_started', item_id: 'a', audio_start_ms: 0 })
    qwen.say({
      type: 'conversation.item.input_audio_transcription.text',
      item_id: 'a',
      text: 'never',
      stash: ' confirmed',
    })
    await vi.waitFor(() => expect(client.messages.length).toBe(1))

    client.ws.send('')

    expect(await client.closed).toBe(1000)
    expect(client.messages.at(-1)).toEqual({ tokens: [], finished: true })
    expect(client.messages.flatMap((m) => wordsOf(m, true))).toEqual([
      'never',
      ' confirmed',
      '<end>',
    ])
    await vi.waitFor(() => expect(qwen.closed).toBe(1))
  })

  it('finishes when the vendor hangs up after being asked to', async () => {
    const client = await session()

    client.ws.send('')
    await vi.waitFor(() =>
      expect(qwen.received.some((m) => m.type === 'session.finish')).toBe(true),
    )
    qwen.sockets[0]?.close(1000)

    expect(await client.closed).toBe(1000)
    expect(client.messages.at(-1)).toEqual({ tokens: [], finished: true })
  })

  it('ignores audio sent after the empty frame', async () => {
    const client = await session()
    client.ws.send('')
    await vi.waitFor(() =>
      expect(qwen.received.some((m) => m.type === 'session.finish')).toBe(true),
    )
    const before = qwen.audio().length

    client.ws.send(frame())
    client.ws.send('')
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(qwen.audio().length).toBe(before)
    expect(qwen.received.filter((m) => m.type === 'session.finish')).toHaveLength(1)
  })

  it('ends at the per-mode session cap exactly as for an empty frame', async () => {
    await restart({ limits: { maxSessionSeconds: { ambient: 0.1, dictation: 0.1 } } })
    const client = await session()

    await vi.waitFor(() =>
      expect(qwen.received.some((m) => m.type === 'session.finish')).toBe(true),
    )
    qwen.say({ type: 'session.finished' })

    expect(await client.closed).toBe(1000)
    expect(client.messages).toEqual([{ tokens: [], finished: true }])
  })

  it('answers an upstream error with 502 and closes 1011, and closes the vendor', async () => {
    const client = await session()
    await stream(client, 3)

    qwen.say({ type: 'error', error: { message: 'request req-123 used key sk-leak' } })

    expect(await client.closed).toBe(1011)
    expect(client.messages).toEqual([{ error_code: 502 }])
    // Nothing the vendor said is repeated to the browser.
    expect(JSON.stringify(client.messages)).not.toContain('sk-leak')
    await vi.waitFor(() => expect(qwen.closed).toBe(1))
  })

  it('treats a failed transcription as a failure rather than a hole in the transcript', async () => {
    const client = await session()

    qwen.say({ type: 'conversation.item.input_audio_transcription.failed', item_id: 'a' })

    expect(await client.closed).toBe(1011)
    expect(client.messages).toEqual([{ error_code: 502 }])
  })

  it('treats a known event of the wrong shape as a failure', async () => {
    const client = await session()

    qwen.say({ type: 'conversation.item.input_audio_transcription.completed', item_id: 'a' })

    expect(await client.closed).toBe(1011)
  })

  it('answers 502 and closes 1011 when the vendor hangs up while the doctor is still talking', async () => {
    const client = await session()
    await stream(client, 2)

    qwen.sockets[0]?.close(1011)

    expect(await client.closed).toBe(1011)
    expect(client.messages).toEqual([{ error_code: 502 }])
  })

  it('answers 502 when the vendor cannot be reached at all', async () => {
    qwen.stop()
    const client = connect()
    await opened(client)
    client.ws.send(configFrame(token()))

    expect(await client.closed).toBe(1011)
    expect(client.messages).toEqual([{ error_code: 502 }])
  })

  it('closes the vendor when the browser goes away mid-stream', async () => {
    const client = await session()
    await stream(client, 3)

    client.ws.terminate()

    await vi.waitFor(() => expect(qwen.closed).toBe(1))
  })

  it('closes the vendor when the browser goes away while the session is settling', async () => {
    const client = await session()
    client.ws.send('')
    await vi.waitFor(() =>
      expect(qwen.received.some((m) => m.type === 'session.finish')).toBe(true),
    )

    client.ws.terminate()

    await vi.waitFor(() => expect(qwen.closed).toBe(1))
  })

  it('closes a vendor socket that is still connecting when the browser leaves', async () => {
    // A listener that accepts the TCP connection and never completes the handshake.
    const stalled = createServer()
    const stuck = new Set<Duplex>()
    let hungUp = 0
    stalled.on('upgrade', (_req, socket) => {
      stuck.add(socket)
      // Reading is what lets the listener see the peer hang up, and an HTTP
      // server's sockets stay half open after it does, so `end` and not `close`.
      socket.on('end', () => {
        hungUp += 1
      })
      socket.resume()
    })
    await new Promise<void>((resolve) => stalled.listen(0, '127.0.0.1', resolve))
    const { port } = stalled.address() as AddressInfo
    await restart({
      openUpstream: (upstream) => openQwenRealtime(upstream, `ws://127.0.0.1:${port}`),
    })
    const client = connect()
    await opened(client)
    client.ws.send(configFrame(token()))
    await vi.waitFor(() => expect(stuck.size).toBe(1))

    client.ws.terminate()

    await vi.waitFor(() => expect(hungUp).toBe(1))
    stalled.close()
  })
})

describe('what is logged', () => {
  it('records ids, byte counts, durations and close codes, and never a phrase, a token or the key', async () => {
    const secret = 'Zyxwvut Quillfeather'
    const issued = token()
    const client = connect()
    await opened(client)
    client.ws.send(configFrame(issued))
    await vi.waitFor(() => expect(qwen.received.length).toBeGreaterThan(0))
    await stream(client, 4)
    qwen.say({ type: 'input_audio_buffer.speech_started', item_id: 'a', audio_start_ms: 0 })
    qwen.say({
      type: 'conversation.item.input_audio_transcription.text',
      item_id: 'a',
      text: secret,
      stash: '',
    })
    qwen.say({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'a',
      transcript: secret,
    })
    await vi.waitFor(() => expect(client.messages.length).toBe(2))
    client.ws.send('')
    await vi.waitFor(() =>
      expect(qwen.received.some((m) => m.type === 'session.finish')).toBe(true),
    )
    qwen.say({ type: 'session.finished' })
    await client.closed

    const lines = logged()
    const text = lines.join('')
    for (const forbidden of [
      'Zyxwvut',
      'Quillfeather',
      issued,
      issued.split('.')[0],
      'test-qwen-key',
      'Bearer',
    ]) {
      expect(text, String(forbidden)).not.toContain(String(forbidden))
    }

    const records = lines.map((line) => JSON.parse(line) as Json)
    const closedRecord = records.find((record) => record.msg === 'live relay session closed')
    expect(records.some((record) => record.msg === 'live relay session opened')).toBe(true)
    expect(closedRecord).toMatchObject({
      outcome: 'ok',
      status: 1000,
      count: 4 * 3200,
      actorId: 'doctor-1',
    })
    expect(typeof closedRecord?.requestId).toBe('string')
    expect(typeof closedRecord?.durationMs).toBe('number')
  })

  it('logs a refused upgrade with its status and nothing about the caller', async () => {
    const client = connect({ origin: 'https://evil.example' })
    await new Promise((resolve) => client.ws.on('unexpected-response', resolve))

    const record = logged()
      .map((line) => JSON.parse(line) as Json)
      .find((entry) => entry.msg === 'live relay upgrade refused')

    expect(record).toMatchObject({ level: 'warn', status: 403 })
    expect(JSON.stringify(record)).not.toContain('evil.example')
  })
})
