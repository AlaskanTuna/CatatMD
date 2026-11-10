// Renders the consultation dialogue in one Gemini multi-speaker TTS call: two Malaysian-English voices, so the Malay
// name and the IC digits come out the way a Malaysian ASR expects. Synthetic script text only (no app data).
// Usage: bun scripts/dialogue-gemini.ts <model> <out.wav> [doctorVoice] [patientVoice]
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { key } from './env'

const ROOT = resolve(import.meta.dirname, '..')
const [
  model = 'gemini-2.5-flash-preview-tts',
  out = join(ROOT, '.state', 'consult-gemini.wav'),
  doctor = 'Charon',
  patient = 'Leda',
] = process.argv.slice(2)
type Turn = { speaker: 'doctor' | 'patient'; text: string; say?: string }
const script = JSON.parse(readFileSync(join(ROOT, 'audio-in', 'consult.script.json'), 'utf8')) as {
  turns: Turn[]
}
const body = script.turns
  .map((t) => `${t.speaker === 'doctor' ? 'Doctor' : 'Patient'}: ${t.say ?? t.text}`)
  .join('\n')
// ACCENT=neutral (bake-off B): ILMU auto-detects language, and its unpunctuated stretches look like Malay-mode
// decoding set off by the accent, so only the name keeps its Malay sound.
const prompt =
  (process.env.ACCENT === 'neutral'
    ? 'TTS the following conversation between a Doctor and a Patient at a GP clinic. Both speak clear, neutral ' +
      'international English with no regional accent, at a relaxed clinic pace, ending each sentence clearly, with ' +
      "natural pauses between turns. Only the patient's name, Siti Contoh, is Malay: say just that name the Malay way " +
      '(SEE-tee CHON-toh). Read the IC number digit by digit.\n\n'
    : 'TTS the following conversation between a Doctor and a Patient at a GP clinic in Kuala Lumpur. Both speak natural ' +
      'Malaysian English with a Malaysian accent, warm and unhurried, at a relaxed clinic pace, with short natural pauses ' +
      "between turns. The patient's name, Siti Contoh, is Malay and said the Malay way (CHON-toh). Read the IC number as " +
      'one continuous run of single digits, with no pauses inside it.\n\n') + body
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  {
    method: 'POST',
    headers: { 'x-goog-api-key': key('GEMINI_API_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'Doctor', voiceConfig: { prebuiltVoiceConfig: { voiceName: doctor } } },
              { speaker: 'Patient', voiceConfig: { prebuiltVoiceConfig: { voiceName: patient } } },
            ],
          },
        },
      },
    }),
  },
)
if (!res.ok) throw new Error(`Gemini ${model} ${res.status}: ${(await res.text()).slice(0, 300)}`)
type Part = { inlineData?: { data: string; mimeType: string } }
const json = (await res.json()) as { candidates?: { content?: { parts?: Part[] } }[] }
const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
if (!part) throw new Error('no audio part')
const bytes = Buffer.from(part.data, 'base64')
if (bytes.subarray(0, 4).toString('latin1') === 'RIFF') writeFileSync(out, bytes)
else {
  const rate = Number(/rate=(\d+)/.exec(part.mimeType)?.[1] ?? 24000)
  const h = Buffer.alloc(44)
  h.write('RIFF', 0)
  h.writeUInt32LE(36 + bytes.length, 4)
  h.write('WAVEfmt ', 8)
  h.writeUInt32LE(16, 16)
  h.writeUInt16LE(1, 20)
  h.writeUInt16LE(1, 22)
  h.writeUInt32LE(rate, 24)
  h.writeUInt32LE(rate * 2, 28)
  h.writeUInt16LE(2, 32)
  h.writeUInt16LE(16, 34)
  h.write('data', 36)
  h.writeUInt32LE(bytes.length, 40)
  writeFileSync(out, Buffer.concat([h, bytes]))
}
process.stdout.write(`wrote ${out} (${part.mimeType})\n`)
