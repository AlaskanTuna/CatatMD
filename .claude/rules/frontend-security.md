---
paths:
  - 'frontend/src/**'
  - 'vercel.json'
  - 'backend/src/app.ts'
---

# Frontend Security

These rules protect browser code, local storage, and the SPA security policy.

## Frontend

- **No `dangerouslySetInnerHTML`, no `eval`, no `new Function`.** There are currently zero occurrences repo-wide; keep it that way.
- `localStorage` is for the theme key only (`frontend/src/lib/theme.tsx`). **No clinical content in `localStorage`, `sessionStorage`, or IndexedDB**, and no TanStack Query persister. The query cache is in-memory and must die on reload.
- Auth is cookie-based. `frontend/src/lib/api.ts` sets `credentials: 'include'` and reads no token. Never introduce an `Authorization` header, and never store a session value in JS-reachable storage.
- Every API response is `safeParse`d before render, failing to `ApiError(status, 'invalid_response')`. Do not render an unvalidated payload optimistically.
- Only `VITE_*` env vars reach the bundle. Anything named `VITE_*` is public: no secret ever gets that prefix.
- **The SPA origin sends its own headers** from the `headers` block in `vercel.json`: CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options and COOP. The API is separately covered by `helmet()`. Three entries in that policy are load-bearing and must not be trimmed as unused: `'wasm-unsafe-eval'` in `script-src`, without which the in-browser speech model cannot instantiate; `blob:` in `script-src`, without which ONNX Runtime cannot load its execution backend, which it fetches and then `import()`s from a `URL.createObjectURL` blob (a dynamic import is governed by `script-src`, **not** by `worker-src`, so `worker-src 'self' blob:` starts the worker and the backend load inside it is then blocked); and `microphone=(self)` in `Permissions-Policy`, without which recording is refused before any code runs. `connect-src` must keep `https://*.hf.co`, because HuggingFace redirects model downloads to hosts like `us.aws.cdn.hf.co` that are not under `huggingface.co`; and it must keep `https://api.elevenlabs.io`, the exact host and never a wildcard, without which post-Stop refinement cannot upload (it then falls back to the live transcript); and it must keep `wss://stt-rt.soniox.com`, without which ambient capture cannot open its socket at all. That entry is the exact host for the configured region and must never be widened to a wildcard: it is the platform-layer half of the pair that keeps this egress pointed at one place.
- **Verify a CSP change against the worker, not the UI.** The `blob:` omission above shipped and broke transcription for every cold-cache visitor, because the original check drove the Record tab in a browser whose `transformers-cache` was already warm, so the backend load never took the failing path. Construct the built worker directly and wait for `ready`; see `docs/TRD.md` §17 for the snippet.
- **Do not add `Cross-Origin-Embedder-Policy`.** It would require every cross-origin response the speech model fetches to carry CORP, which the HuggingFace CDN does not send, and would break transcription for a header the app gains nothing from today.
