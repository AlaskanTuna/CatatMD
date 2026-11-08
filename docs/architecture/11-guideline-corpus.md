# 11. Guideline Corpus

Part of the [Technical Reference](../TRD.md).

**Status: `Built`:** implemented 13/08/26 (issue #8) as 11 hand-written chunks, then retired in favour of a single retrieval-only pipeline on 09/09/26 (`docs/decisions/` D-002). Nothing is hand-written today; every citable document, the three originally curated ones included, is ingested through the same pipeline.

- The stable document references and the prompt serialisation live in `backend/src/guidelines/documents.ts` and `backend/src/guidelines/prompt.ts`; the retrieval algorithm lives in `backend/src/retrieval/`.
- The full CPG library, the three originally curated sources included, is indexed in `corpus/cpg/manifest.json` and stored in `guideline_document` and `guideline_chunk`.
- Clinician review of the corrected summaries remains required.
- No `quote` reaches the model because `serialiseCorpusForPrompt` emits only `id`, `title`, and `summary`.

## Two Citable Vocabularies, Not Two Tiers

There is one corpus now, not two. What differs is which artefact cites which shape of reference into it:

| Citer                                                                        | Cites                                                           | Because                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Red-flag triggers (§10), the gap checklist (`backend/src/gaps/checklist.ts`) | `doc:<id>[#p<n>]`, a stable document reference                  | Deterministic artefacts are versioned in code and need an id that survives a re-ingest; a retrieved chunk id does not survive one                                                                                                          |
| The model, on `suggestions` (§12)                                            | The retrieved chunk ids for this consultation, and nothing else | The model's citable set is built per request from `retrieveGuidelines()`. A `doc:` reference is never a member of that set, so it structurally cannot satisfy the request-time `z.enum`: the model can cite a span, never a whole document |

`documentRef(id, page?)` and `parseDocumentRef()` in `backend/src/guidelines/documents.ts` produce and parse the `doc:` form. `CITABLE_DOCUMENT_IDS` names the documents a `doc:` reference may point at; a test in `documents.test.ts` asserts every id there is present in `corpus/cpg/manifest.json`. Page anchors (`#p<n>`) are deliberately unset by every current trigger and checklist entry: nothing in the deterministic layers points at a specific page today, so the format is unexercised rather than broken.

## Chunk Record Shape

```
interface GuidelineChunk {
  id: string        // stable id; the value RedFlag/Citation.guidelineId cites
  title: string
  publisher: string
  year: number
  url: string
  summary: string    // short, non-verbatim summary shown in the UI
  sourceLicence: string       // e.g. 'MOH-ARR' | 'CC-BY-4.0' | 'CC-BY-NC-3.0'
  verbatimAllowed: boolean    // gates whether `quote` may be populated at all
  quote?: string      // short verbatim excerpt, only permitted when verbatimAllowed
  documentId?: string // set on every retrieved chunk, joining it back to `GuidelineDocument`
  page?: number
  ocr?: boolean       // true when the span was OCRed from a scanned page
}
```

The corpus as a whole carries `GUIDELINE_CORPUS_VERSION`, one of the five versioned clinical artefacts stamped on each analysis; see §15 (Clinical Content Versioning). Per-chunk source versions are not modelled, and the reason is recorded there.

`sourceLicence` and `verbatimAllowed` were added 13/08/26 because the licensing difference between sources is legally load-bearing and the schema previously had no way to express it. `verbatimAllowed: false` means the chunk may be summarised and linked but never quoted; a `quote` present on such a chunk is a corpus-authoring defect and `GuidelineChunkSchema`'s refinement fails it at parse time before it reaches a route. The review UI (`frontend/src/review/SafetyCards.tsx`) renders such a chunk **attribution only**: title, publisher, year, page, a deep link to the source PDF at that page, and the licence line, with no summary and no quote span shown, matching the rendering a `doc:` reference gets, because neither carries a retrieved span the licence permits displaying.

## Source Selection: Resolved 13/08/26 (§19 Row 3, Closed)

Three sources anchor the corpus, and every other ingested CPG scopes around them:

| Source                                                                                   | Covers                                                                                                  | Licence Posture                                                                     |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **MOH National Antimicrobial Guideline (NAG) 4th Ed., 2024**, §A10, §A17, §C1/C3/C4      | Modified Centor scoring, acute pharyngitis, acute cough and bronchitis, acute rhinosinusitis, UTI scope | © MOH Malaysia, **all rights reserved**, summarise + link, `verbatimAllowed: false` |
| **Abdullah et al. (2024), Malaysian Sore-Throat Delphi Consensus**, _Infect Drug Resist_ | McIsaac scoring, antibiotic thresholds, point-of-care testing, symptomatic treatment                    | **CC BY-NC 3.0**, quotable with attribution, `verbatimAllowed: true`                |
| **Ooi et al. (2022)**, _Malaysian Family Physician_                                      | Malaysian URTI presenting patterns and antibiotic use                                                   | **CC BY 4.0**, quotable with attribution, `verbatimAllowed: true`                   |

**NICE Is Excluded From The Corpus.** The NICE UK Open Content Licence states that requests to use NICE content **for artificial intelligence purposes, in the UK and internationally, are not covered by the licence**; international reuse requires a paid agreement, and the licence separately forbids amending or adapting the wording or structure of a published recommendation, which chunking for retrieval arguably is. NICE may still be cited as external context in prose; no NICE recommendation text enters the corpus. This is both the safe answer and the better product answer for a Malaysian GP tool.

## One Source Per Chunk: A Safety Requirement, Not A Style Rule

The two Malaysian sources **disagree**: NAG 2024 puts the antibiotic threshold at Modified Centor **≥3**, while the 2024 Delphi consensus puts it at McIsaac **≥4** (and no antibiotic below 2). They give different answers at a score of 3.

Merging them into one "Centor threshold" chunk would manufacture a consensus that does not exist, and the ID-constrained citation mechanism **cannot catch that failure**, because the model would be citing a real, valid ID. A fabricated agreement reachable through a valid ID is strictly worse than a free-text citation, because it is structurally invisible. Therefore:

- One source per chunk. Every chunk carries its own `publisher`, `year`, and threshold.
- The review UI attributes **per chunk**. It never renders "the guideline says" over merged sources (`docs/PRD.md` CAP-4).

## Sore-Throat Score (Built 08/10/26)

`docs/decisions/` D-012 carries the rationale; this is the implementation reference (#221).

| Part         | Where                                          | Contract                                                                                                                                    |
| ------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Definition   | `backend/src/calculators/sore-throat-score.ts` | NAG 2024 §A10's Modified Centor, items and points only, stamped `SORE_THROAT_SCORE_VERSION`; no threshold. Listed in `VERSIONED_DATA_FILES` |
| Suggestions  | `backend/src/calculators/prefill.ts`           | Pure. Its own sentence reader, not the red-flag engine's; `suggestion: null` wherever nothing was plainly established                       |
| When offered | `scoresFor(transcript, profileId)`             | The `adult-acute-urti` profile, and a sentence plainly reporting a sore throat                                                              |
| Analysis     | `consultations/analysis.ts`                    | Run on the raw transcript in-process beside the rules, never sent to a model; `scores` omitted when empty                                   |
| Stamp        | `clinical-versions/index.ts`                   | `soreThroatScore` in `ACTIVE_CLINICAL_VERSIONS`                                                                                             |
| Review page  | `frontend/src/review/ScoreCard.tsx`            | Nothing pre-selected; a suggestion shows its sentence and a Use button; answers in component state only; hidden in print                    |
| Preview stub | `frontend/src/preview/backend.ts`              | Runs the real `scoresFor`, as it runs the real red-flag engine                                                                              |

- **A Sentence Counts** only if it is not a question, not safety-netting, not about another person or another time. A clause with a negator states nothing, and a denial must govern the finding directly. Said both ways, the item stays empty.
- **A Temperature Is A Reading,** never a number after "above", "under" or similar, and only within 34 to 43 °C.
- **The Citation Is One `doc:` Reference,** resolved by the review page from the ingested documents like a red flag's citation.
- **The Offered Score And Its Suggestions Persist With The Analysis.** The doctor's answers do not.

## Candidate Set Reaching The Prompt

Retrieval is the only source of a citable corpus for the model. The chunks `retrieveGuidelines()` (below) returns for this consultation are serialised into the system prompt for the `suggestions` call (§12), and `corpusIdsFor()` builds the request-time `z.enum` from exactly that set. When retrieval returns nothing, whether because nothing scored above the relevance floors or because the call failed, the corpus is empty and **that call is not made at all** (#340): `generateSuggestions()` (`backend/src/suggestions/index.ts`) runs only the `red_flags` half and returns `suggestions: []`. `outOfScope` is not forced, because an empty retrieval is not an out-of-scope consultation and §19 row 7 turns on telling those apart. Red flags (§10) and the gap checklist are unaffected, because both cite `doc:` references against the ingested documents directly rather than the retrieved set, so an empty retrieval never silences either of them.

## Schema-Enforced Rejection

`ClinicalSuggestionSchema.citations[].guidelineId` is `z.string()` in the shared schema (§3), the shared package cannot depend on a backend-only corpus. The request-time schema used for the suggestions call (§12) narrows this field to `z.enum(corpusIds)`, where `corpusIds` is the live list of retrieved chunk ids at request time. A citation naming an id outside that set, a `doc:` reference included, fails `request.schema.safeParse()` inside `OpenAICompatibleClient.generate()` (§6, `Built`) and throws `LLMResponseError`, the suggestion never reaches the doctor. This is a schema-enforced rejection path, not a prompt instruction the model could choose to ignore.

**Resolved 13/08/26**, source selection and the redistribution stance are settled above, and `verbatimAllowed` now carries the distinction in the schema rather than in a comment. §19 row 3 is closed. **Resolved 09/09/26:** the MaHTAS residual is answered. A Malaysian CPG for this territory does exist: the Academy of Medicine library lists _Management of Sore Throat_ (2003, portal file id 284), 23 years old, now ingested alongside the NAG 2024 anchoring. One residual remains, still deliberately not represented as settled: no clinician has reviewed the summaries corrected by the 07/09/26 primary-source audit (`docs/PRD.md` §12, issue #240).

## Retrieval Pipeline (Built 09/09/26)

A per-consultation corpus is retrieved for each consultation. `docs/README.md` ("Guardrails Against Fabrication", "Guideline Grounding") carries the reader-facing narrative; this subsection is the implementation reference.

- **The Full Library Is The Corpus, And It Is The Only One.** `corpus/cpg/manifest.json` indexes 109 CPG documents from the Academy of Medicine portal, the three anchoring sources above included; the top chunks for each consultation join the `suggestions` candidate set (§12), cited only by the model.
- **Retrieved Ids Are Not Stable Identifiers.** They are generated per document, page, and chunk ordinal at ingest and change on re-ingest, so nothing outside the prompt names one. The review UI resolves them from `ConsultationAnalysis.retrievedGuidelines` (§3), persisted with the analysis because re-running retrieval would not be reproducible.

### Data Model

Two Prisma models, added by migrations `20260909000000_add_guideline_retrieval`, `20260909000100_add_guideline_chunk_ocr`, and `20260909000200_scope_guideline_documents`:

| Model               | Columns                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GuidelineDocument` | `id`, `title`, `publisher`, `year`, `sourceUrl`, `jurisdiction`, `sourceLicence`, `sha256`, `storagePath?`, `pageCount`, `ingestedAt`, `profiles[]`, `verbatimAllowed` |
| `GuidelineChunk`    | `id`, `documentId` → `GuidelineDocument` (`onDelete: Cascade`), `page`, `ordinal`, `heading?`, `text`, `ocr`, `embedding vector(1024)?`, `tsv tsvector?`               |

`embedding` and `tsv` are `Unsupported` to Prisma and written by raw SQL at ingest. `tsv` is a stored generated column (`to_tsvector('english', coalesce(heading, '') || ' ' || text)`) behind a GIN index, and `embedding` carries an HNSW index (`vector_cosine_ops`). `@@index([documentId, ordinal])` preserves per-document chunk order.

### Retrieval Algorithm

`retrieveGuidelines(content: Deidentified, { profileId })` in `backend/src/retrieval/retrieve.ts` runs six steps:

1. **Guard.** Count chunks in the requested jurisdiction (default `'MY'`) whose document is tagged with the active `profileId`; nothing in scope returns `[]` before any other work. A document with no profile tag is never retrievable, which is the default for every manifest entry until an operator scopes it.
2. **Lexical.** `buildLexicalQuery` reduces the text to its 12 most frequent non-stopword terms (English and Malay stop lists, de-id tokens stripped) and ORs them into `to_tsquery('english')`, ranked by `ts_rank_cd` over `tsv`, top 20, then floored at `ts_rank_cd >= 0.2` (at least two query terms).
3. **Semantic.** The content, truncated to 6,000 characters, is embedded through the gated `EmbeddingClient` (below) and matched by pgvector cosine distance (`<=>`) against `embedding`, top 20, then floored at cosine similarity `>= 0.42` (calibrated 09/09/26 on the scoped CPGs).
4. **Fuse.** Reciprocal rank fusion over both floored lists with `k = 60`; the fused order supplies up to 6 ids. The floors are what keep the citation constraint meaningful: without them retrieval always returns six chunks, and the `z.enum` would guarantee only that an id exists, not that it applies.
5. **Load.** `prisma.guidelineChunk.findMany` with `include: { document: true }` for the winning ids, reordered to the fused ranking.
6. **Map.** Each row is parsed through `GuidelineChunkSchema` with `summary` set to the chunk text and `title` carrying the page (`"Document title, p. 12: heading"`), plus `documentId`, `page`, and `ocr`, so the review UI can link `url#page=N` and flag OCR spans.

### Embedding Egress

`backend/src/lib/llm/embeddings.ts` exports a second egress point beside `LLMClient`, gated the same way: `embed()` accepts only `readonly Deidentified[]`. It is always Qwen regardless of `LLM_PROVIDER`, because the stored vectors were produced by one model and a query embedded by another would silently match nothing; it shares `QWEN_API_KEY` and `QWEN_BASE_URL` and selects the model from `QWEN_EMBEDDING_MODEL` (default `text-embedding-v4`).

### Failure Behaviour

| Condition                              | Behaviour                                                                                                                                                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chunk table empty for the jurisdiction | Returns `[]` before any embedding call; no citable corpus is available, so `generateSuggestions()` forces zero suggestions (`outOfScope: true`) while red flags and gaps, which cite `doc:` references rather than the retrieved set, run unaffected |
| Embedding call fails                   | Logs `embedding_unavailable` and continues lexical-only                                                                                                                                                                                              |
| `retrieveGuidelines` throws            | The `/analyze` handler logs `retrieval_error` and proceeds with no citable corpus, the same forced-empty behaviour as above; analysis never fails on retrieval                                                                                       |
| Nothing ranks                          | Returns `[]`; `retrievedGuidelines` is omitted from the persisted analysis rather than stored empty, and the same forced-empty behaviour applies                                                                                                     |

### Ingestion Pipeline

`bun run corpus:ingest` runs `backend/src/scripts/ingest-cpg.ts`:

1. **Match.** Each PDF in `corpus/cpg/raw/` (gitignored) is matched to a `corpus/cpg/manifest.json` entry by filename, falling back to first-page title text; unmatched files are skipped.
2. **Extract.** Text is extracted per page with poppler `pdftotext -layout`. A page under 80 non-whitespace characters is treated as scanned: rendered by `pdftoppm` at 200 dpi and OCRed with Tesseract `eng+msa`, and its chunks are flagged `ocr`.
3. **Chunk.** Within one page only, never across a page boundary, at up to 1,200 characters with 150 overlap, merging undersized fragments.
4. **Embed And Write.** Every chunk is embedded through the same gated client (guideline text passes through `deidentify` too, so there is one rule and no exemption list) and written in a single transaction: the document's chunks are replaced, the document row upserted, and vectors set by raw SQL. An unchanged `sha256` short-circuits the file unless `--force`.
5. **Upload.** The PDF is PUT to the private Supabase Storage bucket when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, and `storagePath` records the object key. Skipped when they are absent.

Flags: `--dry-run` (match, extract, and chunk with no writes), `--only <id>`, `--skip-upload`, `--force`. Requires poppler and Tesseract with the `eng` and `msa` language packs on the machine.

### Environment

| Variable                     | Constraint       | Role                                                                          |
| ---------------------------- | ---------------- | ----------------------------------------------------------------------------- |
| `QWEN_EMBEDDING_MODEL`       | `string()`       | Embedding model for retrieval queries and ingest; default `text-embedding-v4` |
| `SUPABASE_URL`               | `string().url()` | Ingest upload only; optional, the upload step is skipped when absent          |
| `SUPABASE_SERVICE_ROLE_KEY`  | `string()`       | Ingest upload only; optional, the upload step is skipped when absent          |
| `SUPABASE_GUIDELINES_BUCKET` | `string()`       | Ingest upload only; default `guidelines`                                      |

### Licence Status

AMM/MOH reuse terms for the CPG library are unconfirmed (issue #250); every ingested document carries `sourceLicence: 'MOH-CPG-unconfirmed'`. This is a private prototype and nothing is redistributed.

Issue #250 also covers a narrower, still-open question: whether MOH-ARR spans (the NAG document) may be sent to the model for grounding at all, distinct from whether they may be displayed. The current posture, stated rather than assumed, is that they are sent, de-identified like every other retrieved span, and display is off: `verbatimAllowed: false` suppresses the summary and quote in the review UI (above) but does not remove the chunk from the model's candidate set. §19 row 23 tracks this as open.

---
