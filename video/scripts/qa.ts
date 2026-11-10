// Checks the deliverables against BRIEF §1 and prints the evidence: ffprobe, loudness, true peak, sizes.
import { spawnSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { must } from '../src/must'

const [video, srt, poster] = process.argv.slice(2) as [string, string, string]
const run = (cmd: string, args: string[]) => spawnSync(cmd, args, { encoding: 'utf8' })
type Stream = {
  codec_type: string
  codec_name: string
  profile?: string
  width?: number
  height?: number
  r_frame_rate?: string
  pix_fmt?: string
  sample_rate?: string
  channels?: number
  bit_rate?: string
}
const probe: { streams: Stream[]; format: { duration: string } } = JSON.parse(
  run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', video]).stdout,
)
const v = must(
  probe.streams.find((s) => s.codec_type === 'video'),
  'a video stream',
)
const a = must(
  probe.streams.find((s) => s.codec_type === 'audio'),
  'an audio stream',
)
const ebur = run('ffmpeg', [
  '-hide_banner',
  '-nostats',
  '-i',
  video,
  '-vn',
  '-af',
  'ebur128=peak=true',
  '-f',
  'null',
  '-',
]).stderr
const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(ebur.split('Summary:')[1] ?? '')?.[1])
const TP = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(ebur.split('True peak:')[1] ?? '')?.[1])
const mb = statSync(video).size / 1e6
const faststart = (() => {
  const head = readFileSync(video)
    .subarray(0, 64 * 1024)
    .toString('latin1')
  return (
    head.indexOf('moov') >= 0 &&
    head.indexOf('moov') < (head.indexOf('mdat') < 0 ? Infinity : head.indexOf('mdat'))
  )
})()
const checks: [string, boolean, string][] = [
  ['1920×1080', v.width === 1920 && v.height === 1080, `${v.width}×${v.height}`],
  ['30 fps', v.r_frame_rate === '30/1', String(v.r_frame_rate)],
  ['H.264 High', v.codec_name === 'h264' && v.profile === 'High', `${v.codec_name} ${v.profile}`],
  ['yuv420p', v.pix_fmt === 'yuv420p', String(v.pix_fmt)],
  ['+faststart', faststart, faststart ? 'moov before mdat' : 'moov after mdat'],
  [
    'AAC 48 kHz stereo',
    a.codec_name === 'aac' && a.sample_rate === '48000' && a.channels === 2,
    `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch`,
  ],
  [
    'AAC 128 to 160 kbps',
    Number(a.bit_rate) >= 120000 && Number(a.bit_rate) <= 168000,
    `${Math.round(Number(a.bit_rate) / 1000)} kbps`,
  ],
  ['−14 LUFS ±0.5', Math.abs(I + 14) <= 0.5, `${I} LUFS`],
  ['true peak ≤ −1.5 dBTP', TP <= -1.5, `${TP} dBTP`],
  // v2: REVISION-2 §2 (2:45 and 25 MB), with the Director's 3:30 cap after rough 1.
  [
    'length 2:45 to 3:30',
    Number(probe.format.duration) >= 165 && Number(probe.format.duration) <= 210,
    `${Number(probe.format.duration).toFixed(2)} s`,
  ],
  ['size ≤ 25 MB', mb <= 25, `${mb.toFixed(2)} MB`],
  [
    'poster ≤ 300 KB',
    statSync(poster).size <= 307200,
    `${(statSync(poster).size / 1024).toFixed(0)} KB`,
  ],
  [
    'srt present',
    statSync(srt).size > 0,
    `${readFileSync(srt, 'utf8').split('\n\n').filter(Boolean).length} cues`,
  ],
]
for (const [name, ok, got] of checks)
  process.stdout.write(`${ok ? 'pass' : 'FAIL'}  ${name.padEnd(22)} ${got}\n`)
process.exit(checks.every((c) => c[1]) ? 0 : 1)
