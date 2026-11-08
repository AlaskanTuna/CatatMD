# Skills

Project skills are committed, so every collaborator's agent has the same capabilities on clone, with no per-machine setup.

## Layout

- **`.agents/skills/<name>/`** holds the real skill, the tool-agnostic home.
- **`.claude/skills/<name>`** is a symlink to `../../.agents/skills/<name>`, so Claude Code sees the same copy.
- **Impeccable is the one exception.** It is a real directory at `.claude/skills/impeccable/`, because its hook manifest hard-codes that path. Never rehome it.
- **`skills-lock.json`** pins the upstream source and hash of each skill installed with the `skills` CLI. Provenance for the hand-vendored sets is in `.agents/skills/.superpowers-provenance` and `.agents/skills/.mattpocock-provenance`.
- **Windows checkouts need symlink support.** `.agents/skills/README.md` has the recovery steps for a checkout where the links landed as plain text files.

## What Is Here

| Skill                                 | Use It When                                                                                                                                                                                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `healthcare-cdss-patterns`            | Touching `redflags/` or any clinical scoring. Its core rule is ours: the engine is a pure function library with zero side effects and zero tolerance for false negatives.                                                                                              |
| `healthcare-phi-compliance`           | Touching `deid/`, `AuditEvent`, or access control.                                                                                                                                                                                                                     |
| `better-auth-security-best-practices` | Touching auth wiring, or session and cookie config.                                                                                                                                                                                                                    |
| superpowers (14 skills)               | Setting the approach: brainstorming, writing-plans, test-driven-development, systematic-debugging, verification-before-completion, code review and worktrees. Process skills come before implementation skills.                                                        |
| `grilling`, `grill-me`                | Stress-testing a plan one decision at a time.                                                                                                                                                                                                                          |
| `writing-for-agents`                  | Editing `AGENTS.md`, `docs/agents/`, or authoring a skill.                                                                                                                                                                                                             |
| `cso`, `diagram`, `make-pdf`          | A security review, a diagram, or a PDF export.                                                                                                                                                                                                                         |
| `impeccable`                          | Any UI work. Its hook gives live design feedback, and `npx impeccable detect` is the deterministic audit for a UI diff. Never suppress a finding without explicit human confirmation; waivers go through `/impeccable hooks ignore-*` only. Needs Node 22.12 or later. |

## Subagents

`.claude/agents/` holds the project's domain reviewers. Run the matching one on any diff in its area.

| Agent                      | Area                                                                            |
| -------------------------- | ------------------------------------------------------------------------------- |
| `phi-boundary-auditor`     | `deid/`, `lib/llm/`, `lib/logger.ts`, `audit/`, any new egress or log field     |
| `clinical-safety-reviewer` | `redflags/`, `guidelines/`, `analysis/`, `suggestions/`, the approve transition |
| `api-security-reviewer`    | routes, middleware, config, auth                                                |
| `frontend-reviewer`        | `frontend/src/`                                                                 |
| `db-migrator`              | `prisma/` schema, migrations and seeds                                          |
| `test-engineer`            | writing, extending or triaging tests                                            |
| `ci-doctor`                | a failing workflow run or deploy                                                |
| `docs-maintainer`          | `docs/`, `README.md`, `AGENTS.md`                                               |

## Changing A Skill

- **Vendored skills are not hand-edited.** A refresh replaces them wholesale, so a local edit is lost. Put a project-specific rule in `docs/agents/` instead; it wins on any conflict.
- **Adding a skill** takes the Branch Lane: vendor it into `.agents/skills/`, add the symlink, and add a row above.
