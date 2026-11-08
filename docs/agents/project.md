# Project

**CatatMD** turns a GP consultation into a reviewable structured clinical note, with missing-information prompts, red-flag detection, cited clinical suggestions and a dictated prescription table. _Catat_ is Malay for "to note down".

- **Clinical scope is deliberately narrow:** adult GP consultations for acute cough, sore throat and other upper respiratory symptoms.
- **It does not diagnose and does not replace clinical judgement.** The doctor reviews, edits and approves every output, and stays responsible for every medical decision.
- **All consultation data in this repository is simulated.** No real patient data enters it.
- **Quality is a deliverable.** Security posture, tests and documentation are first-class, not polish added later.

## Architecture

Three tiers: React SPA, Express API, Postgres. The API is the only component that holds identifiable data. The LLM sits **outside** the trust boundary and is reached only through a de-identification gate. Four commitments shape the code; `docs/agents/invariants.md` states the rules they imply.

| Commitment                        | Where It Lives                                      | What It Guarantees                                                                                                                                                                     |
| --------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The PHI boundary**              | `backend/src/deid/`                                 | Identifiers become stable pseudonymous tokens (`[PATIENT_1]`, `[NRIC_1]`) in a request-scoped vault before any text leaves the API; responses are re-hydrated on the way back.         |
| **One egress point**              | `backend/src/lib/llm/`                              | `LLMClient` is the only path to a model, it refuses input that has not passed the gate, and the provider is a swappable adapter, so a data-residency change is a configuration change. |
| **Deterministic red flags first** | `backend/src/redflags/`                             | A rules engine over a versioned trigger list runs first; the LLM pass may only _add_ candidates for review, never suppress a rule hit.                                                 |
| **ID-constrained citations**      | `backend/src/guidelines/`, `backend/src/retrieval/` | The model may cite only guideline IDs it was given; free-text references fail at parse time, so a hallucinated reference is structurally impossible.                                   |

Implementation detail lives in `docs/TRD.md`.

## Repo Layout

```
shared/            @shared/types: Zod schemas and inferred types, built first, imported by both sides
backend/           Express 5 API (tsx dev, tsc build)
  src/deid/        PHI detection, tokenisation, re-hydration vault   (the trust boundary)
  src/lib/llm/     LLMClient port and provider adapters              (the only model egress)
  src/lib/asr/     speech-recognition adapters
  src/redflags/    deterministic escalation-trigger rules engine
  src/guidelines/  citation corpus (ID-constrained)
  src/routes/      HTTP surface
frontend/          Vite and React 19 SPA (Tailwind 4, Radix, TanStack Query)
evals/             offline evaluation harnesses
prisma/            schema.prisma, migrations, seeds (Supabase Postgres)
scripts/           repository scripts (floor guard, demo recorder)
docs/              product, architecture and operations docs
```

## Tech Stack

- **Runtime and package manager:** Node 24, Bun workspaces (`bun install`, `bun run`).
- **Shared:** TypeScript 5.9 and Zod. Schemas in `shared/` are the single source of truth for both sides.
- **Backend:** Express 5, tsx, Prisma 6, better-auth (Prisma adapter), Vitest.
- **Frontend:** React 19, Vite 7, Tailwind 4, Radix UI, TanStack Query 5, react-router 7.
- **Database:** Supabase Postgres, used as Postgres only. The pooled URL (`:6543`) serves the app; the direct URL (`:5432`) runs migrations.
- **LLM:** provider-agnostic, selected by `LLM_PROVIDER`. Qwen through Alibaba Model Studio's Singapore endpoint is the default; Gemini's free tier is local-only on synthetic data; DeepSeek is for benchmarking.
- **Tooling:** Biome (lint and format), Prettier (Markdown and YAML), Husky, commitlint, lint-staged, Gitleaks, Vitest.
- **Hosting:** frontend on Vercel, API on Render (Singapore), database on Supabase (Singapore). All three sit in one region by design, for data residency.

## Commands

```bash
bun install                  # install all workspaces
bun run dev                  # shared watch, backend and frontend together
bun run dev:backend          # build shared, then the backend only
bun run dev:frontend         # build shared, then the frontend only

bun run db:migrate           # prisma migrate dev (uses DIRECT_URL)
bun run db:studio            # prisma studio
bun run prisma:generate      # regenerate the client

bun run verify               # the gate: lint, format check, typecheck, tests, floor guard
bun run lint                 # biome check .
bun run format               # biome format, plus prettier for Markdown and YAML
bun run typecheck            # tsc --noEmit across every workspace
bun run test                 # vitest across every workspace
bun run build                # shared, prisma generate, backend tsc, frontend vite build
```
