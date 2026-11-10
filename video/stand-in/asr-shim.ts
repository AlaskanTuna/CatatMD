// A local stand-in for Soniox, for filming only: Soniox's account has no balance (402), so the user asked for
// the film's speech recognition to run on other providers. The app is unchanged except for a local, uncommitted
// patch that points its Soniox hosts here (stand-in/soniox-local.patch). This server speaks the two Soniox
// surfaces the app uses:
//   POST /v1/auth/temporary-api-key  -> a throwaway key (the app's mint call)
//   WS   /transcribe-websocket       -> config frame, then the recorder's container chunks, then '' = end of audio
// and streams like Soniox does: interim words while the speaker is still talking, then final words that replace them.
//   live (interim):  Qwen3-ASR-Flash-Realtime (Alibaba Model Studio, international endpoint). Its server VAD also
//                    cuts the audio into phrases (audio_start_ms .. audio_end_ms).
//   final:           each phrase's exact span, padded 150 ms, goes to OpenAI: gpt-4o-transcribe for the words (with a
//                    generic setting line and the session's own context terms as the prompt) and, in ambient mode,
//                    gpt-4o-transcribe-diarize with the two synthetic voices enrolled as known speakers "1" and "2".
// Interim words carry a provisional speaker (the other voice from the phrase before); the final carries the
// diariser's. The final-only predecessor is kept as asr-shim-v1-final-only.ts.
// Usage: OPENAI_API_KEY=... QWEN_API_KEY=... SHIM_SPEAKER_REFS=a.wav,b.wav bun stand-in/asr-shim.ts
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { must } from '../src/must'

const PORT = Number(process.env.SHIM_PORT ?? 8787)
const OPENAI = process.env.OPENAI_API_KEY
const QWEN = process.env.QWEN_API_KEY
if (!OPENAI || !QWEN) throw new Error('OPENAI_API_KEY and QWEN_API_KEY must both be set')
const QWEN_URL =
  process.env.SHIM_QWEN_URL ??
  'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3-asr-flash-realtime'
const REFS = (process.env.SHIM_SPEAKER_REFS ?? '').split(',').filter(Boolean)
const REF_URLS = REFS.map((p) => `data:audio/wav;base64,${readFileSync(p).toString('base64')}`)
const RATE = 16000
const BYTES_PER_MS = (RATE * 2) / 1000
// Qwen's spans already carry margins: measured, a phrase opens ~200 ms before speech and closes ~300 ms after it.
const PAD_MS = 0
const SILENCE_MS = Number(process.env.SHIM_SILENCE_MS ?? 500)

const log = (...a: unknown[]) =>
  process.stdout.write(`${[new Date().toISOString().slice(11, 23), ...a].join(' ')}\n`)

function wav(pcm: Buffer): Blob {
  const h = Buffer.alloc(44)
  h.write('RIFF', 0)
  h.writeUInt32LE(36 + pcm.length, 4)
  h.write('WAVEfmt ', 8)
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(1, 20)
  h.writeUInt16LE(1, 22)
  h.writeUInt32LE(RATE, 24)
  h.writeUInt32LE(RATE * 2, 28)
  h.writeUInt16LE(2, 32)
  h.writeUInt16LE(16, 34)
  h.write('data', 36)
  h.writeUInt32LE(pcm.length, 40)
  // Copies into plain ArrayBuffer-backed bytes, which Blob accepts (a Buffer may sit on a SharedArrayBuffer).
  return new Blob([new Uint8Array(h), new Uint8Array(pcm)], { type: 'audio/wav' })
}

async function openai(form: FormData) {
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI}` },
    body: form,
    signal: AbortSignal.timeout(60_000),
  })
  const json = (await res.json()) as {
    text?: string
    segments?: { speaker?: string; text?: string; start: number; end: number }[]
    error?: { message: string }
  }
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${json.error?.message ?? 'no message'}`)
  return json
}

type Part = { text: string; speaker: string | null; fromMs: number; toMs: number }

/**
 * One phrase's final words. A phrase one voice speaks takes gpt-4o-transcribe's words and the diariser's speaker.
 * A phrase the diariser hears two enrolled voices in (Qwen's VAD ran two turns together) is split along the
 * diariser's own segments, each with its speaker and words, so neither turn is lost or given to the other voice.
 * Times are milliseconds from the start of the span sent.
 */
