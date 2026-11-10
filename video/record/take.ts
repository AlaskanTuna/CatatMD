// One take: a Playwright screencast of the page with cues logged against the encoder's own clock. A check run
// records too (each billable step runs once, so its take is kept) and also writes one lossless still per cue.

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { expect, type Locator, type Page } from '@playwright/test'
import {
  BASE,
  type Box,
  CHECK,
  type Cue,
  type Manifest,
  RUN_DIR,
  RUN_ID,
  shot as shotSpec,
  type Take,
} from './contract'

export type CueOptions = { box?: Box; clip?: boolean; settle?: boolean }
export type TakeApi = {
  /** Logs a cue once its element is visible, in the viewport and still. */
  cue: (id: string, locator: Locator, options?: CueOptions) => Promise<void>
  skip: (id: string, why: string) => void
  hold: (ms: number) => Promise<void>
  deviation: (note: string) => void
  /** Marks the wall-clock moment the fake microphone opened, so the edit can line up consult.wav. */
  audioStarted: (file: string) => void
  /** Logs an on-camera click at this moment, for the click sound. */
  clicked: (id: string) => void
}

const manifestPath = () => join(RUN_DIR, 'manifest.json')

function saveTake(take: Take, browser: string) {
  mkdirSync(RUN_DIR, { recursive: true })
  const manifest: Manifest = existsSync(manifestPath())
    ? JSON.parse(readFileSync(manifestPath(), 'utf8'))
    : { runId: RUN_ID, mode: CHECK ? 'check' : 'record', target: BASE, browser, takes: [] }
  manifest.takes.push(take)
  writeFileSync(`${manifestPath()}.tmp`, `${JSON.stringify(manifest, null, 2)}\n`)
  renameSync(`${manifestPath()}.tmp`, manifestPath())
}

function nextTake(shot: string): number {
  const raw = join(RUN_DIR, 'raw')
  if (!existsSync(raw)) return 1
  const numbers = readdirSync(raw).map((n) =>
    Number(new RegExp(`^${shot}-take(\\d+)\\.`).exec(n)?.[1] ?? 0),
  )
  return Math.max(0, ...numbers) + 1
}

/** Playwright stamps the encoder's start on the WebM; cue times are measured from it. */
function encoderOrigin(file: string): number {
  const run = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format_tags=creation_time', '-of', 'json', file],
    { encoding: 'utf8' },
  )
  const origin = Date.parse(JSON.parse(run.stdout).format?.tags?.creation_time)
  if (!Number.isFinite(origin)) throw new Error(`No encoder creation time in ${file}`)
  return origin
}

async function settledBox(page: Page, locator: Locator): Promise<Box | null> {
  let last = await locator.boundingBox()
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(120)
    const next = await locator.boundingBox()
    const prev = last
    if (
      prev &&
      next &&
      ['x', 'y', 'width', 'height'].every(
        (k) => Math.abs(prev[k as keyof Box] - next[k as keyof Box]) < 0.5,
      )
    )
      return next
    last = next
  }
  throw new Error('The element kept moving for 3 s')
}

const round = (b: Box): Box => ({
  x: Math.round(b.x),
  y: Math.round(b.y),
  width: Math.round(b.width),
  height: Math.round(b.height),
})
function clip(b: Box): Box {
  const x = Math.max(0, b.x)
  const y = Math.max(0, b.y)
  return round({
    x,
    y,
    width: Math.min(1920, b.x + b.width) - x,
    height: Math.min(1080, b.y + b.height) - y,
  })
}

