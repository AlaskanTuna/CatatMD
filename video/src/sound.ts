// The film's sound bed and effects (REVISION-2 §7), as data. The Director supplies the files (public/music,
// public/sfx) and their manifests; scripts/sound.ts turns those into src/data/sound.json. With no files, this is silent.

import footageJson from './data/footage.json'
import soundJson from './data/sound.json'
import { line, PLACED, type Segment, type ShotId } from './edit'

type SoundConfig = {
  music?: { src: string; from: number; seconds: number; bedDb: number }
  /** Each effect's file and its gain, set by scripts/sound.ts to sit about 18 dB under the voice. */
  sfx: Partial<Record<SfxKind, { src: string; gainDb: number }>>
  sfxDb: number
}
export type SfxKind = 'click' | 'captureStart' | 'analysisChime' | 'approveChime' | 'paperSlide'
export const SOUND = soundJson as unknown as SoundConfig
const db = (d: number) => 10 ** (d / 20)

/** Clicks with their own sound; every other logged click gets the soft UI click. */
const SPECIAL: Record<string, SfxKind> = {
  'start-ambient': 'captureStart',
  'confirm-approval': 'approveChime',
  export: 'paperSlide',
}
/** Cues that sound without a click: "Analysis complete". */
const CUE_SOUNDS: { shot: ShotId; cue: string; kind: SfxKind; lead: number }[] = [
  { shot: 'S4', cue: 'analysis-done', kind: 'analysisChime', lead: 1.0 },
]

type Clicks = Record<
  string,
  { clicks?: { id: string; t: number }[]; cues: Record<string, { t: number }> }
>
const shots = (footageJson as unknown as { shots: Clicks }).shots

/** Seconds into the segment that show take time t of shot, if the cut shows it. */
function segTime(seg: Segment, shot: ShotId, t: number): number | null {
  let start = 0
  for (const c of seg.clips ?? []) {
    const rate = c.rate ?? 1
    if ((c.shot ?? seg.shot) === shot && t >= c.src && t < c.src + c.dur * rate)
      return start + (t - c.src) / rate
    start += c.dur
  }
  return null
}

export type SfxEvent = { at: number; kind: SfxKind; src: string; volume: number }
export const SFX: SfxEvent[] = PLACED.flatMap(({ seg, from }) => {
  if (!seg.clips) return []
  const out: SfxEvent[] = []
  const seen = new Set<ShotId>([
    ...(seg.shot ? [seg.shot] : []),
    ...seg.clips.map((c) => c.shot).filter((s): s is ShotId => Boolean(s)),
  ])
  for (const shot of seen) {
    for (const c of shots[shot]?.clicks ?? []) {
      const at = segTime(seg, shot, c.t)
      const kind = SPECIAL[c.id] ?? 'click'
      const fx = SOUND.sfx[kind]
      if (at !== null && fx) out.push({ at: from + at, kind, src: fx.src, volume: db(fx.gainDb) })
    }
    for (const s of CUE_SOUNDS.filter((x) => x.shot === shot)) {
      const cue = shots[shot]?.cues[s.cue]
      const at = cue ? segTime(seg, shot, cue.t - s.lead) : null
      const fx = SOUND.sfx[s.kind]
      if (at !== null && fx)
        out.push({ at: from + at, kind: s.kind, src: fx.src, volume: db(fx.gainDb) })
    }
  }
  return out
})

/** Film-second spans where someone speaks: every narration line, and the consultation where it is heard. */
const VOICE = PLACED.flatMap(({ seg, from }) =>
  seg.lines.map((l) => [from + l.at, from + l.at + line(l.id).seconds] as const),
)
const DIALOGUE = PLACED.flatMap(({ seg, from }) =>
  (seg.sounds ?? [])
    .filter((s) => s.volume >= 0.5)
    .map((s) => [from + s.at, from + s.at + s.dur] as const),
)
const CARDS = PLACED.filter(({ seg }) => seg.graphic === 'title' || seg.graphic === 'end').map(
  ({ seg, from }) => [from, from + seg.dur] as const,
)
const FILM = PLACED.reduce((n, p) => n + p.seg.dur, 0)

/** How far inside any span t sits, as 0..1 with `ramp` seconds of slope on each edge. */
function inside(spans: readonly (readonly [number, number])[], t: number, ramp: number) {
  let v = 0
  for (const [a, b] of spans)
    v = Math.max(
      v,
      Math.min(1, Math.max(0, Math.min((t - (a - ramp)) / ramp, (b + ramp - t) / ramp))),
    )
  return v
}

/** Music gain at film second t: bed, +6 dB on the cards, −6 dB under the voice, silent under heard dialogue. */
export function musicGain(t: number) {
  if (!SOUND.music) return 0
  const cards = inside(CARDS, t, 0.6)
  const speech = inside(VOICE, t, 0.25)
  const heard = inside(DIALOGUE, t, 0.4)
  const level = SOUND.music.bedDb + 6 * cards - 6 * speech * (1 - cards * 0.5)
  const ends = Math.min(1, t / 1.5, (FILM - t) / 2.5)
  return db(level) * (1 - heard) * Math.max(0, ends)
}
