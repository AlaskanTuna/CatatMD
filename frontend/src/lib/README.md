<a id="readme-top"></a>

# Browser Library

Shared API and browser helpers used across the frontend.

## Module Guide

### Owns

- [api.ts](api.ts) defines the typed API client, error type, and request boundary.
- [transcript.ts](transcript.ts) parses, serializes, and reshapes transcript turns.
- [note-templates.ts](note-templates.ts) provides note sections and clipboard formatting.
- [theme.tsx](theme.tsx) owns the theme provider and preference hook.
- [clock.ts](clock.ts), [plural.ts](plural.ts), [cn.ts](cn.ts), and [use-viewport-fit.ts](use-viewport-fit.ts) provide small shared helpers.

### Used By

Routes and feature modules call api for server data. Shared helpers are imported throughout the UI.

### Invariants

- **JSON Parsing:** Use request() for ordinary JSON API methods. Settings has a separate retention helper, and the copilot uses its SSE stream path.
- **Cookie Auth:** Use credentials: include; do not add a bearer token or an Authorization header.
- **Storage:** Keep clinical content out of browser storage. The query cache is memory-only.
- **Audio Download:** getConsultationAudio returns a Blob and checks HTTP status directly.

### Tests

- **API And Transcript:** api.test.ts and transcript.test.ts.
- **Helpers:** note-templates.test.ts and use-viewport-fit.test.ts.

<p align="right"><a href="#readme-top">&uarr;</a></p>
