// The pre-Analyse gate (Director, C2): the transcript the app holds must, through the repo's own de-identifier and
// red-flag engine run locally and offline, (1) turn "Siti Contoh" into a patient token, (2) turn the IC into an NRIC
// token, and (3) fire the haemoptysis rule with no emergency flag. Exit 1 on any failure. Never edits the transcript.
// Usage: bun scripts/gate.ts <transcript.json | text.txt>   (JSON: an app Transcript, or {text})
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// The app's own backend source: this repository's, or APP_SRC for another checkout.
const APP = process.env.APP_SRC ?? resolve(import.meta.dirname, '../../backend/src')
const { deidentify } = await import(`${APP}/deid/index.ts`)
const { evaluateRedFlags } = await import(`${APP}/redflags/evaluate.ts`)

type Turn = { speaker: 'doctor' | 'patient'; text: string }
type Transcript = { source: string; turns: Turn[]; labelsReviewed?: boolean }

export function gate(input: Transcript) {
  const text = input.turns.map((t) => t.text).join('\n')
  const deid = String((deidentify(text) as { text: unknown }).text)
  const tokens = [...new Set(deid.match(/\[[A-Z_]+_\d+\]/g) ?? [])]
  // v2 dialogue: only the doctor names her, "Puan Siti" (the surname leaks in lowercase, #482).
  const nameIn = input.turns.some((t) => /\bsiti\b/i.test(t.text))
  const nameLeft = /siti|contoh/i.test(deid)
  const nric = tokens.filter((t) => t.startsWith('[NRIC'))
  const flags = evaluateRedFlags(input as never) as {
    id: string
    severity: string
    source: string
  }[]
  const checks = {
    'name heard as "Siti"': nameIn,
    'name tokenised (no Siti/Contoh left)':
      !nameLeft && tokens.some((t) => t.startsWith('[PATIENT')),
    'IC tokenised as NRIC': nric.length > 0,
    'haemoptysis rule fires': flags.some((f) => f.id === 'haemoptysis'),
    'no emergency flag': !flags.some((f) => f.severity === 'emergency'),
  }
  // The line the S4 graphic shows: the first de-identified sentence that carries a token, as this consultation has it.
  const graphicLine =
    deid
      .split(/(?<=[.?!])\s+|\n/)
      .filter((s) => /\[(PATIENT|NRIC)_\d+\]/.test(s))
      .join(' | ') || null
  const sourceLine = graphicLine
    ? (text.split(/(?<=[.?!])\s+|\n/).find((s) => /siti/i.test(s)) ?? null)
    : null
  return {
    pass: Object.values(checks).every(Boolean),
    checks,
    tokens,
    flags: flags.map((f) => `${f.id}(${f.severity},${f.source})`),
    graphicLine,
    sourceLine,
  }
}

if (import.meta.main) {
  const file = process.argv[2]
  const raw = readFileSync(file, 'utf8')
  let transcript: Transcript
  try {
    const json = JSON.parse(raw)
    transcript = json.turns
      ? json
      : { source: 'asr_hosted', turns: [{ speaker: 'doctor', text: json.text }] }
  } catch {
    transcript = { source: 'asr_hosted', turns: [{ speaker: 'doctor', text: raw }] }
  }
  const result = gate(transcript)
  for (const [name, ok] of Object.entries(result.checks))
    process.stdout.write(`${ok ? 'pass' : 'FAIL'}  ${name}\n`)
  process.stdout.write(
    `tokens: ${result.tokens.join(' ')}\nflags: ${result.flags.join(', ')}\ngraphic: ${result.graphicLine}\n`,
  )
  writeFileSync(`${file}.gate.json`, `${JSON.stringify(result, null, 2)}\n`)
  process.exit(result.pass ? 0 : 1)
}
