// Generates the film's five sound effects with ElevenLabs sound generation, then trims and levels them.
// Each lands in public/sfx/<id>.wav (48 kHz mono, peak -3 dBFS, 10 ms fade-in) and public/sound-manifest.json lists
// them with the music bed. Usage: ELEVENLABS_API_KEY=... bun sound/make-sfx.ts [id...]
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

const KEY = process.env.ELEVENLABS_API_KEY
if (!KEY) throw new Error('ELEVENLABS_API_KEY is not set')
const SFX: Record<string, { text: string; seconds: number }> = {
  click: {
    text: 'A single soft, subtle UI click on a laptop trackpad. Very short, clean, close, dry, no reverb, no music.',
    seconds: 0.5,
  },
  captureStart: {
    text: 'Two quick, soft, high-pitched electronic beeps rising in pitch, like a phone app starting to record. Bright, clean, short, no bass, no music.',
    seconds: 0.8,
  },
  analysisChime: {
    text: 'A soft, pleasant single notification chime, one glassy bell tone with a short calm decay. Clean, minimal, no music.',
    seconds: 1.2,
  },
  approveChime: {
    text: 'Two quick ascending bright marimba notes, a pleasant, satisfying success chime when a task is completed. Clear mid and high tones, clean, short ring, no bass, no music.',
    seconds: 1.3,
  },
  paperSlide: {
    text: 'A short, soft sound of a single sheet of paper sliding out of a printer tray. Subtle, close, dry, no music.',
    seconds: 0.8,
  },
}
const only = process.argv.slice(2)
mkdirSync('public/sfx', { recursive: true })
mkdirSync('.state/sfx', { recursive: true })
const run = (cmd: string, args: string[]) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`${cmd} failed: ${r.stderr.slice(-400)}`)
  return r.stdout + r.stderr
}
for (const [id, s] of Object.entries(SFX)) {
  if (only.length && !only.includes(id)) continue
  const raw = `.state/sfx/${id}.mp3`
  const res = await fetch(
    'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',
    {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ text: s.text, duration_seconds: s.seconds, prompt_influence: 0.8 }),
    },
  )
  if (!res.ok)
    throw new Error(`${id}: ElevenLabs ${res.status} ${(await res.text()).slice(0, 200)}`)
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()))
  // Trim leading silence, measure the peak, set it to -3 dBFS, and fade the first 10 ms so it never clicks.
  const trimmed = `.state/sfx/${id}.trim.wav`
  run('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-i',
    raw,
    '-af',
    'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse',
    '-ac',
    '1',
    '-ar',
    '48000',
    trimmed,
  ])
  const peak = Number(
    /max_volume: (-?[\d.]+) dB/.exec(
      run('ffmpeg', ['-hide_banner', '-i', trimmed, '-af', 'volumedetect', '-f', 'null', '-']),
    )?.[1],
  )
  run('ffmpeg', [
    '-v',
    'error',
    '-y',
    '-i',
    trimmed,
    '-af',
    `volume=${(-3 - peak).toFixed(2)}dB,afade=t=in:d=0.01`,
    '-c:a',
    'pcm_s16le',
    `public/sfx/${id}.wav`,
  ])
  process.stdout.write(`${id}: done\n`)
}
const probe = (f: string) =>
  Number(
    run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim(),
  )
const lufs = (f: string) =>
  Number(
    /I:\s+(-?[\d.]+) LUFS/.exec(
      run('ffmpeg', [
        '-hide_banner',
        '-nostats',
        '-i',
        f,
        '-af',
        'apad=pad_dur=2,ebur128',
        '-f',
        'null',
        '-',
      ]).split('Summary:')[1] ?? '',
    )?.[1],
  )
const manifest = {
  note: 'Director-owned. Paths are relative to public/. Music: "Goodbye Halflight", track 2 of the user\'s AI-generated, non-copyright lofi suite. Sound effects: generated with ElevenLabs sound generation for this film.',
  music: {
    file: 'music/goodbye-halflight.mp3',
    cutIn: 0,
    seconds: +probe('public/music/goodbye-halflight.mp3').toFixed(2),
    lufs: -14.9,
    bpm: 78.3,
  },
  sfx: Object.fromEntries(
    Object.keys(SFX)
      .filter((id) => existsSync(`public/sfx/${id}.wav`))
      .map((id) => [
        id,
        {
          file: `sfx/${id}.wav`,
          seconds: +probe(`public/sfx/${id}.wav`).toFixed(3),
          lufs: lufs(`public/sfx/${id}.wav`),
          peakDbfs: -3,
        },
      ]),
  ),
}
writeFileSync('public/sound-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`)
process.stdout.write(`${JSON.stringify(manifest.sfx)}\n`)
