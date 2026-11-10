// Pre-render check (REVISION-2 §5, owner review of v3): every ring or spot must sit on its target for its whole span,
// and end at least 0.25 s before that target moves, closes or re-renders. It reads the take itself, 10 frames a second,
// inside each mark's box, from the mark's first frame to 0.25 s past its last, and compares each frame with a
// reference frame where the target is verifiably on screen: the cue's logged moment, or the mark's own `ref`.
// - Presence: the mean-removed correlation with the reference must stay at or above MIN_CORR. A hover tint or a
//   brightness shift keeps it near 1; a tooltip or toast that has closed, or a ring over empty space, drops it.
// - Change: no more than SHARE of the box's pixels may move by more than LEVEL grey levels from the reference.
// A reference is only as good as the take's time map (cue and click times against the picture), so the check first
// matches every logged click in each staged take to the sharpest picture change around it, and fails a take whose
// clicks sit, by median, more than TIMING_MAX seconds from their picture.
// Usage: bun scripts/check-marks.ts   (exit 1 on any failure; CATATMD_EDIT_DRAFT=1 lists rule breaks without throwing)
import { spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import footageJson from '../src/data/footage.json'
import { MARK_SPANS, PROBLEMS, take } from '../src/edit'

const ROOT = resolve(import.meta.dirname, '..')
const LEVEL = 40 // grey levels a pixel must move by to count as changed
const SHARE = 0.25 // share of the box's pixels that may change before it counts as a different element
const MIN_CORR = 0.8 // the lowest correlation with the reference that still counts as the same target
const TIMING_MAX = 1.5 // seconds a take's clicks may sit, by median, from the picture changes they cause

function grey(file: string, ss: number, t: number, crop: string) {
  const run = spawnSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-ss',
      ss.toFixed(3),
      '-t',
      t.toFixed(3),
      '-i',
      file,
      '-vf',
      `${crop}format=gray,fps=10`,
      '-f',
      'rawvideo',
      '-pix_fmt',
      'gray',
      '-',
    ],
    { maxBuffer: 1 << 28 },
  )
  if (run.status !== 0) throw new Error(String(run.stderr))
  return run.stdout
}
function corr(a: Uint8Array, b: Uint8Array) {
  let ma = 0
  let mb = 0
  for (let i = 0; i < a.length; i++) {
    ma += a[i]
    mb += b[i]
  }
  ma /= a.length
  mb /= b.length
  let ab = 0
  let aa = 0
  let bb = 0
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - ma
    const y = b[i] - mb
    ab += x * y
    aa += x * x
    bb += y * y
  }
  // A flat box (no structure) matches only another flat box.
  if (aa < 1e-6 || bb < 1e-6) return aa < 1e-6 && bb < 1e-6 ? 1 : 0
  return ab / Math.sqrt(aa * bb)
}

let failed = PROBLEMS.length
for (const p of PROBLEMS) process.stdout.write(`FAIL  rule: ${p}\n`)

// 1. Time maps: each logged click against the sharpest whole-frame change in [t - 5, t + 1.5] (160x90, 10 fps).
type Shot = { src: string; clicks?: { id: string; t: number }[] }
const shots = (footageJson as unknown as { shots: Record<string, Shot> }).shots
const used = new Set(MARK_SPANS.map((m) => m.shot as string))
for (const [id, s] of Object.entries(shots)) {
  if (!used.has(id) || !s.clicks?.length) continue
  const raw = grey(join(ROOT, 'public', s.src), 0, 1e6, 'scale=160:90,')
  const N = 160 * 90
  const n = Math.floor(raw.length / N)
  const step = (k: number) => {
    let c = 0
    for (let i = 0; i < N; i++) c += Math.abs(raw[k * N + i] - raw[(k - 1) * N + i])
    return c / N
  }
  const lags = s.clicks.map((c) => {
    let best = 0
    let at = c.t
    for (
      let k = Math.max(1, Math.round((c.t - 5) * 10));
      k < Math.min(n, Math.round((c.t + 1.5) * 10));
      k++
    ) {
      const d = step(k)
      if (d > best) {
        best = d
        at = k / 10
      }
    }
    return c.t - at
  })
  const median = [...lags].sort((a, b) => a - b)[Math.floor(lags.length / 2)]
  const ok = Math.abs(median) <= TIMING_MAX
  if (!ok) failed++
  process.stdout.write(
    `${ok ? 'pass' : 'FAIL'}  timing ${id}: clicks sit ${median.toFixed(1)} s from their picture (median of ${lags.length})\n`,
  )
}

// 2. Marks: presence against the reference, and no change, from the first frame to 0.25 s past the last.
for (const m of MARK_SPANS) {
  if (m.live) {
    process.stdout.write(`skip  ${m.seg} ${m.label} (live content)\n`)
    continue
  }
  if (m.ref === null) {
    failed++
    process.stdout.write(
      `FAIL  ${m.seg} ${m.label}: a box mark without a cue needs a ref (a source time where its target shows)\n`,
    )
    continue
  }
  const b = {
    x: Math.max(0, Math.round(m.box.x)),
    y: Math.max(0, Math.round(m.box.y)),
    w: Math.round(m.box.width),
    h: Math.round(m.box.height),
  }
  b.w = Math.min(b.w, 1920 - b.x)
  b.h = Math.min(b.h, 1080 - b.y)
  const file = join(ROOT, 'public', take(m.shot).src)
  const crop = `crop=${b.w}:${b.h}:${b.x}:${b.y},`
  const size = b.w * b.h
  const ref = grey(file, m.ref, 0.1, crop).subarray(0, size)
  const run = grey(file, m.src0, Math.max(0.1, m.src1 - m.src0), crop)
  const frames = Math.floor(run.length / size)
  let low = 1
  let lowAt = m.src0
  let worst = 0
  let worstAt = m.src0
  for (let k = 0; k < frames; k++) {
    const f = run.subarray(k * size, (k + 1) * size)
    const c = corr(ref, f)
    if (c < low) {
      low = c
      lowAt = m.src0 + k / 10
    }
    let changed = 0
    for (let i = 0; i < size; i++) if (Math.abs(f[i] - ref[i]) > LEVEL) changed++
    if (changed / size > worst) {
      worst = changed / size
      worstAt = m.src0 + k / 10
    }
  }
  const present = low >= MIN_CORR
  const steady = worst <= SHARE
  if (!present || !steady) failed++
  const why = [
    !present &&
      `target not on screen (correlation ${low.toFixed(2)} at ${m.shot} ${lowAt.toFixed(1)} s)`,
    !steady && `box changes ${(worst * 100).toFixed(0)}% (at ${m.shot} ${worstAt.toFixed(1)} s)`,
  ].filter(Boolean)
  process.stdout.write(
    `${present && steady ? 'pass' : 'FAIL'}  ${m.seg} ${m.label}: correlation ${low.toFixed(2)} min, ${(worst * 100).toFixed(0)}% changed, vs ${m.shot} ${m.ref.toFixed(1)} s${why.length ? `: ${why.join('; ')}` : ''}\n`,
  )
}
process.stdout.write(
  `${failed ? `${failed} problem(s): fix the cut before rendering` : 'every mark sits on its target and ends before it changes'}\n`,
)
process.exit(failed ? 1 : 0)
