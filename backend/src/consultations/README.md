# Consultations

## Purpose

Own the consultation domain logic used by the HTTP routes.

## Owns

- Persisted row mapping to the consultation detail contract.
- The shared analysis pipeline and its rehydration helpers.
- PATCH validation and update logic, including disposition merging.

## Entry Points

- `detail.ts`: `toDetail` and `toDetailWithApprover`.
- `analysis.ts`: `runAnalysis`, `classifyFailure`, and `rehydrateAssertions`.
- `update.ts`: `PatchBodySchema`, `updateConsultation`, and `batchMetadata`.
- `index.ts`: public exports for route consumers.

## Used By

- `routes/consultations.ts` parses requests, checks ownership, calls these entry points, and writes responses.
- `routes/copilot.ts` reuses `toDetailWithApprover` for the consultation detail contract.
- `bench/workflow.ts` remains independent because its stage timings and measured projection differ from the full analysis result.

## Invariants

- `runAnalysis` de-identifies before model calls. Deterministic red flags remain additive through the plain union helper.
- `updateConsultation` never approves a consultation. Approval stays in the explicit route.
- Audit events continue through `recordAuditEvent`; clinical text is not added to audit metadata.

## Tests

- `routes/consultations.test.ts` covers details, analysis, and PATCH behavior against Postgres.
- `routes/no-stray-approval.test.ts` protects the single explicit approval write.
- `audit/no-stray-audit-writes.test.ts` protects the audit writer boundary.
- Run with `bun run --cwd backend test`.
