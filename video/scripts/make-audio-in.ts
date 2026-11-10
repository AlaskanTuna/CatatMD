// Builds the fake-microphone WAVs from the dialogue scripts: one Kokoro render per turn, natural gaps, 48 kHz mono.
// Usage: bun scripts/make-audio-in.ts [consult] [dictation]   (none named = both). Each writes audio-in/<name>.wav
// and its .timeline.json. The film's consult.wav is the Gemini render instead (README.md, Inputs Not Committed), so a
// Kokoro consult here replaces it: build dictation alone unless that is the aim.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { kokoro, seconds } from './tts'

const DIR = resolve(import.meta.dirname, '../audio-in')
const TMP = resolve(import.meta.dirname, '../.state/audio-in')
mkdirSync(TMP, { recursive: true })

const ffmpeg = (args: string[]) => {
  const run = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8' })
  if (run.status !== 0) throw new Error(run.stderr)
}
const lang = (voice: string) => (voice.startsWith('b') ? 'en-gb' : 'en-us')

function build(
  name: string,
  parts: { voice: string; text: string; gapAfter: number; meta: object }[],
  lead: number,
) {
  const pieces: string[] = []
  const timeline: object[] = []
  let t = lead
  const silence = (s: number) => {
    const f = join(TMP, `sil-${s.toFixed(2)}.wav`)
    ffmpeg([
      '-f',
      'lavfi',
      '-i',
      `anullsrc=r=48000:cl=mono`,
      '-t',
      s.toFixed(3),
      '-c:a',
      'pcm_s16le',
      f,
    ])
    return f
  }
  pieces.push(silence(lead))
  parts.forEach((p, i) => {
    const raw = join(TMP, `${name}-${i}.raw.wav`)
    const out = join(TMP, `${name}-${i}.wav`)
    kokoro(p.text, raw, p.voice, lang(p.voice))
    ffmpeg(['-i', raw, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', out])
    const len = seconds(out)
    timeline.push({ ...p.meta, start: +t.toFixed(2), end: +(t + len).toFixed(2) })
    t += len + p.gapAfter
    pieces.push(out, silence(p.gapAfter))
  })
  const list = join(TMP, `${name}.list`)
  writeFileSync(list, pieces.map((f) => `file '${f}'`).join('\n'))
  const wav = join(DIR, `${name}.wav`)
  ffmpeg([
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    list,
    '-c:a',
    'pcm_s16le',
    '-ar',
    '48000',
    '-ac',
    '1',
    wav,
  ])
  writeFileSync(
    join(DIR, `${name}.timeline.json`),
    `${JSON.stringify(
      { file: `${name}.wav`, seconds: +seconds(wav).toFixed(2), turns: timeline },
      null,
      2,
    )}\n`,
  )
  process.stdout.write(`${name}.wav ${seconds(wav).toFixed(1)} s, ${parts.length} parts\n`)
}

type Turn = { speaker: 'doctor' | 'patient'; text: string; say?: string }
const ONLY = process.argv.slice(2)
const wanted = (name: string) => !ONLY.length || ONLY.includes(name)

if (wanted('consult')) {
  const consult = JSON.parse(readFileSync(join(DIR, 'consult.script.json'), 'utf8')) as {
    voices: Record<string, string>
    turns: Turn[]
  }
  build(
    'consult',
    consult.turns.map((turn, i) => {
      const next = consult.turns[i + 1]
      // A reply follows a question quickly; the doctor's own second sentence after an examination waits longer.
      const gapAfter = !next
        ? 2.0
        : next.speaker === turn.speaker
          ? 1.6
          : turn.text.endsWith('?')
            ? 0.7
            : 0.9
      return {
        voice: consult.voices[turn.speaker],
        text: turn.say ?? turn.text,
        gapAfter,
        meta: { speaker: turn.speaker, text: turn.text },
      }
    }),
    2.0,
  )
}
if (wanted('dictation')) {
  const dictation = JSON.parse(readFileSync(join(DIR, 'dictation.script.json'), 'utf8')) as {
    voice: string
    text: string
    say?: string
  }
  build(
    'dictation',
    [
      {
        voice: dictation.voice,
        text: dictation.say ?? dictation.text,
        gapAfter: 2.0,
        meta: { text: dictation.text },
      },
    ],
    1.5,
  )
}
