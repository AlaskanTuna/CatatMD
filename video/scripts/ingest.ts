// Stages the kept takes for the edit: each WebM becomes a 30 fps CFR H.264 MP4 in public/footage (keyframe every 10
// frames, for exact seeks) with 3 s of its last frame held, and src/data/footage.json lists each take's cues in seconds.
// Takes are read from FOOTAGE_DIR (default ./footage). Usage: bun scripts/ingest.ts [--force] [shot...]: with shots
// named, only those are encoded; a missing MP4 is otherwise encoded, and an existing one kept unless --force.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const FOOTAGE_DIR = resolve(process.env.FOOTAGE_DIR ?? join(ROOT, 'footage'))
const FORCE = process.argv.includes('--force')
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('--'))
/** The takes the film uses (Director-approved), by shot. */
// v3 (10 Nov, streaming stand-in): S1 and S2 reuse the approved v1 takes; S3 to S5 are draft 4 (rec-v3); S7, S6,
// S8 and S8R are draft 4 too.
// A key may stage a second take of a shot under its own name (S7Q: v3's Q1-only retake of S7); `shot` names it.
// `shiftMs` corrects a take whose logged cue and click times sit off its picture (a bad encoder start time): every
// logged time moves by it. scripts/check-marks.ts tests each take's clicks against the picture changes they cause.
export const KEPT: Record<string, { run: string; take: number; shot?: string; shiftMs?: number }> =
  {
    S1: { run: 'check-1', take: 1 },
    S2: { run: 'check-1', take: 1 },
    S3: { run: 'rec-v3', take: 1 },
    S4: { run: 'rec-v3', take: 1 },
    S5: { run: 'rec-v3', take: 1 },
    // S7 take 1's Q1 reply was cut short (#479); take 6 is the Q1-only retake, cut together with take 1 from 108.8 s.
    S7: { run: 'rec-v3', take: 1 },
    S7Q: { run: 'rec-v3', take: 6, shot: 'S7' },
    // S6 take 1's run-on final left both lines needing a decision; take 2 parsed clean.
    S6: { run: 'rec-v3', take: 2 },
    // S8's log runs 3.0 s behind its picture: Confirm Approval is pressed at 18.55 s in the picture (logged 21.55 s),
    // Export at 25.1 s (logged 28.1 s), and the first cue's card is settled by 1.9 s (logged 4.9 s; v2 logged 1.8 s).
    S8: { run: 'rec-v3', take: 1, shiftMs: -3000 },
    S8R: { run: 'rec-v3', take: 1 },
  }

type Cue = {
  id: string
  tMs: number
  box: { x: number; y: number; width: number; height: number } | null
}
type Take = {
  shot: string
  take: number
  status: string
  file: string
  durationMs: number
  cues: Cue[]
  clicks?: { id: string; tMs: number }[]
  audioIn?: { file: string; startMs: number | null }
  note?: string
}

mkdirSync(join(ROOT, 'public', 'footage'), { recursive: true })
const OUT = join(ROOT, 'src', 'data', 'footage.json')
const before = (existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { shots: {} }) as {
  shots: Record<string, { staged?: number }>
}
const out: Record<string, unknown> = {}
for (const [shot, { run, take, shot: source = shot, shiftMs = 0 }] of Object.entries(KEPT)) {
  const manifest = JSON.parse(
    readFileSync(join(FOOTAGE_DIR, 'runs', run, 'manifest.json'), 'utf8'),
  ) as { takes: Take[] }
  const t = manifest.takes.find((x) => x.shot === source && x.take === take)
  if (!t) throw new Error(`${source} take ${take} is not in ${run}`)
  const src = join(FOOTAGE_DIR, 'runs', run, t.file)
  const dest = join(ROOT, 'public', 'footage', `${shot}.mp4`)
  const wanted = ONLY.length ? ONLY.includes(shot) : !existsSync(dest)
  if (wanted && (FORCE || !existsSync(dest))) {
    const run = spawnSync('ffmpeg', [
      '-v',
      'error',
      '-y',
      '-i',
      src,
      '-vf',
      'fps=30,tpad=stop_mode=clone:stop_duration=3',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '14',
      '-g',
      '10',
      '-pix_fmt',
      'yuv420p',
      '-an',
      dest,
    ])
    if (run.status !== 0) throw new Error(String(run.stderr))
  }
  // A take not staged here keeps its last known staged length, so the edit still compiles without its MP4.
  const probe = existsSync(dest)
    ? Number(
        spawnSync(
          'ffprobe',
          ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', dest],
          { encoding: 'utf8' },
        ).stdout.trim(),
      )
    : (before.shots[shot]?.staged ?? t.durationMs / 1000 + 3)
  out[shot] = {
    run,
    take,
    status: t.status,
    note: t.note,
    src: `footage/${shot}.mp4`,
    width: 1920,
    height: 1080,
    seconds: t.durationMs / 1000,
    staged: probe,
    shiftMs: shiftMs || undefined,
    cues: Object.fromEntries(
      t.cues.map((c) => [c.id, { t: (c.tMs + shiftMs) / 1000, box: c.box }]),
    ),
    clicks: (t.clicks ?? []).map((c) => ({ id: c.id, t: (c.tMs + shiftMs) / 1000 })),
    audioIn: t.audioIn
      ? { file: t.audioIn.file, start: ((t.audioIn.startMs ?? 0) + shiftMs) / 1000 }
      : null,
  }
  process.stdout.write(`${shot}: ${(t.durationMs / 1000).toFixed(1)} s, ${t.cues.length} cues\n`)
}
mkdirSync(join(ROOT, 'src', 'data'), { recursive: true })
writeFileSync(OUT, `${JSON.stringify({ shots: out }, null, 2)}\n`)
