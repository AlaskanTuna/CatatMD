# Environments

The backend loads the repository-root `.env` in development and test. Production platforms supply their environment values. Keep `.env` local and use synthetic data in every non-production environment.

## Environment Matrix

| Environment          | What Runs                                                                                                                                                                   | Environment Variable Names                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local                | Bun workspaces, Vite frontend, Express API, and the Postgres 16 container in `docker-compose.yml` on port 5434. Point both Prisma URLs at the local container.              | Required by `EnvSchema`: `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. Runtime settings: `NODE_ENV`, `PORT`, `CORS_ORIGIN`, `TRUSTED_PROXY_IPS`, `LLM_PROVIDER`, `DEID_FAIL_CLOSED`, `LOG_LEVEL`. Optional provider and feature variables are listed in `.env.example`.                                                                                                                                      |
| CI                   | GitHub Actions, a throwaway `pgvector/pgvector:pg16` service, and stubbed model calls. CI never connects to production Supabase and has no provider key.                    | `NODE_ENV`, `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `LLM_PROVIDER`, `DEID_FAIL_CLOSED`. Deployment jobs also use `VERCEL_TOKEN` and `GH_TOKEN`.                                                                                                                                                                                                                                         |
| Pull request preview | Vercel static preview with the in-browser API stub. The job removes the `/api` rewrite to Render before building.                                                           | `VITE_PREVIEW_STUB`, `VERCEL_TOKEN`, `GH_TOKEN`. No database, model, or recognizer credentials are needed by the preview bundle.                                                                                                                                                                                                                                                                                                      |
| Production           | Vercel serves the frontend, Render runs the API, and Supabase hosts Postgres. The production API uses the pooled database URL at runtime and the direct URL for migrations. | Render runtime names: `NODE_ENV`, `PORT`, `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `TRUSTED_PROXY_IPS`, `LLM_PROVIDER`, `QWEN_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL`, `ILMU_API_KEY`, `SONIOX_API_KEY`, `SONIOX_REGION`, `ELEVENLABS_API_KEY`, `AUDIO_RETENTION_HOURS`, `TRANSCRIPT_CLEANUP`, `DEID_FAIL_CLOSED`, `LOG_LEVEL`, `GUEST_EMAIL`, `GUEST_PASSWORD`, `SEED_DOCTOR_PASSWORD`. |

The workflow sets `VERCEL_TOKEN` as a GitHub Actions secret for Vercel deploys. `GH_TOKEN` is a workflow variable used for GitHub issue and preview-comment operations. Neither belongs in the frontend bundle.

## Optional Variables

Optional keys control paths that can be disabled without stopping the API:

- `ILMU_API_KEY` enables hosted transcription. If absent, that route returns `503 asr_unavailable`.
- `SONIOX_API_KEY` enables the live-session key route. `SONIOX_REGION` must match the Soniox project region and the matching host in `vercel.json`.
- `ELEVENLABS_API_KEY` enables post-recording transcript refinement. The provider's data-improvement setting must be off, and the key must be speech-to-text-only with a credit quota.
- `GUEST_EMAIL` and `GUEST_PASSWORD` enable the guest sign-in route. `SEED_DOCTOR_PASSWORD` is used by the account seed script only.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_GUIDELINES_BUCKET` are used for guideline ingestion from an operator machine, not by the running API.

`render.yaml` seeds variables when a Render service is created. For an existing service, its live settings take precedence. Updating a Render variable does not redeploy the service, so trigger a deploy before verifying the new value. Do not put secrets in this repository.

For production, `VITE_API_URL` must be unset so the frontend uses its own `/api` origin. `VITE_PREVIEW_STUB` must be absent from the production bundle.

## Regional Data Handling

Keep the production API on Render Singapore, Postgres on Supabase Singapore, and the production LLM provider on the configured Qwen Singapore endpoint. The production environment rejects `LLM_PROVIDER=gemini` and `LLM_PROVIDER=deepseek`. Gemini is for local synthetic data only; DeepSeek is for benchmarking only.

Vercel's region is not specified in the repository configuration. Do not use the static frontend host as evidence that all processing stays in Singapore. Speech recognition is a separate audio egress path, not covered by the LLM de-identification boundary. The current `SONIOX_REGION` value in `render.yaml` is `us`; do not describe ambient capture as an in-Singapore-only flow. Review provider routing and the applicable DPIA controls before changing these paths. See [DPIA](../DPIA.md).
