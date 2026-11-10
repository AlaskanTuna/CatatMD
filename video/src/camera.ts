// The v2 camera (REVISION-2 §5): every app segment rests on the full window at 100%; a focus eases in on cue, holds
// while the line names it, and eases back to 100%. Pure data and checks, shared by the renderer and the pre-render
// checks. Any rule broken here throws, so a bad cut fails the render instead of shipping.
import type { Box } from './motion/ease'

export type View = { x: number; y: number; z: number }
export const REST: View = { x: 960, y: 540, z: 1 }
/** A camera key: arrive at `view` at time `at`, having moved for `move` seconds. */
export type Key = View & { at: number; move: number }

export type FocusSpec = {
  /** Seconds into the segment when the target is ready (a cue's moment through the time remap, or explicit). */
  cueAt: number
  box: Box
  /** Seconds held at the focus after the move lands. */
  hold: number
  z?: number
  /** 0.8 to 1.0 s. */
  move?: number
  /** Go straight to this focus from the previous one, without passing through 100% (close targets only). */
  pan?: boolean
}

export const MOVE = { min: 0.8, max: 1.0, default: 0.9, lead: 0.3 }
const RAMP = 0.2 // a ring's own fade, in and out (Marks.tsx: 6 frames)

/** The zoom that frames a box comfortably: small targets get 120%, panes stay near 100%. */
export function fitZoom(b: Box) {
  return Math.min(1.2, Math.max(1, Math.min((0.55 * 1920) / b.width, (0.55 * 1080) / b.height)))
}
const centre = (b: Box) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })

/** The visible window for a view, clamped inside the take. */
export function window(v: View) {
  const w = 1920 / v.z
  const h = 1080 / v.z
  const left = Math.min(1920 - w, Math.max(0, v.x - w / 2))
  const top = Math.min(1080 - h, Math.max(0, v.y - h / 2))
  return { left, top, w, h }
}

export type Plan = { keys: Key[]; moves: [number, number][] }

/** Turns a segment's focuses into camera keys, checking every §5 rule. */
export function plan(segId: string, dur: number, focuses: FocusSpec[]): Plan {
  const keys: Key[] = [{ ...REST, at: 0, move: 0 }]
  const moves: [number, number][] = []
  let cur: View = REST
  let free = 0 // the earliest time the next move may start
  focuses.forEach((f, i) => {
    const move = f.move ?? MOVE.default
    if (move < MOVE.min || move > MOVE.max)
      throw new Error(`${segId} focus ${i + 1}: move ${move} s is outside 0.8 to 1.0 s`)
    const z = f.z ?? fitZoom(f.box)
    if (z < 1 || z > 1.2)
      throw new Error(`${segId} focus ${i + 1}: zoom ${z} is outside 100% to 120%`)
    const target = { ...centre(f.box), z }
    const start = f.cueAt - MOVE.lead
    if (f.pan) {
      if (i === 0 || cur.z === 1)
        throw new Error(`${segId} focus ${i + 1}: a pan needs a zoomed focus before it`)
      if (Math.abs(target.z - cur.z) > 1e-6)
        throw new Error(`${segId} focus ${i + 1}: a pan must keep the same zoom`)
      if (Math.abs(target.x - cur.x) > 1920 / z || Math.abs(target.y - cur.y) > 1080 / z)
        throw new Error(
          `${segId} focus ${i + 1}: a pan target more than one screen away must return to 100% first`,
        )
    } else if (cur.z !== 1) {
      // Back to rest first, as soon as the previous hold ends.
      keys.push({ ...REST, at: free + move, move })
      moves.push([free, free + move])
      free += move
      cur = REST
    }
    if (start < free - 1e-6)
      throw new Error(
        `${segId} focus ${i + 1}: its move starts at ${start.toFixed(2)} s, before the camera is free at ${free.toFixed(2)} s`,
      )
    keys.push({ ...target, at: start + move, move })
    moves.push([start, start + move])
    cur = target
    free = start + move + f.hold
  })
  if (cur.z !== 1) {
    const move = MOVE.default
    keys.push({ ...REST, at: free + move, move })
    moves.push([free, free + move])
    free += move
  }
  if (free > dur + 1e-6)
    throw new Error(
      `${segId}: the camera is still moving at ${free.toFixed(2)} s, past the segment's end (${dur} s)`,
    )
  return { keys, moves }
}

/** The view at segment time t: holds each key, easing into the next over its `move`. */
export function viewAt(keys: Key[], t: number, ease: (p: number) => number): View {
  let cur: View = keys[0]
  for (const k of keys.slice(1)) {
    if (t >= k.at) {
      cur = k
      continue
    }
    if (t > k.at - k.move) {
      const p = ease((t - (k.at - k.move)) / k.move)
      return {
        x: cur.x + (k.x - cur.x) * p,
        y: cur.y + (k.y - cur.y) * p,
        z: cur.z + (k.z - cur.z) * p,
      }
    }
    break
  }
  return cur
}

/** No drift: the camera may not move while a ring fades in or out. */
export function checkNoDrift(
  segId: string,
  moves: [number, number][],
  marks: { at: number; to: number; label: string }[],
) {
  for (const m of marks)
    for (const [a, b] of moves)
      for (const [r0, r1] of [
        [m.at, m.at + RAMP],
        [m.to - RAMP, m.to],
      ] as const)
        if (r0 < b - 1e-6 && r1 > a + 1e-6)
          throw new Error(
            `${segId} ${m.label}: the camera moves (${a.toFixed(2)} to ${b.toFixed(2)} s) while the mark fades (${r0.toFixed(2)} to ${r1.toFixed(2)} s)`,
          )
}