async function finalise(pcm: Buffer, diarize: boolean, prompt: string): Promise<Part[]> {
  const durMs = (pcm.length / 2 / RATE) * 1000
  const textForm = new FormData()
  textForm.append('file', wav(pcm), 'phrase.wav')
  textForm.append('model', process.env.SHIM_TEXT_MODEL ?? 'gpt-4o-transcribe')
  textForm.append('response_format', 'json')
  textForm.append('language', 'en')
  if (prompt) textForm.append('prompt', prompt)
  const diarJob = diarize
    ? (async () => {
        const form = new FormData()
        form.append('file', wav(pcm), 'phrase.wav')
        form.append('model', 'gpt-4o-transcribe-diarize')
        form.append('response_format', 'diarized_json')
        form.append('chunking_strategy', 'auto')
        REF_URLS.forEach((url, i) => {
          form.append('known_speaker_names[]', String(i + 1))
          form.append('known_speaker_references[]', url)
        })
        return ((await openai(form)).segments ?? []).filter(
          (g) => g.speaker && /^\d+$/.test(g.speaker) && (g.text ?? '').trim(),
        )
      })()
    : Promise.resolve([])
  const [text, segs] = await Promise.all([
    openai(textForm).then((j) => (j.text ?? '').trim()),
    diarJob,
  ])
  if (!diarize) return [{ text, speaker: null, fromMs: 0, toMs: durMs }]
  // Merge consecutive same-speaker segments, then decide.
  const runs: Part[] = []
  for (const g of segs) {
    const last = runs.at(-1)
    if (last && last.speaker === g.speaker) {
      last.text += ` ${(g.text ?? '').trim()}`
      last.toMs = g.end * 1000
    } else
      runs.push({
        text: (g.text ?? '').trim(),
        speaker: g.speaker ?? null,
        fromMs: g.start * 1000,
        toMs: g.end * 1000,
      })
  }
  if (runs.length > 1) return runs
  return [{ text, speaker: runs[0]?.speaker ?? null, fromMs: 0, toMs: durMs }]
}

type SessionConfig = { enable_speaker_diarization?: boolean; context?: { terms?: string[] } }

/**
 * The OpenAI prompt: a generic setting line (it names no patient) plus the session's own context terms, the ones the
 * app sends Soniox. Measured on the film's audio: with the app's "domain: Healthcare" line alone, the Malay name came
 * back as "Situ contoh" and a whole question was dropped; with this line, neither.
 */
function promptFrom(config: SessionConfig) {
  const terms = (config.context?.terms ?? []).slice(0, 60).join(', ')
  const setting = config.enable_speaker_diarization
    ? 'A consultation in a Malaysian GP clinic, in English. Malay personal names are common.'
    : 'A doctor in a Malaysian GP clinic dictating a prescription, in English.'
  return terms ? `${setting} Terms: ${terms}.` : setting
}

type Phrase = {
  id: string
  startMs: number
  endMs: number | null
  /** Qwen's confirmed text plus its unconfirmed stash while live, then its completed transcript. */
  live: string
  provisional: string | null
  /** Final parts, timed from the padded span's start (startMs - PAD_MS). */
  final: Part[] | null
  emitted: boolean
}
type Sink = { send: (data: string) => unknown }
type Session = {
  id: string
  diarize: boolean
  prompt: string
  pcm: Buffer[]
  pcmBytes: number
  phrases: Phrase[]
  lastSpeaker: string | null
  first: { done: boolean }
  qwen: WebSocket
  qwenReady: Promise<void>
  ff: ChildProcessWithoutNullStreams
  ended: boolean
  finished: boolean
}

function words(
  text: string,
  startMs: number,
  endMs: number,
  speaker: string | null,
  isFinal: boolean,
  first: { done: boolean } | null,
) {
  const list = text.split(/\s+/).filter(Boolean)
  const span = Math.max(1, endMs - startMs)
  return list.map((w, i) => {
    // The stream's very first final word carries no leading space; every other word does, as Soniox's tokens do.
    const lead = first && !first.done ? '' : ' '
    if (first) first.done = true
    return {
      text: `${lead}${w}`,
      start_ms: Math.round(startMs + (span * i) / list.length),
      end_ms: Math.round(startMs + (span * (i + 1)) / list.length),
      is_final: isFinal,
      ...(speaker === null ? {} : { speaker }),
      language: 'en',
      confidence: 0.95,
    }
  })
}

/**
 * One Soniox message: the finals now ready, strictly in phrase order, plus the whole interim tail. The app appends
 * finals and replaces its interim words with each message's interim tokens, so every message carries the full tail.
 */
function flush(ws: Sink, s: Session) {
  const finals = []
  for (const p of s.phrases) {
    if (p.emitted) continue
    if (!p.final) break
    for (const part of p.final) {
      const base = Math.max(0, p.startMs - PAD_MS)
      if (part.text)
        finals.push(
          ...words(part.text, base + part.fromMs, base + part.toMs, part.speaker, true, s.first),
        )
    }
    p.emitted = true
  }
  const interim = s.phrases
    .filter((p) => !p.emitted)
    .flatMap((p) =>
      words(
        p.live,
        p.startMs,
        p.endMs ?? p.startMs + 1000,
        s.diarize ? p.provisional : null,
        false,
        null,
      ),
    )
  ws.send(JSON.stringify({ tokens: [...finals, ...interim] }))
}

