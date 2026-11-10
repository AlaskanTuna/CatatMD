// Measures how far the on-screen live text trails the audio, from a take's text log (record/run.ts startTextLog)
// and the WAV's word timings (faster-whisper). For every update, the newest word on screen is matched to its spoken
// occurrence; lag = when it showed minus when it finished being said. A negative lag would be a word on screen before
// it was heard. Usage: bun scripts/stream-lag.ts <run> <shot> <words.json> <wavAt> [offset]
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { must } from '../src/must'

const ROOT = resolve(import.meta.dirname, '..')
const [run, shot, wordsFile, wavAtArg, offsetArg] = process.argv.slice(2) as [
  string,
  string,
  string,
  string,
  string?,
]
const wavAt = Number(wavAtArg)
const offset = Number(offsetArg ?? 0)
const dir = join(resolve(process.env.FOOTAGE_DIR ?? join(ROOT, 'footage')), 'runs', run)
const { anchor, log } = JSON.parse(readFileSync(join(dir, `${shot}-text.json`), 'utf8')) as {
  anchor: { cue: string; wall: number }
  log: [number, string][]
}
const take = must(
  (
    JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) as {
      takes: { shot: string; status: string; cues: { id: string; tMs: number }[] }[]
    }
  ).takes
    .filter((t) => t.shot === shot && t.status.startsWith('ok'))
    .at(-1),
  `an ok ${shot} take in ${run}`,
)
const anchorT =
  must(
    take.cues.find((c) => c.id === anchor.cue),
    `cue ${anchor.cue}`,
  ).tMs / 1000
const words = (
  JSON.parse(readFileSync(wordsFile, 'utf8')) as { w: string; s: number; e: number }[]
).map((w) => ({ ...w, n: norm(w.w) }))

function norm(w: string) {
  return w.toLowerCase().replace(/[^a-z0-9]/g, '')
}
/** The text of the bubble being written: the conversation's last line (S3), or the whole box (S6). */
function current(text: string) {
  if (shot === 'S6') return text.trim()
  const block = text.split('Stop and Finish')[1]?.split('Speakers are numbered')[0] ?? ''
  const lines = block
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^Speaker \d+$/.test(l) && !/^\d+:\d\d$/.test(l))
  return lines.at(-1) ?? ''
}

const rows: { t: number; word: string; lag: number }[] = []
let prev = ''
for (const [wall, text] of log) {
  const cur = current(text)
  // Interim growth only (the bubble extends what it showed): finals rewrite text after the phrase ends.
  if (
    cur &&
    cur !== prev &&
    (!process.env.INTERIM_ONLY ||
      (cur.startsWith(prev.replace(/[.,?!]+$/, '')) && cur.length > prev.length))
  ) {
    const last = cur.split(/\s+/).map(norm).filter(Boolean).at(-1)
    // The audio time this frame shows: the picture's take time, minus where the WAV starts, minus the edit's offset.
    const tWav = anchorT + (wall - anchor.wall) / 1000 - wavAt - offset
    if (last) {
      // The latest spoken occurrence that had started by then (a later one cannot be what is showing).
      const said = words.filter((w) => w.n === last && w.s <= tWav + 0.5).at(-1)
      if (said) rows.push({ t: tWav, word: last, lag: tWav - said.e })
    }
  }
  prev = cur
}
rows.sort((a, b) => a.lag - b.lag)
const lags = rows.map((r) => r.lag)
const median = lags[Math.floor(lags.length / 2)]
process.stdout.write(
  `${shot}: ${rows.length} matched updates; lag min ${lags[0].toFixed(2)} s, median ${median.toFixed(2)} s (wavAt ${wavAt}, offset ${offset})\n`,
)
process.stdout.write(
  `smallest: ${rows
    .slice(0, 6)
    .map((r) => `${r.word}@${r.t.toFixed(2)}:${r.lag.toFixed(2)}`)
    .join('  ')}\n`,
)
