---
paths:
  - 'package.json'
  - 'bun.lock'
  - '.github/**'
  - 'render.yaml'
  - 'vercel.json'
  - 'Dockerfile*'
---

# Supply Chain And CI

These rules govern dependencies, GitHub Actions, and supply-chain controls.

## Supply Chain And CI

OWASP promoted Software Supply Chain Failures to A03:2025, and it is this repo's largest genuine gap.

- CI installs with `bun install --frozen-lockfile`. Never loosen that, and always commit `bun.lock` with a dependency change.
- **Pin GitHub Actions to commit SHAs.** Actions in `.github/workflows/ci.yml` are pinned to full commit SHAs with a version comment; add new actions SHA-pinned from the start.
- Before adding a dependency: prefer well-known, actively maintained packages, check open advisories, and avoid versions published in the last few days. Most malicious releases are pulled within hours, so a short cooldown catches them.
- Keep the CI secret surface at one entry (`secrets.VERCEL_TOKEN`). Project and org IDs are identifiers, not credentials, and stay inline.
- **Built:** `bun audit --audit-level=high` runs in `verify` (`ci.yml`), so a high or critical advisory fails every branch until it is resolved. It reads a database that moves on its own, which means **a red `verify` can appear on a branch that changed no dependency**: check `git diff --name-only origin/main -- package.json bun.lock` before assuming the branch caused it (issue #315 was exactly this).
- **Transitive advisories are fixed through the root `overrides` block**, which is why one exists. Bump the entry rather than pinning a workspace dependency, and never let a bump move `@huggingface/transformers` off the version `docs/TRD.md` §20.1 measured.
- **In place:** monthly grouped Dependabot updates (`.github/dependabot.yml`), Gitleaks secret scanning on every commit range, and a three-day install cooldown (`bunfig.toml`). **Not built today:** no SAST. State this as an open gap rather than implying coverage.
- **Architectural invariants are enforced by source-scanning guard tests.** Seven exist, all named `no-stray-*`, so `find backend/src -name 'no-stray-*.test.ts'` is the authority rather than this list:
  - `audit/no-stray-audit-writes.test.ts`: every audit write goes through `recordAuditEvent`
  - `clinical-versions/no-stray-clinical-constants.test.ts`: version constants have one home
  - `deid/no-stray-brand-casts.test.ts`: only `deid/` mints the `Deidentified` brand
  - `deid/no-stray-other-language.test.ts`: the untranslated half of a turn never reaches model-bound text
  - `routes/no-stray-approval.test.ts`: `approved` is unreachable without an explicit clinician action
  - `lib/llm/no-stray-provider-sdk.test.ts`: one provider SDK repo-wide, LLM and transcription vendors alike (scopes include `@soniox/` and `@elevenlabs/`, package `elevenlabs`)
  - `lib/asr/no-stray-fetch.test.ts`: the outbound `fetch` inventory under "ASR Egress" (four entries, including `elevenlabs.ts: 1`)

  Two more live in the SPA, because ambient capture egresses where no backend guard can see it:

  - `frontend/src/audio/live/no-stray-websocket.test.ts`: the `new WebSocket(` inventory
  - `frontend/src/no-stray-fetch.test.ts`: the `fetch`, `XMLHttpRequest`, `sendBeacon` and `EventSource` inventory, and a check that every call outside the upload module and the preview stub addresses `${BASE}/api`

  Follow that shape for any invariant the type system cannot express, and check the open issues rather than this line for which one is worth writing next.
