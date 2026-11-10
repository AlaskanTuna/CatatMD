import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { C, FONT } from '../theme'
import { EASE_OUT, ramp, sec } from './ease'
import { Wordmark } from './Wordmark'

const rise = (f: number, at: number, len = 0.5) => {
  const p = ramp(f, sec(at), sec(at + len), EASE_OUT)
  return { opacity: p, transform: `translateY(${(1 - p) * 10}px)` }
}

/** S0: wordmark and the product's own tagline on the dark ground. */
export const TitleCard: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame()
  const out = 1 - ramp(f, sec(dur - 0.5), sec(dur))
  return (
    <AbsoluteFill
      style={{
        background: C.darkGround,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: out,
      }}
    >
      <div style={{ ...rise(f, 0.3, 0.7) }}>
        <Wordmark height={132} catat="#FFFFFF" box={C.darkAccent} md={C.darkGround} />
      </div>
      <div
        style={{
          ...rise(f, 2.4, 0.6),
          marginTop: 56,
          maxWidth: 1180,
          textAlign: 'center',
          fontFamily: FONT.heading,
          fontWeight: 500,
          fontSize: 50,
          lineHeight: 1.25,
          color: '#E9ECEA',
        }}
      >
        The consultation is already documented. It just needs you to check it.
      </div>
      <div
        style={{
          ...rise(f, 3.4, 0.6),
          marginTop: 28,
          fontFamily: FONT.body,
          fontSize: 26,
          color: '#9AA39E',
          letterSpacing: 0.4,
        }}
      >
        Prototype · adult GP consultations · cough, sore throat and other upper respiratory symptoms
      </div>
    </AbsoluteFill>
  )
}

/** S9: the closing line, the repository and the stack. */
export const EndCard: React.FC<{ dur: number }> = () => {
  const f = useCurrentFrame()
  const fadeIn = ramp(f, 0, sec(0.4))
  return (
    <AbsoluteFill
      style={{
        background: C.darkGround,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeIn,
      }}
    >
      <div style={{ ...rise(f, 0.2, 0.5) }}>
        <Wordmark height={70} catat="#FFFFFF" box={C.darkAccent} md={C.darkGround} />
      </div>
      <div
        style={{
          marginTop: 54,
          fontFamily: FONT.heading,
          fontWeight: 600,
          fontSize: 84,
          lineHeight: 1.1,
          color: '#FFFFFF',
          textAlign: 'center',
        }}
      >
        <span style={{ ...rise(f, 1.0, 0.5), display: 'inline-block' }}>CatatMD drafts.</span>{' '}
        <span style={{ ...rise(f, 2.6, 0.5), display: 'inline-block', color: C.darkAccent }}>
          The doctor decides.
        </span>
      </div>
      <div
        style={{
          ...rise(f, 3.8, 0.6),
          marginTop: 64,
          fontFamily: FONT.body,
          fontSize: 34,
          fontWeight: 500,
          color: '#E9ECEA',
        }}
      >
        github.com/AlaskanTuna/CatatMD
      </div>
      <div
        style={{
          ...rise(f, 4.2, 0.6),
          marginTop: 18,
          fontFamily: FONT.body,
          fontSize: 24,
          color: '#9AA39E',
          letterSpacing: 0.3,
        }}
      >
        React 19 · Express 5 · Postgres · Zod at every boundary · de-identification before every
        model call
      </div>
      <div
        style={{
          ...rise(f, 4.4, 0.6),
          marginTop: 12,
          fontFamily: FONT.body,
          fontSize: 22,
          color: '#7E8782',
        }}
      >
        Every consultation shown is synthetic.
      </div>
    </AbsoluteFill>
  )
}
