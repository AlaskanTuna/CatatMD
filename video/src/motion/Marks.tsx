import { useCurrentFrame } from 'remotion'
import { C } from '../theme'
import { type Box, inOut } from './ease'

/** Accent rounded outline, 200 ms in and out with a 4 px settle, no bounce (DESIGN.md motion). */
export const Ring: React.FC<{ box: Box; pad: number; from: number; to: number }> = ({
  box,
  pad,
  from,
  to,
}) => {
  const f = useCurrentFrame()
  const o = inOut(f, from, to, 6, 6)
  const grow = (1 - o) * 4
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x - pad - grow,
        top: box.y - pad - grow,
        width: box.width + 2 * (pad + grow),
        height: box.height + 2 * (pad + grow),
        border: `3px solid ${C.accent}`,
        borderRadius: 12,
        boxShadow: `0 0 0 6px rgba(19, 106, 81, 0.14), 0 6px 24px rgba(19, 106, 81, 0.18)`,
        opacity: o,
      }}
    />
  )
}

/** A soft spotlight: everything but the box dims to 45% ink, the box keeps a thin accent edge. */
export const Spot: React.FC<{ box: Box; pad: number; from: number; to: number }> = ({
  box,
  pad,
  from,
  to,
}) => {
  const f = useCurrentFrame()
  const o = inOut(f, from, to, 9, 9)
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x - pad,
        top: box.y - pad,
        width: box.width + 2 * pad,
        height: box.height + 2 * pad,
        borderRadius: 14,
        outline: `2px solid rgba(19, 106, 81, ${0.9 * o})`,
        boxShadow: `0 0 0 4000px rgba(29, 34, 31, ${0.42 * o})`,
      }}
    />
  )
}
