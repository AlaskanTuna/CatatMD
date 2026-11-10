// Records takes in order: bun record/run.ts S1 S2 S3 S4 S5 S7 S6 S8 S8R (NEW makes the film's draft off camera when
// S2 is not re-shot; STATE prints what the draft holds). APP_URL is the app to film; CATATMD_RECORD_CHECK=1 also
// writes stills. S2 registers the film patient and S8 approves the draft: each runs once per film.
// Every on-camera click is paced for the v2 camera: the target holds still 1.8 s after its cue (0.9 s move in, then
// a ring), the click lands, and the result holds 1.2 s. Billable steps run once per call; a missed cue is a noted
// deviation, never a failed take.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Browser, chromium, expect, type Locator, type Page } from '@playwright/test'
import { gate } from '../scripts/gate'
import { must } from '../src/must'
import {
  BASE,
  CHECK,
  filmState,
  GUEST_STATE,
  ROOT,
  RUN_DIR,
  SHOTS,
  saveFilmState,
} from './contract'
import { recordTake, type TakeApi } from './take'

const PRE = 1800
const POST = 1200
const P = SHOTS.film_patient
const S7 = (SHOTS.shots as { id: string; questions?: string[] }[]).find((s) => s.id === 'S7')
if (!S7?.questions || S7.questions.length < 2)
  throw new Error('shots.json S7 needs its two questions')
const QUESTIONS = S7.questions