function maybeFinish(ws: Sink, s: Session) {
  if (!s.ended || s.finished || s.phrases.some((p) => !p.emitted)) return
  s.finished = true
  log(s.id, 'finished')
  ws.send(JSON.stringify({ tokens: [], finished: true }))
}

function open(ws: Sink, config: SessionConfig): Session {
  const id = randomUUID().slice(0, 8)
  const diarize = config.enable_speaker_diarization === true
  const qwen = new WebSocket(QWEN_URL, { headers: { Authorization: `Bearer ${QWEN}` } } as never)
  let ready!: () => void
  const s: Session = {
    id,
    diarize,
    prompt: promptFrom(config),
    pcm: [],
    pcmBytes: 0,
    phrases: [],
    lastSpeaker: null,
    first: { done: false },
    qwen,
    qwenReady: new Promise<void>((r) => (ready = r)),
    ff: spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      '-ac',
      '1',
      '-ar',
      String(RATE),
      '-f',
      's16le',
      'pipe:1',
    ]),
    ended: false,
    finished: false,
  }
  const terms = (config.context?.terms ?? []).slice(0, 60).join(', ')
  qwen.onopen = () => {
    qwen.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text'],
          input_audio_format: 'pcm',
          sample_rate: RATE,
          input_audio_transcription: {
            language: 'en',
            ...(terms ? { corpus: { text: `Terms: ${terms}.` } } : {}),
          },
          turn_detection: { type: 'server_vad', threshold: 0.2, silence_duration_ms: SILENCE_MS },
        },
      }),
    )
    ready()
  }
  qwen.onmessage = (e) => {
    const j = JSON.parse(String(e.data)) as {
      type: string
      item_id?: string
      audio_start_ms?: number
      audio_end_ms?: number
      text?: string
      stash?: string
      transcript?: string
      error?: unknown
    }
    const phrase = () => s.phrases.find((p) => p.id === j.item_id)
    if (j.type === 'input_audio_buffer.speech_started') {
      const prev = s.phrases.at(-1)
      const prevSpeaker = prev ? (prev.final?.at(-1)?.speaker ?? prev.provisional) : s.lastSpeaker
      // Turn-taking cue for the interim label only. Qwen's spans overlap the pauses by about 500 ms in total, so a
      // measured gap under 250 ms is a short breath by the same voice, and a longer one is usually the other voice
      // answering. The diariser's final label always overrides it.
      const startMs = j.audio_start_ms ?? 0
      const sameVoice = prev?.endMs != null && startMs - prev.endMs < 250
      const provisional = diarize
        ? sameVoice
          ? (prevSpeaker ?? '1')
          : prevSpeaker === '1'
            ? '2'
            : '1'
        : null
      s.phrases.push({
        id: must(j.item_id, 'the Qwen item id'),
        startMs,
        endMs: null,
        live: '',
        provisional,
        final: null,
        emitted: false,
      })
    } else if (j.type === 'conversation.item.input_audio_transcription.text') {
      const p = phrase()
      if (p && !p.final) {
        p.live = `${j.text ?? ''}${j.stash ?? ''}`.trim()
        flush(ws, s)
      }
    } else if (j.type === 'input_audio_buffer.speech_stopped') {
      const p = phrase()
      if (p) p.endMs = j.audio_end_ms ?? null
    } else if (j.type === 'conversation.item.input_audio_transcription.completed') {
      const p = phrase()
      if (!p) return
      p.live = (j.transcript ?? p.live).trim()
      // Qwen heard no words: a breath or a click. Sending it on invites the final model to invent some (it echoed a
      // prompt term, "haemoptysis", and an "Okay," on two such fragments), so it closes empty.
      const spanMs = (p.endMs ?? p.startMs) - p.startMs
      const liveWords = p.live.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length
      if (liveWords === 0 || (spanMs < 800 && liveWords <= 1)) {
        p.final = []
        log(
          id,
          'dropped empty phrase',
          `${(((p.endMs ?? p.startMs) - p.startMs) / 1000).toFixed(1)}s`,
        )
        flush(ws, s)
        maybeFinish(ws, s)
        return
      }
      flush(ws, s)
      const end = p.endMs ?? Math.round(s.pcmBytes / BYTES_PER_MS)
      const all = Buffer.concat(s.pcm)
      const from = Math.max(0, Math.round((p.startMs - PAD_MS) * BYTES_PER_MS)) & ~1
      const to = Math.min(all.length, Math.round((end + PAD_MS) * BYTES_PER_MS)) & ~1
      void finalise(Buffer.from(all.subarray(from, to)), diarize, s.prompt)
        .catch((err) => {
          log(id, 'final error, keeping the live words', String(err))
          return [
            {
              text: p.live,
              speaker: p.provisional,
              fromMs: PAD_MS,
              toMs: PAD_MS + (end - p.startMs),
            },
          ]
        })
        .then((found) => {
          // In ambient mode a short phrase no enrolled voice claims is a fragment ("Ha?"): drop it.
          const parts = diarize
            ? found.filter((x) => x.speaker !== null || end - p.startMs >= 1500)
            : found
          if (parts.length < found.length)
            log(
              id,
              'dropped unclaimed fragment',
              found
                .filter((x) => !parts.includes(x))
                .map((x) => x.text)
                .join(' | '),
            )
          p.final = parts
          const lastSpeaker = parts.at(-1)?.speaker
          if (lastSpeaker) s.lastSpeaker = lastSpeaker
          const shown = parts
            .map(
              (x) =>
                `[${x.speaker ?? '-'}${diarize && parts.length === 1 && x.speaker !== p.provisional ? ` (provisional ${p.provisional})` : ''}] ${x.text}`,
            )
            .join(' ')
          log(
            id,
            parts.length > 1 ? 'final SPLIT' : 'final',
            `${((end - p.startMs) / 1000).toFixed(1)}s`,
            shown,
            `| live: ${p.live}`,
          )
          flush(ws, s)
          maybeFinish(ws, s)
        })
    } else if (j.type === 'error') {
      log(id, 'qwen error', JSON.stringify(j.error).slice(0, 300))
    }
  }
  qwen.onclose = (e) => log(id, 'qwen closed', e.code)

  let carry = Buffer.alloc(0)
  s.ff.stdout.on('data', async (chunk: Buffer) => {
    s.pcm.push(chunk)
    s.pcmBytes += chunk.length
    carry = Buffer.concat([carry, chunk])
    await s.qwenReady
    // Forward in 100 ms slices as the audio arrives, so Qwen hears the consultation in real time.
    while (carry.length >= 3200) {
      qwen.send(
        JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: carry.subarray(0, 3200).toString('base64'),
        }),
      )
      carry = carry.subarray(3200)
    }
  })
  s.ff.stdout.on('end', async () => {
    await s.qwenReady
    if (carry.length)
      qwen.send(
        JSON.stringify({ type: 'input_audio_buffer.append', audio: carry.toString('base64') }),
      )
    // A second of silence lets Qwen's VAD close the last phrase.
    qwen.send(
      JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: Buffer.alloc(32000).toString('base64'),
      }),
    )
    s.ended = true
    setTimeout(() => {
      // Safety net: never leave the app waiting on a phrase Qwen never closed.
      for (const p of s.phrases)
        if (!p.final)
          p.final = [{ text: p.live, speaker: p.provisional, fromMs: PAD_MS, toMs: PAD_MS + 1000 }]
      flush(ws, s)
      maybeFinish(ws, s)
    }, 9000)
    maybeFinish(ws, s)
  })
  log(id, 'open', diarize ? 'ambient (diarize)' : 'dictation')
  return s
}

