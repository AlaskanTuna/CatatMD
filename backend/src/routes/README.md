<a id="readme-top"></a>

# Routes

Defines the Express HTTP surface and coordinates request validation, domain modules, persistence and response schemas.

## Owns

- Routers for auth, health, patients, consultations, ASR, CatatAI, notifications, reference data and settings.
- The HTTP boundary between clients and backend modules.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- asr.ts: asrRouter. auth.ts: authRouter. consultations.ts: consultationsRouter.
- copilot.ts: copilotRouter. health.ts: healthRouter. notifications.ts: notificationsRouter.
- patients.ts: patientsRouter. reference.ts: referenceRouter. settings.ts: settingsRouter.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- app.ts mounts each router and applies shared middleware, session guards and route-specific limits.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Parse request and response data with shared schemas at the HTTP boundary.
- De-identify patient-derived text before any model call. A note becomes approved only through the doctor’s explicit approval action.
- Do not import provider SDKs or bypass ownership checks.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for PHI handling, auth and approval.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- auth.test.ts, health.test.ts, patients.test.ts, consultations.test.ts and notifications.test.ts cover access and resource behavior.
- asr.test.ts plus asr-batch-sessions.test.ts, asr-draft-turns.test.ts, asr-live-sessions.test.ts and asr-refinement-check.test.ts cover ASR routes.
- consultations-audio.test.ts, consultations-live-analysis.test.ts, consultations-live-flags.test.ts, consultations-prescriptions.test.ts and consultations-transcript-corrections.test.ts cover consultation actions.
- copilot.test.ts, reference.test.ts, settings.test.ts and no-stray-approval.test.ts cover the remaining routes and approval boundary.
- Postgres is not required; route tests mock Prisma.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §13, API Contracts](../../../docs/architecture/13-api-contracts.md), [TRD §14, Auth Model](../../../docs/architecture/14-auth-model.md), [TRD §20, ASR Contract](../../../docs/architecture/20-asr-contract.md) and [TRD §25, Review Copilot Tool-Call Behaviour](../../../docs/architecture/25-review-copilot-tool-call-behaviour.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>
