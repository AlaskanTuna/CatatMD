// Streams a WebM/Opus file to the stand-in in real time (as the browser does) and reports the interim stream:
// how often it updates, sample interim tails, and the final transcript by speaker.
// Usage: bun stand-in/test-stream.ts <file.webm> <seconds> <ambient|dictation>
import { readFileSync } from 'node:fs'

const [file, secs, mode] = process.argv.slice(2) as [string, string, string]
const bytes = readFileSync(file)
const t0 = Date.now()
const at = () => (Date.now() - t0) / 1000
const ws = new WebSocket(`ws://127.0.0.1:${process.env.SHIM_PORT ?? 8787}/transcribe-websocket`)
const turns: { speaker: string; text: string }[] = []
let interimMsgs = 0,
  lastInterim = '',
  samples: string[] = []
ws.onopen = async () => {
  ws.send(
    JSON.stringify({
      api_key: 'x',
      model: 'stt-rt-v5',
      audio_format: 'auto',
      enable_speaker_diarization: mode === 'ambient',
      context:
        mode === 'ambient'
          ? { terms: ['haemoptysis', 'phlegm'] }
          : { terms: ['paracetamol', 'benzydamine', 'mL'] },
    }),
  )
  const n = 400,
    step = Math.ceil(bytes.length / n),
    pause = (Number(secs) * 1000) / n
  for (let o = 0; o < bytes.length; o += step) {
    ws.send(bytes.subarray(o, o + step))
    await Bun.sleep(pause)
  }
  ws.send('')
}
type Token = { text: string; is_final?: boolean; speaker?: string }
ws.onmessage = (e) => {
  const j = JSON.parse(String(e.data)) as {
    tokens?: Token[]
    error_code?: number
    error_message?: string
    finished?: boolean
  }
  const fin = (j.tokens ?? []).filter((t: Token) => t.is_final)
  const inter = (j.tokens ?? [])
    .filter((t: Token) => !t.is_final)
    .map((t: Token) => t.text)
    .join('')
    .trim()
  if (inter && inter !== lastInterim) {
    interimMsgs++
    if (interimMsgs % 15 === 1) samples.push(`${at().toFixed(1)}s interim: …${inter.slice(-60)}`)
    lastInterim = inter
  }
  for (const t of fin) {
    const sp = t.speaker ?? '-'
    const last = turns.at(-1)
    if (last && last.speaker === sp) last.text += t.text
    else turns.push({ speaker: sp, text: t.text.trimStart() })
  }
  if (j.error_code) process.stdout.write(`ERROR ${j.error_message}\n`)
  if (j.finished) {
    process.stdout.write(`interim updates: ${interimMsgs} over ${at().toFixed(1)} s\n`)
    for (const s of samples.slice(0, 6)) process.stdout.write(`   ${s}\n`)
    for (const t of turns) process.stdout.write(`[${t.speaker}] ${t.text}\n`)
    process.stdout.write(`turns: ${turns.length}\n`)
    process.exit(0)
  }
}
