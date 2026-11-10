import { Easing, interpolate } from 'remotion'

export const FPS = 30
export const sec = (s: number) => Math.round(s * FPS)
/** Calm in-out for camera moves; out-quart for UI-scale entrances (DESIGN.md: ease-out-quart, 150 to 250 ms). */
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1)
export const EASE_OUT = Easing.bezier(0.25, 1, 0.5, 1)
export const ramp = (t: number, from: number, to: number, easing = EASE_IN_OUT) =>
  interpolate(t, [from, to], [0, 1], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
/** 0 to 1 over `fin` frames from `from`, back to 0 over `fout` frames ending at `to`. */
export const inOut = (f: number, from: number, to: number, fin = 6, fout = 6) =>
  Math.min(ramp(f, from, from + fin, EASE_OUT), 1 - ramp(f, to - fout, to, EASE_OUT))
export type Box = { x: number; y: number; width: number; height: number }
