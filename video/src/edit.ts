// The cut, as data. Times are seconds: `at` inside a segment, `src` inside a take. Every source time is read off a
// logged cue (src/data/footage.json) plus the check run's small offset between logging a cue and acting on it.

import { checkNoDrift, type FocusSpec, type Plan, plan } from './camera'
import consultJson from './data/consult.timeline.json'
import footageJson from './data/footage.json'
import linesJson from './data/lines.json'
import type { Box } from './motion/ease'
import { must } from './must'

export type ShotId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S7Q' | 'S8' | 'S8R'
type Cue = { t: number; box: Box | null }
export type Take = {
  src: string
  width: number
  height: number
  seconds: number
  staged: number
  cues: Record<string, Cue>
}
const footage = footageJson as unknown as { shots: Record<ShotId, Take> }
export const take = (id: ShotId) => footage.shots[id]
export const cueT = (id: ShotId, cue: string) => {
  const c = footage.shots[id].cues[cue]
  if (!c) throw new Error(`${id} has no cue ${cue}`)
  return c.t
}
export const cueBox = (id: ShotId, cue: string): Box => {
  const c = footage.shots[id].cues[cue]
  if (!c?.box) throw new Error(`${id} cue ${cue} has no box`)
  return c.box
}

export type Line = { id: string; text: string; seconds: number; file: string }
const LINES = Object.fromEntries(
  (linesJson as { lines: Line[] }).lines.map((l) => [l.id, l]),
) as Record<string, Line>
export const line = (id: string) => {
  const l = LINES[id]
  if (!l) throw new Error(`No narration line ${id}`)
  return l
}

/** One played piece of a take: `dur` seconds of output from `src`, at `rate`; `dissolve` crossfades it in. */
export type Clip = { shot?: ShotId; src: number; dur: number; rate?: number; dissolve?: number }
/** A ring (accent outline) or spot (soft dim around it) on a box in take pixels. */
export type Mark = {
  kind: 'ring' | 'spot'
  shot?: ShotId
  cue?: string
  box?: Box
  pad?: number
  /** Explicit segment times, or (with a cue) `len` seconds starting `lead` before the cue's moment in the cut. */
  at?: number
  to?: number
  len?: number
  lead?: number
  /** Its content changes by design while marked (a running timer): the pixel check skips it. */
  live?: boolean
  /**
   * A source time in the mark's take where its target is verifiably on screen: the pixel check compares every frame
   * of the ring against this one. Defaults to its cue's logged moment; a box mark without a cue must set it.
   */
  ref?: number
}
/**
 * A camera focus (REVISION-2 §5): ease in from 100% starting 0.3 s before the cue's moment, hold, ease back out.
 * `at` overrides the cue's moment (segment seconds). `ring` draws a mark on the box once the camera has landed.
 */
export type Focus = {
  cue?: string
  shot?: ShotId
  box?: Box
  at?: number
  hold: number
  z?: number
  move?: number
  pan?: boolean
  ring?: { kind?: 'ring' | 'spot'; pad?: number; live?: boolean }
  /** As Mark.ref: where the ring's target is verifiably on screen, for a box focus. */
  ref?: number
}
export type Sound = {
  src: string
  from: number
  at: number
  dur: number
  volume: number
  fade?: number
}
export type Quote = { at: number; to: number; text: string; who: string }
export type Segment = {
  id: string
  chapter?: 'Capture' | 'Review' | 'Prescribe' | 'Approve'
  dur: number
  graphic?: 'title' | 'deid' | 'end'
  shot?: ShotId
  clips?: Clip[]
  focus?: Focus[]
  /** Filled in below: the camera plan from `focus`. */
  plan?: Plan
  marks?: Mark[]
  lines: { id: string; at: number }[]
  sounds?: Sound[]
  quotes?: Quote[]
}

