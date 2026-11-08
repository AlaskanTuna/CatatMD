# 17. Environments & Deployment

Part of the [Technical Reference](../TRD.md).

**Status: `Specified`**, the Render service definition below is `Built`; migration wiring and the free-tier mitigation remain `Specified`.

## Topology

Frontend → Vercel; backend → Render (Singapore); database → Supabase (Singapore), locked in `AGENTS.md`, all three in-region by design. Backend hosting is `Built`: see the Render Service Definition below.

## Free-Tier Seats And Collaborator Access

Both Vercel and Render stay on **free tiers**, deliberately: Vercel Hobby is a single seat with no collaborators, and Render's free plan is a single workspace member. Neither collaborator's platform access is paid for. @Andersonnn7788 works through the GitHub repository, not a platform seat, and build logs are readable from each platform's GitHub check without a dashboard login. Only genuinely dashboard-level configuration (environment variables, custom domains) needs a seat, and that is expected to stay a single-owner task.

**Vercel Git-Integration Deploys Are Off Entirely** (`vercel.json` → `git.deploymentEnabled: false`, issue #58). The CI `deploy` job is the only path to production. Do not reconnect the integration: it deployed without regard to CI status, and on pull requests it produced a permanently failing check that no branch could ever turn green. Render's Git integration is unaffected and still deploys the backend.

### The Hobby Author Restriction, And How CI Works Around It

Vercel Hobby only builds commits authored by the account owner. This was originally believed to affect Git-integration deploys only, on the reasoning that a token-authenticated CLI deploy is attributed to the token owner. **That reasoning is wrong**, and the deployment record disproves it:

| Observation                                                    | Evidence                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| The CLI attaches the checkout's git metadata to the deployment | `meta.githubCommitAuthorName` is populated on CLI deploys   |
| Vercel applies the author check to that metadata               | `dpl_BLGhgtaTjfujznqt8aoofmZkZPcB`, `source=cli`, `BLOCKED` |
| Every `BLOCKED` deployment was authored by a non-owner         | 10 of the last 100, across both the Git and CLI paths       |
| Every owner-authored deployment built                          | same sample                                                 |

**Consequence, Stated Precisely.** An earlier revision of this section said a collaborator-authored merge "does not reach production", which overstated it in two ways worth correcting rather than quietly editing:

- **The Restriction Is Vercel-Only, So It Is Frontend-Only.** The API deploys from Render, which applies no author restriction. Render's deploy history shows every recent commit reaching `live` regardless of author, including `717e05c` by the collaborator. Backend and documentation work is therefore unaffected.
- **A Blocked Commit Is Delayed, Not Lost.** Vercel builds the whole checked-out tree, so an owner-authored merge carries every ancestor commit with it. `4504188` did exactly that for `717e05c`. A collaborator's frontend change goes live with the next owner-authored merge rather than never.

**The Workaround, And Why It Works**

A later revision of this section concluded that only a plan decision could resolve this. **That was also wrong.** The restriction applies to the git author the CLI _finds_, not to the token and not to the plan, and the CLI finds it by reading the git repository in its working directory. Give it a directory with no repository and there is no author to check.

Measured 14/08/26, same build output, same token, same project, with `HEAD` at `1047bb1` (authored by the collaborator):

| Deploy Working Directory              | `readyState` | Attached git Author        |
| ------------------------------------- | ------------ | -------------------------- |
| The checkout                          | `BLOCKED`    | the collaborator's address |
| A copy of `.vercel/` outside any repo | `READY`      | none                       |

The `deploy` job therefore copies the build output to a temporary directory before calling `vercel deploy`, and asserts that directory is not inside a repository before using it. A collaborator's frontend change now deploys on its own merge.

**What This Costs.** The deployment carries no git metadata, so Vercel's dashboard cannot show which commit produced it. `--meta commitSha` is now the only provenance link between a deployment and a commit, which is why the identity check reads it back rather than trusting the CLI's inference.

**What Is Still True.** Reconnecting the Git integration would reintroduce the restriction in full, because Vercel reads authorship from the push itself on that path and no working directory is involved.

### SPA Security Headers

**Status: `Built`**

Source: the `headers` block in `vercel.json`. The API is covered separately by `helmet()`; these are the SPA origin's own.

| Header                       | Value                                               | Why This Value                                                                           |
| ---------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Content-Security-Policy`    | see below                                           | The substantive one. Every other row here is a one-liner.                                |
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains; preload`      | Two years, which is what the preload list requires.                                      |
| `X-Frame-Options`            | `DENY`                                              | Redundant with `frame-ancestors` for modern browsers, kept for older ones.               |
| `X-Content-Type-Options`     | `nosniff`                                           | Stops a served asset being reinterpreted as script.                                      |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                   | A consultation id must never leave in a `Referer` to a third party.                      |
| `Permissions-Policy`         | `microphone=(self), camera=(), geolocation=(), ...` | **`microphone=(self)` Is Load-Bearing**, see below.                                      |
| `Cross-Origin-Opener-Policy` | `same-origin`                                       | Severs any opener relationship. Safe here because the app opens no cross-origin windows. |

**Four Entries Look Like They Could Be Trimmed And Cannot.** All four were established by loading the built app under the real policy and exercising the Record tab, not by reading documentation.

- **`'wasm-unsafe-eval'` In `script-src`.** The speech model is WebAssembly. Without this it cannot instantiate, and the failure appears as a broken Record tab rather than as an obvious policy error.
- **`blob:` In `script-src`.** ONNX Runtime loads its execution backend by fetching it, wrapping the response in a `URL.createObjectURL` blob, and calling `import()` on that blob. A dynamic import is governed by `script-src`, not by `worker-src`, so `worker-src 'self' blob:` starts the worker and then the backend load inside it is blocked. The failure surfaces as `no available backend found. ERR: [wasm] TypeError: Failed to fetch dynamically imported module: blob:...`, **after** the model reports 100% downloaded, which reads as a model or network problem rather than a policy one.
- **`microphone=(self)` In `Permissions-Policy`.** A policy that omits `microphone` denies it. Recording would be refused by the browser before any application code ran.
- **`https://*.hf.co` in `connect-src`.** HuggingFace serves `huggingface.co` but **redirects model downloads to a different registrable path**, observed as `us.aws.cdn.hf.co`. Allowing only `huggingface.co` passes a superficial test, because the config and tokenizer files come from there, and then fails on the model weights.

**`Cross-Origin-Embedder-Policy` Is Deliberately Absent.** It would require every cross-origin response the speech model fetches to carry `Cross-Origin-Resource-Policy`, which the HuggingFace CDN does not send. Adding it would break transcription in exchange for a header this app gains nothing from, since it uses no `SharedArrayBuffer`.

**How This Was Verified.** The production build is served locally under the exact policy string from `vercel.json`, same-origin with the API proxied, so that a CORS failure cannot be mistaken for a CSP failure.

**That Method Missed `blob:` Once, And The Reason Is Worth Keeping.** The original verification drove the Record tab through the UI in a browser whose `transformers-cache` was already warm, so the backend load did not take the path that needs `blob:`. The policy then shipped and broke transcription for anyone arriving with a cold cache. Driving the UI is not a sufficient test of a policy, because the UI can be satisfied by cached state that a first-time visitor does not have.

**So The Check Is Now Against The Built Worker Directly**, which removes both the cache and the sign-in from the question:

```js
const w = new Worker('/assets/transcribe.worker-<hash>.js', { type: 'module' })
w.onmessage = (e) => console.log(e.data) // expect { type: 'ready' }
w.postMessage({ type: 'load' })
```

Run against two servers differing only in the policy string, this is a controlled A/B rather than an observation: without `blob:` in `script-src` it returns the `no available backend found` error above, with it the worker reports `ready`. `'unsafe-eval'` was checked the same way and is **not** required, so it stays out.

## Render Service Definition (`render.yaml`)

**Status: `Built`**

Source: `render.yaml` (repo root).

| Field              | Value                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `type` / `runtime` | `web` / `node`                                                                                                                   |
| `region`           | `singapore`                                                                                                                      |
| `plan`             | `free`                                                                                                                           |
| `buildCommand`     | `bun install && bun run --cwd shared build && bunx prisma generate --schema prisma/schema.prisma && bun run --cwd backend build` |
| `startCommand`     | `bun run --cwd backend start`                                                                                                    |
| `healthCheckPath`  | `/api/health`                                                                                                                    |

`envVars`: `NODE_ENV=production`; `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `QWEN_API_KEY`, `ILMU_API_KEY` all `sync: false` (set manually in the Render dashboard, never committed); `BETTER_AUTH_SECRET` uses `generateValue: true`; `LLM_PROVIDER=qwen`; `QWEN_BASE_URL` pinned to the Singapore Model Studio endpoint; `QWEN_MODEL=qwen3.7-flash`; `DEID_FAIL_CLOSED: 'true'`.

`QWEN_MODEL` pins the same untested default flagged in Open #6 below, the value is already committed to the deploy config before the exact model id has been confirmed against a live Model Studio account.

The retrieved tier (§11) adds four `EnvSchema` fields, all deliberately absent from `render.yaml`:

| Variable                     | Constraint       | Where It Is Needed                                                                                              |
| ---------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `QWEN_EMBEDDING_MODEL`       | `string()`       | Nowhere unless the model changes: the committed default `text-embedding-v4` matches the stored vectors          |
| `SUPABASE_URL`               | `string().url()` | The machine running `bun run corpus:ingest`, for the private-bucket PDF upload; the step is skipped when absent |
| `SUPABASE_SERVICE_ROLE_KEY`  | `string()`       | Same; the upload credential, never the running service                                                          |
| `SUPABASE_GUIDELINES_BUCKET` | `string()`       | Same; default `guidelines`                                                                                      |

The running service needs none of the `SUPABASE_*` set: citation links resolve to each document's `sourceUrl` on the AMM portal, and ingestion is a developer-machine script rather than a service path.

### `render.yaml` Is Not Authoritative For Env Vars On A Live Service

**Learned The Hard Way On 14/08/26.** A Blueprint seeds environment variables when the service is created. After that the service's own values win, and editing `render.yaml` in the repository changes nothing on a service that already exists.

The failure this produced: `QWEN_MODEL` was corrected in `render.yaml`, merged, and deployed, while production carried on running the old value. The repository asserted a pin that production did not honour, and nothing anywhere reported a disagreement.

Two rules follow, both of which cost time to discover:

- **Changing a `value:` env var in `render.yaml` requires setting it on the service as well.** The CLI has no command for this; use the API (`PUT /v1/services/{id}/env-vars/{key}`) or the dashboard.
- **Setting An Env Var Does Not Redeploy.** The API accepts the change and the running instance keeps the old value until a deploy is triggered (`POST /v1/services/{id}/deploys`). A verification run immediately after setting the variable will still exercise the old one, which is exactly what happened here.

Treat `render.yaml` as the definition used at creation and as documentation thereafter. It is not a control surface for a running service, and a reader cannot tell the difference from the file alone.

### Configuration That Lives Outside The Repository

The `render.yaml` trap above is one instance of a shape worth naming, because it has now caught us three times: **the repository reads as authoritative, is not, and nothing reports the disagreement.** A reviewer reading the diff cannot see the divergence, and neither can CI.

| Surface                     | What The Repo Cannot See                                                                                                                                                                                                                                                                                            | How You Would Notice                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Render env vars             | Service values win after creation; `render.yaml` only seeds them (above)                                                                                                                                                                                                                                            | Compare `GET /v1/services/{id}/env-vars` against `render.yaml` before trusting a pin                                      |
| Vercel project settings     | Build command, root directory, install command and env vars set in the dashboard override repo intent                                                                                                                                                                                                               | `vercel inspect` the live deployment; the CI path filter cannot gate on them                                              |
| Render `ELEVENLABS_API_KEY` | Set in Render by the account holder only, as a speech-to-text-only key with a vendor credit quota, and only after the vendor account's "use data to improve models" setting is confirmed off (§20.14). `render.yaml` declares it `sync: false`, so no value is in the repo. Unset means refinement is never offered | `GET /api/asr/live-sessions/config` omits `batchRefinement`; `POST /api/asr/batch-sessions` answers 503 `asr_unavailable` |
| Local `.env`                | Gitignored and per checkout, so a copy taken once keeps superseded values indefinitely                                                                                                                                                                                                                              | `SessionStart` hook names the disagreeing keys (issue #97, below)                                                         |

Two consequences for the deploy path filter (§17, `changes` job):

- It gates on **repository paths only**. A dashboard-side settings change alters the deployed bundle while touching no file, so no filter can trigger on it. That is a known limit, not a defect to fix.
- It is therefore not a completeness guarantee. It answers "can this push have changed the bundle", never "is production equal to `main`".

When a deploy-affecting change is made outside the repository, record it here in the same commit. For the two remote surfaces that is the only mechanism this project has for making it visible to the next reader. The third is the exception, because a local `.env` is the only one of the three the repository can read for itself.

### A Third Instance: A Worktree's `.env` Is A Copy, Not A Link

`.worktreeinclude` copies `.env` into a git worktree **at creation time**, so from that moment the worktree's environment is frozen and drifts from the main checkout silently. Same shape as the two above: something reads as authoritative, is not, and nothing reports the disagreement.

Observed 14/08/26. A worktree created before `QWEN_MODEL` was re-pinned kept the superseded value, so every local analysis there failed with a 403 while identical code worked in the main checkout and in production. The failure is maximally misleading, because the repository is innocent: `.env.example`, `render.yaml` and the `env.ts` default all carried the correct value, so reading the repo pointed away from the cause, and `git pull` cannot fix it because `.env` is gitignored by design.

The same applies to `DATABASE_URL`, `BETTER_AUTH_SECRET`, and every other copied key. A rotated secret fails the same way.

Checking is cheap, and worth doing from a worktree before believing any environment-dependent failure:

```bash
diff <(sort .env) <(sort "$(git rev-parse --path-format=absolute --git-common-dir)/../.env") || echo DRIFTED
```

Automating it was tracked as GitHub issue #97, because a stale copy still boots and still looks like it is working, which makes the failure mode worse than the empty `.env` the mechanism was written to prevent.

**Resolved As A Warning Rather Than A Resync.** `.claude/hooks/env-drift.mjs` runs at session start, so the drift announces itself instead of waiting to be suspected. It compares two ways: `.env` against the values `.env.example` commits, which needs no git relationship and therefore also covers a second clone rather than only a worktree; and, inside a linked worktree, `.env` against the main checkout's, which is the only way to reach a rotated secret, since a secret cannot be compared against anything tracked. It reports key names and never values, so the warning is safe to paste, and the `diff` above remains the way to see what actually differs.

Three properties are deliberate:

- **It Warns, It Does Not Resync.** A worktree can legitimately need its own `PORT`, `CORS_ORIGIN` or `DATABASE_URL`, so overwriting would break a real override to fix a rarer problem.
- **It Compares Only Keys The Local `.env` Sets.** An unset key falls through to the `EnvSchema` default in §7, which carries the pinned value, so absence is safe and a stale override is the dangerous case.
- **A Key Is Compared By Value Only If `.env.example` Assigns It One.** The example is tracked, so any value in it is already public, and the secrets are exactly the entries left empty. That is a secret classifier with no hand-kept list to fall out of date.

A symlink was rejected outright: symlinks already fail on a Windows checkout here, which is why the `.claude/skills/` entries land as plain text stubs.

## Pooled Versus Direct URL Split

`DATABASE_URL` (Supavisor pooler, `:6543`, `pgbouncer=true`) is used by the running app; `DIRECT_URL` (`:5432`) is used only by `prisma migrate`, both already `Built` in `EnvSchema` (§7), `.env.example`, and `render.yaml`.

## Migration Flow

Locally: `bun run db:migrate` (`prisma migrate dev`, against `DIRECT_URL`). In production: `render.yaml`'s `buildCommand` does not run `prisma migrate deploy`, and **it should not**. Render's `preDeployCommand` is a paid-tier feature, and it is unnecessary here regardless, Postgres is Supabase, not Render, so migrations are applied from a developer machine against `DIRECT_URL` and are already live by the time the API deploys. The earlier proposal to add a `preDeployCommand` is withdrawn.

The consultation-settings migration is additive, but its `NoteTemplate` and `CaptureMode` enums and the `noteTemplate`, `captureMode`, and `editedMedicalRecordNote` columns must exist before the corresponding API version serves traffic. Apply it first with `bun run db:migrate:deploy`; then deploy the backend and frontend. During a staggered rollout, shared response parsing projects missing `noteTemplate` and `captureMode` fields forward as `soap` and `manual`, which for `captureMode` is what an absent field means and not the column default (§4). The backend rejects legacy SOAP-only edits for canonical analyses rather than allowing the two note representations to diverge, and the frontend keeps a rejected settings draft inside the modal without claiming it was persisted.

**The Manual Step Is Now Flagged Rather Than Remembered** (issue #132). The premise above holds only when someone actually applies the migration, and PR #124 merged and deployed with `notificationsClearedAt` absent from production. `GET /api/notifications` would have thrown on every screen, since the chrome polls it sitewide; it was caught by running `prisma migrate status` by hand before the deploy landed, which is luck rather than process.

The `migrations` job in `.github/workflows/ci.yml` reads the migrations directory against the PR's base branch and emits a warning annotation plus a job summary naming each addition and the command to run. It deliberately **does not fail the build**: a migration has to merge before it can be applied, so blocking the merge would block the fix.

It also deliberately holds **no production credential**. A check that could verify the database itself would need `DIRECT_URL` in Actions, and putting a production database credential in CI is a decision for an owner rather than a convenience for a workflow. That option stays open and unchosen.

**Warning on the PR was not enough, because the reminder died at the merge** (issue #341). A step summary and inline annotations hang off the pull request, so they stop being read at the moment the apply first becomes possible. PR #320 then merged with `prescriptions` absent from production, and because `assertOwnedConsultation` reads a row with no `select`, Prisma emitted the missing column on every consultation query: the detail, history, `PATCH`, approve, erase and prescription-parse routes all returned 500 together, behind a green deploy.

The `migration-reminder` job closes that gap from the other side. On a push to `main` that adds a migration, it opens an issue titled `db: apply <migration> to production`, labelled `priority:p0`, skipping any title already open so a re-run cannot duplicate one. An issue is the forcing function rather than a louder warning because it persists and carries an assignee.

It is assigned to the **author of the merge**, who knows what the migration needs. That author may not hold `DIRECT_URL`, so the body tells them to reassign rather than close, and two cases fall back to the platform owner: a commit whose author is not a GitHub user, and an author who is not an assignable collaborator. A reminder assigned to nobody is the state the job exists to prevent.

Three further properties are load-bearing and should not be traded away:

| Property                                                   | Why                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Needs only `GITHUB_TOKEN`                                  | Keeps the credential decision above unchosen rather than quietly making it      |
| Nothing depends on it (`deploy` needs `[verify, changes]`) | A missing reminder must never be able to hold up a ship                         |
| Fails the job when the issue cannot be opened              | A reminder lost in silence is the exact defect being fixed, so it must be noisy |

It still applies nothing. The manual step remains the design; this only makes forgetting it loud.

|                             |                                                 |
| --------------------------- | ----------------------------------------------- |
| `bun run db:status`         | What is pending against the configured database |
| `bun run db:migrate:deploy` | Apply it                                        |

## CI

**Status: `Built`**, `.github/workflows/ci.yml`, reinstated 13/08/26 (issue #13), extended to deployment 13/08/26 (issue #52). It answers §19 row 12 in practice: CI runs on every push to `main` and every pull request. The register row is left open pending the dependency-scan half of the question (§16), which is still not built.

Three jobs, the second and third gated on the first:

| Job       | Runs On                            | Does                                                                                                                                                                    |
| --------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify`  | every push and PR                  | `bun install --frozen-lockfile`, `prisma generate` + `migrate deploy` against a throwaway Postgres service container, `lint`, `typecheck`, `test`, confidentiality grep |
| `deploy`  | pushes to `main` only              | `vercel pull` / `build` / `deploy --prebuilt`, then asserts what production actually serves                                                                             |
| `preview` | pull requests from this repository | Builds the bundle against the in-browser stub, deploys it as a Vercel preview, and posts the URL on the pull request. See Pull Request Previews below                   |

Two properties of `verify` are deliberate. It uses a **throwaway Postgres**, never the shared Supabase instance, because the route and auth suites exercise real ownership scoping and audit writes rather than mocking the database. It carries **no LLM provider key**, because LLM-dependent tests stub at the `LLMClient` port, the same boundary that makes the provider swappable.

`deploy` asserts rather than trusts, because each of these has shipped at least once: a deployment Vercel refused to build, a production alias left pointing at an older build, and a bundle built without `VITE_API_URL` so every API call landed on the static origin. Exit code 0 from `vercel deploy` establishes none of that, so the job checks the deployment's ready state, the domain's resolved deployment id, and the served bundle.

**Concurrency:** superseded runs are cancelled on pull requests but never on `main`, because a run on `main` deploys, and cancelling between the deploy and its assertions is precisely how an unverified build is left live.

## Pull Request Previews

**Status: `Built`, 06/10/26.** A pull request that changes the bundle gets a Vercel preview URL, posted as one comment on the pull request and edited on each push. **A preview never talks to the production API.** It runs on a stub that lives in the browser.

| Layer    | What It Does                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No route | The `preview` job removes the `/api` → Render rewrite from `vercel.json` before building, so the deployment has no path to the API                                                                     |
| Stub     | The bundle is built with `VITE_PREVIEW_STUB=true`. `frontend/src/preview/` then answers every request whose path starts with `/api/`, on any origin, with synthetic data before it reaches the network |
| CSP      | `connect-src` already allows only the page's own origin and the recogniser hosts                                                                                                                       |
| Checks   | CI fails a preview build that lacks the stub or still references Render, and fails a production build that contains the stub                                                                           |

**What A Preview Can And Cannot Show:**

- **Runs For Real:** the deterministic red-flag engine and the prescription parser, imported from `backend/src/` into the stub.
- **Synthetic:** sign-in (automatic, as a synthetic doctor), patients, and consultations seeded from `backend/src/fixtures/`. State lives in memory; a reload resets it.
- **Placeholder:** any analysis. No model runs, so the note says it is a placeholder.
- **Unavailable:** live and hosted recognition, which need the API to issue a key. The UI shows its normal fallbacks.

**Costs And Limits:**

- Each preview is one deployment against the Hobby plan's daily cap, so the job uses the production job's deployable-paths filter.
- Pull requests from forks get no secrets and no preview.
- A new API route needs a stub handler, or the preview answers it with a 501 `not_in_preview` error.

**Manual Setting, Outside The Repository: Vercel Deployment Protection.** Vercel protects preview deployments with Vercel Authentication by default, so only the account owner can open a preview. To let teammates in, turn it off for previews under Project Settings → Deployment Protection, or with the API:

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID?teamId=$VERCEL_ORG_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  -d '{"ssoProtection": null}'
```

Turning it off is safe only because a preview holds no real data and cannot reach the API. Keep it on if either ever changes.

## Free-Tier Auto-Pause Mitigation

Two independent free-tier sleep behaviours compound the same risk: Render free instances spin down after a period of inactivity, and Supabase free-tier projects auto-pause after roughly a week idle. A user may first access the app after both services have slept, so a cold start is a realistic failure mode, not a theoretical one.

**Resolved 13/08/26 (§19 Row 14, Closed).** An external scheduler pings `GET /api/health` and the frontend origin every 10 minutes. Two properties make this the right shape rather than a platform-native cron:

- The health check performs a `SELECT 1` (§8), so **one ping addresses both platforms' sleep behaviour**, the API instance stays warm and the database sees traffic.
- It runs **off-platform**, so it survives the exact failure it exists to prevent: a Render-hosted cron on a spun-down instance cannot wake itself.

Both projects stay on their free tiers; no upgrade is required.

Two infrastructure facts previously recorded here as `Open` are now **resolved**, see §19 rows 5 and 6: the Supabase project exists in `ap-southeast-1` (Singapore), and `QWEN_MODEL` is pinned to `qwen3.7-flash`, which accepts JSON-Schema-constrained decoding (§21.2, re-measured 14/08/26; it is not the only such model, and `qwen-flash` is no longer reachable on this account). `.env.example` and `render.yaml` both carry the corrected value.

---
