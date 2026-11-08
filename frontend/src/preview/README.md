<a id="readme-top"></a>

# Preview Stub

The preview module supplies a synthetic API for frontend preview builds.

## Module Guide

### Owns

- [stub.ts](stub.ts) installs and removes the browser fetch interceptor.
- [backend.ts](backend.ts) dispatches supported API paths to the preview handlers.
- [engines.ts](engines.ts) reuses pure analysis helpers for preview responses.

### Used By

main.tsx dynamically imports stub.ts when VITE_PREVIEW_STUB is exactly true. The install completes before React mounts and starts its first query.

### Invariants

- **API Isolation:** Every /api/ request is handled by the stub, regardless of origin. API calls never fall through to the real network.
- **Unknown Routes:** An API path without a handler returns 501 not_in_preview.
- **Other Requests:** Non-API requests, including fonts and model files, use the original fetch.
- **Fresh State:** Stub data lives in memory and resets on reload. It does not use browser storage.

### Tests

Coverage includes stub.test.ts.

<p align="right"><a href="#readme-top">&uarr;</a></p>