// Where each WAV starts in its take, read off the app's own clock. The harness logs the Start click, not the moment
// Chromium opens the fake mic: S3's theatre timer and its "Hearing you now" flip put consult.wav 0 at 11.45 s, and
// S6's level meter puts dictation.wav 0 at 12.2 s. v3: the mic opens 0.1 s after the press (Start at 7.4 s, Dictate at
// 11.2 s), so dictation.wav 0 is 11.3 s: its interim line shows each word 0.26 s or more after it is said.
// v3 (draft 4): the stand-in now streams words live, like the product's provider, and opens the mic on the Start
// click, so consult.wav 0 is 7.50 s into S3. That start is measured from the stream itself (scripts/stream-lag.ts:
// the on-screen text logged every 40 ms against faster-whisper word timings): at 7.50 s the earliest words show
// 0.26 s after they are said and none before. The theatre clock starts after "Checking the microphone", 0.75 s late.
// LATENCY_OFFSET (v2's 3.30 s for a per-utterance stand-in) is therefore 0: picture and sound play as filmed.
const LATENCY_OFFSET = 0
type Turn = { speaker: 'doctor' | 'patient'; text: string; start: number; end: number }
const CONSULT = (consultJson as { turns: Turn[] }).turns
const WAV = {
  consult: { at: 7.5 + LATENCY_OFFSET, seconds: 90.72 },
  dictation: { at: 11.3 + LATENCY_OFFSET, seconds: 12.908 },
}
const DICTATION: Turn[] = [
  {
    speaker: 'doctor',
    start: 1.54,
    end: 5.6,
    text: 'Paracetamol, two tablets four times a day for five days.',
  },
  {
    speaker: 'doctor',
    start: 6.2,
    end: 10.84,
    text: 'Benzydamine gargle, 15 mL three times a day for five days.',
  },
]
/** Written forms where the spoken script spells a number out (the bubble on screen shows the digits). */
const WRITTEN: Record<string, string> = {
  'My IC is nine zero zero four one two zero eight six five four three.': 'My IC is 900412086543.',
}
/** A clip whose take audio is heard: the WAV in sync with the picture, and a caption for every turn wholly inside it. */
function heard(
  wav: keyof typeof WAV,
  turns: Turn[],
  segAt: number,
  src: number,
  dur: number,
  until?: number,
  volume = 0.85,
) {
  const w0 = src - WAV[wav].at
  const skip = Math.max(0, -w0)
  const end = Math.min(until ?? w0 + dur, w0 + dur, WAV[wav].seconds)
  const sounds: Sound[] = [
    {
      src: `audio/${wav}.wav`,
      from: w0 + skip,
      at: segAt + skip,
      dur: end - w0 - skip,
      volume,
      fade: 0.3,
    },
  ]
  const quotes: Quote[] = turns
    .filter((t) => t.start >= w0 && t.end <= end)
    .map((t) => ({
      at: Number((segAt + t.start - w0).toFixed(2)),
      to: Number(Math.min(segAt + dur - 0.05, segAt + t.end - w0 + 0.3).toFixed(2)),
      who: t.speaker === 'doctor' ? 'Doctor' : 'Patient',
      text: WRITTEN[t.text] ?? t.text,
    }))
  return { sounds, quotes }
}

// Boxes the takes did not cue, measured off the v2 footage (take pixels).
// S3 theatre, after the flag lands (62.6 s) and Ask Next fills (69.6 s): the URGENT haemoptysis block, and Ask Next
// item 2 (breathlessness). The same boxes as v2.
const THEATRE_FLAG: Box = { x: 1518, y: 154, width: 350, height: 50 }
const ASK_NEXT_2: Box = { x: 1518, y: 310, width: 250, height: 44 }
// S7: the settled Q1 answer bubble (24.5 s on), the Plan section after Apply (59 s on), and its one new line.
// S3: the doctor's first bubble, where turn 1 streams in live (10.3 s to 16.5 s), and the IC bubble once final (26.5 s).
const TURN_1_LIVE: Box = { x: 44, y: 142, width: 590, height: 44 }
const IC_FINAL: Box = { x: 1292, y: 222, width: 186, height: 42 }
// v3: the retake's answer (S7Q, 25 s on), and take 1's Plan after Apply (119 s on) with its one new line.
const CATATAI_ANSWER: Box = { x: 1536, y: 712, width: 308, height: 134 }
const PLAN: Box = { x: 758, y: 778, width: 504, height: 90 }
const PLAN_NEW_LINE: Box = { x: 766, y: 839, width: 296, height: 28 }
// S6: the Prescription Dictation dialog while it listens (12 s to 27 s).
const DICTATION_DIALOG: Box = { x: 576, y: 350, width: 768, height: 380 }

// Turn 1 under the narration (ducked, no caption: its words stream on screen), then turns 2 to 4 heard in full.
const S3_T1 = heard('consult', [], 5.0, 9.0, 6.0, undefined, 0.3)
const S3_B = heard('consult', CONSULT.slice(1, 4), 11.0, 15.0, 17.0, 24.5)
const S3_B2 = heard('consult', CONSULT, 28.0, 41.8, 9.55)
const S6_D1 = heard('dictation', DICTATION, 3.0, 11.4, 16.2)

