import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * GitHub issue #172, closing a gap left open by #171.
 *
 * `.claude/rules/security.md` says the ASR relay is the only path audio may
 * take out of the API, and that no other module may call an ASR provider. Until
 * now that was a sentence rather than a check. The sibling guard
 * `no-stray-provider-sdk.test.ts` catches a vendor arriving as an SDK import;
 * this one catches the case that guard structurally cannot see, which is the
 * case the relay itself is built on: an outbound call made with native `fetch`
 * and no dependency to notice.
 *
 * Three decisions, all deliberate:
 *
 * 1. **Calls are resolved from the AST, never matched as text.** Measured on
 *    the real file before writing this: `backend/src/lib/asr/ilmu.ts` contains
 *    two occurrences of the string `fetch`, one of which is the prose in its
 *    own header explaining why native fetch was chosen over the SDK. A text
 *    scan would either count that comment or need an `isComment` heuristic to
 *    excuse it. Parsing means prose naming the pattern cannot trip the guard,
 *    which matters most for a rule whose documentation has to discuss it.
 * 2. **The inventory is pinned per file, not allowlisted by path.** A second
 *    outbound call inside the file already permitted to make one is exactly the
 *    change worth catching, and a path allowlist would wave it through. Same
 *    argument as the per-file pin in `no-stray-brand-casts.test.ts`.
 * 3. **The scan keys on the call site, not on the hostname.** The ILMU base URL
 *    lives in `env`, so a hostname scan would read a variable name and prove
 *    nothing. What is invariant is that an outbound call exists at all.
 *
 * Scope is `backend/src` only. The SPA calls `fetch` on every screen and is a
 * different boundary entirely: it holds no provider key and reaches only our
 * own API. Test files are exempt because a test that stubs or asserts on
 * `fetch` is describing the boundary rather than crossing it.
 */
const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url))

const SCANNED_DIR = 'backend/src'

/**
 * The complete, intended inventory of outbound `fetch` calls in the API.
 *
 * Four entries, and they are not the same kind of thing.
 *
 * `ilmu.ts` is the audio egress the rule names: `transcribeWithIlmu` posts a
 * recording. `soniox.ts` carries no audio at all, and is here because it mints
 * the short-lived credential the browser uses to open its own stream (#268);
 * the egress it enables happens in the client, where this guard cannot see it,
 * which is why `frontend/src/audio/live/no-stray-websocket.test.ts` exists as
 * its counterpart. `elevenlabs.ts` is the same shape for refinement after Stop
 * (#436): it mints a single-use token and the browser uploads the recording,
 * which `frontend/src/no-stray-fetch.test.ts` pins on the other side.
 *
 * All three use native fetch because neither vendor's SDK may be imported: the
 * repo-wide provider-SDK inventory is pinned at one, inside `lib/llm/`, and
 * `no-stray-provider-sdk.test.ts` names both vendors so a shortcut trips it.
 *
 * `scripts/ingest-cpg.ts` is an operator-run script, not a request path: it
 * uploads a guideline PDF the operator downloaded to the project's private
 * Supabase Storage bucket. No patient data exists in that process (#220).
 *
 * Adding an entry here is the reviewable decision this test exists to force:
 * every one is a new path by which data leaves the API without passing the
 * de-identification gate, which raw audio structurally cannot pass.
 */
const EXPECTED_FETCH_CALLS: ReadonlyMap<string, number> = new Map([
  ['backend/src/lib/asr/ilmu.ts', 1],
  ['backend/src/lib/asr/soniox.ts', 1],
  ['backend/src/lib/asr/elevenlabs.ts', 1],
  ['backend/src/scripts/ingest-cpg.ts', 1],
])

function sourceFiles(): string[] {
  const found: string[] = []

  const walk = (absolute: string) => {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const child = join(absolute, entry.name)
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(child)
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        found.push(relative(REPO_ROOT, child).replaceAll('\\', '/'))
      }
    }
  }

  walk(join(REPO_ROOT, SCANNED_DIR))
  return found
}

/**
 * True for the call forms that actually reach the network.
 *
 * `fetch(...)` covers the global. The property form covers `globalThis.fetch`
 * and any aliased holder, which is the shape someone reaches for when working
 * around a guard they have noticed.
 */
function isFetchCall(node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) return false
  const callee = node.expression
  if (ts.isIdentifier(callee)) return callee.text === 'fetch'
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text === 'fetch'
  return false
}

function fetchCalls(paths: readonly string[]): string[] {
  const found: string[] = []

  for (const path of paths) {
    const text = readFileSync(join(REPO_ROOT, path), 'utf8')
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)

    const visit = (node: ts.Node) => {
      if (isFetchCall(node)) {
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
        found.push(`${path}:${line}`)
      }
      ts.forEachChild(node, visit)
    }

    visit(source)
  }

  return found
}

/** `['a.ts:1', 'a.ts:9']` to `{ 'a.ts': 2 }`. */
function countByFile(locations: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const location of locations) {
    const path = location.slice(0, location.lastIndexOf(':'))
    counts.set(path, (counts.get(path) ?? 0) + 1)
  }
  return counts
}

