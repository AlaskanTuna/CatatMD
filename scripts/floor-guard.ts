// Rejects changes that lower the quality floor by adding suppressions, weakening tests, or leaving work unfinished.
// --diff checks the merge base against the working tree and untracked files.
// --hook runs as a Claude Code PreToolUse hook for Edit, Write, and MultiEdit, and asks before risky edits.
// Adapted from addyosmani/agent-skills, constraint-driven-development, MIT.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

type Line = { line: number; text: string }
export type Change = { path: string; added: Line[]; removed: string[]; deleted: boolean }
export type Violation = { rule: string; path: string; line?: number }

type HookInput = {
  file_path?: unknown
  content?: unknown
  old_string?: unknown
  new_string?: unknown
  edits?: unknown
}

type HookResponse = {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse'
    permissionDecision: 'ask'
    permissionDecisionReason: string
  }
}

const CODE = /\.(?:[cm]?[jt]sx?|sql)$/
const TEST = /(?:^|\/)[^/]+\.test\.tsx?$/
const IGNORED =
  /^(?:\.claude\/skills|\.agents\/skills|graphify-out|prisma\/migrations)(?:\/|$)|(?:^|\/)(?:node_modules|dist)(?:\/|$)|^bun\.lock$|^scripts\/floor-guard(?:\.test)?\.ts$/

const RULES: { name: string; pattern: RegExp; testsOnly: boolean; loosens: 'added' | 'removed' }[] =
  [
    {
      name: 'a check silenced',
      pattern: /biome-ignore|@ts-(?:ignore|expect-error|nocheck)|eslint-disable/g,
      testsOnly: false,
      loosens: 'added',
    },
    {
      name: 'a test skipped or focused',
      pattern:
        /\b(?:describe|it|test)\s*\.\s*(?:skip|only|todo)\s*\(|\b(?:xit|xdescribe|fit)\s*\(/g,
      testsOnly: true,
      loosens: 'added',
    },
    {
      name: 'an assertion removed',
      pattern: /\b(?:expect(?:TypeOf)?|assert(?:\.\w+)?)\s*\(/g,
      testsOnly: true,
      loosens: 'removed',
    },
    {
      name: 'an empty catch',
      pattern: /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/g,
      testsOnly: false,
      loosens: 'added',
    },
    {
      name: 'unfinished work',
      pattern: /\b(?:TODO|FIXME)\b/g,
      testsOnly: false,
      loosens: 'added',
    },
  ]

const count = (text: string, pattern: RegExp) => text.match(pattern)?.length ?? 0

const linesOf = (text: string, firstLine = 1): Line[] =>
  text.split(/\r?\n/).map((line, index) => ({ line: firstLine + index, text: line }))

const isCodePath = (path: string) => CODE.test(path)
const isIgnoredPath = (path: string) => IGNORED.test(path)

function firstAddedLine(change: Change, pattern: RegExp): number | undefined {
  return change.added.find((line) => count(line.text, pattern) > 0)?.line
}

export function findViolations(changes: Change[]): Violation[] {
  const found: Violation[] = []

  for (const change of changes) {
    if (!isCodePath(change.path) || isIgnoredPath(change.path)) continue
    const isTest = TEST.test(change.path)
    if (change.deleted) {
      if (isTest) found.push({ rule: 'a test file deleted', path: change.path })
      continue
    }

    const added = change.added.map((line) => line.text).join('\n')
    const removed = change.removed.join('\n')
    for (const rule of RULES) {
      if (rule.testsOnly && !isTest) continue
      const net = count(added, rule.pattern) - count(removed, rule.pattern)
      if (rule.loosens === 'added' ? net <= 0 : net >= 0) continue
      found.push({
        rule: rule.name,
        path: change.path,
        line: rule.loosens === 'added' ? firstAddedLine(change, rule.pattern) : undefined,
      })
    }
  }

  return found
}

export function parseDiff(diff: string): Change[] {
  const changes: Change[] = []
  let current: Change | undefined
  let inHunk = false
  let nextLine = 0

  for (const raw of diff.split('\n')) {
    const text = raw.replace(/\r$/, '')
    const header = /^diff --git a\/(.+) b\/(.+)$/.exec(text)
    if (header) {
      current = { path: header[2], added: [], removed: [], deleted: false }
      changes.push(current)
      inHunk = false
      continue
    }
    if (!current) continue

    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text)
    if (hunk) {
      inHunk = true
      nextLine = Number(hunk[1])
    } else if (!inHunk) {
      if (text.startsWith('deleted file mode')) current.deleted = true
    } else if (text.startsWith('+')) {
      current.added.push({ line: nextLine++, text: text.slice(1) })
    } else if (text.startsWith('-')) {
      current.removed.push(text.slice(1))
    }
  }

  return changes
}

export const isAllowed = (commitMessages: string) =>
  /^Floor-Guard-Allow:[ \t]*\S/m.test(commitMessages)

const where = (violation: Violation) =>
  `${violation.path}${violation.line === undefined ? '' : `:${violation.line}`}`

export function hookChanges(path: string, input: HookInput, existing: string): Change[] {
  const changes: Change[] = []
  let searchFrom = 0

  const addChange = (next: string, previous: string, firstLine: number) => {
    changes.push({
      path,
      added: linesOf(next, firstLine),
      removed: previous.split(/\r?\n/),
      deleted: false,
    })
  }

  if (typeof input.content === 'string') addChange(input.content, existing, 1)

  const addEdit = (next: string, previous: string) => {
    const index = existing.indexOf(previous, searchFrom)
    const firstLine = index < 0 ? 1 : (existing.slice(0, index).match(/\n/g)?.length ?? 0) + 1
    if (index >= 0) searchFrom = index + previous.length
    addChange(next, previous, firstLine)
  }

  if (typeof input.new_string === 'string') {
    addEdit(input.new_string, typeof input.old_string === 'string' ? input.old_string : '')
  }

  if (Array.isArray(input.edits)) {
    for (const value of input.edits) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) continue
      const edit = value as { old_string?: unknown; new_string?: unknown }
      if (typeof edit.new_string === 'string') {
        addEdit(edit.new_string, typeof edit.old_string === 'string' ? edit.old_string : '')
      }
    }
  }

  return changes
}

