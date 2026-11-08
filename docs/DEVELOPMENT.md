# Development

This handbook covers the day-to-day development workflow. For contribution lanes, branch and pull request rules, and review requirements, see [Contributing](../.github/CONTRIBUTING.md).

Use Node 24 or later and the Bun version pinned in the root `package.json`. Run commands from the repository root unless a command includes `--cwd`.

## Workspace Map

| Workspace       | Role                                                               | Dev, Build, And Test Commands                              | Depends On                                                   |
| --------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------ |
| Repository root | Workspace orchestration, Prisma, shared scripts, and quality gates | `bun run dev`, `bun run build`, `bun run test`             | All workspaces; local Postgres for the full test run         |
| `shared/`       | Zod contracts and inferred types for the API and SPA               | `bun run --cwd shared dev`, `build`, `typecheck`, `test`   | Zod                                                          |
| `backend/`      | Express API, clinical logic, provider adapters, and persistence    | `bun run --cwd backend dev`, `build`, `typecheck`, `test`  | `shared/`, Prisma Client, Postgres for database-backed tests |
| `frontend/`     | React SPA and browser-side audio workflows                         | `bun run --cwd frontend dev`, `build`, `typecheck`, `test` | `shared/`                                                    |
| `evals/`        | Synthetic-fixture evaluation harnesses and pure grader tests       | `bun run --cwd evals eval`, `test`, `typecheck`            | `shared/`; selected fixtures and helpers in `backend/`       |

The Vite development server uses port 5173 and proxies `/api` to the API on port 3001. The API reads the root `.env` file from both source and compiled paths.

## The Build Order

`@shared/types` exports `shared/dist/index.js` and `shared/dist/index.d.ts`. Backend and frontend TypeScript projects reference `shared/`, and both runtime imports and type resolution therefore need the built output.

Build `shared/` before running a scoped backend or frontend check if `@shared/types` does not resolve. Root `typecheck`, `test`, and `build` do this automatically. The root build then generates Prisma Client, builds the backend, and builds the frontend. `dev:backend` and `dev:frontend` build shared first; `dev` starts the shared watch task alongside the API and SPA.

## Every Script

### Root Scripts

| Script              | What It Does                                                                            |
| ------------------- | --------------------------------------------------------------------------------------- |
| `dev`               | Runs the shared TypeScript watcher, backend watcher, and Vite server together.          |
| `dev:backend`       | Builds shared, then starts the backend watcher.                                         |
| `dev:frontend`      | Builds shared, then starts Vite.                                                        |
| `db:migrate`        | Runs Prisma's local development migration flow against `prisma/schema.prisma`.          |
| `db:migrate:deploy` | Applies existing migrations with Prisma's deploy flow.                                  |
| `db:status`         | Shows migration status for the configured database.                                     |
| `db:seed`           | Builds shared and runs `prisma/seed.ts`.                                                |
| `db:seed:demo`      | Builds shared and runs the synthetic consultation seed in `prisma/seed-demo.ts`.        |
| `corpus:ingest`     | Builds shared and runs the clinical practice guideline ingestion script.                |
| `db:studio`         | Opens Prisma Studio for the configured database.                                        |
| `prisma:generate`   | Regenerates Prisma Client from `prisma/schema.prisma`.                                  |
| `lint`              | Runs `biome check .`.                                                                   |
| `lint:fix`          | Runs Biome checks and applies available fixes across the repository.                    |
| `format`            | Formats supported source files with Biome and Markdown/YAML with Prettier.              |
| `format:check`      | Checks Biome formatting and Prettier formatting without writing changes.                |
| `typecheck`         | Builds shared, then typechecks shared, backend, frontend, and evals.                    |
| `test`              | Builds shared, runs all workspace tests, the floor-guard tests, and offline demo tests. |
| `verify`            | Runs lint, format check, typecheck, the full test command, and the floor guard.         |
| `floor-guard`       | Runs `scripts/floor-guard.ts --diff` against changed and untracked code files.          |
| `build`             | Builds shared, generates Prisma Client, then builds backend and frontend.               |
| `start`             | Starts the compiled backend from `backend/dist/server.js`.                              |
| `prepare`           | Installs Husky hooks.                                                                   |
| `evals`             | Builds shared and runs the pipeline evaluation harness.                                 |
| `demo:offline`      | Runs the offline demo recorder and media helper tests.                                  |

### Workspace Scripts

