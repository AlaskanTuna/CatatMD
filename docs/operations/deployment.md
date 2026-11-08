# Deployment

## Main-Branch Flow

GitHub Actions runs the `verify` job on every pull request and push to `main`. It installs the locked Bun workspaces, scans commits with Gitleaks, audits dependencies at `high`, applies Prisma migrations to a throwaway pgvector Postgres service, then runs lint, typecheck, tests, format checks, and the floor guard. CI has no production database or LLM credentials.

The `migrations` job warns on pull requests that add migrations. After merge, `migration-reminder` opens an issue for each new migration. Neither job applies a production migration or blocks the API deploy. See [Database](database.md) for the required manual step.

## Deployable-Paths Filter

After `verify` passes on a push to `main`, the `changes` job compares the push with its previous commit. It marks a push deployable when a changed path matches:

```text
^(frontend/|shared/|vercel\.json$|bun\.lock$|package\.json$|tsconfig\.json$|\.github/workflows/ci\.yml$)
```

The filter includes frontend and shared source, Vercel configuration, root build inputs, and the workflow. It excludes documentation and backend paths because those do not change the Vercel frontend bundle. A documentation-only push still runs CI, skips the Vercel deployment, and may still trigger Render's independent API deployment.

If the previous commit cannot be resolved, the filter fails open and deploys. When the filter skips a frontend deployment, the production alias can point to the last deployment that touched one of these paths. The bundle is byte-identical to the current frontend build. The filter is not a check that every production setting or service matches `main`.

## Vercel Production Deploy

The `deploy` job depends on `verify` and `changes`. It runs only when `changes` reports `deployable=true`. Vercel's Git deployment integration is disabled in `vercel.json`; this workflow is the production frontend deploy path.

The job performs these steps:

1. Pull production project settings with `vercel pull`.
2. Build the frontend with `vercel build --prod`.
3. Fail if `VITE_API_URL` is set or the built bundle contains `catatmd-api.onrender.com`. Production calls `/api` on its own origin, and `vercel.json` rewrites that path to Render.
4. Fail if the production bundle contains the preview stub.
5. Copy `.vercel` build output to a temporary directory outside the Git checkout, then submit it with `vercel deploy --prebuilt --prod --no-wait`. The job attaches `commitSha` metadata.
6. Wait for Vercel to report `READY`. A blocked, errored, canceled, or timed-out deployment fails the job.
7. Set `catatmd.vercel.app` to the deployment, verify the alias target and served asset fingerprint, then request `/api/health` through the public domain to verify the Render rewrite.

The live alias and bundle checks exist because Vercel once reported a deployment ready while `catatmd.vercel.app` still served an older bundle (issue #50).

Main-branch runs are not canceled while deploying. This prevents a newer push from canceling a deployment between publishing the build and checking the live alias.

Vercel Hobby allows 100 deployments per rolling 24 hours. On 14/08/26 the project reached 97 of 100; a quota-blocked deployment returned no error code or message and a zero-millisecond build (issue #82). Do not retry a quota failure blindly, since each retry spends another deployment slot.

## Collaborator-Authorship Caveat

Vercel Hobby checks the commit author found in Git metadata, including on CLI deploys. The workflow stages the build outside the repository before deploying so Vercel cannot read that author. A controlled comparison at `HEAD` `1047bb1` produced `BLOCKED` from the checkout and `READY` from a Git-less staging directory with the same build, token, and project. The cost is that the Vercel dashboard does not associate the deployment with a Git commit; `commitSha` metadata is the provenance link.

In a sample of the last 100 deployments, every `BLOCKED` deployment was non-owner-authored (10 cases), while owner-authored deployments built. The current staging workaround was measured separately; keep the caveat visible if the deploy path changes (issue #58).

If a merge appears stuck or production does not move, check the main-branch workflow history with:

```bash
gh run list --branch main
```

Inspect the `deploy` job for a `BLOCKED` state or a failed alias or health assertion. The workflow reports a blocked deployment as not published. Do not reconnect Vercel Git integration, because it bypasses CI and restores the author restriction (issue #58).

## Pull Request Previews

The `preview` job runs for pull requests from this repository when deployable paths change and `VERCEL_TOKEN` is available. Fork pull requests receive no preview. CI removes the `/api` rewrite and builds with `VITE_PREVIEW_STUB=true`; the browser stub responds with synthetic data, and the deployment has no route to Render. CI fails if the built preview still contains the production API host or lacks the stub.

The deterministic red-flag engine and prescription parser run in the stub. Model-backed analysis is a placeholder, and live or hosted speech recognition is unavailable. A new API route needs a preview stub handler or the preview returns `501 not_in_preview`.

## Rollback

**Frontend:** Use Vercel's Instant Rollback in the dashboard or run `vercel rollback <deployment-id-or-url>`. On the Hobby plan, rollback is limited to the immediately previous production deployment. Confirm that `catatmd.vercel.app` serves the intended deployment. Vercel restores a custom alias only when it was present on the target deployment. CI assigns this alias explicitly, so use the workflow's supported command if needed: `vercel alias set <deployment-url> catatmd.vercel.app`. Rollback turns off automatic production domain assignment. After the incident is fixed, promote the selected deployment with `vercel promote <deployment-id-or-url>` to restore normal production promotion. See [Vercel rollback](https://vercel.com/docs/cli/rollback).

**API:** In Render, open the service's **Deploys** page, choose a recent successful deploy, and select **Rollback**. Confirm the target deploy before proceeding. Dashboard rollback disables Render auto-deploys; re-enable them in service settings after the fix is ready. Rollback is available only while the target build artifact is retained. See [Render rollbacks](https://render.com/docs/rollbacks).

Neither service rollback reverses a Supabase schema migration. Production schema changes remain a separate manual operation described in [Database](database.md).