describe('only the ASR relay egresses with fetch (issue #172)', () => {
  it('finds source to scan, so an empty pass means something', () => {
    const scanned = sourceFiles()

    // A walk that silently returns nothing passes every assertion below
    // forever. The floor is deliberately well under the real count so it
    // survives ordinary refactoring, and well over zero.
    expect(
      scanned.length,
      'scanned almost no files under backend/src; the walk is broken or the tree moved',
    ).toBeGreaterThan(20)

    for (const pinned of EXPECTED_FETCH_CALLS.keys()) {
      expect(
        scanned,
        `${pinned} was not scanned, so the inventory below proves nothing about it`,
      ).toContain(pinned)
    }
  })

  it('excludes test files, which describe the boundary rather than cross it', () => {
    expect(sourceFiles().every((path) => !path.endsWith('.test.ts'))).toBe(true)
  })

  it('resolves the call forms that reach the network', () => {
    const forms = [
      'await fetch(url)',
      'fetch(url, { method: "POST" })',
      'const r = await globalThis.fetch(url)',
      'const r = await undici.fetch(url)',
    ]

    for (const form of forms) {
      const source = ts.createSourceFile('probe.ts', form, ts.ScriptTarget.Latest, true)
      let hits = 0
      const visit = (node: ts.Node) => {
        if (isFetchCall(node)) hits += 1
        ts.forEachChild(node, visit)
      }
      visit(source)

      expect(hits, `${JSON.stringify(form)} should be caught exactly once`).toBe(1)
    }
  })

  it('does not fire on prose or on unrelated identifiers', () => {
    const benign = [
      '// Native fetch and FormData, deliberately not the OpenAI SDK',
      'const note = "the relay calls fetch(url) directly"',
      'const data = await prefetch(url)',
      'const rows = await repository.fetchAll()',
      'type Fetcher = typeof fetch',
    ]

    for (const form of benign) {
      const source = ts.createSourceFile('probe.ts', form, ts.ScriptTarget.Latest, true)
      let hits = 0
      const visit = (node: ts.Node) => {
        if (isFetchCall(node)) hits += 1
        ts.forEachChild(node, visit)
      }
      visit(source)

      expect(hits, `${JSON.stringify(form)} should not be caught`).toBe(0)
    }
  })

  it('matches the intended inventory exactly, file by file', () => {
    const actual = countByFile(fetchCalls(sourceFiles()))

    expect(
      Object.fromEntries([...actual].sort()),
      'An outbound fetch call appeared, moved, or disappeared in backend/src. ' +
        'The ASR relay is the only egress that may make one, because audio ' +
        'cannot be de-identified and is therefore governed by bounds, audit ' +
        'and per-consultation consent instead. Text egress goes through ' +
        'deid/ then LLMClient. If a new outbound call is genuinely required, ' +
        'adding it to EXPECTED_FETCH_CALLS is the reviewable decision this ' +
        'test exists to force.',
    ).toEqual(Object.fromEntries([...EXPECTED_FETCH_CALLS].sort()))
  })
})

/**
 * Issue #487: the live relay is an audio egress that `fetch` cannot see, and the
 * second one built on a socket rather than a call.
 *
 * The API now holds a WebSocket to Qwen3-ASR realtime and accepts one from the
 * browser, so the two questions this file asks of `fetch` have to be asked of
 * sockets too: where can the API open one, and which host can it name. Both are
 * resolved from the AST for the reason the first decision above gives, and both
 * are pinned per file.
 *
 * **The global `WebSocket` is covered, not just the `ws` import.** Node 24 ships
 * one, so a module could open a socket with no import for the provider-SDK guard
 * to notice, exactly as `fetch` needs no dependency. A construction of either
 * name is counted wherever it appears.
 *
 * **A `dashscope` host is a string, not a call**, so it is found as a string
 * literal. Two files may hold one: the adapter, which pins the realtime address
 * as a literal, and `config/env.ts`, whose `QWEN_BASE_URL` default is the text
 * adapter's address and is read through `env` everywhere else. Nothing may build
 * either from configuration, which is the property worth the guard.
 */
const EXPECTED_SOCKET_SITES: ReadonlyMap<string, number> = new Map([
  ['backend/src/lib/asr/qwen-realtime.ts', 2],
  ['backend/src/lib/asr/live-relay.ts', 2],
])

const EXPECTED_DASHSCOPE_HOSTS: ReadonlyMap<string, number> = new Map([
  ['backend/src/lib/asr/qwen-realtime.ts', 1],
  ['backend/src/config/env.ts', 1],
])

/** `import ... from 'ws'`, `import('ws')` and `require('ws')`. */
function isWsSpecifier(node: ts.Node): boolean {
  const literal = (candidate: ts.Node | undefined) =>
    candidate !== undefined && ts.isStringLiteralLike(candidate) && candidate.text === 'ws'

  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return literal(node.moduleSpecifier)
  }
  if (ts.isCallExpression(node)) {
    const callee = node.expression
    const loads =
      callee.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(callee) && callee.text === 'require')
    return loads && literal(node.arguments[0])
  }
  return false
}

