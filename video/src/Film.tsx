import { Audio, Video } from '@remotion/media'
import type { CSSProperties } from 'react'
import {
  AbsoluteFill,
  Freeze,
  getInputProps,
  Sequence,
  staticFile,
  useCurrentFrame,
} from 'remotion'
import { REST, viewAt } from './camera'
import { type Clip, cueBox, line, type Mark, PLACED, type Segment, type ShotId, take } from './edit'
import { type Caption, Captions } from './motion/Captions'
import { EndCard, TitleCard } from './motion/Cards'
import { Hud, SyntheticChip } from './motion/Chrome'
import { DeidGraphic } from './motion/DeidGraphic'
import { type Box, EASE_IN_OUT, FPS, inOut, sec } from './motion/ease'
import { Ring, Spot } from './motion/Marks'
import { must } from './must'
import { musicGain, SFX, SOUND } from './sound'
import { C, FONT } from './theme'

/** Review-page takes: the transcript below bubble 5 holds merged ILMU turns and must never be in frame. */

type Cam = { S: number; tx: number; ty: number }

/** The framing at segment time t: holds each, easing into the next over its `move`. */
/** Scales the 1920×1080 take around the focus, never past its edges. */
function camera(f: { x: number; y: number; z: number }): Cam {
  const z = Math.min(1.2, Math.max(1, f.z))
  const left = Math.min(1920 - 1920 / z, Math.max(0, f.x - 960 / z))
  const top = Math.min(1080 - 1080 / z, Math.max(0, f.y - 540 / z))
  return { S: z, tx: -left * z, ty: -top * z }
}
const toFrame = (b: Box, { S, tx, ty }: Cam): Box => ({
  x: tx + b.x * S,
  y: ty + b.y * S,
  width: b.width * S,
  height: b.height * S,
})

/** The camera at segment time t: the segment's plan (rest at 100%, focus on cue), or rest. */
function camAt(seg: Segment, t: number): Cam {
  return camera(seg.plan ? viewAt(seg.plan.keys, t, (p) => EASE_IN_OUT(p)) : REST)
}

/** Output-time starts of each clip inside its segment. */
function clipStarts(clips: Clip[]) {
  const starts: number[] = []
  let t = 0
  for (const c of clips) {
    starts.push(t)
    t += c.dur
  }
  return starts
}

function Footage({ shot, clip }: { shot: ShotId; clip: Clip }) {
  const t = take(shot)
  const trim = Math.round(clip.src * FPS)
  const last = Math.floor((t.staged - 0.1) * FPS) - trim
  const rate = clip.rate ?? 1
  const live = Math.max(0, Math.floor(last / rate))
  return (
    <Freeze frame={live} active={(f) => f >= live}>
      <Video
        src={staticFile(t.src)}
        trimBefore={trim}
        playbackRate={rate}
        muted
        style={{ width: 1920, height: 1080 }}
      />
    </Freeze>
  )
}

function SegmentFootage({ seg }: { seg: Segment }) {
  const frame = useCurrentFrame()
  const t = frame / FPS
  const cam = camAt(seg, t)
  const layer: CSSProperties = {
    position: 'absolute',
    width: 1920,
    height: 1080,
    transformOrigin: '0 0',
    transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.S})`,
  }
  const clips = must(seg.clips, `${seg.id} clips`)
  const starts = clipStarts(clips)
  return (
    <>
      {clips.map((c, i) => {
        const from = sec(starts[i] - (c.dissolve ?? 0))
        const to = sec(starts[i] + c.dur)
        const shot = must(c.shot ?? seg.shot, `${seg.id}'s shot`)
        const fadeIn = sec(c.dissolve ?? 0)
        // A dissolving clip starts early, so its source starts early by the same amount.
        const lead = (c.dissolve ?? 0) * (c.rate ?? 1)
        return (
          <Sequence
            key={`${shot}@${c.src}`}
            from={from}
            durationInFrames={to - from}
            name={`${seg.id} clip ${i + 1} (${shot} @${c.src})`}
          >
            <div style={{ ...layer, opacity: fadeIn ? Math.min(1, (frame - from) / fadeIn) : 1 }}>
              <Footage shot={shot} clip={{ ...c, src: Math.max(0, c.src - lead) }} />
            </div>
          </Sequence>
        )
      })}
      {(seg.marks ?? []).map((m) => (
        <MarkView
          key={`${m.kind}:${m.cue ?? 'box'}@${m.at}`}
          mark={m}
          seg={seg}
          cam={cam}
          frame={frame}
        />
      ))}
    </>
  )
}

function markBox(m: Mark, seg: Segment): Box {
  if (m.box) return m.box
  return cueBox(
    must(m.shot ?? seg.shot, `${seg.id}'s shot`),
    must(m.cue, `${seg.id} mark cue or box`),
  )
}

function MarkView({
  mark,
  seg,
  cam,
  frame,
}: {
  mark: Mark
  seg: Segment
  cam: Cam
  frame: number
}) {
  const from = sec(must(mark.at, `${seg.id} mark start`))
  const to = sec(must(mark.to, `${seg.id} mark end`))
  if (frame < from || frame >= to) return null
  const box = toFrame(markBox(mark, seg), cam)
  const pad = (mark.pad ?? 8) * cam.S
  return mark.kind === 'ring' ? (
    <Ring box={box} pad={pad} from={from} to={to} />
  ) : (
    <Spot box={box} pad={pad} from={from} to={to} />
  )
}