| Workspace   | Script           | What It Does                                                       |
| ----------- | ---------------- | ------------------------------------------------------------------ |
| `shared/`   | `build`          | Compiles declarations and JavaScript into `shared/dist/`.          |
| `shared/`   | `dev`            | Rebuilds shared continuously and preserves watch output.           |
| `shared/`   | `typecheck`      | Typechecks shared, including its test files.                       |
| `shared/`   | `test`           | Runs shared Vitest tests.                                          |
| `backend/`  | `dev`            | Watches and runs `src/server.ts` with `tsx`.                       |
| `backend/`  | `build`          | Compiles the backend TypeScript project.                           |
| `backend/`  | `start`          | Runs the compiled `dist/server.js`.                                |
| `backend/`  | `typecheck`      | Typechecks the backend, including tests.                           |
| `backend/`  | `test`           | Runs backend Vitest tests, allowing an empty selection.            |
| `backend/`  | `bench:workflow` | Runs the workflow benchmark in `src/bench/workflow.ts`.            |
| `frontend/` | `dev`            | Starts Vite.                                                       |
| `frontend/` | `build`          | Runs `tsc -b`, then builds the Vite bundle.                        |
| `frontend/` | `preview`        | Serves the built frontend through Vite's preview server.           |
| `frontend/` | `typecheck`      | Typechecks frontend source without emitting files.                 |
| `frontend/` | `test`           | Runs Vitest under `frontend/src/`.                                 |
| `evals/`    | `eval`           | Runs `evals/run.ts` through `tsx`.                                 |
| `evals/`    | `test`           | Runs the pure eval grader and word-error-rate tests.               |
| `evals/`    | `typecheck`      | Typechecks eval sources and the included backend fixtures/helpers. |

## Environment Variables

The root `.env.example` documents application configuration. Do not commit `.env` or place real patient data in any local service. The table describes use, not values.

### Runtime

| Variable            | Required When | What It Does                                                                                            |
| ------------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`          | Optional      | Selects development, test, or production behavior.                                                      |
| `PORT`              | Optional      | Sets the API listen port.                                                                               |
| `CORS_ORIGIN`       | Optional      | Sets the browser origin allowed by the API.                                                             |
| `TRUSTED_PROXY_IPS` | Optional      | Lists proxy addresses whose forwarded client IP may be trusted. Leave empty for direct local API calls. |
| `LOG_LEVEL`         | Optional      | Sets log verbosity. Redaction remains enabled at every level.                                           |

### Database

| Variable            | Required When                                                 | What It Does                                                                                         |
| ------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | Required for API startup and Prisma runtime access            | Supplies the runtime Postgres connection. Point local work at Docker Postgres.                       |
| `DIRECT_URL`        | Required by the backend environment schema and for migrations | Supplies Prisma's direct migration connection. For local work, point it at the same Docker database. |
| `DATABASE_PASSWORD` | Only when assembling a hosted connection string               | A password placeholder in the example; the backend does not read it as a separate setting.           |

### Authentication And Demo Accounts

| Variable               | Required When                                              | What It Does                                                                                         |
| ---------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`   | Required for API startup                                   | Signs better-auth session data.                                                                      |
| `BETTER_AUTH_URL`      | Required for API startup                                   | Sets the canonical auth URL.                                                                         |
| `GUEST_EMAIL`          | Set together with `GUEST_PASSWORD` to enable guest sign-in | Identifies the shared guest account. If either credential is absent, the guest route stays disabled. |
| `GUEST_PASSWORD`       | Set together with `GUEST_EMAIL` to enable guest sign-in    | Authenticates the shared guest account.                                                              |
| `SEED_DOCTOR_PASSWORD` | Optional when running `db:seed`                            | Lets the seed create its two demo doctor accounts. Existing email accounts are left unchanged.       |

### LLM And Guideline Retrieval