/** `new WebSocket(...)` and `new WebSocketServer(...)`, whichever way they were obtained. */
function isSocketConstruction(node: ts.Node): boolean {
  if (!ts.isNewExpression(node)) return false
  const callee = node.expression
  const name = ts.isIdentifier(callee)
    ? callee.text
    : ts.isPropertyAccessExpression(callee)
      ? callee.name.text
      : ''
  return name === 'WebSocket' || name === 'WebSocketServer'
}

function isSocketSite(node: ts.Node): boolean {
  return isWsSpecifier(node) || isSocketConstruction(node)
}

/** Any string that names a dashscope host, in a literal or in the text of a template. */
function isDashscopeHost(node: ts.Node): boolean {
  const text =
    ts.isStringLiteralLike(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
      ? node.text
      : undefined
  return text !== undefined && /(^|[/.])dashscope[\w-]*\./.test(text)
}

function countSites(paths: readonly string[], matches: (node: ts.Node) => boolean) {
  const found: string[] = []

  for (const path of paths) {
    const text = readFileSync(join(REPO_ROOT, path), 'utf8')
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)

    const visit = (node: ts.Node) => {
      if (matches(node))
        found.push(
          `${path}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`,
        )
      ts.forEachChild(node, visit)
    }

    visit(source)
  }

  return Object.fromEntries([...countByFile(found)].sort())
}

function hits(form: string, matches: (node: ts.Node) => boolean): number {
  const source = ts.createSourceFile('probe.ts', form, ts.ScriptTarget.Latest, true)
  let count = 0
  const visit = (node: ts.Node) => {
    if (matches(node)) count += 1
    ts.forEachChild(node, visit)
  }
  visit(source)
  return count
}

describe('only the Qwen relay opens or accepts a socket, and only it names a dashscope host (issue #487)', () => {
  it('resolves the forms that open a socket', () => {
    for (const form of [
      "import { WebSocket } from 'ws'",
      "import WebSocket from 'ws'",
      "import 'ws'",
      "export { WebSocketServer } from 'ws'",
      "const { WebSocket } = require('ws')",
      "const ws = await import('ws')",
      "const s = new WebSocket('wss://example.test')",
      'const s = new globalThis.WebSocket(url)',
      'const s = new WebSocketServer({ noServer: true })',
    ]) {
      expect(hits(form, isSocketSite), `${JSON.stringify(form)} should be caught`).toBe(1)
    }
  })

  it('does not fire on prose, lookalikes or the type of a socket', () => {
    for (const form of [
      '// opens a WebSocket to the vendor with new WebSocket(url)',
      'const note = "import { WebSocket } from \'ws\'"',
      "import { x } from 'wss-utils'",
      "import type { Server } from 'node:http'",
      'const socket: WebSocket = open()',
      'const sockets = new Set<WebSocket>()',
      'const s = new WebSocketPool()',
    ]) {
      expect(hits(form, isSocketSite), `${JSON.stringify(form)} should not be caught`).toBe(0)
    }
  })

  it('resolves a dashscope host in a literal or a template, and not in prose or a lookalike', () => {
    for (const form of [
      "const a = 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime'",
      // `\u0024` keeps the placeholder out of the source text of a plain string.
      'const a = `https://dashscope-intl.aliyuncs.com/\u0024{path}`',
      'const a = `\u0024{scheme}://dashscope.aliyuncs.com/x`',
    ]) {
      expect(hits(form, isDashscopeHost), `${JSON.stringify(form)} should be caught`).toBe(1)
    }
    for (const form of [
      '// the host is dashscope-intl.aliyuncs.com',
      "const a = 'the dashscope team'",
      "const a = 'https://example.test/dashscope'",
    ]) {
      expect(hits(form, isDashscopeHost), `${JSON.stringify(form)} should not be caught`).toBe(0)
    }
  })

  it('keeps every `ws` import and socket construction in the relay and its adapter', () => {
    expect(
      countSites(sourceFiles(), isSocketSite),
      'A WebSocket was opened or accepted somewhere other than the Qwen relay. ' +
        'Audio cannot be de-identified, so the only sockets that may carry it are ' +
        'qwen-realtime.ts (the upstream) and live-relay.ts (the browser side). ' +
        'Adding a file here is the reviewable decision this test exists to force.',
    ).toEqual(Object.fromEntries([...EXPECTED_SOCKET_SITES].sort()))
  })

  it('keeps a dashscope host to the adapter and the text model address it shares', () => {
    expect(
      countSites(sourceFiles(), isDashscopeHost),
      'A dashscope host appeared in backend/src outside qwen-realtime.ts (the ' +
        'realtime address) and config/env.ts (the QWEN_BASE_URL default the text ' +
        'adapter reads). Route text through LLMClient and audio through the relay.',
    ).toEqual(Object.fromEntries([...EXPECTED_DASHSCOPE_HOSTS].sort()))
  })
})
