import { describe, expect, it } from 'vitest'
import {
  type Change,
  findViolations,
  hookChanges,
  hookResponse,
  isAllowed,
  parseDiff,
} from './floor-guard'

const change = (path: string, added: string[], removed: string[] = []): Change => ({
  path,
  added: added.map((text, index) => ({ line: index + 1, text })),
  removed,
  deleted: false,
})

const rules = (...changes: Change[]) => findViolations(changes).map((violation) => violation.rule)

describe('parseDiff', () => {
  it('reads added lines, removed lines, and deleted files', () => {
    const diff = [
      'diff --git a/backend/src/a.ts b/backend/src/a.ts',
      'index 1111111..2222222 100644',
      '--- a/backend/src/a.ts',
      '+++ b/backend/src/a.ts',
      '@@ -3 +3,2 @@',
      '-const oldValue = 1',
      '+const newValue = 1',
      '++counter',
      '@@ -10,0 +12 @@',
      '+// TODO: finish',
      'diff --git a/backend/src/a.test.ts b/backend/src/a.test.ts',
      'deleted file mode 100644',
      'index 3333333..0000000',
      '--- a/backend/src/a.test.ts',
      '+++ /dev/null',
      '@@ -1 +0,0 @@',
      '-expect(1).toBe(1)',
    ].join('\r\n')

    expect(parseDiff(diff)).toEqual([
      {
        path: 'backend/src/a.ts',
        added: [
          { line: 3, text: 'const newValue = 1' },
          { line: 4, text: '+counter' },
          { line: 12, text: '// TODO: finish' },
        ],
        removed: ['const oldValue = 1'],
        deleted: false,
      },
      {
        path: 'backend/src/a.test.ts',
        added: [],
        removed: ['expect(1).toBe(1)'],
        deleted: true,
      },
    ])
  })
})

describe('findViolations', () => {
  it('passes changes that do not lower the floor', () => {
    expect(rules(change('backend/src/handler.ts', ['const answer = 1']))).toEqual([])
  })

  it('flags Biome and TypeScript suppression markers at their line', () => {
    const biome = findViolations([
      change('backend/src/auth.ts', [
        'const allowed = true',
        '// biome-ignore lint/suspicious/noExplicitAny: reason',
      ]),
    ])
    expect(biome).toEqual([{ rule: 'a check silenced', path: 'backend/src/auth.ts', line: 2 }])
    expect(rules(change('backend/src/auth.ts', ['// biome-ignore format: reason']))).toEqual([
      'a check silenced',
    ])
    expect(rules(change('backend/src/auth.ts', ['// @ts-ignore']))).toEqual(['a check silenced'])
    expect(rules(change('backend/src/auth.ts', ['// @ts-expect-error']))).toEqual([
      'a check silenced',
    ])
    expect(rules(change('backend/src/auth.ts', ['// @ts-nocheck']))).toEqual(['a check silenced'])
    expect(rules(change('backend/src/auth.ts', ['/* eslint-disable no-console */']))).toEqual([
      'a check silenced',
    ])
  })

  it('does not flag a suppression that only moved', () => {
    expect(rules(change('backend/src/auth.ts', ['  // @ts-ignore'], ['// @ts-ignore']))).toEqual([])
  })

  it('flags skipped, focused, and todo tests in Vitest test files', () => {
    expect(
      rules(
        change('backend/src/handler.test.ts', [
          "it.skip('refuses', () => {})",
          "describe.only('suite', () => {})",
          "test.todo('later')",
          "xit('old test', () => {})",
          "xdescribe('old suite', () => {})",
          "fit('focused test', () => {})",
        ]),
      ),
    ).toEqual(['a test skipped or focused'])
    expect(rules(change('frontend/src/handler.test.tsx', ["test.skip('later')"]))).toEqual([
      'a test skipped or focused',
    ])
    expect(rules(change('backend/src/handler.ts', ["test.skip('later')"]))).toEqual([])
    expect(rules(change('backend/src/parser.test.ts', ['reader.skip(4)']))).toEqual([])
  })

  it('flags a deleted test file', () => {
    const deleted = {
      ...change('backend/src/handler.test.ts', [], ['expect(true).toBe(true)']),
      deleted: true,
    }
    expect(rules(deleted)).toEqual(['a test file deleted'])
    expect(rules({ ...change('backend/src/old.ts', []), deleted: true })).toEqual([])
  })

  it('flags a net reduction in test assertions', () => {
    expect(
      rules(
        change(
          'backend/src/handler.test.ts',
          ['expect(result).toEqual(expected)'],
          ['expect(first).toBe(1)', 'expect(second).toBe(2)'],
        ),
      ),
    ).toEqual(['an assertion removed'])
    expect(
      rules(
        change(
          'backend/src/handler.test.ts',
          ['expect(result).toEqual(expected)'],
          ['expect(result).toBe(expected)'],
        ),
      ),
    ).toEqual([])
  })

  it('flags an empty catch block', () => {
    expect(rules(change('backend/src/handler.ts', ['} catch {}']))).toEqual(['an empty catch'])
    expect(rules(change('backend/src/handler.ts', ['} catch (error) { }']))).toEqual([
      'an empty catch',
    ])
    expect(
      rules(
        change('backend/src/handler.ts', ['} catch {', '  // reason for ignoring this error', '}']),
      ),
    ).toEqual([])
  })

  it('flags unfinished work markers', () => {
    expect(rules(change('backend/src/handler.ts', ['// TODO: finish this']))).toEqual([
      'unfinished work',
    ])
    expect(rules(change('backend/src/handler.ts', ['// FIXME: handle this']))).toEqual([
      'unfinished work',
    ])
    expect(rules(change('backend/src/handler.ts', [], ['// TODO: finish this']))).toEqual([])
  })

  it('ignores prose, vendored, generated, and guard paths', () => {
    const paths = [
      'docs/notes.md',
      '.claude/skills/example/helper.ts',
      '.agents/skills/example/helper.ts',
      'graphify-out/generated.ts',
      'prisma/migrations/20260101_init/migration.sql',
      'backend/node_modules/pkg/index.ts',
      'frontend/dist/assets/index.ts',
      'bun.lock',
      'scripts/floor-guard.ts',
      'scripts/floor-guard.test.ts',
    ]
    expect(
      rules(...paths.map((path) => change(path, ['// @ts-ignore', '// TODO: later']))),
    ).toEqual([])
  })
})