| Variable                     | Required When                                             | What It Does                                                                                                                                                                     |
| ---------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LLM_PROVIDER`               | Optional at boot; set to choose a provider                | Selects the LLM adapter used for generation.                                                                                                                                     |
| `QWEN_API_KEY`               | Required when Qwen generation or embeddings are used      | Authenticates Qwen requests.                                                                                                                                                     |
| `QWEN_BASE_URL`              | Optional                                                  | Sets the Qwen-compatible API endpoint.                                                                                                                                           |
| `QWEN_MODEL`                 | Optional                                                  | Selects the Qwen generation model.                                                                                                                                               |
| `QWEN_EMBEDDING_MODEL`       | Optional                                                  | Selects the embedding model used by guideline retrieval.                                                                                                                         |
| `GEMINI_API_KEY`             | Required for Gemini calls; local synthetic-data work only | Authenticates Gemini requests. Production rejects this provider.                                                                                                                 |
| `GEMINI_MODEL`               | Optional                                                  | Selects the Gemini model.                                                                                                                                                        |
| `DEEPSEEK_API_KEY`           | Required for DeepSeek calls; benchmarking only            | Authenticates DeepSeek requests. Production rejects this provider because its API processes and stores data in the PRC, raising an unresolved PDPA 2010 s.129 transfer question. |
| `DEEPSEEK_BASE_URL`          | Optional                                                  | Sets the DeepSeek-compatible API endpoint.                                                                                                                                       |
| `DEEPSEEK_MODEL`             | Optional                                                  | Selects the DeepSeek model.                                                                                                                                                      |
| `SUPABASE_URL`               | Optional, for guideline PDF upload during ingestion       | Selects the Supabase Storage project used by the ingestion script.                                                                                                               |
| `SUPABASE_SERVICE_ROLE_KEY`  | Optional, with `SUPABASE_URL` for guideline PDF upload    | Authenticates guideline PDF storage operations.                                                                                                                                  |
| `SUPABASE_GUIDELINES_BUCKET` | Optional                                                  | Selects the guideline PDF storage bucket.                                                                                                                                        |

Provider keys are optional at boot. A selected provider still needs its key when a model call is made. Gemini is restricted to local development with synthetic data because its free-tier terms permit submitted content to be used for product improvement and human review. DeepSeek is for benchmarking, and production configuration rejects it.

### Speech And Transcript Processing

| Variable             | Required When                                      | What It Does                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ILMU_API_KEY`       | Optional; required for hosted transcription        | Enables the hosted Malay/code-switching transcription relay. Without it, the hosted route is unavailable.                                                                                               |
| `ILMU_BASE_URL`      | Optional                                           | Sets the ILMU relay endpoint.                                                                                                                                                                           |
| `ILMU_ASR_MODEL`     | Optional                                           | Selects the ILMU recognition model.                                                                                                                                                                     |
| `SONIOX_API_KEY`     | Optional; required for ambient streaming           | Enables minting browser credentials for ambient capture. Without it, the mint route is unavailable.                                                                                                     |
| `SONIOX_REGION`      | Optional                                           | Selects the region belonging to the Soniox project. The region must match the key.                                                                                                                      |
| `SONIOX_RT_MODEL`    | Optional                                           | Selects the Soniox real-time model.                                                                                                                                                                     |
| `ELEVENLABS_API_KEY` | Optional; required for batch transcript refinement | Enables refinement after ambient capture. Use a speech-to-text-only key with a credit quota, and confirm the account's data-improvement setting is off. Without it, the live transcript remains in use. |
| `TRANSCRIPT_CLEANUP` | Optional                                           | Controls the constrained transcript-correction model pass. Keep the shipped setting until the measurement in `evals/transcript-cleanup.ts` supports enabling it.                                        |

### Retention And De-Identification

| Variable                | Required When                                           | What It Does                                                                                              |
| ----------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `AUDIO_RETENTION_HOURS` | Optional, only after a clinic adopts a retention period | Controls how long stored consultation audio remains available. Unset means no recording is stored.        |
| `DEID_FAIL_CLOSED`      | Optional; production requires the fail-closed behavior  | Refuses LLM payloads that did not pass the de-identification gate. Do not disable it outside a unit test. |

### Local Tooling

| Variable               | Required When                                                              | What It Does                                                                                |
| ---------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `POSTGRES_PORT`        | Optional, if the local default port is occupied                            | Overrides the host port mapped by Docker Compose. Update both local database URLs to match. |
| `DEMO_SEED_BASE_URL`   | Optional, when seeding demo consultations against another local API URL    | Sets the API origin used by `prisma/seed-demo.ts`.                                          |
| `EVAL_API_URL`         | Optional, when running API-driven evals against a non-default API          | Sets the API origin used by the pipeline and CatatAI proposal harnesses.                    |
| `EVAL_ORIGIN`          | Optional, when the eval request needs a different browser origin           | Sets the `Origin` header. It must be allowed by the API CORS configuration.                 |
| `EVAL_CONSULTATION_ID` | Required by the CatatAI proposal harness                                   | Selects an existing, unapproved synthetic consultation for the harness.                     |
| `EVAL_LABEL`           | Optional, when naming generated eval reports                               | Labels report files.                                                                        |
| `FFMPEG_PATH`          | Optional, when `ffmpeg` is not available on `PATH` for the ASR A/B harness | Sets the local ffmpeg binary path. The harness also locates `ffprobe` beside it.            |

