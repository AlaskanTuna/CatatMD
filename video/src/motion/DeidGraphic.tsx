import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { C, FONT } from '../theme'
import { EASE_IN_OUT, EASE_OUT, ramp, sec } from './ease'

// S4 graphic. The lines and tokens are the film consultation's own, run through backend/src/deid by scripts/gate.ts:
// the patient's "My IC is [NRIC_1]." and the doctor's "Thank you Puan [PATIENT_1]." v3: quoted as draft 4's live
// transcript holds them (footage/runs/rec-v3/S3-transcript.json and S3-gate.json): the IC in digits, no comma.
// It shows text only. Audio is never drawn crossing this boundary.
const NAME = 'Siti'
const IC = '900412086543'
// The vault keeps the span exactly as the transcript has it (deidentify() reverse map, checked offline 9 Nov 2026).

const card: React.CSSProperties = {
  position: 'absolute',
  background: C.surface,
  border: `1px solid ${C.line}`,
  borderRadius: 22,
  boxShadow: '0 10px 40px rgba(29,34,31,0.08)',
}
const label: React.CSSProperties = {
  fontFamily: FONT.body,
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: 1.6,
  textTransform: 'uppercase',
  color: C.inkMuted,
}
const text: React.CSSProperties = {
  fontFamily: FONT.body,
  fontSize: 32,
  lineHeight: 1.45,
  color: C.ink,
}

const Token: React.FC<{ children: string; o?: number }> = ({ children, o = 1 }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '0 10px',
      margin: '0 2px',
      borderRadius: 8,
      background: `rgba(19,106,81,${0.12 * o})`,
      border: `1.5px solid rgba(19,106,81,${0.55 * o})`,
      color: C.accent,
      fontWeight: 600,
      fontVariantNumeric: 'tabular-nums',
    }}
  >
    {children}
  </span>
)

/** A phrase that is real, then becomes its token in place: highlight, then crossfade. */
const Swap: React.FC<{ real: string; token: string; p: number; hi: number }> = ({
  real,
  token,
  p,
  hi,
}) =>
  p < 0.5 ? (
    <span
      style={{
        background: `rgba(19,106,81,${0.16 * hi})`,
        borderRadius: 6,
        padding: '0 3px',
        opacity: 1 - p * 2,
      }}
    >
      {real}
    </span>
  ) : (
    <span style={{ opacity: (p - 0.5) * 2 }}>
      <Token>{token}</Token>
    </span>
  )

