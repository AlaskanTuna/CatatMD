// Turns the Director's public/sound-manifest.json into src/data/sound.json, with gains set so that, after
// finish.sh normalises the whole film to -14 LUFS, the music bed sits near -30 LUFS (+6 dB on the cards, -6 dB under
// speech) and each effect about 18 dB under the voice (REVISION-2 §7). Gains are relative to the narration's own
// measured loudness, so a re-voice keeps the balance.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const manifestPath = join(ROOT, 'public', 'sound-manifest.json')
if (!existsSync(manifestPath)) {
  process.stdout.write(`No public/sound-manifest.json yet: the cut stays silent.\n`)
  process.exit(0)
}
type Entry = { file: string; seconds: number; lufs: number; cutIn?: number }
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
  music?: Entry
  sfx?: Record<string, Entry>
}

// The narration's integrated loudness, measured over every line joined (concat filter, not the concat protocol).
const lines = (
  JSON.parse(readFileSync(join(ROOT, 'voice', 'lines.json'), 'utf8')) as {
    lines: { file: string }[]
  }
).lines.map((l) => join(ROOT, l.file))
const args = lines.flatMap((f) => ['-i', f])
const filter = `${lines.map((_, i) => `[${i}:a]`).join('')}concat=n=${lines.length}:v=0:a=1,ebur128`
const run = spawnSync(
  'ffmpeg',
  ['-hide_banner', '-nostats', ...args, '-filter_complex', filter, '-f', 'null', '-'],
  { encoding: 'utf8' },
)
const voice = Number(/I:\s+(-?[\d.]+) LUFS/.exec(run.stderr.split('Summary:')[1] ?? '')?.[1])
if (!Number.isFinite(voice)) throw new Error('Could not measure the narration loudness')

// finish.sh lifts the voice-dominated mix to about -14 LUFS, so everything moves by (-14 - voice).
const lift = -14 - voice
const MUSIC_BED = -30
const SFX_UNDER_VOICE = 18
const out: Record<string, unknown> = { voiceLufs: voice, sfx: {}, sfxDb: -SFX_UNDER_VOICE }
if (manifest.music) {
  const m = manifest.music
  if (!existsSync(join(ROOT, 'public', m.file))) throw new Error(`Missing ${m.file}`)
  out.music = {
    src: m.file,
    from: m.cutIn ?? 0,
    seconds: m.seconds,
    bedDb: Number((MUSIC_BED - lift - m.lufs).toFixed(1)),
  }
}
// Effects are too short for a meaningful LUFS, so they are matched by peak (Director): each peaks 18 dB under the
// narration's typical peak, and the click a further 4 dB down because it repeats.
const peak = (file: string) => {
  const r = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', file, '-af', 'volumedetect', '-f', 'null', '-'],
    { encoding: 'utf8' },
  )
  const v = Number(/max_volume: (-?[\d.]+) dB/.exec(r.stderr)?.[1])
  if (!Number.isFinite(v)) throw new Error(`No peak for ${file}`)
  return v
}
const voicePeaks = lines.map(peak).sort((a, b) => a - b)
const voicePeak = voicePeaks[Math.floor(voicePeaks.length / 2)]
out.voicePeakDbfs = voicePeak
const KINDS = ['click', 'captureStart', 'analysisChime', 'approveChime', 'paperSlide']
for (const [kind, e] of Object.entries(manifest.sfx ?? {})) {
  if (!KINDS.includes(kind)) throw new Error(`Unknown sfx kind ${kind}`)
  const file = join(ROOT, 'public', e.file)
  if (!existsSync(file)) throw new Error(`Missing ${e.file}`)
  const target = voicePeak - SFX_UNDER_VOICE - (kind === 'click' ? 4 : 0)
  ;(out.sfx as Record<string, unknown>)[kind] = {
    src: e.file,
    gainDb: Number((target - peak(file)).toFixed(1)),
  }
}
writeFileSync(join(ROOT, 'src', 'data', 'sound.json'), `${JSON.stringify(out, null, 2)}\n`)
process.stdout.write(
  `voice ${voice} LUFS (lift ${lift.toFixed(1)} dB); music ${out.music ? 'placed' : 'none'}; sfx ${Object.keys(out.sfx as object).join(', ') || 'none'}\n`,
)