## Database Work

Local development and database-backed tests use the Docker Postgres service in `docker-compose.yml`. It maps to host port 5434 by default and stores data in a named Docker volume.

```bash
docker compose up -d
bun run db:migrate
```

Keep both `DATABASE_URL` and `DIRECT_URL` pointed at this local database. `DATABASE_URL` is the runtime connection. `DIRECT_URL` is Prisma's migration connection. The Supabase example uses a pooled URL for runtime and a direct URL for migrations, but never run local tests against Supabase.

Use `bun run db:status` to inspect migration state, `bun run db:migrate` to create and apply a local development migration, and `bun run db:migrate:deploy` to apply committed migrations. After changing `prisma/schema.prisma`, run `bun run prisma:generate` if a command needs the updated Prisma Client.

`bun run db:seed` creates the demo doctors when `SEED_DOCTOR_PASSWORD` is set and creates the guest account when both guest credentials are set. It uses better-auth and skips existing accounts.

`bun run db:seed:demo` calls the running API as the guest account and creates synthetic fixture consultations in the states defined in `prisma/seed-demo.ts`. Analysis calls can use the configured LLM provider. The seed skips fixture consultations already present and does not delete existing data.

Use `bun run db:studio` to inspect local rows. Keep synthetic data in local databases and fixtures only.

## Testing

Tests sit beside the source they cover. The root `bun run test` runs each workspace suite, floor-guard tests, and offline demo tests. The full backend route and auth run needs a migrated local Postgres database. Do not point tests at Supabase.

| Area                     | Test Layout                                             | Database Or Service Needs                                                                                                                        |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared contracts         | `shared/src/*.test.ts`                                  | None                                                                                                                                             |
| Backend logic and routes | `backend/src/**/<name>.test.ts`                         | The full backend route and auth run needs local Postgres; focused de-identification, red-flag, and guideline suites need no database or API key. |
| Safety acceptance        | `backend/src/acceptance/safety.test.ts`                 | Synthetic fixtures and pure functions; no live model calls.                                                                                      |
| Frontend                 | `frontend/src/**/<name>.test.ts[x]`                     | No backend database. Vite's test environment is `jsdom`.                                                                                         |
| Eval graders             | `evals/graders.test.ts`, `evals/wer.test.ts`            | Pure tests; no live provider calls.                                                                                                              |
| Repository scripts       | `scripts/floor-guard.test.ts`, `scripts/demo/*.test.ts` | Demo tests use local fixtures and mocks; no application server.                                                                                  |

Run one file or filter by a test name by passing Vitest arguments after the workspace script:

```bash
bun run --cwd backend test src/redflags/evaluate.test.ts
bun run --cwd backend test src/acceptance/safety.test.ts -t "detects the red-flag fixture on every run"
bun run --cwd frontend test src/review/ChecklistPanel.test.tsx
```

The root test command also runs `bun test scripts/floor-guard.test.ts` and `bun run demo:offline`. A focused `bun run --cwd backend test src/deid` run needs no Postgres or provider key. Shared and frontend tests are also safe to run without the API or database.

### No-Stray Guard Tests

These tests scan source to pin sensitive call sites and prevent accidental bypasses. Update a pinned inventory only when the architecture change is deliberate and reviewed.

