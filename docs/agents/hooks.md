# Hooks

Hooks turn the rules in `docs/agents/invariants.md` into enforcement. Claude Code hooks are wired in `.claude/settings.json`, which holds only the wiring; Git hooks live in `.husky/`. Every Claude Code hook command starts with a `[ ! -f ... ] ||` guard, so a missing script never blocks a session.

## Claude Code

| Event                        | Script                                       | What It Does                                                                                                                                                                                                                                                |
| ---------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SessionStart`               | `.claude/hooks/env-drift.mjs`                | Reports when the local `.env` disagrees with `.env.example` or with the main checkout. Names keys only, never values. Does not fire on compaction.                                                                                                          |
| `PreToolUse` on Bash         | `.claude/hooks/block-dangerous-git.mjs`      | Denies force pushes and `filter-branch` outright. Asks before hard resets, force branch deletes, force cleans and wholesale working-tree discards. Plain pushes and `gh pr merge` pass, so neither lane breaks. The `!` prefix goes through the same guard. |
| `PreToolUse` on Edit, Write  | `.claude/hooks/no-em-dash-or-emoji.mjs`      | Blocks content that introduces an em dash or an emoji.                                                                                                                                                                                                      |
| `PreToolUse` on Edit, Write  | `scripts/floor-guard.ts --hook`              | Asks the human before an edit that adds a suppression, a skipped or focused test, or an empty `catch` or `TODO`. Its own failure never blocks an edit.                                                                                                      |
| `PostToolUse` on Edit, Write | `.claude/skills/impeccable/scripts/hook.mjs` | Runs Impeccable's immediate-tier design checks on UI files.                                                                                                                                                                                                 |
| `Stop`                       | `.claude/skills/impeccable/scripts/hook.mjs` | Runs Impeccable's full-rule design pass.                                                                                                                                                                                                                    |

## Git

| Hook                 | What It Does                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `.husky/pre-commit`  | Scans staged changes with Gitleaks (skipped with a warning when Gitleaks is not installed; CI still scans), then runs lint-staged. |
| `.husky/commit-msg`  | Runs commitlint against Conventional Commits.                                                                                      |
| `.husky/post-commit` | Refreshes the committed knowledge graph when graphify is installed.                                                                |

## Changing A Hook

- Keep each script dependency-free Node, so it runs on every collaborator's machine without an install.
- Test a hook by piping a sample event into it: `echo '{"tool_input":{"command":"git status"}}' | node .claude/hooks/block-dangerous-git.mjs`.
- Change `.claude/settings.json` through the Branch Lane, like any other agent configuration.