describe('isAllowed', () => {
  it('requires a reason on a Floor-Guard-Allow trailer', () => {
    expect(isAllowed('chore: remove stale test\n\nFloor-Guard-Allow: test is obsolete\n')).toBe(
      true,
    )
    expect(isAllowed('chore: remove stale test\n\nFloor-Guard-Allow:\n')).toBe(false)
    expect(isAllowed('chore: mention Floor-Guard-Allow: in passing')).toBe(false)
  })
})

describe('hookChanges and hookResponse', () => {
  it('compares writes and edits with their prior text and reports the edited line', () => {
    const write = hookChanges(
      'backend/src/handler.test.ts',
      { content: 'expect(first).toBe(1)' },
      'expect(first).toBe(1)\nexpect(second).toBe(2)',
    )
    expect(findViolations(write).map((violation) => violation.rule)).toEqual([
      'an assertion removed',
    ])

    const edit = hookChanges(
      'backend/src/handler.ts',
      { old_string: 'const value = 1', new_string: 'const value = 1\n// @ts-ignore' },
      'first line\nconst value = 1',
    )
    const violations = findViolations(edit)
    expect(violations).toEqual([
      { rule: 'a check silenced', path: 'backend/src/handler.ts', line: 3 },
    ])
    expect(hookResponse(violations)?.hookSpecificOutput).toMatchObject({
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
    })
    expect(JSON.stringify(hookResponse(violations))).toContain('backend/src/handler.ts:3')
    expect(JSON.stringify(hookResponse(violations))).not.toContain('@ts-ignore')

    const multiEdit = hookChanges(
      'backend/src/handler.ts',
      {
        edits: [
          {
            old_string: 'const value = 1',
            new_string: 'const value = 1\n// biome-ignore lint: reason',
          },
        ],
      },
      'first line\nconst value = 1',
    )
    expect(findViolations(multiEdit)).toEqual([
      { rule: 'a check silenced', path: 'backend/src/handler.ts', line: 3 },
    ])
  })

  it('does not request a decision for clean edits', () => {
    expect(hookResponse([])).toBeUndefined()
  })
})