| Test                                                                | What It Enforces                                                                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `backend/src/deid/no-stray-brand-casts.test.ts`                     | Pins every cast to `Deidentified`, so only the de-identification module mints the egress brand.                          |
| `backend/src/deid/no-stray-other-language.test.ts`                  | Checks that the untranslated transcript field is absent from model-bound text and is not read by backend source.         |
| `backend/src/lib/llm/no-stray-provider-sdk.test.ts`                 | Keeps provider SDK imports in the LLM adapter and pins the repo-wide provider import count.                              |
| `backend/src/lib/asr/no-stray-fetch.test.ts`                        | Pins the native `fetch` call sites used for ASR egress.                                                                  |
| `frontend/src/no-stray-fetch.test.ts`                               | Pins browser network call sites, keeps API requests on the app origin, and limits refinement uploads to ambient capture. |
| `frontend/src/audio/no-stray-audio-persistence.test.ts`             | Prevents audio persistence outside the allowed module and pins modules that may send recordings.                         |
| `frontend/src/audio/live/no-stray-websocket.test.ts`                | Pins the browser WebSocket construction site to the ambient stream client.                                               |
| `frontend/src/audio/live/no-stray-transformers.test.ts`             | Prevents worker-driving code from reaching the inference library through direct or transitive imports.                   |
| `backend/src/routes/no-stray-approval.test.ts`                      | Keeps the approval state write in the consultation approval route and pins it to one write.                              |
| `backend/src/audit/no-stray-audit-writes.test.ts`                   | Routes `AuditEvent` writes through the audit module, scanning backend source and Prisma scripts.                         |
| `backend/src/clinical-versions/no-stray-clinical-constants.test.ts` | Keeps trigger and checklist identifiers and guideline scoring systems in versioned clinical data.                        |
| `frontend/src/no-stray-dev-references.test.ts`                      | Prevents internal document references from shipping in frontend source.                                                  |

### Acceptance Suite And Evals

The safety acceptance suite runs as part of the backend tests. It checks the privacy gateway, deterministic red flags, citation constraints, unknown-versus-denied assertions, and documentation gaps against synthetic fixtures. Its report is an engineering check against synthetic inputs, not clinical validation or real-world performance evidence.

The pipeline eval, `bun run evals`, needs a running API and a configured LLM provider. It sends each synthetic fixture through the real ephemeral analysis route, makes real model calls, and writes a report under `evals/reports/`. It does not persist a `Consultation`, but it does write an ephemeral-analysis audit event. Run it after changes to prompts, retrieval, analysis schemas, or provider behavior when you need a measured end-to-end comparison. Critical grader failures exit non-zero. See [the eval guide](../evals/README.md) for harness details.

Other measurement harnesses are separate from `bun run evals` and the test suite:

- Run `evals/transcript-cleanup.ts` when measuring whether the constrained correction pass adds correct proposals beyond the deterministic table. It spends real LLM calls and measures the pass policy, not the API route merge.
- Run `evals/copilot-proposals.ts` after changing CatatAI proposal prompting. It drives the real API with an existing unapproved synthetic consultation and real LLM calls.
- Run `evals/asr-ab.ts` when comparing hosted ASR models or segmentation. It uses real provider calls, requires synthetic or scripted audio, and may require local ffmpeg. It is not part of `bun run evals`.

## Code Conventions

- Parse HTTP, LLM, and environment boundaries with Zod schemas. Keep shared contracts in `shared/src/` (exported from `index.ts`) and derive TypeScript types with `z.infer`.
- Do not use `any`. Accept `unknown` at untrusted boundaries and narrow it with validation.
- Keep strict TypeScript checks enabled. The root config rejects unchecked indexed access, unused locals and parameters, and implicit overrides.
- Use `camelCase` for values and functions, `PascalCase` for React components and types, and uppercase names for environment variables and pinned constants.
- Use lowercase kebab-case for utility modules, such as `live-fold.ts`. Use PascalCase for React component files, such as `CapturePanel.tsx`.
- Keep tests beside their source as `<name>.test.ts` or `<name>.test.tsx`.
- Use `import type` for type-only imports. Biome rejects explicit `any` and non-null assertions, and warns on `console` calls other than `console.error` and `console.warn`.
- Comment why a rule exists when the reason is not obvious. Do not comment what the code already says.

## Adding Things

### A New API Route

- Add the handler under `backend/src/routes/` and mount it in `backend/src/app.ts`. Add session or rate-limit middleware there when the route needs it.
- Put request and response contracts in `shared/src/` (exported from `index.ts`), then use them in the route and `frontend/src/lib/api.ts`.
- Add backend route tests beside the route. Add a matching handler in `frontend/src/preview/backend.ts` and cover it in `frontend/src/preview/stub.test.ts`; an unhandled preview route returns 501.

### A New Shared Schema

- Add the Zod schema and inferred type in `shared/src/` (exported from `index.ts`). Do not hand-write a parallel type.
- Add or extend tests in `shared/src/` and export the contract from the shared module.
- Build shared before checking consumers so `shared/dist/` contains the exported declaration and JavaScript.

