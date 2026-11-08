<a id="readme-top"></a>

# Frontend SPA

CatatMD's browser client is a React 19 and Vite 7 single-page app for adult GP visits with upper respiratory symptoms, including acute cough and sore throat. It presents captured information and generated notes for clinician review. It does not diagnose, and the clinician approves the final note. Repository consultation data is synthetic.

## Commands

From the repository root, **bun run dev:frontend** in the root [package.json](../package.json) builds shared first and starts Vite. The frontend package scripts below run from **frontend/** after shared has been built.

| Action                               | Command               |
| ------------------------------------ | --------------------- |
| Start Vite                           | **bun Run Dev**       |
| Build TypeScript and the Vite bundle | **bun Run Build**     |
| Run frontend tests                   | **bun Run Test**      |
| Check TypeScript                     | **bun Run Typecheck** |
| Serve the production bundle locally  | **bun Run Preview**   |

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Directory Map

Tests sit beside the source files they cover.

| Directory    | Purpose                                                      | README                           |
| ------------ | ------------------------------------------------------------ | -------------------------------- |
| **audio/**   | Audio capture, transcription, and live speech helpers        | [audio](src/audio/README.md)     |
| **copilot/** | CatatAI conversation and proposal UI                         | [copilot](src/copilot/README.md) |
| **demo/**    | State and controls for the guided demo tour                  | [demo](src/demo/README.md)       |
| **lib/**     | API client, shared browser helpers, and theme state          | [lib](src/lib/README.md)         |
| **preview/** | Synthetic API stub used by preview builds                    | [preview](src/preview/README.md) |
| **review/**  | Note, safety, transcript, and prescription review components | [review](src/review/README.md)   |
| **routes/**  | Page components and consultation capture panel               | [routes](src/routes/README.md)   |
| **shell/**   | Public and signed-in application layouts                     | [shell](src/shell/README.md)     |
| **ui/**      | Reusable visual controls and display primitives              | [ui](src/ui/README.md)           |

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Routing

[App.tsx](src/App.tsx) uses React Router. The report page has session protection but sits outside the signed-in shell.

| Route                                               | Page                               | Layout                      |
| --------------------------------------------------- | ---------------------------------- | --------------------------- |
| **/**                                               | Landing                            | MarketingShell              |
| **/privacy**                                        | Privacy                            | MarketingShell              |
| **/login**                                          | Login                              | Standalone                  |
| **/consultations/:id/report**                       | ConsultationReportPage             | Protected, outside AppShell |
| **/patients**, **/patients/new**, **/patients/:id** | Patient list, creation, and detail | RequireSession and AppShell |
| **/consultations**, **/consultations/:id**          | Consultation list and review       | RequireSession and AppShell |
| **/guidelines**, **/settings**                      | Guideline library and settings     | RequireSession and AppShell |
| All other paths                                     | Redirect to **/**                  | None                        |

RequireSession loads the session through api.session. A missing session redirects to /login.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Data Fetching

main.tsx creates a TanStack Query client with one retry and no refetch on window focus. It wraps App in QueryClientProvider. Most route queries and mutations use methods from [lib/api.ts](src/lib/api.ts); Settings owns a separate retention helper.

| Response Path                     | Current Validation                                                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSON through lib/api.ts request() | safeParse before return. Clinical contracts use @shared/types; local Zod envelopes wrap nested responses. Auth success calls using z.unknown have no shape validation. |
| Settings retention                | safeParse with a local envelope and the shared RetentionPolicySchema.                                                                                                  |
| CatatAI stream                    | use-copilot.ts decodes SSE frames with JSON.parse and casts them. It does not safeParse frames with a shared schema.                                                   |
| Consultation audio download       | Returns a Blob and handles status codes directly. It is not a JSON response.                                                                                           |
| Hosted batch ASR response         | Parsed with a local Zod wire schema in audio/live/elevenlabs-batch.ts.                                                                                                 |

Response validation is therefore not universal across frontend paths. Preserve each path's current parsing boundary when changing it.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Preview Stub

Set VITE_PREVIEW_STUB=true to install preview/stub.ts before the first query can run. It intercepts every /api/ path, including requests whose origin differs from the SPA.

Unknown API paths return 501 not_in_preview. Non-API requests pass through to fetch. Stub state stays in memory and resets on reload.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Styling

Vite loads Tailwind CSS 4 through @tailwindcss/vite. src/index.css imports Tailwind and defines the design tokens in its @theme block.

Follow [DESIGN.md](../docs/DESIGN.md) for visual decisions. The Impeccable skill supports frontend design and critique work; it is agent tooling, not an application dependency.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Frontend Security

- **Browser Storage:** Keep clinical content out of browser storage and IndexedDB. The TanStack Query cache stays in memory and clears on reload.
- **Authentication:** The API client sends cookies with credentials: include. Do not add an Authorization header or store session values in JavaScript-accessible storage.
- **Responses:** Validate JSON before rendering it. Do not render unvalidated API payloads optimistically.

See [frontend-security.md](../.claude/rules/frontend-security.md) for the complete browser policy.

<p align="right"><a href="#readme-top">&uarr;</a></p>
