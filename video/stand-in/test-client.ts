// Streams a WebM/Opus file to the stand-in the way the app does (config frame, ~250 ms chunks, '' at the end)
// and prints the transcript it gets back, grouped by speaker. Usage: bun stand-in/test-client.ts <file.webm> <ambient|dictation>
import { readFileSync } from 'node:fs'

const [file, mode] = process.argv.slice(2) as [string, string]
const bytes = readFileSync(file)
const SHIM = `127.0.0.1:${process.env.SHIM_PORT ?? 8787}`
const mint = await (
  await fetch(`http://${SHIM}/v1/auth/temporary-api-key`, { method: 'POST' })
).json()
const ws = new WebSocket(`ws://${SHIM}/transcribe-websocket`)
const turns: { speaker: string; text: string }[] = []
ws.onopen = async () => {
  ws.send(
    JSON.stringify({
      api_key: mint.api_key,
      model: 'stt-rt-v5',
      audio_format: 'auto',
      enable_speaker_diarization: mode === 'ambient',
      context:
        mode === 'ambient'
          ? {
              general: [
                { key: 'domain', value: 'Healthcare' },
                { key: 'speakers', value: 'Two speakers: a doctor and a patient' },
              ],
              terms: ['haemoptysis', 'phlegm', 'IC number'],
            }
          : {
              general: [
                { key: 'domain', value: 'Healthcare' },
                { key: 'speakers', value: 'One speaker: a doctor dictating a prescription' },
              ],
              terms: ['paracetamol', 'benzydamine'],
            },
    }),
  )
  const step = Math.ceil(bytes.length / 400)
  for (let o = 0; o < bytes.length; o += step) {
    ws.send(bytes.subarray(o, o + step))
    await Bun.sleep(5)
  }
  ws.send('')
}
ws.onmessage = (e) => {
  const j = JSON.parse(String(e.data))
  for (const t of j.tokens ?? []) {
    const sp = t.speaker ?? '-'
    const last = turns.at(-1)
    if (last && last.speaker === sp) last.text += t.text
    else turns.push({ speaker: sp, text: t.text.trimStart() })
  }
  if (j.error_code) process.stdout.write(`ERROR ${j.error_code} ${j.error_message}\n`)
  if (j.finished) {
    for (const t of turns) process.stdout.write(`[${t.speaker}] ${t.text}\n`)
    process.stdout.write(`turns: ${turns.length}\n`)
    ws.close()
    process.exit(0)
  }
}
