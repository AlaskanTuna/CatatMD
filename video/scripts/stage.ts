// Stages the media the edit plays that git does not hold, from where each stage writes it into public/:
// - the narration WAVs (voice/lines/, from scripts/narration.ts) and their lengths (voice/lines.json),
// - the fake-microphone WAVs the edit replays (AUDIO_IN_DIR, default ./audio-in) and the dialogue timeline,
// - the music bed named in public/sound-manifest.json (MUSIC_DIR, default ./music).
// Footage is staged by scripts/ingest.ts. Usage: bun scripts/stage.ts
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const AUDIO_IN_DIR = resolve(process.env.AUDIO_IN_DIR ?? join(ROOT, 'audio-in'))
const MUSIC_DIR = resolve(process.env.MUSIC_DIR ?? join(ROOT, 'music'))
const missing: string[] = []

function copy(from: string, to: string) {
  if (!existsSync(from)) {
    missing.push(from)
    return
  }
  mkdirSync(resolve(to, '..'), { recursive: true })
  copyFileSync(from, to)
}

const voice = join(ROOT, 'voice', 'lines')
const wavs = existsSync(voice) ? readdirSync(voice).filter((f) => f.endsWith('.wav')) : []
if (!wavs.length) missing.push(`${voice}/*.wav (run: bun run voice)`)
for (const f of wavs) copy(join(voice, f), join(ROOT, 'public', 'voice', 'lines', f))
copy(join(ROOT, 'voice', 'lines.json'), join(ROOT, 'src', 'data', 'lines.json'))

for (const f of ['consult.wav', 'dictation.wav'])
  copy(join(AUDIO_IN_DIR, f), join(ROOT, 'public', 'audio', f))
copy(
  join(ROOT, 'audio-in', 'consult.timeline.json'),
  join(ROOT, 'src', 'data', 'consult.timeline.json'),
)

const manifest = JSON.parse(readFileSync(join(ROOT, 'public', 'sound-manifest.json'), 'utf8')) as {
  music?: { file: string }
}
if (manifest.music)
  copy(join(MUSIC_DIR, basename(manifest.music.file)), join(ROOT, 'public', manifest.music.file))

if (missing.length) {
  console.error(`Not staged (the edit will miss them):\n- ${missing.join('\n- ')}`)
  process.exit(1)
}
process.stdout.write(
  `staged ${wavs.length} narration lines, 2 dialogue WAVs and the music bed into public/\n`,
)