export const TIMELINE: Segment[] = [
  {
    id: 'S0',
    graphic: 'title',
    dur: 7.5,
    lines: [
      { id: 'S0-1', at: 0.9 },
      { id: 'S0-2', at: 2.6 },
    ],
  },

  {
    id: 'S1',
    shot: 'S1',
    dur: 6.1,
    clips: [
      { src: 0.3, dur: 2.3 },
      { src: 5.5, dur: 3.8, dissolve: 0.3 },
    ],
    marks: [
      { kind: 'ring', cue: 'try-demo', pad: 10, len: 0.7 },
      { kind: 'ring', cue: 'guest-button', pad: 10, len: 0.6 },
    ],
    lines: [{ id: 'S1-1', at: 0.5 }],
  },

  {
    id: 'S2',
    chapter: 'Capture',
    shot: 'S2',
    dur: 8.4,
    clips: [
      { src: 0.6, dur: 5.2, rate: 2.4 },
      // From the rendered profile: src 13.1 to 14.0 is the page's loading skeleton (Director, Checkpoint 3).
      { src: 14.1, dur: 2.0, dissolve: 0.2 },
      { src: 16.1, dur: 1.2 },
    ],
    // Above the profile's Erase card at every moment (it starts at y 979).
    marks: [
      { kind: 'ring', cue: 'register-button', pad: 8, at: 4.15, to: 4.75 },
      { kind: 'ring', cue: 'start-consultation', pad: 8, at: 6.3, to: 6.9 },
    ],
    lines: [{ id: 'S2-1', at: 1.0 }],
  },

  {
    id: 'S3',
    chapter: 'Capture',
    shot: 'S3',
    dur: 50.63,
    clips: [
      // Consent, then Start Ambient Capture (click at 7.4 s); the theatre opens at 8.2 s.
      { src: 1.0, dur: 5.0, rate: 1.6 },
      // One stretch at real speed: turn 1 streams into the doctor's bubble (10.3 s to 16.5 s) under the narration,
      // then turns 2 to 4 are heard; the IC turns final at 26.5 s.
      { src: 9.0, dur: 23.0 },
      // Turns 7 and 8: "Are you coughing anything up?" and the streaks of blood.
      { src: 41.8, dur: 9.55, dissolve: 0.4 },
      // The transcript keeps pace, silent.
      { src: 51.35, dur: 3.62, rate: 3.0 },
      // The live red flag lands at 62.6 s; Ask Next moves down under it.
      { src: 62.2, dur: 3.8 },
      { src: 66.0, dur: 1.36, rate: 2.5 },
      // Ask Next fills in at 69.6 s.
      { src: 69.4, dur: 4.3 },
    ],
    focus: [
      { box: TURN_1_LIVE, at: 6.7, hold: 4.6 },
      { box: IC_FINAL, at: 22.7, hold: 1.8, ring: { pad: 8 }, ref: 30.0 },
      { box: THEATRE_FLAG, at: 42.0, hold: 1.4, ring: { pad: 8 }, ref: 66.0 },
      { box: ASK_NEXT_2, at: 47.3, hold: 1.8, ring: { pad: 8 }, ref: 74.0 },
    ],
    marks: [
      // Ends 0.25 s before the box ticks (3.7 s in the take).
      { kind: 'ring', cue: 'consent-unticked', pad: 8, at: 0.6, to: 1.4 },
      { kind: 'ring', cue: 'start-ambient', pad: 6, at: 2.75, to: 3.7 },
    ],
    lines: [
      { id: 'S3-1', at: 0.3 },
      { id: 'S3-2a', at: 7.4 },
      { id: 'S3-2b', at: 46.5 },
    ],
    sounds: [...S3_T1.sounds, ...S3_B.sounds, ...S3_B2.sounds],
    quotes: [...S3_B.quotes, ...S3_B2.quotes],
  },

  {
    id: 'S4',
    chapter: 'Review',
    shot: 'S4',
    dur: 4.8,
    clips: [{ src: 0.8, dur: 4.8 }],
    marks: [{ kind: 'ring', cue: 'analyse-button', pad: 6, at: 0.9, to: 2.9 }],
    lines: [{ id: 'S4-1', at: 0.8 }],
  },

  {
    id: 'S4g',
    chapter: 'Review',
    graphic: 'deid',
    dur: 11.8,
    lines: [
      { id: 'S4-2', at: 0.6 },
      { id: 'S4-3', at: 5.9 },
    ],
  },

  {
    id: 'S5',
    chapter: 'Review',
    shot: 'S5',
    dur: 34.1,
    clips: [
      // "Analysis complete", then the three panels.
      { shot: 'S4', src: 54.7, dur: 4.4 },
      { src: 4.1, dur: 4.6, dissolve: 0.3 },
      { src: 8.7, dur: 10.0 },
      // The checklist modal: open at 40.1 s, the haemoptysis row's evidence at 45.8 s, closed by about 49.8 s.
      { src: 39.8, dur: 7.11, rate: 1.35, dissolve: 0.3 },
      // A suggestion and its guideline chip (pressed at 57.6 s); the source opens at 59.5 s.
      { src: 52.0, dur: 7.99, dissolve: 0.3 },
    ],
    focus: [
      { cue: 'rule-badge', hold: 1.9, ring: { pad: 5 } },
      { cue: 'ai-candidate', hold: 1.9, pan: true, ring: { pad: 6 } },
      { cue: 'checklist-evidence', hold: 1.2, ring: { pad: 10 } },
    ],
    marks: [
      { kind: 'ring', cue: 'ai-generated-badge', pad: 5, at: 9.6, to: 10.8 },
      { kind: 'ring', cue: 'guideline-chip', pad: 6, at: 29.5, to: 31.4 },
    ],
    lines: [
      { id: 'S5-1', at: 4.7 },
      { id: 'S5-2', at: 11.4 },
      { id: 'S5-3', at: 14.6 },
      { id: 'S5-4', at: 21.3 },
      { id: 'S5-5', at: 26.6 },
    ],
  },

  // CatatAI runs before the prescription, as it was filmed: it cannot see confirmed prescriptions (#478), and its
  // footage shows "0 prescriptions", which would contradict S6 if it came after.
  {
    id: 'S7',
    chapter: 'Review',
    shot: 'S7',
    dur: 27.94,
    clips: [
      // The Q1-only retake (S7Q, take 6): open, Q1 typed and sent (16.7 s), the reply streams and settles by 25 s.
      { shot: 'S7Q', src: 1.2, dur: 3.4 },
      { shot: 'S7Q', src: 4.6, dur: 4.0, rate: 3.05 },
      { shot: 'S7Q', src: 16.8, dur: 3.04, rate: 2.7 },
      { shot: 'S7Q', src: 25.0, dur: 5.0 },
      // Take 1 from its proposal card (landed 109.1 s; Q1 and its cut reply have scrolled away): Apply at 115.2 s.
      { src: 109.3, dur: 6.5, dissolve: 0.4 },
      // The Plan after Apply: "You Edited This", and the doctor's one new line.
      { src: 118.6, dur: 5.0, dissolve: 0.3 },
    ],
    focus: [
      { shot: 'S7Q', box: CATATAI_ANSWER, at: 10.9, hold: 3.0, ring: { pad: 8 }, ref: 28.0 },
      { cue: 'proposal-card', at: 16.2, hold: 2.6, ring: { pad: 8 } },
      { box: PLAN, at: 23.4, hold: 2.6 },
    ],
    marks: [
      { kind: 'ring', shot: 'S7Q', cue: 'open-catatai', pad: 6, at: 1.0, to: 2.75 },
      { kind: 'ring', cue: 'apply', pad: 6, at: 20.35, to: 21.05 },
      { kind: 'ring', box: PLAN_NEW_LINE, pad: 6, at: 24.1, to: 26.5, ref: 120.0 },
      { kind: 'ring', cue: 'plan-edited', pad: 5, at: 24.1, to: 26.5 },
    ],
    lines: [
      { id: 'S7-1', at: 6.6 },
      { id: 'S7-2', at: 18.7 },
    ],
  },

  {
    id: 'S6',
    chapter: 'Prescribe',
    shot: 'S6',
    dur: 28.2,
    clips: [
      // Prescriptions, Add, Dictate (11.2 s).
      { src: 2.4, dur: 3.0, rate: 3.0 },
      // The dictation, heard whole; its words stream into the line under the box from 13.9 s, and each final lands
      // in the box (22.3 s, 27.1 s).
      { src: 11.4, dur: 16.2 },
      // Stop (31.8 s), and the lines parse (33.4 s).
      { src: 27.6, dur: 3.0, rate: 2.4 },
      // Confirm Prescription (40.5 s), saved (41.9 s).
      { src: 34.8, dur: 6.0, rate: 1.6 },
    ],
    focus: [
      // The dictation dialog at 120% while the words stream in.
      { box: DICTATION_DIALOG, at: 3.6, hold: 14.6 },
      { cue: 'parsed-lines', hold: 1.5, z: 1.12 },
    ],
    marks: [
      { kind: 'ring', cue: 'dictate-button', pad: 6, at: 1.9, to: 2.65 },
      { kind: 'ring', cue: 'parsed-fields', pad: 8, at: 22.35, to: 23.5 },
      { kind: 'ring', cue: 'confirm-prescription', pad: 6, at: 24.7, to: 25.45 },
    ],
    lines: [
      { id: 'S6-1', at: 2.7 },
      { id: 'S6-2', at: 20.0 },
    ],
    sounds: S6_D1.sounds,
    quotes: S6_D1.quotes,
  },

  {
    id: 'S8',
    chapter: 'Approve',
    shot: 'S8',
    dur: 22.49,
    // Picture times (S8's log corrected by -3.0 s at ingest): Acknowledge 4.3 s and 8.1 s, Approve Note 12.0 s, the
    // "What approving does" tip 14.0 to 18.4 s, Confirm Approval 18.55 s, the "Note approved" toast 19.6 to 23.2 s,
    // Export 25.1 s.
    clips: [
      { src: 1.0, dur: 3.6 },
      { src: 4.6, dur: 3.4, rate: 2.0 },
      { src: 11.4, dur: 1.4, rate: 2.0 },
      // Slower through the tip, so it reads while the ring is on it.
      { src: 14.2, dur: 3.76, rate: 1.25 },
      // Approved: the toast, then Export.
      { src: 18.9, dur: 5.33, rate: 1.2 },
      { shot: 'S8R', src: 0.8, dur: 5.0, dissolve: 0.4 },
    ],
    // The tip ring: on from 15.8 s to 17.9 s in the take, gone 0.25 s (segment) before the tip closes at 18.4 s.
    focus: [{ cue: 'approve-tip', at: 9.0, hold: 1.8, ring: { pad: 6 } }],
    marks: [
      { kind: 'ring', cue: 'ack-rule', pad: 6, at: 0.9, to: 2.9 },
      { kind: 'ring', cue: 'ack-ai', pad: 6, at: 4.2, to: 5.0 },
      // The toast: on from 19.9 s to 22.7 s in the take; it fades from 23.2 s.
      { kind: 'ring', cue: 'approved-status', pad: 6, at: 13.0, to: 15.3 },
      { kind: 'ring', cue: 'export', pad: 6, at: 15.95, to: 16.7 },
    ],
    lines: [
      { id: 'S8-1', at: 0.3 },
      { id: 'S8-2', at: 5.0 },
      { id: 'S8-3', at: 15.6 },
    ],
  },

  {
    id: 'S9',
    graphic: 'end',
    dur: 6.5,
    lines: [
      { id: 'S9-1', at: 1.0 },
      { id: 'S9-2', at: 2.6 },
    ],
  },
]