### A New Red-Flag Trigger

- Read `backend/src/redflags/README.md` and the clinical safety rules before changing trigger behavior.
- Add the trigger, its source, severity, and version metadata in `backend/src/redflags/triggers.ts`.
- Add positive, negative, language, and context cases to the relevant tests under `backend/src/redflags/`.
- Add or update a synthetic case in `backend/src/fixtures/corpus.ts` and its expected IDs in `backend/src/fixtures/rubrics.ts`; the acceptance suite uses those fixtures.

### A New LLM Or ASR Adapter

- Keep LLM transport behind `backend/src/lib/llm/types.ts` and `backend/src/lib/llm/index.ts`. Keep provider-specific code under `backend/src/lib/llm/` and preserve `Deidentified` inputs and Zod-validated outputs.
- Keep speech-provider code under `backend/src/lib/asr/`. Add validated configuration in `backend/src/config/env.ts`, and use shared contracts for data crossing the API boundary.
- Add adapter tests beside the implementation. Review `backend/src/lib/llm/no-stray-provider-sdk.test.ts` and `backend/src/lib/asr/no-stray-fetch.test.ts` when changing outbound call sites.
- For browser audio changes, also review `frontend/src/no-stray-fetch.test.ts`, `frontend/src/audio/no-stray-audio-persistence.test.ts`, and the live socket guard.

### A New Migration

- Change `prisma/schema.prisma`, then run `bun run db:migrate` against local Docker Postgres to create and apply the migration.
- Review the generated SQL under `prisma/migrations/`, then regenerate Prisma Client with `bun run prisma:generate` when consumers need the new model or field.
- Update `prisma/seed.ts` or `prisma/seed-demo.ts` only when the new data belongs in those synthetic seed flows. Never create or test migrations against Supabase from a local task.

## Quality Gates

Run `bun run verify` before considering a code change ready. It runs Biome lint, formatting checks, workspace typechecks, all tests, and the floor guard.

`bun run floor-guard` checks changed and untracked TypeScript, JavaScript, and SQL files against the merge base with `origin/main`. It flags added suppressions, skipped or focused tests, removed test assertions, empty `catch` blocks, `TODO` or `FIXME` markers, and deleted test files. It needs an available `origin/main` reference to compare changes.

Husky runs Gitleaks on staged changes when installed, then `lint-staged` on pre-commit. The commit message hook runs commitlint. The post-commit hook refreshes the knowledge graph when the graph file and CLI are present.

Claude Code hooks report environment drift, block or ask about selected dangerous Git commands, reject edits that introduce an em dash or emoji, and ask before an edit lowers the floor. Their wiring is documented in [`docs/agents/hooks.md`](agents/hooks.md).

## Troubleshooting

| Symptom                                                        | Cause                                                                                              | Fix                                                                                                                                                              |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@shared/types` does not resolve                               | The package exports `shared/dist`, but shared has not been built in this checkout.                 | Run `bun run --cwd shared build`, then repeat the scoped command.                                                                                                |
| Prisma reports a missing generated model or field              | The schema changed after Prisma Client was generated.                                              | Run `bun run prisma:generate`.                                                                                                                                   |
| API cannot connect to Postgres                                 | Docker Postgres is stopped, the port is occupied, or the local URLs point elsewhere.               | Start Docker Compose. If port 5434 is occupied, set `POSTGRES_PORT` and update both local database URLs.                                                         |
| A migration fails against the local database                   | `DIRECT_URL` is missing or points at a different database than local development.                  | Set both database URLs to the local Docker Postgres; `DIRECT_URL` is used for migrations. Never use Supabase for tests.                                          |
| A fresh worktree has no `.env`                                 | `.worktreeinclude` copies `.env` only when the worktree is created, and does not refresh it later. | Create a local `.env` from `.env.example`, set local database URLs, and provide local credentials as needed. The env-drift hook reports key names, never values. |
| Skills under `.claude/skills/` appear as text files on Windows | Git created placeholder files because Windows symlink support was unavailable.                     | Follow the recovery steps in [the skills README](../.agents/skills/README.md). Enabling symlink support alone does not repair an existing checkout.              |
| Floor guard says it cannot compare with `origin/main`          | The local repository lacks the merge-base reference the diff check needs.                          | Fetch the current origin reference, then rerun `bun run floor-guard`.                                                                                            |
