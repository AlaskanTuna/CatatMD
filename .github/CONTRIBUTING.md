# Contributing To CatatMD

This guide gets a contributor from a fresh clone to a merged pull request. Agents follow it too; their always-on rules are in [`AGENTS.md`](../AGENTS.md).

## First Run

1. Install Node 24 and Bun (the version is pinned in `package.json` under `packageManager`).
2. `bun install`, which also installs the Git hooks through Husky.
3. `cp .env.example .env` and fill in the values the comments mark as required. Local development needs a Postgres database: `docker compose up -d` starts one on port 5434. Every provider key is optional at boot. Without an LLM key the analysis calls fail, and without an ASR key the hosted speech routes answer 503; a Gemini free-tier key is enough for local work on synthetic data.
4. `bun run db:migrate`, then `bun run db:seed`.
5. `bun run dev`. The frontend is on `http://localhost:5173` and the API on `http://localhost:3001`.
6. `bun run verify` before your first commit, to confirm the toolchain is green on your machine.

Optional tools: [Gitleaks](https://github.com/gitleaks/gitleaks) 8.30.1 for the local secret scan (CI runs it regardless), and the `gh` CLI for issues and pull requests.

> **Never point `.env` at the shared Supabase database for local work or tests.** The route and auth suites write real rows, so a run against Supabase edits live shared data. Point `DATABASE_URL` and `DIRECT_URL` at the Docker Postgres on port 5434.

## Running Tests

The root `bun run test` (and so `bun run verify`) needs a migrated Postgres, because the backend route and auth suites exercise real ownership scoping and audit writes. These scoped runs need no database and no API key:

| Command                                     | What It Covers                         |
| ------------------------------------------- | -------------------------------------- |
| `bun run --cwd frontend test`               | Every frontend component and hook test |
| `bun run --cwd shared test`                 | The shared Zod contracts               |
| `bun run --cwd backend test src/deid`       | The de-identification gate             |
| `bun run --cwd backend test src/redflags`   | The red-flag rules engine              |
| `bun run --cwd backend test src/guidelines` | The guideline corpus                   |
| `bun test scripts/floor-guard.test.ts`      | The floor guard                        |

Build `shared` first (`bun run --cwd shared build`) if a scoped run cannot resolve `@shared/types`.

## Paths That Need A Second Review

A change under these paths is a clinical-safety or data change. Run the named reviewer from `.claude/agents/`, fill in the Clinical-Safety Checklist, and ask a maintainer to review before merging.

| Path                                               | Why                                                  | Reviewer                   |
| -------------------------------------------------- | ---------------------------------------------------- | -------------------------- |
| `backend/src/deid/`                                | The trust boundary: what leaves the API              | `phi-boundary-auditor`     |
| `backend/src/lib/llm/`, `backend/src/lib/asr/`     | The only egress points to model and speech providers | `phi-boundary-auditor`     |
| `backend/src/redflags/`, `backend/src/guidelines/` | Patient-safety rules and the citation corpus         | `clinical-safety-reviewer` |
| `prisma/`                                          | Schema, migrations, the audit hash chain             | `db-migrator`              |

## Lanes To Main

The lane is chosen by what the change is, not by how big it is.

| Lane            | What Qualifies                                                                            | How It Ships                                                                                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Docs Lane**   | Prose only: `docs/**` and root prose such as `README.md`. The whole diff, not part of it. | Commit straight to `main`. Every push runs `verify`, so the commit stands on its own. It does not deploy: `docs/**` is outside the deployable-paths filter in `ci.yml` (#82); keep it that way. |
| **Branch Lane** | Everything else, including one-line code, config and workflow fixes, and any mixed diff.  | Branch, pull request, `gh pr merge --squash --delete-branch`.                                                                                                                                   |

- **Markdown is not automatically docs.** `AGENTS.md`, `docs/agents/**`, `.claude/**`, `.agents/skills/**` and `.github/*.md` change how agents behave. They take the Branch Lane whatever their size.
- **A stacked pull request is the one case where `--delete-branch` is wrong.** Deleting a branch closes every pull request based on it instead of retargeting them. Merge the child first, or merge the parent without `--delete-branch` and delete the branch once the child lands (#351, #352, #353).

## Issues

- Every piece of work starts as an issue, filed from `.github/ISSUE_TEMPLATE/` (`task.yml` or `bug.yml`), with an assignee and labels.
- **Acceptance Criteria** and **File Scope** are required. They are what make parallel work collision-free and review objective.
- Labels: one `type:*` (`task`, `bug`), one `area:*` (`deid`, `llm`, `asr`, `redflags`, `guidelines`, `api`, `ui`, `db`, `infra`, `docs`), and a `priority:*` (`p0` to `p2`) where it matters.
- Search open and closed issues and pull requests before filing, and link any that overlap.

## Branches And Commits

- **Branch names:** `<type>/<short-topic>`, for example `fix/deid-spoken-dob` or `feat/ic-scan-intake`.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <imperative summary>`, sentence case, no trailing period. commitlint enforces it in the `commit-msg` hook. Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore`, `revert`.
- **The pull request title** becomes the squash commit, so it follows the same format and ends with the issue number: `fix(deid): tokenise a date of birth said as words (#441)`.

## Pull Requests

1. Fill in `.github/PULL_REQUEST_TEMPLATE.md`. The **Clinical-Safety Checklist** is required when the diff touches `deid/`, `lib/llm/`, `lib/asr/`, `redflags/`, `guidelines/` or logging.
2. `bun run verify` passes locally. It is the same gate CI runs: lint, format check, typecheck, every test suite, and the floor guard.
3. A change to an API route updates its handler in `frontend/src/preview/` in the same pull request, because previews run on that stub backend.
4. A change to `prisma/schema.prisma` ships its migration. Production does not apply migrations on deploy; the template's Migrations section says what to run after merging.
5. Run the matching reviewer from `.claude/agents/` on a diff in its area (`docs/agents/skills.md` lists them).

## Deploys

- A merge to `main` that touches a deployable path deploys the frontend to Vercel and the API to Render through the `deploy` job in `ci.yml`.
- Check that it did: `gh run list --branch main --limit 3`. A skipped deploy is silent, and the failure mode is production sitting behind `main`.
- A pull request that changes the bundle gets a Vercel preview, built with `VITE_PREVIEW_STUB=true` so `frontend/src/preview/` answers every `/api` call with synthetic data.

## Never

- Force-push, rewrite published history, or delete a branch other than a merged feature branch.
- Commit a secret, or real patient data. Fixtures are synthetic.
- Skip, focus or delete a test, or add a lint suppression, to go green. If one is truly intended, say why in the pull request; a maintainer adds the `Floor-Guard-Allow: <reason>` commit trailer.
