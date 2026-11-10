import { useCurrentFrame } from 'remotion'
import { FONT } from '../theme'
import { type Box, inOut, sec } from './ease'

export type Caption = { from: number; to: number; text: string; who?: string }

// REVISION-2 §4: minimal. Work Sans 500 at 30 px on a light ink plate, two lines of about 60 characters at most,
// centred 44 px above the bottom edge. Dialogue gets a muted small-caps speaker label, never italics.
const STYLE = { size: 30, line: 1.3, maxWidth: 960, bottom: 44, plate: 'rgba(10, 13, 11, 0.55)' }
const ZONE = { width: STYLE.maxWidth + 32, height: Math.ceil(2 * STYLE.size * STYLE.line + 16) }

/** Bottom-centre; moves to the top (under the chapter bar) only while a marked element sits beneath it. */
export const Captions: React.FC<{ captions: Caption[]; avoid: (frame: number) => Box[] }> = ({
  captions,
  avoid,
}) => {
  const f = useCurrentFrame()
  const c = captions.find((x) => f >= sec(x.from) && f < sec(x.to) + 4)
  if (!c) return null
  const o = inOut(f, sec(c.from), sec(c.to) + 4, 4, 4)
  const zone = {
    x: (1920 - ZONE.width) / 2,
    y: 1080 - STYLE.bottom - ZONE.height,
    width: ZONE.width,
    height: ZONE.height,
  }
  const clash = avoid(f).some(
    (b) =>
      b.x < zone.x + zone.width &&
      b.x + b.width > zone.x &&
      b.y < zone.y + zone.height &&
      b.y + b.height > zone.y,
  )
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        ...(clash ? { top: 92 } : { bottom: STYLE.bottom }),
        display: 'flex',
        justifyContent: 'center',
        opacity: o,
      }}
    >
      <div
        style={{
          maxWidth: STYLE.maxWidth,
          padding: '8px 16px',
          borderRadius: 10,
          background: STYLE.plate,
          color: '#FFFFFF',
          fontFamily: FONT.body,
          fontWeight: 500,
          fontSize: STYLE.size,
          lineHeight: STYLE.line,
          letterSpacing: 0,
          textAlign: 'center',
        }}
      >
        {c.who ? (
          <span
            style={{
              fontSize: 24,
              fontVariant: 'all-small-caps',
              letterSpacing: 0.6,
              color: 'rgba(255,255,255,0.62)',
              marginRight: 10,
            }}
          >
            {c.who}
          </span>
        ) : null}
        {c.text}
      </div>
    </div>
  )
}
