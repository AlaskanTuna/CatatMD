# 02. System Context & Component Responsibilities

Part of the [Technical Reference](../TRD.md).

**Status: `Built`**

Per-module contract, read as "owns / may import / must never import":

| Module                    | Owns                                                                                                                        | May Import                                                                     | Must Never Import                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `shared/`                 | Zod schemas and inferred types (`@shared/types`), the single source of truth for both sides                                 | Zod only                                                                       | Anything backend- or frontend-specific                                |
| `backend/src/deid/`       | PHI detection, tokenisation, the request-scoped rehydration vault, the only module permitted to mint a `Deidentified` value | `@shared/types`                                                                | Any LLM provider SDK                                                  |
| `backend/src/lib/llm/`    | `LLMClient` port + the OpenAI-compatible adapter, the only egress point to any provider                                     | `openai` SDK, `@shared/types`, `deid/types.js` (type-only, for `Deidentified`) | Nothing outside `lib/llm/` may import an LLM provider SDK directly    |
| `backend/src/redflags/`   | Deterministic escalation-trigger rules engine, currently an intent-stating README only                                      | `@shared/types`                                                                | An LLM provider SDK; must remain a pure function library              |
| `backend/src/guidelines/` | Curated citation corpus, currently an intent-stating README only                                                            | `@shared/types`                                                                | ,                                                                     |
| `backend/src/routes/`     | HTTP surface, currently `health.ts` only                                                                                    | `express`, `lib/prisma.js`, `config/env.js`                                    | An LLM provider SDK; PHI must reach `deid/` before any LLM call       |
| `frontend/`               | React SPA, consultation intake, review, and approval UI. Rendering constraints that dictate structure are in §24            | `@shared/types`, the backend HTTP API                                          | A provider SDK or the de-identification vault (both are backend-only) |

The load-bearing rule that cuts across the table: **no module outside `backend/src/lib/llm/` may import an LLM provider SDK directly.** This is what makes the provider swappable and is stated as a module constraint, not a convention, see §5 for the compile-time mechanism that backs the PHI half of it.

---
