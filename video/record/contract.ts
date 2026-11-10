// The recording contract: cue ids from shots.json, cue times in ms from the take's first video frame, boxes in CSS px
// of the 1920×1080 viewport at DSF 1 (1 CSS px = 1 video px).
// Env: APP_URL (the app to film, default the local stack), FOOTAGE_DIR (where takes land, default ./footage),
// CATATMD_RUN_ID (a run's folder name), CATATMD_RECORD_CHECK=1 (a check run, with a still per cue).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

export type Box = { x: number; y: number; width: number; height: number }
export type Cue = { id: string; tMs: number; box: Box | null; still?: string }
export type Take = {
  shot: string
  take: number
  status: 'ok' | 'ok-deviation' | 'failed'
  mode: 'check' | 'record'
  file: string | null
  durationMs: number
  fps: number
  cues: Cue[]
  audioIn?: { file: string; startMs: number | null }
  /** On-camera clicks, for placing the UI click sound in the edit. */
  clicks?: { id: string; tMs: number }[]
  note?: string
}
export type Manifest = {
  runId: string
  mode: 'check' | 'record'
  target: string
  browser: string
  takes: Take[]
}

type Shot = { id: string; target_s: number; cues: string[] }
type Shots = {
  film_patient: { name: string; nric: string; age: number; gender: string }
  shots: Shot[]
}

export const ROOT = resolve(import.meta.dirname, '..')
export const SHOTS: Shots = JSON.parse(readFileSync(join(ROOT, 'shots.json'), 'utf8'))
export const BASE = process.env.APP_URL ?? 'http://localhost:4173'
export const FOOTAGE_DIR = resolve(process.env.FOOTAGE_DIR ?? join(ROOT, 'footage'))
export const CHECK = process.env.CATATMD_RECORD_CHECK === '1'

export function shot(id: string): Shot {
  const found = SHOTS.shots.find((s) => s.id === id)
  if (!found) throw new Error(`Shot ${id} is not in shots.json`)
  return found
}

const stamp = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kuala_Lumpur',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
  .formatToParts(new Date())
  .reduce<Record<string, string>>((p, x) => Object.assign(p, { [x.type]: x.value }), {})
export const RUN_ID =
  process.env.CATATMD_RUN_ID ??
  `${CHECK ? 'check' : 'rec'}-${stamp.year}${stamp.month}${stamp.day}-${stamp.hour}${stamp.minute}`
export const RUN_DIR = join(FOOTAGE_DIR, 'runs', RUN_ID)

/** Ids of the film's own records, so later shots open them by URL and never touch anything else. */
export type FilmState = {
  patientIds: string[]
  consultationIds: string[]
  consultationId?: string
  approved?: boolean
  probeConsultationId?: string
  v2ConsultationId?: string
  v3ConsultationId?: string
}
const STATE = join(ROOT, '.state', 'film.json')
export function filmState(): FilmState {
  return existsSync(STATE)
    ? JSON.parse(readFileSync(STATE, 'utf8'))
    : { patientIds: [], consultationIds: [] }
}
export function saveFilmState(update: Partial<FilmState>): FilmState {
  const next = { ...filmState(), ...update }
  mkdirSync(join(ROOT, '.state'), { recursive: true })
  writeFileSync(STATE, `${JSON.stringify(next, null, 2)}\n`)
  return next
}
/** The guest session, one per origin: a cookie for the live app does not sign in to the local stack. */
export const GUEST_STATE = join(
  ROOT,
  '.state',
  `guest-${new URL(BASE).host.replace(/[^a-z0-9]+/gi, '-')}.json`,
)