async function launch(fakeWav?: string): Promise<Browser> {
  const args = ['--autoplay-policy=no-user-gesture-required', '--disable-audio-output']
  if (fakeWav) {
    if (!existsSync(fakeWav)) throw new Error(`Missing fake-mic WAV ${fakeWav}`)
    args.push(
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${fakeWav}%noloop`,
    )
  }
  return chromium.launch({ headless: true, args })
}

/**
 * A fresh 1920×1080 page. Signed in, it reuses this origin's guest session, signing in as guest off camera the first
 * time; S1 opens it signed out, because its take is the on-camera sign-in.
 */
async function newPage(browser: Browser, signedIn = true): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    timezoneId: 'Asia/Kuala_Lumpur',
    locale: 'en-GB',
    permissions: ['microphone'],
    ...(signedIn && existsSync(GUEST_STATE) ? { storageState: GUEST_STATE } : {}),
  })
  // The bell's unread count is the shared guest account's activity, not the film's: hide only that badge.
  await context.addInitScript(() => {
    const style = document.createElement('style')
    style.textContent =
      'button[aria-label^="Notifications"] > span[aria-hidden="true"] { display: none !important; }'
    const add = () => document.head.appendChild(style)
    if (document.head) add()
    else document.addEventListener('DOMContentLoaded', add, { once: true })
  })
  const page = await context.newPage()
  if (signedIn && !existsSync(GUEST_STATE)) {
    await page.goto(`${BASE}/login`)
    await page.getByRole('button', { name: 'Sign In as Guest' }).click()
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 })
    await context.storageState({ path: GUEST_STATE })
  }
  return page
}

/** Types like a person: steady, a little faster than the eye needs. */
async function typeInto(field: Locator, text: string, take: TakeApi) {
  await field.click()
  await field.pressSequentially(text, { delay: 55 })
  await take.hold(250)
}

async function warm(page: Page) {
  for (let i = 0; i < 12; i++) {
    const res = await page.request.get(`${BASE}/api/health`, { timeout: 30_000 }).catch(() => null)
    if (res?.ok()) return
    await page.waitForTimeout(5_000)
  }
  throw new Error('The API did not answer /api/health within a minute')
}

function logApi(page: Page, shot: string) {
  const calls: { t: number; method: string; path: string; status?: number }[] = []
  const t0 = Date.now()
  page.on('response', (res) => {
    const url = new URL(res.url())
    if (url.pathname.startsWith('/api/'))
      calls.push({
        t: Date.now() - t0,
        method: res.request().method(),
        path: url.pathname,
        status: res.status(),
      })
  })
  return () => {
    mkdirSync(join(RUN_DIR, 'api'), { recursive: true })
    writeFileSync(join(RUN_DIR, 'api', `${shot}.json`), `${JSON.stringify(calls, null, 1)}\n`)
    const posts = calls
      .filter((c) => c.method !== 'GET')
      .map((c) => `${c.method} ${c.path.replace(/c[a-z0-9]{24}/g, ':id')} ${c.status}`)
    process.stdout.write(`api writes in ${shot}: ${posts.join(', ') || 'none'}\n`)
  }
}

async function snapshot(page: Page, name: string) {
  mkdirSync(join(ROOT, '.state', 'scout'), { recursive: true })
  writeFileSync(
    join(ROOT, '.state', 'scout', `v2-${name}.aria.yml`),
    await page
      .locator('body')
      .ariaSnapshot()
      .catch((e) => String(e)),
  )
}

async function softCue(take: TakeApi, id: string, locator: Locator, ms = 20_000) {
  try {
    await locator.waitFor({ state: 'visible', timeout: ms })
    await take.cue(id, locator)
    return true
  } catch (error) {
    take.skip(
      id,
      `not seen within ${ms} ms (${error instanceof Error ? error.message.split('\n')[0] : error})`,
    )
    return false
  }
}

/**
 * Logs what the live text shows (the theatre's conversation, or the dictation box) on every change, polled every
 * 40 ms in the page, on the wall clock. The anchor ties the wall clock to the take: a cue's moment, taken right after it.
 */
async function startTextLog(page: Page, mode: 'theatre' | 'dictation') {
  await page.evaluate((m) => {
    const w = window as unknown as { __textLog: [number, string][]; __textTimer: number }
    w.__textLog = []
    let last = ''
    const read = () =>
      m === 'theatre'
        ? // innerText, not textContent: the latency measurement reads its line breaks between bubbles.
          ((
            document.querySelector(
              'dialog[aria-label="Consultation conversation"]',
            ) as HTMLElement | null
          )?.innerText ?? '')
        : ([...document.querySelectorAll('[role=dialog], dialog')]
            .find((d) => d.textContent?.includes('What You Prescribed'))
            ?.querySelector('textarea')?.value ?? '')
    w.__textTimer = window.setInterval(() => {
      const t = read()
      if (t !== last) {
        last = t
        w.__textLog.push([Date.now(), t])
      }
    }, 40)
  }, mode)
  return async (file: string, anchor: { cue: string; wall: number }) => {
    const log = await page.evaluate(() => {
      const w = window as unknown as { __textLog: [number, string][]; __textTimer: number }
      window.clearInterval(w.__textTimer)
      return w.__textLog
    })
    writeFileSync(join(RUN_DIR, file), `${JSON.stringify({ anchor, log })}\n`)
  }
}

/** Cue the target, hold for the camera, click, hold for the result. */
async function pacedClick(take: TakeApi, id: string, target: Locator) {
  await take.cue(id, target)
  await take.hold(PRE)
  await target.click()
  take.clicked(id)
  await take.hold(POST)
}

// The film's draft, by its key in .state/film.json: v2 filmed v2ConsultationId (draft 3), v3 v3ConsultationId (draft 4).
const DRAFT_KEY = (process.env.CATATMD_DRAFT_KEY ?? 'v3ConsultationId') as
  | 'v2ConsultationId'
  | 'v3ConsultationId'
if (!['v2ConsultationId', 'v3ConsultationId'].includes(DRAFT_KEY))
  throw new Error(`Unknown CATATMD_DRAFT_KEY ${DRAFT_KEY}`)
const consultId = () => {
  // CATATMD_CONSULT_ID points a dry run at another of the film's own drafts (the probe draft), never anyone else's.
  const override = process.env.CATATMD_CONSULT_ID
  if (
    override &&
    !filmState().consultationIds.includes(override) &&
    filmState().probeConsultationId !== override
  )
    throw new Error(`${override} is not one of the film's drafts`)
  const id = override ?? filmState()[DRAFT_KEY]
  if (!id) throw new Error(`No ${DRAFT_KEY}: run NEW first`)
  return id
}
const consultUrl = () => `${BASE}/consultations/${consultId()}`
const held = async (page: Page) =>
  (
    (await (await page.request.get(`${BASE}/api/consultations/${consultId()}`)).json()) as {
      consultation: {
        status: string
        transcript: {
          source: string
          turns: { speaker: 'doctor' | 'patient'; text: string }[]
        } | null
        analysis?: unknown
      }
    }
  ).consultation

const SHOT_FNS: Record<string, () => Promise<void>> = {
  /** Landing, then the guest sign-in: the only take that starts signed out. */
  async S1() {
    const browser = await launch()
    try {
      const page = await newPage(browser, false)
      await warm(page)
      await page.goto(BASE)
      await page.getByRole('heading', { level: 1 }).waitFor()
      await recordTake(page, 'S1', async (take) => {
        await take.hold(600)
        await take.cue('landing-hero', page.getByRole('heading', { level: 1 }))
        await take.hold(1400)
        const demo = page.getByRole('link', { name: 'Try the Demo' })
        await take.cue('try-demo', demo)
        await demo.click()
        await page.waitForURL('**/login')
        await take.cue('login-page', page.getByRole('heading', { name: 'Sign In', level: 1 }))
        await take.hold(900)
        const guest = page.getByRole('button', { name: 'Sign In as Guest' })
        await take.cue('guest-button', guest)
        await guest.click()
        await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 })
      })
      await page.context().storageState({ path: GUEST_STATE })
    } finally {
      await browser.close()
    }
  },

  /** Registers the film patient and starts its consultation, which becomes the film's draft. Runs once. */
  async S2() {
    const state = filmState()
    if (state.patientIds.length)
      throw new Error('The film patient exists already: re-shooting S2 would register another')
    const browser = await launch()
    try {
      const page = await newPage(browser)
      await warm(page)
      // The name must be the film's alone. Only a match count is read; no other record is opened.
      const list = (await (await page.request.get(`${BASE}/api/patients`)).json()) as {
        patients: { id: string; name: string }[]
      }
      if (list.patients.some((p) => p.name.trim().toLowerCase() === P.name.toLowerCase()))
        throw new Error(`Another visitor already has a patient named ${P.name}`)
      await page.goto(`${BASE}/patients/new`)
      const name = page.getByRole('textbox', { name: 'Name' })
      await name.waitFor()
      await recordTake(page, 'S2', async (take) => {
        await take.hold(500)
        await take.cue('form-empty', page.getByRole('heading', { name: 'Patient Details' }))
        await typeInto(name, P.name, take)
        await take.cue('name-typed', name)
        const nric = page.getByRole('textbox', { name: 'NRIC' })
        await typeInto(nric, P.nric, take)
        await take.cue('nric-typed', nric)
        await typeInto(page.getByRole('spinbutton', { name: 'Age' }), String(P.age), take)
        await page.getByRole('button', { name: 'Gender' }).click()
        await page.getByRole('option', { name: P.gender, exact: true }).click()
        await take.hold(400)
        const register = page.getByRole('button', { name: 'Register Patient' })
        await take.cue('register-button', register)
        await register.click()
        await page.waitForURL(/\/patients\/(?!new)[^/]+$/, { timeout: 30_000 })
        const patientId = must(new URL(page.url()).pathname.split('/').pop(), 'the new patient id')
        saveFilmState({ patientIds: [...filmState().patientIds, patientId] })
        await take.cue('profile', page.getByRole('heading', { name: P.name }).first())
        await take.hold(1200)
        const start = page.getByRole('button', { name: 'Start Consultation' }).first()
        await take.cue('start-consultation', start)
        await start.click()
        await page.waitForURL(/\/consultations\/[^/]+$/, { timeout: 30_000 })
        const consultationId = must(
          new URL(page.url()).pathname.split('/').pop(),
          'the new consultation id',
        )
        saveFilmState({
          consultationIds: [...filmState().consultationIds, consultationId],
          [DRAFT_KEY]: consultationId,
        })
        await take.hold(1500)
      })
    } finally {
      await browser.close()
    }
  },

  /** Off camera: the film's draft, from the film patient's profile (when S2 is not re-shot). */
  async NEW() {
    const existing = filmState()[DRAFT_KEY]
    if (existing) throw new Error(`${DRAFT_KEY} exists already: ${existing}`)
    const browser = await launch()
    try {
      const page = await newPage(browser)
      await warm(page)
      await page.goto(`${BASE}/patients/${filmState().patientIds[0]}`)
      await page.getByRole('button', { name: 'Start Consultation' }).first().click()
      await page.waitForURL(/\/consultations\/[^/]+$/, { timeout: 30_000 })
      const id = must(new URL(page.url()).pathname.split('/').pop(), 'the new draft id')
      saveFilmState({ consultationIds: [...filmState().consultationIds, id], [DRAFT_KEY]: id })
      process.stdout.write(`${DRAFT_KEY}: ${id}\n`)
    } finally {
      await browser.close()
    }
  },

  /** Off camera: what the draft holds now. */
  async STATE() {
    const browser = await launch()
    try {
      const page = await newPage(browser)
      await warm(page)
      const c = await held(page)
      process.stdout.write(
        `${JSON.stringify({ id: consultId(), status: c.status, transcript: c.transcript && { source: c.transcript.source, turns: c.transcript.turns.length }, analysed: Boolean(c.analysis) })}\n`,
      )
    } finally {
      await browser.close()
    }
  },

  async S3() {
    const wav = join(ROOT, 'audio-in', 'consult.wav')
    const seconds = (
      JSON.parse(readFileSync(join(ROOT, 'audio-in', 'consult.timeline.json'), 'utf8')) as {
        seconds: number
      }
    ).seconds
    const browser = await launch(wav)
    try {
      const page = await newPage(browser)
      await warm(page)
      if ((await held(page)).transcript) throw new Error('The film draft already has a transcript')
      const done = logApi(page, 'S3')
      await page.goto(consultUrl())
      const consent = page.getByRole('checkbox', { name: /agreed to be recorded/ })
      await consent.waitFor({ timeout: 60_000 })
      const transcript = page.getByRole('region', { name: 'Transcript' })
      try {
        await recordTake(page, 'S3', async (take) => {
          await take.hold(1500)
          await take.cue('consent-unticked', consent)
          await take.hold(PRE)
          await consent.check()
          take.clicked('consent')
          await take.hold(600)
          await take.cue('consent-ticked', consent)
          const start = page.getByRole('button', { name: 'Start Ambient Capture' })
          await pacedClick(take, 'start-ambient', start)
          const opened = Date.now()
          take.audioStarted('audio-in/consult.wav')
          // Listening opens the full-window theatre (#287), a modal <dialog>: everything live is cued inside it,
          // because the page behind stays laid out (and "visible") but is inert.
          const theatre = page.getByRole('dialog', { name: 'Consultation conversation' })
          await softCue(
            take,
            'listening',
            theatre.getByText('Listening', { exact: true }).first(),
            30_000,
          )
          const anchor = { cue: 'listening', wall: Date.now() }
          const textLog = await startTextLog(page, 'theatre')
          await snapshot(page, 's3-listening')
          await softCue(take, 'first-turn', theatre.getByText(/Good morning/i).first(), 30_000)
          await softCue(take, 'name-turn', theatre.getByText(/My IC is/i).first(), 30_000)
          await softCue(
            take,
            'transcript-building',
            theatre.getByText(/cough for three days/i).first(),
            40_000,
          )
          await snapshot(page, 's3-building')
          await softCue(take, 'ask-next', theatre.getByText(/Ask Next/i).first(), 20_000)
          await softCue(
            take,
            'red-flag-live',
            theatre.getByText(/Haemoptysis reported/i).first(),
            60_000,
          )
          await snapshot(page, 's3-red-flag')
          await softCue(
            take,
            'last-turn',
            theatre.getByText(/thank you,? doctor/i).first(),
            Math.max(5_000, opened + seconds * 1000 + 8_000 - Date.now()),
          )
          const left = opened + seconds * 1000 + 1500 - Date.now()
          if (left > 0) await take.hold(left)
          await snapshot(page, 's3-end-of-audio')
          await textLog('S3-text.json', anchor)
          await pacedClick(
            take,
            'stop-finish',
            theatre.getByRole('button', { name: /Stop and Finish/ }),
          )
          // ElevenLabs refinement has no budget in v2: take the live transcript as soon as the choice appears.
          const useLive = page.getByRole('button', { name: 'Use Live Transcript' })
          if (
            await useLive
              .waitFor({ state: 'visible', timeout: 6_000 })
              .then(() => true)
              .catch(() => false)
          ) {
            await useLive.click()
            take.clicked('use-live')
          }
          await expect(page.getByRole('button', { name: 'Analyse Consultation' })).toBeEnabled({
            timeout: 180_000,
          })
          await take.hold(800)
          await snapshot(page, 's3-saved')
          await take.cue('transcript-saved', transcript, { clip: true })
          await take.hold(3000)
          const alerts = (await page.getByRole('alert').allInnerTexts()).filter((a) => a.trim())
          if (alerts.length)
            take.deviation(`alert on screen at the end: ${alerts.join(' / ').slice(0, 200)}`)
        })
      } finally {
        done()
      }
      const t = (await held(page)).transcript
      writeFileSync(join(RUN_DIR, 'S3-transcript.json'), `${JSON.stringify(t, null, 2)}\n`)
      if (t) {
        const verdict = gate(t)
        writeFileSync(join(RUN_DIR, 'S3-gate.json'), `${JSON.stringify(verdict, null, 2)}\n`)
        process.stdout.write(
          `gate ${verdict.pass ? 'PASS' : 'FAIL'}: ${JSON.stringify(verdict.checks)}; turns ${t.turns.length}; ${verdict.tokens.join(' ')}\n`,
        )
      }
    } finally {
      await browser.close()
    }
  },

  async S4() {
    const browser = await launch()
    try {
      const page = await newPage(browser)
      await warm(page)
      const c = await held(page)
      if (!c.transcript) throw new Error('No transcript on the film draft')
      if (c.analysis) throw new Error('The film draft is already analysed')
      const verdict = gate(c.transcript)
      writeFileSync(join(RUN_DIR, 'S4-gate.json'), `${JSON.stringify(verdict, null, 2)}\n`)
      if (!verdict.pass) throw new Error(`Gate failed: ${JSON.stringify(verdict.checks)}`)
      const done = logApi(page, 'S4')
      await page.goto(consultUrl())
      const analyse = page.getByRole('button', { name: 'Analyse Consultation' })
      await expect(analyse).toBeEnabled({ timeout: 60_000 })
      try {
        await recordTake(page, 'S4', async (take) => {
          await take.hold(1500)
          await take.cue('analyse-button', analyse)
          await take.hold(PRE)
          await analyse.click()
          take.clicked('analyse')
          await softCue(take, 'analysing', page.getByRole('button', { name: /^Analysing/ }), 10_000)
          await page
            .getByRole('button', { name: 'Approve Note' })
            .waitFor({ state: 'visible', timeout: 240_000 })
          await take.hold(2000)
          await snapshot(page, 's4-analysed')
          await take.cue('analysis-done', page.getByRole('main'), { clip: true })
          await take.hold(3000)
        })
      } finally {
        done()
      }
    } finally {
      await browser.close()
    }
  },

  async S5() {
    const browser = await launch()
    try {
      const page = await newPage(browser)
      await warm(page)
      await page.goto(consultUrl())
      await page.getByRole('button', { name: 'Approve Note' }).waitFor({ timeout: 60_000 })
      const glide = async (l: Locator) => {
        await l.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
        await page.waitForTimeout(1100)
      }
      const note = page.getByRole('region', { name: 'Clinical Note' })
      const safety = page.getByRole('complementary', { name: 'Clinical safety' })
      const card = (h: RegExp) =>
        safety
          .locator('div')
          .filter({ has: page.getByRole('heading', { name: h }) })
          .filter({ has: page.getByRole('button', { name: 'Acknowledge' }) })
          .last()
      await recordTake(page, 'S5', async (take) => {
        await take.hold(2500)
        await take.cue('three-panels', page.getByRole('main'), { clip: true })
        await take.cue('transcript-pane', page.getByRole('region', { name: 'Transcript' }), {
          clip: true,
        })
        await take.cue('note-pane', note, { clip: true })
        await take.cue('safety-pane', safety, { clip: true })
        await take.hold(3000)
        await take.cue(
          'ai-generated-badge',
          note.getByText('AI Generated', { exact: true }).first(),
        )
        await take.hold(2500)
        const rule = card(/^Haemoptysis reported/)
        await take.cue('red-flag-rule', rule)
        await take.cue('rule-badge', rule.getByText('Rule', { exact: true }))
        await take.hold(3000)
        await softCue(take, 'ai-candidate', card(/^H(a)?emoptysis \(blood/), 3_000)
        await take.hold(3500)
        const gaps = page.getByRole('heading', { name: /^Missing Information/ })
        await glide(gaps)
        await take.cue('missing-info', gaps)
        await take.hold(1500)
        const showAll = page.getByRole('button', { name: /^Show All \d+ Missing Items/ })
        await glide(showAll)
        await take.hold(PRE)
        await showAll.click()
        take.clicked('show-all')
        const allergies = page.getByRole('heading', { name: /allerg/i }).first()
        await allergies.waitFor()
        await glide(allergies)
        await take.cue('missing-allergies', allergies)
        await take.hold(3000)
        const gapsDialog = page.getByRole('dialog', { name: /Missing Information/ })
        await gapsDialog.getByRole('button', { name: 'Close' }).click()
        await gapsDialog.waitFor({ state: 'detached' })
        await take.hold(POST)
        const checklistButton = page.getByRole('button', { name: 'Completeness Checklist' })
        await glide(checklistButton)
        await take.hold(PRE)
        await checklistButton.click()
        take.clicked('checklist')
        const dialog = page.getByRole('dialog', { name: 'Completeness Checklist' })
        await take.cue('checklist', dialog, { clip: true })
        await take.hold(2000)
        const row = dialog.getByRole('button', {
          name: /^Haemoptysis .*Show the transcript source/,
        })
        await glide(row)
        await take.hold(1200)
        await row.click()
        take.clicked('evidence-row')
        await take.cue('checklist-evidence', dialog.getByText(/streaks of blood/).first())
        await take.hold(3500)
        await dialog.getByRole('button', { name: 'Close' }).click()
        await dialog.waitFor({ state: 'detached' })
        await take.hold(POST)
        const suggestions = page.getByRole('heading', { name: /^Suggestions/ })
        await glide(suggestions)
        await take.cue(
          'suggestion',
          safety.getByRole('heading', { name: /^Suggestions/ }).locator('xpath=following::p[1]'),
        )
        await take.hold(2000)
        const chip = safety.getByRole('button', { name: /^[a-z0-9-]+-p\d+-c\d+$/ }).first()
        await take.cue('guideline-chip', chip)
        await take.hold(PRE)
        await chip.click()
        take.clicked('guideline-chip')
        const source = safety.getByText(/Open source/).first()
        await source.waitFor()
        await glide(source)
        await take.cue('guideline-expanded', source.locator('xpath=ancestor::div[2]'))
        await take.hold(4000)
      })
    } finally {
      await browser.close()
    }
  },

  async S7() {
    const browser = await launch()
    try {
      const page = await newPage(browser)
      await warm(page)
      const done = logApi(page, 'S7')
      await page.goto(consultUrl())
      await page.getByRole('button', { name: 'Approve Note' }).waitFor({ timeout: 60_000 })
      const note = page.getByRole('region', { name: 'Clinical Note' })
      try {
        await recordTake(page, 'S7', async (take) => {
          await take.hold(1500)
          await pacedClick(take, 'open-catatai', page.getByRole('button', { name: 'Open CatatAI' }))
          const box = page.getByRole('textbox', { name: 'Ask CatatAI about this consultation' })
          const panel = page
            .locator('div')
            .filter({ has: page.getByRole('heading', { name: 'CatatAI' }) })
            .filter({ has: box })
            .last()
          const settled = page
            .getByRole('button', { name: 'Propose as Edit' })
            .or(page.getByRole('button', { name: 'Apply', exact: true }))
          await box.click()
          await box.pressSequentially(QUESTIONS[0], { delay: 32 })
          await take.cue('q1-typed', box)
          await take.hold(800)
          await page.getByRole('button', { name: 'Send' }).click()
          take.clicked('send')
          await settled.first().waitFor({ state: 'visible', timeout: 120_000 })
          // v3: settled also means the reply stopped streaming (its cursor is an animate-pulse span); a retake once
          // judged a reply mid-stream.
          await expect(panel.locator('.animate-pulse')).toHaveCount(0, { timeout: 120_000 })
          await take.hold(1000)
          await softCue(take, 'q1-answer', panel.getByText(/haemoptysis/i).first(), 3_000)
          const answer = (await panel.textContent()) ?? ''
          if (/\[[a-z_.0-9]+\]/i.test(answer)) {
            take.deviation('Q1 answer printed a bracketed ID (#483)')
            // Fail before Q2 is spent; the third attempt runs with CATATMD_Q1_ACCEPT=1 and is framed wide (Director).
            if (!process.env.CATATMD_Q1_ACCEPT)
              throw new Error('Q1 printed a bracketed ID: retake (#483)')
          }
          // #479: a reply cut to one word ("The") still settles with Propose as Edit. A usable answer names the flag.
          if (!/haemoptysis/i.test(answer.split(QUESTIONS[0])[1] ?? '')) {
            take.deviation('Q1 answer does not name the red flag: truncated (#479)?')
            throw new Error('Q1 answer unusable (#479): stop and tell the Director')
          }
          // v3: a Q1-only retake, cut together with an earlier take's Q2 (Director's call).
          if (process.env.CATATMD_S7_Q1_ONLY) {
            await take.hold(5000)
            for (const id of ['q2-typed', 'proposal-card', 'apply', 'plan-edited'])
              take.skip(id, 'Q1-only retake')
            return
          }
          await take.hold(5000)
          await box.click()
          await box.pressSequentially(QUESTIONS[1], { delay: 32 })
          await take.cue('q2-typed', box)
          await take.hold(800)
          await page.getByRole('button', { name: 'Send' }).click()
          take.clicked('send')
          const apply = page.getByRole('button', { name: 'Apply', exact: true })
          const propose = page.getByRole('button', { name: 'Propose as Edit' })
          // Q1's own Propose button hides the moment Q2 starts streaming; wait it out so it isn't mistaken for Q2's.
          await propose.waitFor({ state: 'hidden', timeout: 10_000 })
          await apply.or(propose).first().waitFor({ state: 'visible', timeout: 120_000 })
          if (!(await apply.isVisible())) {
            // The model answered in prose: the app's own fallback (#185) turns the answer into a card. One more call.
            take.deviation('Q2 came back as prose: pressed Propose as Edit (#185)')
            await take.hold(2000)
            await pacedClick(take, 'propose-as-edit', propose)
            await apply.waitFor({ state: 'visible', timeout: 120_000 })
          }
          await take.hold(1000)
          await snapshot(page, 's7-proposal')
          await take.cue(
            'proposal-card',
            page.getByText(/^Proposed change to plan/i).locator('xpath=..'),
          )
          await take.hold(3500)
          await pacedClick(take, 'apply', apply)
          const close = page.getByRole('button', { name: 'Close CatatAI' })
          if (await close.isVisible().catch(() => false)) await close.click()
          const plan = note.getByRole('heading', { name: 'Plan', level: 3 })
          await plan.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
          await take.hold(1200)
          await snapshot(page, 's7-applied')
          await softCue(take, 'plan-edited', note.getByText(/You Edited This/i).first(), 10_000)
          await take.hold(3500)
        })
      } finally {
        done()
      }
    } finally {
      await browser.close()
    }
  },

  async S6() {
    const browser = await launch(join(ROOT, 'audio-in', 'dictation.wav'))
    try {
      const page = await newPage(browser)
      await warm(page)
      const done = logApi(page, 'S6')
      await page.goto(consultUrl())
      await page.getByRole('button', { name: 'Approve Note' }).waitFor({ timeout: 60_000 })
      try {
        await recordTake(page, 'S6', async (take) => {
          await take.hold(1500)
          const panel = page.getByRole('button', { name: /^Prescriptions/ })
          await panel.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
          await take.hold(1100)
          await pacedClick(take, 'prescriptions-open', panel)
          await page.getByRole('button', { name: 'Add', exact: true }).click()
          take.clicked('add')
          const dialog = page.getByRole('dialog').filter({ hasText: 'What You Prescribed' })
          const dictate = dialog.getByRole('button', { name: 'Dictate', exact: true })
          await dictate.waitFor()
          await take.hold(800)
          await pacedClick(take, 'dictate-button', dictate)
          take.audioStarted('audio-in/dictation.wav')
          await softCue(
            take,
            'listening',
            dialog.getByText('Listening', { exact: true }).first(),
            20_000,
          )
          const anchor = { cue: 'listening', wall: Date.now() }
          const textLog = await startTextLog(page, 'dictation')
          const box = dialog.getByRole('textbox', { name: 'What You Prescribed' })
          await expect(box)
            .toHaveValue(/benzydamine/i, { timeout: 45_000 })
            .catch(() => take.deviation('dictated text did not reach the box'))
          await take.hold(1500)
          await take.cue('dictated-text', box)
          const stop = dialog.getByRole('button', { name: 'Stop dictation' })
          if (await stop.isVisible().catch(() => false))
            await pacedClick(take, 'stop-dictation', stop)
          else take.skip('stop-dictation', 'dictation ended by itself')
          await softCue(
            take,
            'parsed-lines',
            dialog.getByRole('region', { name: 'Prescription Lines' }),
            20_000,
          )
          await softCue(
            take,
            'parsed-fields',
            dialog.getByRole('list', { name: 'Prescription lines' }).getByRole('listitem').first(),
            10_000,
          )
          await snapshot(page, 's6-parsed')
          await textLog('S6-text.json', anchor)
          // Two lines exactly as dictated, or a retake before anything is saved (Director, v3 rule 3).
          const field = (role: 'textbox' | 'combobox' | 'button', name: string) =>
            dialog.getByRole(role, { name, exact: true })
          const got = {
            lines: await dialog
              .getByRole('list', { name: 'Prescription lines' })
              .getByRole('listitem')
              .count(),
            l1: [
              await field('combobox', 'Drug, line 1').inputValue(),
              await field('textbox', 'Dose, line 1').inputValue(),
              (await field('button', 'Frequency, line 1').textContent()) ?? '',
              await field('textbox', 'Duration, line 1').inputValue(),
            ],
            l2: [
              await field('combobox', 'Drug, line 2').inputValue(),
              await field('textbox', 'Dose, line 2').inputValue(),
              (await field('button', 'Frequency, line 2').textContent()) ?? '',
              await field('textbox', 'Duration, line 2').inputValue(),
            ],
          }
          const norm = (xs: string[]) =>
            xs.map((x) => x.trim().toLowerCase().replace(/\s+/g, ' ')).join(' | ')
          const ok =
            got.lines === 2 &&
            norm(got.l1) === 'paracetamol | 2 tablets | four times daily | 5 days' &&
            norm(got.l2) === 'benzydamine | 15 ml | three times daily | 5 days'
          writeFileSync(join(RUN_DIR, `S6-parse-take.json`), `${JSON.stringify(got, null, 2)}\n`)
          if (!ok) {
            take.deviation(`parse: ${got.lines} lines; ${norm(got.l1)} ; ${norm(got.l2)}`)
            throw new Error(
              'Dictation did not parse into the two expected lines: retake (Director, v3 rule 3)',
            )
          }
          // A run-on final ("…five days Benzydamine…") parses right but leaves both lines unticked ("Needs a decision").
          // Retake for a clean parse; CATATMD_S6_TICK=1 has the doctor tick them on camera instead.
          const include = [1, 2].map((n) =>
            dialog.getByRole('checkbox', { name: `Include line ${n}` }),
          )
          const unticked = (await Promise.all(include.map((c) => c.isChecked()))).filter(
            (x) => !x,
          ).length
          if (unticked) {
            take.deviation(`${unticked} of 2 lines need a decision (run-on final)`)
            if (!process.env.CATATMD_S6_TICK)
              throw new Error('Lines need a decision: retake for a clean parse')
            await take.hold(1500)
            for (const [i, box] of include.entries()) {
              if (await box.isChecked()) continue
              await box.click()
              take.clicked(`tick-line-${i + 1}`)
              await take.hold(900)
            }
          }
          await take.hold(3500)
          const confirm = dialog.getByRole('button', { name: /^Confirm (\d+ )?Prescriptions?$/ })
          await expect(confirm).toBeEnabled({ timeout: 15_000 })
          await pacedClick(take, 'confirm-prescription', confirm)
          await dialog.waitFor({ state: 'detached', timeout: 30_000 })
          await softCue(
            take,
            'prescription-saved',
            page.getByRole('button', { name: /^Prescriptions [1-9]/ }),
            15_000,
          )
          await take.hold(2500)
        })
      } finally {
        done()
      }
    } finally {
      await browser.close()
    }
  },

  async S8() {
    const browser = await launch()
    try {
      const page = await newPage(browser)
      await warm(page)
      if (!CHECK && (await held(page)).status === 'approved')
        throw new Error('The film draft is already approved')
      const done = logApi(page, 'S8')
      await page.goto(consultUrl())
      const approve = page.getByRole('button', { name: 'Approve Note' })
      await approve.waitFor({ timeout: 60_000 })
      const safety = page.getByRole('complementary', { name: 'Clinical safety' })
      const card = (h: RegExp) =>
        safety
          .locator('div')
          .filter({ has: page.getByRole('heading', { name: h }) })
          .filter({ has: page.getByRole('button', { name: 'Acknowledge' }) })
          .last()
      try {
        await recordTake(page, 'S8', async (take) => {
          await take.hold(1500)
          const rule = card(/^Haemoptysis reported/)
          await take.cue('ack-rule', rule)
          await take.hold(PRE)
          if (!CHECK) {
            await rule.getByRole('button', { name: 'Acknowledge' }).click()
            take.clicked('ack-rule')
          }
          await take.hold(POST)
          const ai = card(/^H(a)?emoptysis \(blood/)
          if (await ai.isVisible().catch(() => false)) {
            await take.cue('ack-ai', ai)
            await take.hold(PRE)
            if (!CHECK) {
              await ai.getByRole('button', { name: 'Acknowledge' }).click()
              take.clicked('ack-ai')
            }
            await take.hold(POST)
          } else take.skip('ack-ai', 'no AI Suggested flag on this analysis')
          await pacedClick(take, 'approve-button', approve)
          const confirm = page.getByRole('button', { name: 'Confirm Approval' })
          await take.cue('confirm-approval', confirm)
          await page.getByRole('button', { name: 'What approving does' }).hover()
          await take.hold(600)
          await take.cue(
            'approve-tip',
            page.getByText('Approval finalises this note. It cannot be edited later.').first(),
          )
          await take.hold(3000)
          if (CHECK) {
            await page.getByRole('button', { name: 'Cancel', exact: true }).click()
            for (const id of ['approved-status', 'export', 'report'])
              take.skip(id, 'check run cancels at the confirmation')
            return
          }
          await confirm.click()
          take.clicked('confirm-approval')
          const toast = page.getByText(/Note approved/).first()
          await toast.waitFor({ timeout: 30_000 })
          await take.hold(800)
          await take.cue('approved-status', toast)
          await take.hold(2200)
          const exportButton = page.getByRole('button', { name: 'Export' })
          await pacedClick(take, 'export', exportButton)
          await page.waitForURL('**/report')
          await page.waitForLoadState('networkidle')
          await page.mouse.move(1900, 1060)
          await take.hold(1500)
          await take.cue('report', page.getByText('Consultation Report', { exact: true }).first())
          await take.hold(3000)
        })
      } finally {
        done()
      }
    } finally {
      await browser.close()
    }
  },

  async S8R() {
    const browser = await launch()
    try {
      const page = await newPage(browser)
      await warm(page)
      if ((await held(page)).status !== 'approved')
        throw new Error('The report pickup needs the approved the film draft')
      await page.goto(`${consultUrl()}/report`)
      const heading = page.getByText('Consultation Report', { exact: true }).first()
      await heading.waitFor({ timeout: 60_000 })
      await page.mouse.move(1900, 1060)
      await recordTake(page, 'S8R', async (take) => {
        await take.hold(2000)
        await take.cue('report-top', heading)
        await take.hold(2000)
        const table = page.getByText('Prescriptions', { exact: true }).last()
        await table.evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))
        await take.hold(1500)
        await take.cue('report-prescriptions', table)
        await take.hold(3500)
      })
    } finally {
      await browser.close()
    }
  },
}

for (const id of process.argv.slice(2)) {
  const fn = SHOT_FNS[id]
  if (!fn) throw new Error(`No take function for ${id}`)
  process.stdout.write(`${CHECK ? 'check' : 'record'} ${id} on ${BASE} -> ${RUN_DIR}\n`)
  await fn()
  process.stdout.write(`done ${id}\n`)
}
