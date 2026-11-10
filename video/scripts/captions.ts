// Writes the sidecar .srt from the edit: one or more cues per narration line (and the dialogue quote).
// Director's rules (Checkpoint 3): at most 2 lines of 42 characters per cue, split at a phrase boundary (",", ":",
// ";") before any other word boundary, never a cue of one or two words, never a cue under 1.2 s, and each cue held
// up to 0.4 s past its speech when the next cue leaves room. Timing is by share of characters within the line.
import { writeFileSync } from 'node:fs'
import { line, PLACED } from '../src/edit'

const out = process.argv[2] ?? `${process.env.OUT_DIR ?? 'out'}/catatmd-walkthrough.srt`
type Cue = { from: number; to: number; text: string }
const raw: Cue[] = PLACED.flatMap(({ seg, from }) => [
  ...seg.lines.map((l) => ({
    from: from + l.at,
    to: from + l.at + line(l.id).seconds,
    text: line(l.id).text,
  })),
  ...(seg.quotes ?? []).map((q) => ({
    from: from + q.at,
    to: from + q.to,
    text: `${q.who}: ${q.text}`,
  })),
]).sort((a, b) => a.from - b.from)

const MAX = 42
const MIN_DUR = 1.2
const HOLD = 0.4

function wrap(text: string): string[] {
  const lines: string[] = []
  let cur = ''
  for (const w of text.split(' ')) {
    if (cur && `${cur} ${w}`.length > MAX) {
      lines.push(cur)
      cur = w
    } else cur = cur ? `${cur} ${w}` : w
  }
  if (cur) lines.push(cur)
  return lines
}
const fits = (t: string) => wrap(t).length <= 2

/** Splits text into chunks that each fit 2 lines, preferring phrase boundaries, then balance, never orphans. */
function chunk(text: string): string[] {
  if (fits(text)) return [text]
  const words = text.split(' ')
  let best = -1
  let bestScore = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ')
    if (!fits(a)) break
    const b = words.slice(i).join(' ')
    const phrase = /[,:;]$/.test(words[i - 1]) ? 0 : 1
    const orphan = i < 3 || words.length - i < 3 ? 1 : 0
    const score = orphan * 10_000 + phrase * 1_000 + Math.abs(a.length - b.length)
    if (score < bestScore) {
      bestScore = score
      best = i
    }
  }
  if (best < 0) throw new Error(`Cannot fit a first chunk of: ${text}`)
  return [words.slice(0, best).join(' '), ...chunk(words.slice(best).join(' '))]
}

const cues: Cue[] = []
for (const c of raw) {
  const parts = chunk(c.text)
  const total = parts.reduce((n, p) => n + p.length, 0)
  let t = c.from
  for (const p of parts) {
    const to = t + (c.to - c.from) * (p.length / total)
    cues.push({ from: t, to, text: wrap(p).join('\n') })
    t = to
  }
}
// Hold each cue a little past its speech, and stretch a short one, without touching the next cue.
for (let i = 0; i < cues.length; i++) {
  const next = cues[i + 1]?.from ?? Infinity
  const c = cues[i]
  c.to = Math.min(next - 0.05, Math.max(c.to + HOLD, c.from + MIN_DUR))
}
const short = cues.filter((c) => c.to - c.from < MIN_DUR)
if (short.length)
  throw new Error(`Cues under ${MIN_DUR} s: ${short.map((c) => JSON.stringify(c.text)).join(', ')}`)

const stamp = (s: number) => {
  const ms = Math.round(s * 1000)
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`
}
writeFileSync(
  out,
  cues.map((c, i) => `${i + 1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${c.text}\n`).join('\n'),
)
const cps = Math.max(...cues.map((c) => c.text.replace(/\n/g, ' ').length / (c.to - c.from)))
process.stdout.write(
  `${cues.length} cues -> ${out} (shortest ${Math.min(...cues.map((c) => c.to - c.from)).toFixed(2)} s, peak ${cps.toFixed(1)} cps)\n`,
)
