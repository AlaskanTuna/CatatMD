# 08. HTTP Surface As Built

Part of the [Technical Reference](../TRD.md).

**Status: `Built`**

Source: `backend/src/app.ts` and the routers under `backend/src/routes/`.

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../assets/diagrams/arch-08-http-request-dark.svg" />
    <img src="../assets/diagrams/arch-08-http-request-light.svg" alt="An API request receives request context and a resolved client IP before Helmet, compression, and CORS. Authentication routes precede JSON parsing, then health routes and session guards protect clinical prefixes before route-specific limiters and domain routers; the shared error handler is last." width="100%" />
  </picture>
</p>

## Middleware Stack (In Order)

1. `requestContext`, which assigns `x-request-id` for downstream logging and responses.
2. `clientIp`, before rate limiters and better-auth consume the resolved address.
3. `helmet()`, `compression()`, then `cors({ origin: env.CORS_ORIGIN, credentials: true })`.
4. The guest sign-in limiter, then `/api/auth` through better-auth before the body parser.
5. `express.json({ limit: '1mb' })`, then `/api/health`.
6. `requireSession` on `/api/asr`, `/api/consultations`, `/api/fixtures`, `/api/guidelines`, `/api/notifications`, `/api/patients`, and `/api/settings`.
7. Route-specific limiters, including separate audio, analysis, ASR, live-pane, correction, prescription, erase and settings buckets.
8. Reference and notification routers, ASR, consultation copilot, patients, settings, and consultations routers, then `errorHandler`.

## Routes

| Method | Path                      | Behaviour                                                                                                                                                                                                                |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET`  | `/api/health`             | Runs `SELECT 1` via Prisma. Returns `200 { status: 'ok', provider }` when reachable, with `database: 'local'                                                                                                             | 'remote'`outside production; production omits locality. Returns`503 { status: 'degraded', database: 'unreachable' }` on failure. |
| `POST` | `/api/asr/transcriptions` | Authenticated hosted-ASR relay. Parses raw `audio/*` up to 25 MB with a route-level parser and dedicated limiter. Returns `HostedAsrResultSchema`; fails closed with `503 asr_unavailable` when `ILMU_API_KEY` is unset. |

The mounted surface also includes auth, fixtures, guideline documents, patient CRUD and erasure, consultation create/list/detail/history/analyse/update/approve/erase, live analysis and flags, transcript corrections, prescription parsing, consultation audio storage and retrieval, copilot streaming, notifications, settings, and ASR session/refinement routes. `backend/src/app.ts` defines mount order and protected prefixes. Router implementations define request schemas, ownership checks, provider-configuration failures, and route-specific errors; §13 documents the principal contracts.

---