function SegmentView({ seg }: { seg: Segment }) {
  if (seg.graphic === 'title') return <TitleCard dur={seg.dur} />
  if (seg.graphic === 'end') return <EndCard dur={seg.dur} />
  if (seg.graphic === 'deid') return <DeidGraphic dur={seg.dur} />
  return <SegmentFootage seg={seg} />
}

/** Boxes on screen at film frame f (for keeping captions off them). */
function marksOnScreen(f: number): Box[] {
  const out: Box[] = []
  for (const { seg, from } of PLACED) {
    const local = f - sec(from)
    if (local < 0 || local >= sec(seg.dur) || seg.graphic) continue
    const cam = camAt(seg, local / FPS)
    for (const m of seg.marks ?? [])
      if (local >= sec(must(m.at, 'mark start')) && local < sec(must(m.to, 'mark end')))
        out.push(toFrame(markBox(m, seg), cam))
  }
  return out
}

// No burned-in caption on the end card: its words are already the card. The sidecar .srt keeps them.
export const CAPTIONS: Caption[] = PLACED.filter(({ seg }) => seg.graphic !== 'end').flatMap(
  ({ seg, from }) => [
    ...seg.lines.map((l) => ({
      from: from + l.at,
      to: from + l.at + line(l.id).seconds,
      text: line(l.id).text,
    })),
    ...(seg.quotes ?? []).map((q) => ({
      from: from + q.at,
      to: from + q.to,
      text: q.text,
      who: q.who,
    })),
  ],
)

const CHAPTERS = PLACED.flatMap(({ seg, from }) =>
  seg.chapter ? [{ from: sec(from), to: sec(from + seg.dur), name: seg.chapter }] : [],
)
const FOOTAGE = PLACED.filter((p) => !p.seg.graphic).map((p) => ({
  from: sec(p.from),
  to: sec(p.from + p.seg.dur),
}))

/** `remotion still --props='{"poster":true}'`: the README poster, with a play badge in place of the captions. */
const POSTER = Boolean((getInputProps() as { poster?: boolean }).poster)

const PlayBadge = () => (
  <AbsoluteFill
    style={{ alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 13, 11, 0.18)' }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        padding: '26px 44px 26px 30px',
        borderRadius: 999,
        background: 'rgba(10, 13, 11, 0.86)',
        boxShadow: '0 16px 60px rgba(10,13,11,0.35)',
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: C.darkAccent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            marginLeft: 8,
            borderTop: '22px solid transparent',
            borderBottom: '22px solid transparent',
            borderLeft: `36px solid ${C.darkGround}`,
          }}
        />
      </div>
      <div
        style={{
          fontFamily: FONT.heading,
          fontSize: 46,
          fontWeight: 600,
          color: '#FFFFFF',
          letterSpacing: -0.3,
        }}
      >
        Watch the walkthrough
      </div>
    </div>
  </AbsoluteFill>
)

export const Film = () => (
  <AbsoluteFill style={{ background: C.ground }}>
    {PLACED.map(({ seg, from }) => (
      <Sequence
        key={seg.id}
        name={seg.id}
        from={sec(from)}
        durationInFrames={sec(seg.dur)}
        premountFor={30}
      >
        <AbsoluteFill style={{ background: C.ground, overflow: 'hidden' }}>
          <SegmentView seg={seg} />
        </AbsoluteFill>
        {seg.lines.map((l) => (
          <Sequence
            key={l.id}
            name={`voice ${l.id}`}
            from={sec(l.at)}
            durationInFrames={sec(line(l.id).seconds) + 2}
            layout="none"
          >
            <Audio src={staticFile(line(l.id).file.replace(/^voice\//, 'voice/'))} />
          </Sequence>
        ))}
        {(seg.sounds ?? []).map((s) => (
          <Sequence
            key={`${s.src}@${s.at}`}
            name={`${seg.id} sound ${s.src} @${s.at}`}
            from={sec(s.at)}
            durationInFrames={sec(s.dur)}
            layout="none"
          >
            <Audio
              src={staticFile(s.src)}
              trimBefore={sec(s.from)}
              volume={(f) =>
                s.volume * inOut(f, 0, sec(s.dur), sec(s.fade ?? 0.2), sec(s.fade ?? 0.2))
              }
            />
          </Sequence>
        ))}
      </Sequence>
    ))}
    {SOUND.music ? (
      <Sequence name="music" from={0} layout="none">
        <Audio
          src={staticFile(SOUND.music.src)}
          trimBefore={sec(SOUND.music.from)}
          volume={(f) => musicGain(f / FPS)}
        />
      </Sequence>
    ) : null}
    {SFX.map((x) => (
      <Sequence
        key={`${x.kind}@${x.at}`}
        name={`sfx ${x.kind}`}
        from={sec(x.at)}
        durationInFrames={sec(4)}
        layout="none"
      >
        <Audio src={staticFile(x.src)} volume={x.volume} />
      </Sequence>
    ))}
    <SyntheticChip spans={FOOTAGE} />
    <Hud chapters={CHAPTERS} />
    {POSTER ? <PlayBadge /> : <Captions captions={CAPTIONS} avoid={marksOnScreen} />}
  </AbsoluteFill>
)