export async function recordTake(
  page: Page,
  shot: string,
  action: (take: TakeApi) => Promise<void>,
): Promise<Take> {
  const spec = shotSpec(shot)
  const number = nextTake(shot)
  const file = `raw/${shot}-take${number}.webm`
  const cues: Cue[] = []
  const clicks: { id: string; tMs: number }[] = []
  const skipped: string[] = []
  const deviations: string[] = []
  let audioIn: Take['audioIn']
  let audioWall: number | null = null
  let failure: unknown = null
  let started = false
  const browser = `Chromium ${page.context().browser()?.version() ?? '?'} (headless)`
  mkdirSync(join(RUN_DIR, 'raw'), { recursive: true })
  if (CHECK) mkdirSync(join(RUN_DIR, 'stills'), { recursive: true })
  let captureStart = Date.now()

  const api: TakeApi = {
    async cue(id, locator, options = {}) {
      if (!spec.cues.includes(id))
        throw new Error(`Cue ${id} is not one of ${shot}'s cues in shots.json`)
      await expect(locator, `cue ${id}`).toBeVisible()
      await expect(locator, `cue ${id}`).toBeInViewport()
      const measured =
        options.settle === false ? await locator.boundingBox() : await settledBox(page, locator)
      const raw = options.box ?? measured
      const box = raw ? (options.clip ? clip(raw) : round(raw)) : null
      const cue: Cue = { id, tMs: Date.now() - captureStart, box }
      if (CHECK) {
        cue.still = `stills/${shot}-${id}.png`
        await page.screenshot({ path: join(RUN_DIR, cue.still) })
      }
      cues.push(cue)
    },
    skip(id, why) {
      skipped.push(id)
      deviations.push(`${id} skipped: ${why}`)
    },
    hold: (ms) => page.waitForTimeout(ms),
    deviation: (note) => void deviations.push(note),
    clicked(id) {
      clicks.push({ id, tMs: Date.now() - captureStart })
    },
    audioStarted(name) {
      audioWall = Date.now()
      audioIn = { file: name, startMs: null }
    },
  }

  try {
    let firstFrame!: () => void
    const seen = new Promise<void>((r) => (firstFrame = r))
    captureStart = Date.now()
    await page.screencast.start({
      path: join(RUN_DIR, file),
      fps: 30,
      size: { width: 1920, height: 1080 },
      onFrame: () => firstFrame(),
    })
    started = true
    await page.screencast.showActions({ cursor: 'pointer', style: { title: 'display: none' } })
    await Promise.race([
      seen,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('No screencast frame in 15 s')), 15_000),
      ),
    ])
    await action(api)
    const missing = spec.cues.filter(
      (id) => !skipped.includes(id) && !cues.some((c) => c.id === id),
    )
    if (missing.length) throw new Error(`Missing cues: ${missing.join(', ')}`)
  } catch (error) {
    failure = error
  }

  let durationMs = Date.now() - captureStart
  if (started) {
    try {
      await page.screencast.hideActions()
    } catch {
      // The page may have closed after a failure.
    }
    try {
      await page.screencast.stop()
      const offset = captureStart - encoderOrigin(join(RUN_DIR, file))
      for (const c of cues) c.tMs = Math.max(0, Math.round(c.tMs + offset))
      for (const c of clicks) c.tMs = Math.max(0, Math.round(c.tMs + offset))
      if (audioIn && audioWall !== null)
        audioIn.startMs = Math.round(audioWall - captureStart + offset)
      durationMs = Math.round(Date.now() - captureStart + offset)
    } catch (error) {
      failure ??= error
    }
  }
  const message = (e: unknown) => (e instanceof Error ? e.message.split('\n')[0] : String(e))
  const take: Take = {
    shot,
    take: number,
    status: failure ? 'failed' : deviations.length ? 'ok-deviation' : 'ok',
    mode: CHECK ? 'check' : 'record',
    file: started ? file : null,
    durationMs,
    fps: 30,
    cues,
    ...(audioIn ? { audioIn } : {}),
    ...(clicks.length ? { clicks } : {}),
    ...(failure || deviations.length
      ? { note: [...(failure ? [message(failure)] : []), ...deviations].join(' | ') }
      : {}),
  }
  saveTake(take, browser)
  if (failure) throw failure
  return take
}
