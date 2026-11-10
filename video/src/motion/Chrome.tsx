import { useCurrentFrame } from 'remotion'
import { C, FONT } from '../theme'
import { inOut } from './ease'

/** The always-on tag over every app-footage frame (BRIEF §8). */
export const SyntheticChip: React.FC<{ spans: { from: number; to: number }[] }> = ({ spans }) => {
  const f = useCurrentFrame()
  const s = spans.find((x) => f >= x.from && f < x.to)
  if (!s) return null
  return (
    <div
      style={{
        position: 'absolute',
        left: 28,
        bottom: 28,
        padding: '8px 16px 9px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.94)',
        border: `1px solid ${C.line}`,
        boxShadow: '0 2px 10px rgba(29,34,31,0.10)',
        fontFamily: FONT.body,
        fontSize: 22,
        fontWeight: 600,
        color: C.inkMuted,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: inOut(f, s.from, s.to, 6, 6),
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 99, background: C.accent }} />
      Synthetic demo data
    </div>
  )
}

const ORDER = ['Capture', 'Review', 'Prescribe', 'Approve'] as const

/** A light chapter label, top left: the four acts, the current one in accent. */
export const Hud: React.FC<{
  chapters: { from: number; to: number; name: (typeof ORDER)[number] }[]
}> = ({ chapters }) => {
  const f = useCurrentFrame()
  const cur = chapters.find((c) => f >= c.from && f < c.to)
  if (!cur) return null
  const first = chapters[0].from
  const last = (chapters.at(-1) ?? cur).to
  return (
    <div
      style={{
        position: 'absolute',
        left: 28,
        top: 26,
        display: 'flex',
        gap: 6,
        padding: 6,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.92)',
        border: `1px solid ${C.line}`,
        boxShadow: '0 2px 10px rgba(29,34,31,0.08)',
        opacity: inOut(f, first, last, 9, 9),
      }}
    >
      {ORDER.map((name) => {
        const on = name === cur.name
        return (
          <div
            key={name}
            style={{
              padding: '6px 14px 7px',
              borderRadius: 999,
              fontFamily: FONT.body,
              fontSize: 20,
              fontWeight: on ? 600 : 500,
              color: on ? '#FFFFFF' : C.inkMuted,
              background: on ? C.accent : 'transparent',
            }}
          >
            {name}
          </div>
        )
      })}
    </div>
  )
}
