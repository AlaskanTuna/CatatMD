// Renders the narration (shots.json `narration`, one sentence per line) one WAV per line with Kokoro af_heart, then
// writes voice/lines.json with each line's exact length. A re-voice replaces the WAVs and nothing else.
// Usage: bun scripts/narration.ts [lineId...]   (no ids = every line)
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { kokoro, seconds } from './tts'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = join(ROOT, 'voice', 'lines')
mkdirSync(OUT, { recursive: true })

/** Spoken forms only; the caption keeps the written words. */
const SAY: [RegExp, string][] = [
  [/\bIDs\b/g, 'I Dees'],
  [/\bGP\b/g, 'G P'],
]

type Line = { id: string; scene: string; graphic: boolean; text: string }

/** Sample peak to `db` dBFS (Director, rough 1): no line reaches the mix hotter than the rest. Idempotent. */
function peakTo(wav: string, db: number) {
  const probe = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-nostats', '-i', wav, '-af', 'volumedetect', '-f', 'null', '-'],
    { encoding: 'utf8' },
  )
  const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(probe.stderr)?.[1])
  if (!Number.isFinite(peak)) throw new Error(`No peak for ${wav}`)
  if (Math.abs(db - peak) < 0.05) return
  const tmp = `${wav}.peak.wav`
  const run = spawnSync('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-i',
    wav,
    '-af',
    `volume=${(db - peak).toFixed(2)}dB`,
    '-c:a',
    'pcm_s16le',
    tmp,
  ])
  if (run.status !== 0) throw new Error(String(run.stderr))
  spawnSync('mv', [tmp, wav])
}

/** The narration, one sentence per line, as shots.json holds it (frozen from docs/BRIEF.md and docs/REVISION-2.md). */
export function scriptLines(): Line[] {
  return (JSON.parse(readFileSync(join(ROOT, 'shots.json'), 'utf8')) as { narration: Line[] })
    .narration
}

if (import.meta.main) {
  const only = process.argv.slice(2)
  const lines = scriptLines()
  const manifest: Record<string, unknown>[] = []
  for (const line of lines) {
    const wav = join(OUT, `${line.id}.wav`)
    if (!only.length || only.includes(line.id) || !existsSync(wav)) {
      const said = SAY.reduce((t, [re, to]) => t.replace(re, to), line.text)
      const raw = join(OUT, `${line.id}.24k.wav`)
      kokoro(said, raw, 'af_heart', 'en-us', Number(process.env.VOICE_SPEED ?? 1.0))
      // 48 kHz for the mix; trim Kokoro's edge silence to a fixed 40 ms so slot timing is exact.
      const run = spawnSync('ffmpeg', [
        '-v',
        'error',
        '-y',
        '-i',
        raw,
        '-af',
        'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,adelay=40,apad=pad_dur=0.04',
        '-ar',
        '48000',
        '-ac',
        '1',
        '-c:a',
        'pcm_s16le',
        wav,
      ])
      if (run.status !== 0) throw new Error(String(run.stderr))
      spawnSync('rm', ['-f', raw])
    }
    peakTo(wav, -1)
    manifest.push({
      ...line,
      file: `voice/lines/${line.id}.wav`,
      seconds: +seconds(wav).toFixed(3),
    })
  }
  writeFileSync(
    join(ROOT, 'voice', 'lines.json'),
    `${JSON.stringify(
      { voice: 'kokoro af_heart', speed: Number(process.env.VOICE_SPEED ?? 1.0), lines: manifest },
      null,
      2,
    )}\n`,
  )
  const total = manifest.reduce((a, l) => a + (l.seconds as number), 0)
  process.stdout.write(`${manifest.length} lines, ${total.toFixed(1)} s of voice\n`)
}
