---
paths:
  - 'backend/src/redflags/**'
  - 'backend/src/routes/consultations.ts'
  - 'backend/src/guidelines/**'
  - 'backend/src/clinical-versions/**'
  - 'shared/src/**'
---

# Clinical Safety

These rules preserve deterministic red-flag handling, constrained citations, and clinician approval.

## Clinical Safety Invariants

- **The model may never suppress a deterministic red flag.** `mergeRedFlags` (`backend/src/redflags/evaluate.ts`) is a pure `ruleFlags.concat(modelCandidates)`. Adding a filter, dedupe, sort, or severity comparison to it breaks the safety invariant and the tests in `backend/src/redflags/evaluate.test.ts` that pin it.
- Rule evaluation runs on the raw transcript **before** the LLM calls, never on model output. Keep that ordering in `backend/src/routes/consultations.ts`.
- `makeSuggestionsAndRedFlagsSchema` pins model red flags to `source: z.literal('model')` with `ruleId` omitted, so a model response structurally cannot impersonate a rule hit.
- **Citations are ID-constrained.** `corpusIdsFor()` (`backend/src/guidelines/documents.ts`) feeds `z.enum(corpusIds)`, so a hallucinated or free-text reference fails schema validation before it reaches a route. Never widen `guidelineId` to a plain string.
- `serialiseCorpusForPrompt` sends only `id`, `title`, and `summary` to the model. Do not add `url`, `sourceLicence`, or `verbatimAllowed`.
- A chunk whose licence sets `verbatimAllowed: false` must never carry a `quote`. `GuidelineChunkSchema` enforces this at parse time, so a violation fails before a chunk reaches a route.
- The red-flag engine stays a pure function library: no I/O, no clock, no LLM. `RED_FLAG_LIST_VERSION` and `GUIDELINE_CORPUS_VERSION` are stamped into audit metadata; bump them when the clinical content changes.
- **No output is a diagnosis, and no note self-approves.** Doctor approval is an explicit state transition (`POST /api/consultations/:id/approve`), never a default.
