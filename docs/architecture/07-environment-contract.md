# 07. Environment Contract

Part of the [Technical Reference](../TRD.md).

**Status: `Built`**

Source: `backend/src/config/env.ts`. `EnvSchema` is validated against `process.env` at import time; a failing parse logs the Zod error and calls `process.exit(1)` before the app starts.

| Field                | Type / Constraint                                  | Default                                                  |
| -------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| `NODE_ENV`           | `enum(['development','test','production'])`        | `development`                                            |
| `PORT`               | `coerce.number().int().positive()`                 | `3001`                                                   |
| `CORS_ORIGIN`        | `string().url()`                                   | `http://localhost:5173`                                  |
| `DATABASE_URL`       | `string().min(1)`                                  | none, required                                           |
| `DIRECT_URL`         | `string().min(1)`                                  | none, required                                           |
| `BETTER_AUTH_SECRET` | `string().min(32)`                                 | none, required                                           |
| `BETTER_AUTH_URL`    | `string().url()`                                   | none, required                                           |
| `LLM_PROVIDER`       | `enum(['qwen','gemini','deepseek'])`               | `qwen`                                                   |
| `QWEN_API_KEY`       | `string().optional()`                              | none                                                     |
| `QWEN_BASE_URL`      | `string().url()`                                   | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| `QWEN_MODEL`         | `string()`                                         | `qwen3.7-flash`                                          |
| `GEMINI_API_KEY`     | `string().optional()`                              | none                                                     |
| `GEMINI_MODEL`       | `string()`                                         | `gemini-3.5-flash-lite`                                  |
| `DEEPSEEK_API_KEY`   | `string().optional()`                              | none                                                     |
| `DEEPSEEK_BASE_URL`  | `string().url()`                                   | `https://api.deepseek.com`                               |
| `DEEPSEEK_MODEL`     | `string()`                                         | `deepseek-v4-flash`                                      |
| `ILMU_API_KEY`       | `string().optional()`                              | none: an absent key disables the hosted-ASR relay (#154) |
| `ILMU_BASE_URL`      | `string().url()`                                   | `https://api.ilmu.ai/v1`                                 |
| `ILMU_ASR_MODEL`     | `string()`                                         | `ilmu-asr-v4.2`                                          |
| `SONIOX_API_KEY`     | `string().optional()`                              | none: an absent key disables ambient capture (#268)      |
| `SONIOX_REGION`      | `enum(['us','eu','jp','in'])`                      | `us`                                                     |
| `SONIOX_RT_MODEL`    | `string()`                                         | `stt-rt-v5`                                              |
| `DEID_FAIL_CLOSED`   | `enum(['true','false'])`, transformed to `boolean` | `true`                                                   |

## Production Guards (Enforced At Boot)

1. `NODE_ENV === 'production' && LLM_PROVIDER === 'gemini'` → throws. Gemini's free-tier terms permit Google to use submitted content for product improvement and human review, so it must never sit on a path that could carry patient-derived text in production.
2. `NODE_ENV === 'production' && !DEID_FAIL_CLOSED` → throws. Production must run with fail-closed de-identification.

## Production Guard For DeepSeek (PRC Hosting): Closed 13/08/26

Previously `backend/src/config/env.ts` guarded only `LLM_PROVIDER === 'gemini'` in production, so `LLM_PROVIDER=deepseek` booted in production unguarded despite DeepSeek's API being PRC-hosted, a distinct cross-border question under PDPA 2010 s.129 (`docs/PRD.md` §11).

A third production guard now exists, symmetric with guard 1: `NODE_ENV === 'production' && LLM_PROVIDER === 'deepseek'` throws at boot, naming PRC hosting as the reason. DeepSeek remains available for benchmarking outside production. Asserted by test. §19 row 9 closed.

## `DEID_FAIL_CLOSED` At The Egress Point: Closed 13/08/26

Previously `DEID_FAIL_CLOSED` was declared in `EnvSchema` and guarded at boot, but read nowhere in `backend/src/lib/llm/openai-compatible.ts`. It constrained what configuration was _accepted_ at startup without gating _behaviour_ where a request actually leaves the process.

**What "fail closed" now does** (§19 row 2, resolved): when `DEID_FAIL_CLOSED` is true, `OpenAICompatibleClient.generate()` calls `assertNoIdentifiers(request.content, request.operation)` **before** the network call. That re-runs the full §9 detector inventory over the outbound payload, with already-minted `[LABEL_N]` tokens stripped first, so it inspects only what survived the gate, and throws `DeidentificationError` if anything fires. The request is never sent.

Three properties make this worth more than a duplicate of the first pass:

- It is an **independent second check** on a different input: the first pass runs on the raw transcript, this one on what is actually about to leave.
- It is the control that catches the residual in §5, a `Deidentified` value manufactured by a cast rather than by detection.
- The exception carries **detector labels only, never matched values**, so the failure path cannot itself become a leak vector (§15). Asserted by test.

The guard runs inside the adapter rather than being injected. This widens §2's row for `lib/llm/` from a type-only import of `deid/` to a runtime one, a deliberate, recorded change, on the reasoning that a guard a caller can omit by constructing the client differently is not a boundary.

## Frontend Environment (`VITE_*`)

A separate contract, and a smaller one. These are read by `frontend/` at build time and are **not** in `EnvSchema`, which validates the API's environment only. They were undocumented until #2 shipped a configuration knob that a deploying clinic actually needs to know exists.

| Field                 | Purpose                                                                                                                                                                                                                                                                                                                                | Unset behaviour                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `VITE_API_URL`        | Origin of the API. **Must stay unset in production since #156**: the SPA calls `/api` on its own origin and `vercel.json` rewrites it to Render, which is what keeps the session cookie first-party. Setting it restores a cross-origin call and silently locks out every mobile browser, so the deploy job asserts it is absent (§17) | Requests resolve against the SPA's own origin, which is now the correct wiring |
| `VITE_ASR_MODEL_HOST` | Origin for the on-device speech model's weights (§20). Set it to a mirror and the one third-party runtime request disappears                                                                                                                                                                                                           | Falls back to the HuggingFace CDN, which §20 discloses                         |

**Anything prefixed `VITE_` is public.** Vite inlines it into the bundle, so a value with that prefix is shipped to every visitor. No secret may ever carry it, which is why neither field above is a credential and why `.env.example` documents API-side keys separately.

---
