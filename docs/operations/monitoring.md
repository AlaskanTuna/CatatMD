# Monitoring

## Health Endpoint

`GET /api/health` is public and is configured as Render's health check. It runs `SELECT 1` through Prisma. A successful response is HTTP 200 with `status: "ok"` and the configured LLM provider. A database failure returns HTTP 503 with `status: "degraded"` and `database: "unreachable"`.

Check the API directly at `https://catatmd-api.onrender.com/api/health`. Check the production Vercel rewrite at `https://catatmd.vercel.app/api/health`. The second request also verifies that the SPA origin routes `/api` to Render. Health does not test the LLM provider.

## Keep-Awake Ping

An off-platform external scheduler requests `/api/health` and the frontend origin every 10 minutes. The database query keeps both the Render service and Supabase project active. The scheduler provider and its configuration are not defined in this repository. Keep the ping off Render so it can reach a service that has spun down. The rationale and cadence are recorded in [TRD](../TRD.md).

## Process Logs

The API writes one JSON record per line to stdout. Render drains stdout. `LOG_LEVEL` controls verbosity, but redaction is applied at every level and no debug setting exposes raw content. There is no third-party APM integration.

The logger allows opaque request, actor, and consultation IDs; normalized method and route; status and duration; pipeline stage and LLM operation; provider and model names; fixed error classes and names; detector labels and counts; and other bounded counts. A request ID is also returned in the `x-request-id` header.

The logger does not record transcript bodies, note contents, audio, de-identification vault entries, matched identifier values, or `error.message`. Unknown fields are dropped. The developer-authored `msg` is the remaining free-text surface, so do not interpolate consultation or patient data into a log message. Message scrubbing is a backstop and may not catch every name.

## Audit Events

Audit events are database records, separate from process logs. They record event types and identifiers for actions such as consultation creation, analysis, editing, approval, red-flag dispositions, hosted ASR use, retention changes, and erasure. Metadata carries bounded, typed values such as labels, identifiers, counts, versions, enums, and failure categories. It does not carry transcript or note text.

The event writer is append-only and writes through one code path. New rows carry a hash chain; see [Database](database.md) for its inputs and limits. The chain does not hash `metadata`, and no scheduled production verification is configured in the reviewed sources.