/** The segment time at which a take reaches source time `t`, through the clips' time remap. */
export function segTimeOf(seg: Segment, shot: ShotId, t: number): number {
  let start = 0
  for (const c of seg.clips ?? []) {
    const rate = c.rate ?? 1
    if ((c.shot ?? seg.shot) === shot && t >= c.src && t <= c.src + c.dur * rate)
      return start + (t - c.src) / rate
    start += c.dur
  }
  throw new Error(`${seg.id}: ${shot} at ${t.toFixed(2)} s is not in the cut`)
}
for (const seg of TIMELINE)
  for (const m of seg.marks ?? []) {
    if (m.at !== undefined) continue
    const shot = must(m.shot ?? seg.shot, `${seg.id}'s shot`)
    const at =
      segTimeOf(seg, shot, cueT(shot, must(m.cue, `${seg.id} mark's cue`))) - (m.lead ?? 0.2)
    m.at = Number(at.toFixed(2))
    m.to = Number((at + (m.len ?? 1)).toFixed(2))
  }

// Focuses become a camera plan; their rings become marks timed to the landed camera. Every broken rule is collected,
// then thrown together, so one render attempt lists them all.
const RING_IN = 0.05
export const PROBLEMS: string[] = []
const attempt = (f: () => void) => {
  try {
    f()
  } catch (error) {
    PROBLEMS.push(error instanceof Error ? error.message : String(error))
  }
}
for (const seg of TIMELINE) {
  if (!seg.focus) continue
  const specs: FocusSpec[] = seg.focus.map((f) => {
    const shot = must(f.shot ?? seg.shot, `${seg.id}'s shot`)
    const box = f.box ?? cueBox(shot, must(f.cue, `${seg.id} focus cue`))
    const cueAt = f.at ?? segTimeOf(seg, shot, cueT(shot, must(f.cue, `${seg.id} focus cue`)))
    return { cueAt, box, hold: f.hold, z: f.z, move: f.move, pan: f.pan }
  })
  attempt(() => {
    seg.plan = plan(seg.id, seg.dur, specs)
  })
  seg.focus.forEach((f, i) => {
    if (!f.ring) return
    const landed = specs[i].cueAt - 0.3 + (f.move ?? 0.9)
    seg.marks ??= []
    seg.marks.push({
      kind: f.ring.kind ?? 'ring',
      shot: f.shot,
      cue: f.cue,
      box: f.box,
      pad: f.ring.pad,
      live: f.ring.live,
      ref: f.ref,
      at: Number((landed + RING_IN).toFixed(2)),
      to: Number((landed + f.hold - RING_IN).toFixed(2)),
    })
  })
}