export function hookResponse(violations: Violation[]): HookResponse | undefined {
  if (violations.length === 0) return undefined
  const details = [
    ...new Set(violations.map((violation) => `${violation.rule} at ${where(violation)}`)),
  ]
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: `floor-guard: this edit lowers the quality floor (${details.join(', ')}). Approve only if that is intended.`,
    },
  }
}

function cannotRun(): number {
  console.error(
    'floor-guard: cannot compare with origin/main, so the floor was not checked. Fetch origin and retry.',
  )
  return 2
}

function runDiff(): number {
  const git = (args: string[]) =>
    execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })

  try {
    const root = git(['rev-parse', '--show-toplevel']).trim()
    const base = git(['merge-base', 'origin/main', 'HEAD']).trim()
    const changes = parseDiff(
      git(['-C', root, 'diff', '--no-color', '--no-ext-diff', '--unified=0', '-M', base]),
    )
    const untracked = git(['-C', root, 'ls-files', '--others', '--exclude-standard', '-z'])
      .split('\0')
      .filter((path) => path !== '' && isCodePath(path) && !isIgnoredPath(path))

    for (const path of untracked) {
      changes.push({
        path,
        added: linesOf(readFileSync(join(root, path), 'utf8')),
        removed: [],
        deleted: false,
      })
    }

    const violations = findViolations(changes)
    if (violations.length === 0) {
      process.stdout.write('floor-guard: no change lowers the floor\n')
      return 0
    }

    let allowed = false
    try {
      allowed = isAllowed(git(['log', '--format=%B', `${base}..HEAD`]))
    } catch {
      return cannotRun()
    }

    for (const violation of violations) {
      const message = `floor-guard: ${violation.rule} at ${where(violation)}`
      if (allowed) console.warn(`floor-guard: warning: ${message}`)
      else console.error(message)
    }
    if (allowed) {
      console.warn('floor-guard: allowed by a Floor-Guard-Allow trailer on this branch')
      return 0
    }

    console.error(
      'floor-guard: fix these, or add a Floor-Guard-Allow: <reason> commit trailer to allow them',
    )
    return 1
  } catch {
    return cannotRun()
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function runHook(): void {
  try {
    const parsed: unknown = JSON.parse(readFileSync(0, 'utf8'))
    if (!isRecord(parsed)) return
    const rawInput = parsed.tool_input
    const input = isRecord(rawInput) ? (rawInput as HookInput) : {}
    const root =
      process.env.CLAUDE_PROJECT_DIR || (typeof parsed.cwd === 'string' ? parsed.cwd : '')
    if (typeof input.file_path !== 'string' || root === '') return

    const rootPath = resolve(root)
    const absolute = resolve(rootPath, input.file_path)
    const path = relative(rootPath, absolute).replace(/\\/g, '/')
    if (path === '..' || path.startsWith('../')) return

    const existing = existsSync(absolute) ? readFileSync(absolute, 'utf8') : ''
    const response = hookResponse(findViolations(hookChanges(path, input, existing)))
    if (response) process.stdout.write(JSON.stringify(response))
  } catch {
    // A malformed payload or unreadable file must not block an edit.
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/floor-guard.ts')) {
  if (process.argv.includes('--hook')) {
    runHook()
    process.exit(0)
  }
  process.exit(runDiff())
}