export const DeidGraphic: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame()
  const t = f / 30
  const inP = ramp(f, 0, sec(0.5), EASE_OUT)
  const outP = 1 - ramp(f, sec(dur - 0.4), sec(dur))
  const hi = ramp(f, sec(2.4), sec(2.8), EASE_OUT)
  const swap = ramp(f, sec(3.2), sec(3.9), EASE_IN_OUT)
  const vault = ramp(f, sec(4.0), sec(4.5), EASE_OUT)
  const go = ramp(f, sec(6.0), sec(7.0), EASE_IN_OUT)
  const back = ramp(f, sec(8.6), sec(9.6), EASE_IN_OUT)
  const rehydrate = ramp(f, sec(9.8), sec(10.4), EASE_IN_OUT)
  const SERVER = { x: 150, y: 170, w: 760, h: 580 }
  const MODEL = { x: 1170, y: 170, w: 600, h: 580 }
  const travelX = interpolate(go, [0, 1], [SERVER.x + 40, MODEL.x + 40])
  const returnX = interpolate(back, [0, 1], [MODEL.x + 40, SERVER.x + 40])

  return (
    <AbsoluteFill style={{ background: C.ground, opacity: Math.min(inP, outP) }}>
      <div
        style={{
          position: 'absolute',
          top: 64,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT.heading,
          fontSize: 56,
          fontWeight: 600,
          color: C.ink,
        }}
      >
        De-identified before the model
      </div>

      <div style={{ ...card, left: SERVER.x, top: SERVER.y, width: SERVER.w, height: SERVER.h }}>
        <div style={{ ...label, position: 'absolute', left: 40, top: 32 }}>CatatMD server</div>
        <div style={{ position: 'absolute', left: 40, top: 92, width: SERVER.w - 80 }}>
          <div
            style={{ ...label, fontSize: 18, letterSpacing: 1, color: C.accent, marginBottom: 6 }}
          >
            Transcript · patient
          </div>
          <div style={{ ...text, fontSize: 30 }}>
            My IC is <Swap real={IC} token="[NRIC_1]" p={swap} hi={hi} />.
          </div>
          <div
            style={{
              ...label,
              fontSize: 18,
              letterSpacing: 1,
              color: C.accent,
              margin: '14px 0 6px',
            }}
          >
            Transcript · doctor
          </div>
          <div style={{ ...text, fontSize: 30 }}>
            Thank you Puan <Swap real={NAME} token="[PATIENT_1]" p={swap} hi={hi} />.
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 40,
            bottom: 36,
            width: SERVER.w - 80,
            opacity: vault,
            transform: `translateY(${(1 - vault) * 6}px)`,
          }}
        >
          <div style={{ ...label, fontSize: 18, letterSpacing: 1, marginBottom: 12 }}>
            Request vault · stays on the server
          </div>
          {[
            ['[PATIENT_1]', NAME],
            ['[NRIC_1]', IC],
          ].map(([tok, real]) => (
            <div
              key={tok}
              style={{
                ...text,
                fontSize: 26,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginTop: 6,
              }}
            >
              <Token>{tok}</Token>
              <span style={{ color: C.inkMuted }}>→</span>
              <span>{real}</span>
            </div>
          ))}
        </div>
      </div>

      {/* The trust boundary. */}
      <div
        style={{
          position: 'absolute',
          left: 1040,
          top: 160,
          height: 580,
          borderLeft: `3px dashed ${C.accent}`,
          opacity: 0.55,
        }}
      />
      <div
        style={{
          ...label,
          position: 'absolute',
          left: 940,
          top: 752,
          width: 200,
          textAlign: 'center',
          fontSize: 18,
          color: C.accent,
        }}
      >
        Trust boundary
      </div>

      <div
        style={{
          ...card,
          left: MODEL.x,
          top: MODEL.y,
          width: MODEL.w,
          height: MODEL.h,
          background: '#F7F7F5',
        }}
      >
        <div style={{ ...label, position: 'absolute', left: 40, top: 32 }}>Language model</div>
        <div
          style={{
            ...text,
            fontSize: 30,
            position: 'absolute',
            left: 40,
            top: 92,
            width: MODEL.w - 80,
            opacity: ramp(f, sec(6.8), sec(7.2)),
          }}
        >
          My IC is <Token>[NRIC_1]</Token>.
          <br />
          Thank you Puan <Token>[PATIENT_1]</Token>.
        </div>
        <div
          style={{
            ...text,
            fontSize: 24,
            position: 'absolute',
            left: 40,
            top: 230,
            width: MODEL.w - 80,
            color: C.inkMuted,
            opacity: ramp(f, sec(7.4), sec(7.9)),
          }}
        >
          Sees tokens only.
        </div>
      </div>

      {/* Outbound: the tokenised sentence crosses the boundary. */}
      {t >= 6.0 && t < 7.2 ? (
        <div
          style={{
            ...text,
            position: 'absolute',
            left: travelX,
            top: SERVER.y + 250,
            padding: '10px 18px',
            borderRadius: 14,
            background: C.surface,
            border: `1px solid ${C.line}`,
            boxShadow: '0 8px 26px rgba(29,34,31,0.12)',
            fontSize: 26,
            lineHeight: 1.35,
          }}
        >
          My IC is <Token>[NRIC_1]</Token>.
          <br />
          Thank you Puan <Token>[PATIENT_1]</Token>.
        </div>
      ) : null}

      {/* Return trip: the drafted note comes back with its tokens, and the server puts the real details back. */}
      {t >= 8.6 ? (
        <div
          style={{
            ...text,
            position: 'absolute',
            left: returnX,
            top: SERVER.y + 262,
            padding: '10px 18px',
            borderRadius: 14,
            background: C.surface,
            border: `1px solid ${C.line}`,
            boxShadow: '0 8px 26px rgba(29,34,31,0.12)',
            fontSize: 28,
            opacity: t < 9.6 ? 1 : 1 - ramp(f, sec(10.9), sec(11.3)),
          }}
        >
          Clinical note for{' '}
          <Swap real={NAME} token="[PATIENT_1]" p={1 - rehydrate} hi={rehydrate} />
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 812,
          textAlign: 'center',
          fontFamily: FONT.body,
          fontSize: 24,
          color: C.inkMuted,
        }}
      >
        Text is tokenised on the server before any model call.
      </div>
    </AbsoluteFill>
  )
}