Bun.serve<{ session?: Session }>({
  port: PORT,
  hostname: '127.0.0.1',
  fetch(req, srv) {
    const url = new URL(req.url)
    if (req.method === 'POST' && url.pathname === '/v1/auth/temporary-api-key') {
      log('mint')
      return Response.json({
        api_key: `stand-in-${randomUUID()}`,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      })
    }
    if (url.pathname === '/transcribe-websocket' && srv.upgrade(req, { data: {} })) return undefined
    return new Response('not found', { status: 404 })
  },
  websocket: {
    message(ws, message) {
      if (!ws.data.session) {
        ws.data.session = open(ws, JSON.parse(String(message)) as SessionConfig)
        return
      }
      const s = ws.data.session
      if (typeof message === 'string' && message.length === 0) {
        s.ff.stdin.end()
        return
      }
      if (typeof message !== 'string') s.ff.stdin.write(Buffer.from(message as Uint8Array))
    },
    close(ws) {
      const s = ws.data.session
      if (s && !s.ended) s.ff.stdin.end()
      if (s) setTimeout(() => s.qwen.close(), 3000)
    },
  },
})

log(
  `stand-in listening on 127.0.0.1:${PORT} (live: Qwen realtime; final: OpenAI), speakers enrolled: ${REFS.length}`,
)