/** The source time a segment time shows, and the clip it falls in. */
export function srcAt(seg: Segment, t: number) {
  let start = 0
  const clips = seg.clips ?? []
  for (let i = 0; i < clips.length; i++) {
    const c = clips[i]
    if (t < start + c.dur || i === clips.length - 1)
      return { clip: c, i, start, src: c.src + (t - start) * (c.rate ?? 1) }
    start += c.dur
  }
  throw new Error(`${seg.id} has no clips`)
}

/** Every mark, with the source span the pixel check reads: from its start to 0.25 s past its end. */
export const MARK_SPANS: {
  seg: string
  label: string
  shot: ShotId
  box: Box
  src0: number
  src1: number
  live: boolean
  ref: number | null
}[] = []
const GUARD = 0.25
for (const seg of TIMELINE) {
  if (!seg.clips) continue
  const marks = seg.marks ?? []
  for (const m of marks) {
    const at = must(m.at, `${seg.id} mark start`)
    const to = must(m.to, `${seg.id} mark end`)
    const label = `mark ${m.cue ?? 'box'} ${at}-${to}`
    const a = srcAt(seg, at)
    const b = srcAt(seg, to + GUARD)
    // Marks end at least 0.25 s before their picture changes: the clip may not cut or dissolve under them.
    const next = seg.clips[a.i + 1]?.dissolve ?? 0
    if (a.i !== b.i || to + GUARD > a.start + a.clip.dur - next + 1e-6)
      PROBLEMS.push(
        `${seg.id} ${label}: ends ${(a.start + a.clip.dur - next - to).toFixed(2)} s before its clip changes (needs ${GUARD} s)`,
      )
    const shot = must(m.shot ?? a.clip.shot ?? seg.shot, `${seg.id}'s shot`)
    if (m.cue && (m.shot ?? seg.shot) !== shot)
      PROBLEMS.push(`${seg.id} ${label}: its cue's take is not on screen`)
    const ref = m.ref ?? (m.cue ? cueT(shot, m.cue) : null)
    MARK_SPANS.push({
      seg: seg.id,
      label,
      shot,
      box: m.box ?? cueBox(shot, must(m.cue, `${seg.id} mark cue or box`)),
      src0: a.src,
      src1: b.src,
      live: Boolean(m.live),
      ref,
    })
  }
  const moves = seg.plan?.moves
  if (moves)
    attempt(() =>
      checkNoDrift(
        seg.id,
        moves,
        marks.map((m) => ({
          at: must(m.at, `${seg.id} mark start`),
          to: must(m.to, `${seg.id} mark end`),
          label: `mark ${m.cue ?? 'box'}`,
        })),
      ),
    )
}
if (PROBLEMS.length && !process.env.CATATMD_EDIT_DRAFT)
  throw new Error(`The cut breaks ${PROBLEMS.length} rule(s):\n- ${PROBLEMS.join('\n- ')}`)

/** Each segment's start in the film, in seconds. */
export const PLACED = TIMELINE.reduce<{ seg: Segment; from: number }[]>((acc, seg) => {
  const prev = acc.at(-1)
  acc.push({ seg, from: prev ? prev.from + prev.seg.dur : 0 })
  return acc
}, [])
export const FILM_SECONDS = PLACED.reduce((n, p) => n + p.seg.dur, 0)
