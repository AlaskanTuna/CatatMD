<a id="readme-top"></a>

# backend

The backend is the Express API that stores consultation data, runs guarded clinical workflows and serves reviewable results to the frontend.

CatatMD supports adult GP consultations for acute cough, sore throat and upper respiratory symptoms. It does not diagnose. The doctor reviews, edits and explicitly approves every note. Repository consultation data is synthetic.

## Run, Build, And Test

| Command                     | Purpose                                                               |
| --------------------------- | --------------------------------------------------------------------- |
| bun install                 | Install the Bun workspaces from the repository root.                  |
| bun run dev:backend         | Build shared types, then start the backend watcher.                   |
| bun run --cwd backend build | Run the backend TypeScript build.                                     |
| bun run --cwd backend test  | Run the backend Vitest suite.                                         |
| bun run build               | Build shared types, generate Prisma, then build backend and frontend. |

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Request Path

1. backend/src/app.ts installs request context, client IP, security middleware, auth, JSON parsing, session guards and route-specific limits.
2. The matching router in backend/src/routes validates the HTTP request and coordinates domain modules.
3. Clinical text passes through backend/src/deid before it reaches the LLMClient port in backend/src/lib/llm.
4. The route validates and persists structured state, then returns it through shared contracts for doctor review.

The model provider adapter stays behind LLMClient. Approval is a separate explicit route action.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Directory Map

| Directory           | Purpose                                                               | README                                     |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| acceptance/         | Fixture-driven backend safety checks and measurement helpers.         | [README](src/acceptance/README.md)         |
| analysis/           | Structured note analysis, evidence checks and live-window folding.    | [README](src/analysis/README.md)           |
| audio/              | Consultation recording storage and retention enforcement.             | [README](src/audio/README.md)              |
| audit/              | Audit events, hash-chain verification and erasure.                    | [README](src/audit/README.md)              |
| bench/              | Synthetic consultation workflow measurements.                         | [README](src/bench/README.md)              |
| calculators/        | Evidence-based sore-throat score prefills.                            | [README](src/calculators/README.md)        |
| clinical-profiles/  | Profile identifiers, definitions and selection.                       | [README](src/clinical-profiles/README.md)  |
| clinical-versions/  | Registry of clinical artefact and profile versions.                   | [README](src/clinical-versions/README.md)  |
| config/             | Zod-validated backend runtime environment.                            | [README](src/config/README.md)             |
| copilot/            | CatatAI review prompts, tools and proposal handling.                  | [README](src/copilot/README.md)            |
| consultations/      | Consultation analysis orchestration, detail mapping and update rules. | [README](src/consultations/README.md)      |
| deid/               | Identifier detection, tokenization and request vault.                 | [README](src/deid/README.md)               |
| draft-turns/        | Speaker-turn labels for hosted-ASR transcripts.                       | [README](src/draft-turns/README.md)        |
| fixtures/           | Synthetic clinical, transcript and language fixtures.                 | [README](src/fixtures/README.md)           |
| gaps/               | Missing-information checklist and gap provenance.                     | [README](src/gaps/README.md)               |
| guidelines/         | Curated citation corpus and citation ID helpers.                      | [README](src/guidelines/README.md)         |
| lib/                | Shared auth, persistence, logging, LLM and ASR infrastructure.        | [README](src/lib/README.md)                |
| medications/        | Medication lexicon, matching and prescription parsing.                | [README](src/medications/README.md)        |
| middleware/         | Request identity, session, rate-limit, audio and error middleware.    | [README](src/middleware/README.md)         |
| note-templates/     | Medical-record template version metadata.                             | [README](src/note-templates/README.md)     |
| redflags/           | Deterministic red-flag rules and candidate merge helpers.             | [README](src/redflags/README.md)           |
| retrieval/          | Lexical and semantic guideline retrieval.                             | [README](src/retrieval/README.md)          |
| routes/             | Express routers for the API surface.                                  | [README](src/routes/README.md)             |
| scripts/            | Guideline corpus ingestion CLI.                                       | [README](src/scripts/README.md)            |
| suggestions/        | Cited suggestions and model red-flag candidates.                      | [README](src/suggestions/README.md)        |
| transcript-cleanup/ | Constrained correction proposals for transcripts.                     | [README](src/transcript-cleanup/README.md) |

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Configuration

- Runtime environment parsing lives in backend/src/config/env.ts. Local runs read the repository-root .env file.
- Use .env.example as the environment variable reference.
- The Prisma schema lives at prisma/schema.prisma. Router and middleware wiring lives in backend/src/app.ts; the process entry point is backend/src/server.ts.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §2, System Context and Component Responsibilities](../docs/architecture/02-system-context-and-component-responsibilities.md), [TRD §7, Environment Contract](../docs/architecture/07-environment-contract.md), [TRD §13, API Contracts](../docs/architecture/13-api-contracts.md) and [TRD §16, Security Controls](../docs/architecture/16-security-controls.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>
