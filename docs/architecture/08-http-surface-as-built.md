# 08. HTTP Surface As Built

Part of the [Technical Reference](../TRD.md).

**Status: `Built`**

Source: `backend/src/app.ts`, `backend/src/routes/health.ts`.

## Middleware Stack (In Order)

1. `compression()`
2. `cors({ origin: env.CORS_ORIGIN, credentials: true })`, a single allowed origin, bound to `CORS_ORIGIN`, with credentials enabled
3. `express.json({ limit: '1mb' })`

## Routes

| Method | Path                      | Behaviour                                                                                                                                                                                                                                                                                               |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`  | `/api/health`             | Runs `SELECT 1` against the database via Prisma. Returns `200 { status: 'ok', provider: env.LLM_PROVIDER }` on success, `503 { status: 'degraded', database: 'unreachable' }` on failure.                                                                                                               |
| `POST` | `/api/asr/transcriptions` | Authenticated relay of one consultation recording to the hosted ASR provider (§20, issue #154). Raw `audio/*` body up to 25 MB under a route-level parser and its own rate limiter; returns `200 HostedAsrResultSchema` (§13) and fails closed with `503 asr_unavailable` when `ILMU_API_KEY` is unset. |

The rest of the surface has since been built and is catalogued in §13; `backend/src/app.ts` is authoritative for the middleware stack, which has grown well past the three entries above (request context, client-ip resolution, helmet, a session guard per protected prefix, and per-route rate limiters), with the load-bearing pieces named in `.claude/rules/security.md`.

---
