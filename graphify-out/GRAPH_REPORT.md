# Graph Report - ai-clinical-assistant  (2026-11-08)

## Corpus Check
- 435 files · ~574,821 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 16 file(s) not represented in the graph (top: (none) 10, .toml 2, .example 1)

## Summary
- 3929 nodes · 8031 edges · 211 communities (187 shown, 24 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 320 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0d49e312`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- dependencies
- biome.json
- src/index.ts
- devDependencies
- llm/index.ts
- AudioCapture.test.tsx
- devDependencies
- shared/package.json
- compilerOptions
- dependencies
- graders.ts
- frontend/tsconfig.json
- backend/tsconfig.json
- TRD
- app.ts
- shared/tsconfig.json
- docs/README.md
- theme.tsx
- frontend/package.json
- 17. Environments & Deployment
- PRD
- 9. Capabilities & Acceptance Criteria
- Spoken Digit Runs
- deid.test.ts
- speak-chatterbox.py
- 3. Shared Contracts (`@shared/types`)
- 21. LLM Guardrail Architecture
- vercel.json
- analyseNote
- AuditEvent
- 20. ASR Contract — On-Device Default, Hosted By Exception
- suggestions/index.ts
- api.ts
- spoken-numbers.ts
- Consultation
- detectors.ts
- 5. Market Fit
- 11. Regulatory Posture
- 12. Known Limitations
- 14. Demo Script
- 1. Domain Background
- 13. Success Metrics
- 6. Scope
- audit/index.ts
- live.ts
- ProposalCard.test.tsx
- cn
- CapturePanel.tsx
- logger.ts
- patients.ts
- lexicon.ts
- ref_ui_button_js
- copilot/index.ts
- clinical-profiles/index.ts
- shared_dist_index
- evals/package.json
- use-live-panes.ts
- copilot-proposals.ts
- draft-turns/index.ts
- DemoTour.tsx
- src/index.test.ts
- asr-ab.ts
- evals/tsconfig.json
- ConsultationReview.tsx
- triggers.ts
- package.json
- checklist.ts
- digest.ts
- env.ts
- consultations.ts
- PrescriptionTheatre.tsx
- deid/index.ts
- asr.test.ts
- 20.2 Draft Speaker Labels: Measured, Gated, Not Diarisation
- scripts
- PatientList.tsx
- no-stray-provider-sdk.test.ts
- consultations.test.ts
- analysis/index.ts
- shared/tsconfig.typecheck.json
- no-stray-dev-references.test.ts
- ingest-cpg.ts
- ref_node_fs
- MedicalRecordNoteEditor.tsx
- PrescriptionBlock.test.tsx
- live-tokens.ts
- no-stray-approval.test.ts
- backend/tsconfig.typecheck.json
- DemoTour.test.tsx
- workflow.ts
- lint-staged
- lines.ts
- record.mjs
- Per-Module Dtype On WebGPU (Issue #144)
- Evals
- @testing-library/react
- AmbientCapture.test.tsx
- no-stray-clinical-constants.test.ts
- devDependencies
- use-dictation-stream.ts
- 23. Clinic EHR Integration Interface
- soniox.ts
- createApp
- AmbientCapture.tsx
- 20.4 The Consent Gate (Resolves §19 Row 18)
- ChromeCluster.tsx
- CursorGlow.tsx
- ../review/SafetyCards.js
- 20.3 Measured Finding: Hosted `ilmu-asr-v4.2` Against The Shipped Local Path
- 20.6 Capture Constraints: Dictation DSP Off (Addendum To §20.3)
- prefill.ts
- acceptance/safety.test.ts
- medications/vocabulary.ts
- use-segment-recorder.test.ts
- floor-guard.ts
- soniox-stream.ts
- PrescriptionTheatre.test.tsx
- sig.ts
- batch-tokens.test.ts
- Contributing To CatatMD
- ilmu.ts
- elevenlabs.ts
- elevenlabs-batch.ts
- react-router-dom
- overrides
- src/no-stray-fetch.test.ts
- pipeline.test.ts
- CapturePanel.test.tsx
- asr-live-sessions.test.ts
- AudioSettingsDialog.tsx
- protocol.ts
- src/note-templates.test.ts
- consultations-live-analysis.test.ts
- no-stray-transformers.test.ts
- use-transcript-audio.ts
- 20.10 Ambient Capture On Soniox, Browser-Direct, Under An API-Minted Key
- 20.9 Ambient Capture On ILMU, And The Mechanism Behind 20.8's Post-Correction Row
- recordAuditEvent
- batch-refinement.test.ts
- ConsultationReport.test.tsx
- no-stray-websocket.test.ts
- 20.7 Live Ambient Capture: Mechanism, Models, And The Accuracy Chain
- deriveGaps
- use-live-panes.test.ts
- retrieve.ts
- health.ts
- consultations-audio.test.ts
- createPreviewBackend
- report-data.ts
- backend/package.json
- audio.test.ts
- medications/index.ts
- asr-batch-sessions.test.ts
- evidence.ts
- AudioCapture.tsx
- 20.13 Evaluated 15/10/26: ElevenLabs Scribe v2 Realtime As A Soniox Replacement
- no-stray-audio-persistence.test.ts
- policy.ts
- consultations-transcript-corrections.test.ts
- manifest.json
- preflight.mjs
- 20.12 Two-Way Translation On Ambient Capture
- asr/vocabulary.ts
- medications
- asr.ts
- CPG Corpus
- ConsultationList.test.tsx
- transcript-cleanup/index.ts
- LiveConversation.tsx
- ScoreCard.test.tsx
- scoreWith
- asr-draft-turns.test.ts
- asr-refinement-check.test.ts
- CatatAI.tsx
- analysis/index.test.ts
- nric.ts
- report-data.test.ts
- CatatMD Demo Recorder
- copilot/index.test.ts
- detectNames
- request-context.ts
- 20.14 Refinement After Stop: Batch `scribe_v2`, Browser-Direct, Under An API-Minted Token
- use-copilot.ts
- SafetyCards.test.tsx
- InfoTip.test.tsx
- CatatAI.test.tsx
- FIXTURES
- narrate.sh
- shared_dist_index_consultationdetail
- Migration Flow
- assemble.sh
- assemble-deck.sh
- film-scale.sh

## God Nodes (most connected - your core abstractions)
1. `cn()` - 97 edges
2. `react` - 72 edges
3. `evaluateRedFlags()` - 44 edges
4. `@testing-library/react` - 42 edges
5. `lucide-react` - 41 edges
6. `@tanstack/react-query` - 36 edges
7. `react-router-dom` - 34 edges
8. `api` - 34 edges
9. `../review/SafetyCards.js` - 34 edges
10. `20. ASR Contract — On-Device Default, Hosted By Exception` - 28 edges

## Surprising Connections (you probably didn't know these)
- `What It Grades` --references--> `applyEvidenceCheck()`  [INFERRED]
  evals/README.md → backend/src/analysis/evidence.ts
- `Deliberate Omissions` --references--> `analyseNote()`  [INFERRED]
  docs/trd.md → backend/src/analysis/index.ts
- `Follow-Ups` --references--> `eraseConsultation()`  [INFERRED]
  docs/trd.md → backend/src/audit/erasure.ts
- `Sore-Throat Score (Built 08/10/26)` --references--> `scoresFor()`  [INFERRED]
  docs/trd.md → backend/src/calculators/prefill.ts
- `Profile Persistence And Migration Path` --references--> `ClinicalArtefactVersion`  [INFERRED]
  docs/trd.md → backend/src/clinical-versions/types.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **PHI Boundary Components** — backend_src_deid, backend_src_lib_llm [EXTRACTED 1.00]

## Communities (211 total, 24 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.08
Nodes (25): scripts, build, corpus:ingest, db:migrate, db:migrate:deploy, db:seed, db:seed:demo, db:status (+17 more)

### Community 1 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, better-auth, compression, cors, dotenv, double-metaphone, express, express-rate-limit (+5 more)

### Community 2 - "biome.json"
Cohesion: 0.06
Nodes (30): files, includes, formatter, enabled, indentStyle, indentWidth, lineWidth, quoteStyle (+22 more)

### Community 3 - "src/index.ts"
Cohesion: 0.01
Nodes (155): ANALYSIS_POLL_MS, AssertionState, AssertionStateSchema, BatchAsrConfig, BatchKeytermSchema, BatchSession, BatchSessionRequest, Citation (+147 more)

### Community 4 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @fontsource-variable/outfit, jsdom, tailwindcss, @tailwindcss/vite, @testing-library/react, @types/react, @types/react-dom (+5 more)

### Community 5 - "llm/index.ts"
Cohesion: 0.14
Nodes (19): env, Deidentified, EMBEDDING_DIMENSIONS, EmbeddingClient, getEmbeddingClient(), build(), OpenAICompatibleClient, OpenAICompatibleEmbeddingClient (+11 more)

### Community 6 - "AudioCapture.test.tsx"
Cohesion: 0.08
Nodes (15): agree(), consentBox(), FakeAudioContext, FakeMediaRecorder, FakeOfflineAudioContext, FakeWorker, recorders, settle() (+7 more)

### Community 7 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, @biomejs/biome, @commitlint/cli, @commitlint/config-conventional, concurrently, husky, lint-staged, prettier (+2 more)

### Community 8 - "shared/package.json"
Cohesion: 0.09
Nodes (21): dependencies, zod, devDependencies, typescript, vitest, exports, typescript, vitest (+13 more)

### Community 9 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution, noImplicitOverride (+8 more)

### Community 10 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, clsx, @fontsource-variable/inter, @fontsource-variable/source-serif-4, @fontsource-variable/work-sans, @huggingface/transformers, lucide-react, react (+9 more)

### Community 11 - "graders.ts"
Cohesion: 0.17
Nodes (17): assertions(), Finding, gradeAll(), gradeCitationValidity(), gradeEvidenceGrounding(), gradeFactCoverage(), gradeModelContribution(), gradeRedFlagRecall() (+9 more)

### Community 12 - "frontend/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, jsx, lib, noEmit, types, extends, include, ../tsconfig.json (+1 more)

### Community 13 - "backend/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, outDir, rootDir, types, exclude, extends, include, ../tsconfig.json (+1 more)

### Community 14 - "TRD"
Cohesion: 0.07
Nodes (27): 18. Traceability, 1. Purpose & Relationship To Other Docs, 22. Observability & Privacy-Safe Logging, 24. Frontend Rendering Constraints, 26. Approved-Note Printed Report, 7. Environment Contract, 8. HTTP Surface As Built, `DEID_FAIL_CLOSED` At The Egress Point — Closed 13/08/26 (+19 more)

### Community 15 - "app.ts"
Cohesion: 0.17
Nodes (20): PROTECTED_PREFIXES, analyzeRateLimit, asksForDictation(), audioReadRateLimit, audioWriteRateLimit, batchSessionRateLimit, dictationSessionRateLimit, draftTurnsRateLimit (+12 more)

### Community 16 - "shared/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, declaration, outDir, rootDir, exclude, extends, include (+1 more)

### Community 18 - "theme.tsx"
Cohesion: 0.36
Nodes (6): readStored(), systemPrefersDark(), ThemeContext, ThemeContextValue, ThemePreference, ThemeProvider()

### Community 21 - "frontend/package.json"
Cohesion: 0.08
Nodes (24): @shared/types, typescript, vitest, zod, license, name, private, type (+16 more)

### Community 23 - "17. Environments & Deployment"
Cohesion: 0.15
Nodes (13): 17. Environments & Deployment, A Third Instance: A Worktree's `.env` Is A Copy, Not A Link, CI, Configuration That Lives Outside The Repository, Free-Tier Auto-Pause Mitigation, Free-Tier Seats And Collaborator Access, Pooled Versus Direct URL Split, Pull Request Previews (+5 more)

### Community 25 - "PRD"
Cohesion: 0.20
Nodes (10): 15. Proposal Source Map, 2. Problem Statement, 3. Aim & Objectives, 4. Who It Is For, 7. Product Principles, Aim, Competitive And Regulatory Framing For The Proposal, Objectives (+2 more)

### Community 26 - "9. Capabilities & Acceptance Criteria"
Cohesion: 0.33
Nodes (6): 9. Capabilities & Acceptance Criteria, CAP-1 — Generate A Structured Clinical Note, CAP-2 — Identify Missing Documentation, CAP-3 — Detect Predefined Red Flags And Escalation Triggers, CAP-4 — Provide Clinical Suggestions With Cited References, CAP-5 — Doctor Reviews, Edits, And Approves Before Saving

### Community 27 - "Spoken Digit Runs"
Cohesion: 0.09
Nodes (22): DetectorLabel, 20.5 Hosted Draft Turns: Server-Side Split And Label, 9. De-Identification Pipeline, Chunking, And Why The Pass Needed It, Cue-Anchored Rule, Detector Inventory, Detector Shape — `pattern + score + context`, Failure Taxonomy And Fallback (+14 more)

### Community 28 - "deid.test.ts"
Cohesion: 0.16
Nodes (16): LANGUAGE_SAMPLES, LanguageSample, FIXTURE_RUBRICS, FixtureRubric, SPOKEN_IC_CUE, SPOKEN_IC_DIGITS, SPOKEN_IC_READINGS, spokenIcSentence() (+8 more)

### Community 29 - "speak-chatterbox.py"
Cohesion: 0.08
Nodes (46): hashlib, json, os, pathlib, allocate_durations(), apply_slides(), deconflict(), main() (+38 more)

### Community 30 - "3. Shared Contracts (`@shared/types`)"
Cohesion: 0.25
Nodes (8): 3. Shared Contracts (`@shared/types`), Load-Bearing Semantics, Malaysian Operational Block, Ratification Conditions (Research-Imposed), Structured Clinical-Information Schema — Ratified 13/08/26, Transcript, Transcript Provenance — `Transcript.source`, ClinicalAssertion

### Community 31 - "21. LLM Guardrail Architecture"
Cohesion: 0.22
Nodes (9): 21.1 Measured Finding — Fabricated Clinical Negatives, 21.2 Provider Constraint — Strict Structured Output Is Not Universal, 21.3 Control Tiers, 21.4 Evidence-Bound Assertion — The Primary Control, 21.5 Transcript As Untrusted Input, 21.6 Independent Corroboration Of The §21.1 Mechanism, 21.7 What Stays Open, 21. LLM Guardrail Architecture (+1 more)

### Community 32 - "vercel.json"
Cohesion: 0.20
Nodes (9): buildCommand, framework, git, deploymentEnabled, headers, installCommand, outputDirectory, rewrites (+1 more)

### Community 33 - "analyseNote"
Cohesion: 0.14
Nodes (18): analyseNote(), 12. LLM Prompt & Response Contracts, 6. LLM Port & Adapter, Adapter Mechanism (`OpenAICompatibleClient`), Failure Modes, Gap Assembly — Deterministic First, Model Strictly Additive, `GenerateRequest<T>`, `LLMResponseError` (+10 more)

### Community 34 - "AuditEvent"
Cohesion: 0.12
Nodes (18): 10. Safety Constraints, Why "The Doctor Reviews Everything" Is Not, By Itself, The Safety Argument, 13. API Contracts, 4. Data Model (Prisma), Audit Surface, Auth Models (better-auth Prisma Adapter), Clinical Content Versioning, Clinical Domain (+10 more)

### Community 35 - "20. ASR Contract — On-Device Default, Hosted By Exception"
Cohesion: 0.15
Nodes (13): 20.1 Measured Finding — Model Selection For Malaysian Code-Switched Speech, 20. ASR Contract — On-Device Default, Hosted By Exception, Batch, Not Streaming, For V1, Bounding The Wait: The Worker Speaks, Silence Is Terminated, Capture Mode Ownership And Manual Pause, Consent UX — A Live Tension, Not A Solved Problem, Deciding Whether To Offer Audio — The Two-Stage Capability Probe, The `ASRClient` Port (+5 more)

### Community 36 - "suggestions/index.ts"
Cohesion: 0.09
Nodes (31): ScoreDefinition, cited(), DocumentRefSchema, GapChecklistSourceSchema, CITABLE_DOCUMENT_IDS, CitableDocumentId, corpusIdsFor(), documentRef() (+23 more)

### Community 37 - "api.ts"
Cohesion: 0.04
Nodes (64): api, ApiError, AuditEventSchema, ConsultationEnvelope, ErasePatientEnvelope, FixturesEnvelope, GuidelineDocumentsEnvelope, HistoryEnvelope (+56 more)

### Community 38 - "spoken-numbers.ts"
Cohesion: 0.07
Nodes (45): anchorAfter(), BREAKERS, buildRuns(), ClauseCues, clauseFrom(), continues(), count(), Counts (+37 more)

### Community 39 - "Consultation"
Cohesion: 0.15
Nodes (14): 8. Primary Flow, 14. Auth Model, Consultation Erasure Tombstones, Consultation Lifecycle, Interaction With Existing Contracts, The One Network Call The Local Path Does Make, Two Assets, Two Decisions, What Crosses The Network (+6 more)

### Community 40 - "detectors.ts"
Cohesion: 0.05
Nodes (50): ACCEPT_THRESHOLD, ADDRESS_CONTEXT, ADDRESS_PATTERN, CLAUSE_CUES, CLAUSE_STOPS, CUE_PATTERNS, DATE_NEAR_CUE, DETECTORS (+42 more)

### Community 41 - "5. Market Fit"
Cohesion: 0.25
Nodes (8): 5. Market Fit, Commercial Path — Stated As Estimate, Not Finding, Ground Already Occupied — Not Claimed As Novel, Positioning, The Claim Path — Built, Deliberately Not Shipped, The Commercial Thesis, The Scribe Function Is Already Commoditised Here, What Is Table Stakes Versus What Is Differentiating

### Community 42 - "11. Regulatory Posture"
Cohesion: 0.40
Nodes (5): 11. Regulatory Posture, Data Protection, Intended Purpose Statement, The Architecture Is The Compliance Strategy, The Concession, Volunteered

### Community 43 - "12. Known Limitations"
Cohesion: 0.40
Nodes (5): 12. Known Limitations, Audio And ASR, Clinical And Evidential, Language, Product And Delivery

### Community 44 - "14. Demo Script"
Cohesion: 0.40
Nodes (5): 14. Demo Script, Close, Fixture Content, Guardrail Reel (~60 Seconds), Happy Path

### Community 45 - "1. Domain Background"
Cohesion: 0.40
Nodes (5): 1. Domain Background, The Load-Bearing Gap In This Picture, The Setting, What The Note Actually Is, Who Reads The Note

### Community 46 - "13. Success Metrics"
Cohesion: 0.50
Nodes (4): 13. Success Metrics, Evaluation Reported In The Proposal, Future Production Metrics, MVP Success

### Community 47 - "6. Scope"
Cohesion: 0.50
Nodes (4): 6. Scope, In Scope, Out Of Scope, Out-Of-Scope Presentations At Runtime

### Community 48 - "audit/index.ts"
Cohesion: 0.07
Nodes (37): appended, write(), AUDIT_CHAIN_GENESIS, AuditChainFailure, AuditChainInput, AuditChainRow, AuditChainVerification, computeAuditHash() (+29 more)

### Community 49 - "live.ts"
Cohesion: 0.39
Nodes (8): analyseLiveWindow(), buildLiveFactsSystemPrompt(), established(), fold(), foldFacts(), foldOperational(), isAssertion(), isRecord()

### Community 50 - "ProposalCard.test.tsx"
Cohesion: 0.20
Nodes (7): headline(), ProposalCard(), ACKNOWLEDGE, DISMISS, EDIT, ref_proposalcard_js, shared_dist_index_copilotproposal

### Community 51 - "cn"
Cohesion: 0.04
Nodes (63): Ambient Extends This, It Does Not Bypass It, The Ambient Disclosure, Removed 10/09/26, ConsentGate(), InputMeter(), LevelWave(), MeterState, prefersReducedMotion(), WAVE (+55 more)

### Community 52 - "CapturePanel.tsx"
Cohesion: 0.10
Nodes (33): Mechanism, carryUncertain(), classify(), DOCTOR_PATTERNS, DraftLine, draftLinesFor(), draftToTurns(), endsWithQuestion() (+25 more)

### Community 53 - "logger.ts"
Cohesion: 0.06
Nodes (34): DEIDENTIFICATION_FAILURE_STAGES, DEIDENTIFICATION_PAYLOAD_ORIGINS, DeidentificationFailureStage, DeidentificationPayloadOrigin, ALLOWED_FIELDS, currentRequestId(), DETECTOR_LABELS, ERROR_CLASSES (+26 more)

### Community 54 - "patients.ts"
Cohesion: 0.10
Nodes (26): assertOwnedConsultation(), ROWS, HttpError, prisma, inFlightGate(), MAX_AUDIO_BYTES, parseAudioBody(), rawAudio (+18 more)

### Community 55 - "lexicon.ts"
Cohesion: 0.17
Nodes (17): PROFILE_IDS, ProfileIdSchema, BOTH, lexiconFor(), MEDICATION_LEXICON, MEDICATION_LEXICON_VERSION, BRANDS, URTI (+9 more)

### Community 56 - "ref_ui_button_js"
Cohesion: 0.11
Nodes (19): NoteEditor(), SECTIONS, summarise(), PrescriptionBlock(), ScoreCard(), ConsultationReportPage(), Report(), ago() (+11 more)

### Community 57 - "copilot/index.ts"
Cohesion: 0.11
Nodes (24): CopilotChunk, keepPartial(), ReasoningFilter, rehydrateArgs(), runCopilotTurn(), buildCopilotSystemPrompt(), serialiseCorpus(), drip() (+16 more)

### Community 58 - "clinical-profiles/index.ts"
Cohesion: 0.17
Nodes (18): ADULT_ACUTE_UNCOMPLICATED_UTI_PROFILE_VERSION, ADULT_ACUTE_URTI_PROFILE_VERSION, CLINICAL_PROFILES, ClinicalProfile, DEFAULT_PROFILE_ID, PROFILE_DEFINITIONS, selectProfileContent(), ProfileId (+10 more)

### Community 59 - "shared_dist_index"
Cohesion: 0.09
Nodes (35): evaluateRedFlags(), TRIGGER_FIXTURES, flagIds(), live(), STRADDLING_PAIR, unionOfWindows(), windows(), MALAY_TRIGGER_FIXTURES (+27 more)

### Community 60 - "evals/package.json"
Cohesion: 0.10
Nodes (19): dependencies, @shared/types, devDependencies, tsx, @types/node, typescript, vitest, @shared/types (+11 more)

### Community 61 - "use-live-panes.ts"
Cohesion: 0.10
Nodes (26): appendOnly(), closedSegments(), deltaFor(), mergeFlags(), segmentsToDelta(), EMPTY, LivePanes, useLivePanes() (+18 more)

### Community 62 - "copilot-proposals.ts"
Cohesion: 0.17
Nodes (14): CLICK_INSTRUCTION, hasPhantomClickInstruction(), 25.5 The Phantom-Click Diagnostic, CONTROL_REQUESTS, EDIT_REQUESTS, main(), rate(), REPS (+6 more)

### Community 63 - "draft-turns/index.ts"
Cohesion: 0.18
Nodes (15): DraftTurnsFailureReason, draftChunk(), draftTurns(), DraftTurnsError, mapWithLimit(), mergeAdjacent(), stubClient(), StubRequest (+7 more)

### Community 64 - "DemoTour.tsx"
Cohesion: 0.14
Nodes (15): DEMO_CONSULTATION_ID, DemoTourContext, DemoTourProvider(), DemoTourValue, FallbackReason, pickConsultations(), resolveStepRoute(), runEphemeral() (+7 more)

### Community 65 - "src/index.test.ts"
Cohesion: 0.09
Nodes (22): 2b — `suggestions`, ClinicalAssertionSchema, ClinicalFactsResponseSchema, ClinicalFactsSchema, ConsultationDetailSchema, ConsultationListItemSchema, DraftTurnsRequestSchema, DraftTurnsResponseSchema (+14 more)

### Community 66 - "asr-ab.ts"
Cohesion: 0.09
Nodes (38): Args, asPercent(), CallResult, checkIntegrity(), Chunk, Container, CONTAINER_CODEC, cutChunks() (+30 more)

### Community 67 - "evals/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, noEmit, types, exclude, extends, include, ../tsconfig.json, references

### Community 68 - "ConsultationReview.tsx"
Cohesion: 0.06
Nodes (43): timestamp(), spaceBelow(), TestHarness(), toPixels(), useViewportFit(), verticalMargin(), CHECKLIST_SECTION_LABELS, CHECKLIST_SECTION_ORDER (+35 more)

### Community 69 - "triggers.ts"
Cohesion: 0.09
Nodes (31): CONFUSABLES, expandMishears(), Expansion, isRecorded(), originalSpan(), proposeMishearCorrections(), ABILITY_DENIAL, asserts() (+23 more)

### Community 70 - "package.json"
Cohesion: 0.10
Nodes (20): dependencies, @prisma/client, engines, node, @prisma/client, typescript, license, name (+12 more)

### Community 71 - "checklist.ts"
Cohesion: 0.06
Nodes (33): ALL_GAP_CHECKLIST, CitableDocumentIdSchema, GAP_CHECKLIST, GAP_CHECKLIST_VERSION, GapChecklistSource, NAG_ACUTE_COUGH_PATHWAY, NAG_ADULT_COUGH, NAG_ADULT_COUGH_AND_PHARYNGITIS (+25 more)

### Community 72 - "digest.ts"
Cohesion: 0.28
Nodes (10): decisionFor(), MAX_DIGEST_CHARS, renderChecklist(), renderDigest(), renderGaps(), renderNote(), renderRedFlags(), renderSuggestions() (+2 more)

### Community 73 - "env.ts"
Cohesion: 0.11
Nodes (19): EnvSchema, parsed, auth, CLIENT_IP_HEADER, clientIp(), leftmostForwardedFor(), resolveClientIp(), load() (+11 more)

### Community 74 - "consultations.ts"
Cohesion: 0.05
Nodes (52): audioRetentionEnabled(), scoresFor(), timeStage(), audioSlot, CreateBodySchema, dispositionsFor(), EphemeralBodySchema, LiveAnalysisBodySchema (+44 more)

### Community 75 - "PrescriptionTheatre.tsx"
Cohesion: 0.09
Nodes (39): acceptCandidate(), capDictation(), EMPTY_DRAFT, evidenceOf(), FOOD_OPTIONS, FREQUENCY_OPTIONS, fromSig(), LineEdit (+31 more)

### Community 76 - "deid/index.ts"
Cohesion: 0.08
Nodes (29): labelsIn(), detect(), assertNoIdentifiers(), DeidentificationError, deidentify(), deidentifyTranscript(), detectOutsideTokens(), markDeidentified() (+21 more)

### Community 77 - "asr.test.ts"
Cohesion: 0.22
Nodes (7): auditState, post(), postAudio(), sessionState, testEnv, upstream, webmBytes()

### Community 78 - "20.2 Draft Speaker Labels: Measured, Gated, Not Diarisation"
Cohesion: 0.18
Nodes (11): 20.2 Draft Speaker Labels: Measured, Gated, Not Diarisation, Limits, Measured, 14/08/26, Measured, 15/08/26, Revised 15/08/26: Sentence Units And Content Scores, The Apply Gate Is The Safety Control, The Fallback Contract, The Offsets Contract (+3 more)

### Community 79 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, preview, test, typecheck

### Community 80 - "PatientList.tsx"
Cohesion: 0.11
Nodes (22): count(), CONSULTATION_PAGE_SIZE, ConsultationRows(), ERASE_NOUN, EraseDialog(), formatGender(), PatientDetail(), ErasablePatient (+14 more)

### Community 81 - "no-stray-provider-sdk.test.ts"
Cohesion: 0.25
Nodes (9): isComment(), isProviderSdk(), packageName(), PROVIDER_PACKAGES, PROVIDER_SCOPES, providerImports(), REPO_ROOT, SCANNED_TREES (+1 more)

### Community 82 - "consultations.test.ts"
Cohesion: 0.15
Nodes (11): AI_MEDICAL_RECORD, AI_NOTE, analysed(), ANALYSIS, auditEvent, audits, call(), LEGACY_ANALYSIS (+3 more)

### Community 83 - "analysis/index.ts"
Cohesion: 0.27
Nodes (10): buildEvidenceLinks(), EvidenceLink, linkFor(), linksForGroup(), buildClinicalFactsSystemPrompt(), buildNoteAndGapsSystemPrompt(), sharedPreamble(), NoteAndGapsResult (+2 more)

### Community 84 - "shared/tsconfig.typecheck.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, declaration, noEmit, exclude, extends, include, ./tsconfig.json

### Community 85 - "no-stray-dev-references.test.ts"
Cohesion: 0.18
Nodes (8): ../backend/src/c.js, EXTENSIONS, FORBIDDEN, REGEX_MAY_FOLLOW, REPO_ROOT, SKIPPED, sourceFiles(), SRC

### Community 86 - "ingest-cpg.ts"
Cohesion: 0.09
Nodes (44): bucketName(), chunkPage(), ChunkSpec, cleanPage(), collapseSpaces(), computeRunningHeaders(), EXEC_OPTIONS, execFile (+36 more)

### Community 87 - "ref_node_fs"
Cohesion: 0.08
Nodes (22): brandCasts(), EXPECTED_CASTS, namesBrand(), REPO_ROOT, SCANNED_TREES, sourceFiles(), REPO_ROOT, translated (+14 more)

### Community 88 - "MedicalRecordNoteEditor.tsx"
Cohesion: 0.15
Nodes (18): displayValue(), formatNoteForClipboard(), HISTORY_KEYS, LEGACY_CATEGORY_UNAVAILABLE, MedicalRecordSection, medicalRecordSections(), SECTIONS, CLINICAL_SECTIONS (+10 more)

### Community 89 - "PrescriptionBlock.test.tsx"
Cohesion: 0.29
Nodes (6): expand(), getToggle(), mocks, STORED, useDemoTour, ref_prescriptionblock_js

### Community 90 - "live-tokens.ts"
Cohesion: 0.15
Nodes (19): Built 09/09/26: Per-Token Confidence, Shown As A Cue (Issue #309), What Is Not Measured, continuesWord(), dominantSpeaker(), EMPTY_LIVE_TRANSCRIPT, interimSpeaker(), interimText(), joinTokens() (+11 more)

### Community 91 - "no-stray-approval.test.ts"
Cohesion: 0.36
Nodes (7): approvalWrites(), EXPECTED, isComment(), isExempt(), REPO_ROOT, SCANNED_TREES, sourceFiles()

### Community 92 - "backend/tsconfig.typecheck.json"
Cohesion: 0.29
Nodes (6): compilerOptions, noEmit, exclude, extends, include, ./tsconfig.json

### Community 93 - "DemoTour.test.tsx"
Cohesion: 0.06
Nodes (21): catatai, CurrentPath(), renderTour(), Wander(), ref_demostepbar_js, ref_helpbutton_js, ref_routes_consultationlist_js, ref_routes_consultationreportpage_js (+13 more)

### Community 94 - "workflow.ts"
Cohesion: 0.14
Nodes (19): BENCH_TRANSCRIPT, TURNS, elapsedMs(), fail(), main(), median(), parseRuns(), runOnce() (+11 more)

### Community 95 - "lint-staged"
Cohesion: 0.29
Nodes (6): lint-staged, AGENTS.md, biome.json, commitlint.config.js, {docs,.github}/**/*.{md,yml,yaml}, {shared,backend,frontend,evals,scripts}/**/*.{ts,tsx,js,json}

### Community 96 - "lines.ts"
Cohesion: 0.16
Nodes (28): clausesOf(), Cluster, clustersOf(), COUNTED, cut(), dosed(), fill(), FILLER (+20 more)

### Community 97 - "record.mjs"
Cohesion: 0.14
Nodes (21): ref_bun_test, ref_node_os, assertCompleteTake(), normalizedBeatOffsets(), REQUIRED_BEATS, SHOT_COUNT, SHOT_NAMES, beats (+13 more)

### Community 98 - "Per-Module Dtype On WebGPU (Issue #144)"
Cohesion: 0.29
Nodes (7): Download Size, Measured 15/08/26, Model, Delivery, And Runtime — Resolved 13/08/26 (§19 Row 13, Closed), Per-Module Dtype On WebGPU (Issue #144), Session And Speed, Same Machine And Recording, The Quantised Decoder Needs Graph Optimisation Disabled, Timestamp Integrity On The Reference Recording, Token A/B, Stated With The Honesty §20.1 Demands

### Community 99 - "Evals"
Cohesion: 0.25
Nodes (7): Adding A Case, Cost And Data, Cost And Data, Evals, The ASR A/B Harness, What It Grades, Why This Is Not `tests/`

### Community 100 - "@testing-library/react"
Cohesion: 0.04
Nodes (34): unapprovedDetail, ANALYSING, APPROVED, audioApi, LEGACY_EDITED_NOTE, livePanes, MEDICAL_RECORD_NOTE, NOTE (+26 more)

### Community 101 - "AmbientCapture.test.tsx"
Cohesion: 0.07
Nodes (29): AmbientProps, BATCH_SESSION, choose(), config, createBatchSession, createLiveSession, draftHostedTurns, drain() (+21 more)

### Community 102 - "no-stray-clinical-constants.test.ts"
Cohesion: 0.15
Nodes (10): REPO_ROOT, SCANNED_TREES, CLINICAL_IDS, isExempt(), REPO_ROOT, SCANNED_TREES, sourceFiles(), VERSIONED_DATA_FILES (+2 more)

### Community 103 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, tsx, @types/compression, @types/cors, @types/express, @types/node, typescript, vitest

### Community 104 - "use-dictation-stream.ts"
Cohesion: 0.09
Nodes (16): LiveTranscript, TIMESLICE_MS, DictationPhase, DictationStream, DROPPED_ERROR, MIC_FAILED_ERROR, SHORT_TAIL_NOTICE, START_FAILED_ERROR (+8 more)

### Community 105 - "23. Clinic EHR Integration Interface"
Cohesion: 0.25
Nodes (8): note(), 23. Clinic EHR Integration Interface, Approved-Note Export Contract, Authentication And Transport, Candidate Standards Assessment, Direction And Trigger, PHI Boundary Under A Real Integration, Patient

### Community 106 - "soniox.ts"
Cohesion: 0.08
Nodes (30): LiveSessionFailureReason, DICTATION_LANGUAGE_HINTS, getLiveAsrDescriptor(), LANGUAGE_HINTS, MAX_SESSION_DURATION_SECONDS, mintSonioxSession(), MODE_SETTINGS, ModeSettings (+22 more)

### Community 107 - "createApp"
Cohesion: 0.05
Nodes (25): createApp(), auditEvent, captured, FIXTURE, store, db, sessionState, testEnv (+17 more)

### Community 108 - "AmbientCapture.tsx"
Cohesion: 0.09
Nodes (36): AmbientCapture(), Availability, buildRecorder(), clock(), discardRecorder(), Phase, RECONNECT_DELAYS_MS, Reconnecting() (+28 more)

### Community 109 - "20.4 The Consent Gate (Resolves §19 Row 18)"
Cohesion: 0.29
Nodes (7): 20.4 The Consent Gate (Resolves §19 Row 18), Client Behaviour, Two Controls, Two Questions, What Is Rendered, What Pins This, Added 06/09/26 (#254), What The Copy Claims, And Why It Claims No More, Why The Structure Carries The Rule, Not The Wording

### Community 110 - "ChromeCluster.tsx"
Cohesion: 0.25
Nodes (7): Glass Inside Glass Is Always Flat, HelpButton(), ConsultationList(), AccountPanel(), ChromeCluster(), ref_dropover_js, ref_notificationpanel_js

### Community 111 - "CursorGlow.tsx"
Cohesion: 0.60
Nodes (4): alphaAt(), CursorGlow(), DISCS, sizeAt()

### Community 112 - "../review/SafetyCards.js"
Cohesion: 0.22
Nodes (19): spokenTimestamp(), ../review/SafetyCards.js, AttributionSource(), ChunkProvenance(), ClampedSummary(), CorpusLink(), DispositionControl(), GAP_PRIORITY (+11 more)

### Community 113 - "20.3 Measured Finding: Hosted `ilmu-asr-v4.2` Against The Shipped Local Path"
Cohesion: 0.50
Nodes (4): 20.3 Measured Finding: Hosted `ilmu-asr-v4.2` Against The Shipped Local Path, Decision, Applying The Rule Written In #151 Before Measurement, Findings, In Order Of Consequence, Token Table, Rojak Sample

### Community 114 - "20.6 Capture Constraints: Dictation DSP Off (Addendum To §20.3)"
Cohesion: 0.50
Nodes (4): 20.6 Capture Constraints: Dictation DSP Off (Addendum To §20.3), Re-Measurement Protocol (Needs A Human Reader), What Changed, What This Rests On, And What It Does Not Claim

### Community 115 - "prefill.ts"
Cohesion: 0.14
Nodes (21): allIn(), clausesOf(), denies(), measure(), Prefill, prefillItem(), prefillSoreThroatScore(), read() (+13 more)

### Community 116 - "acceptance/safety.test.ts"
Cohesion: 0.12
Nodes (12): formatReport(), Measurement, measurements, record(), deriveConsultationTitle(), humanise(), PRESENT_STATES, shared_dist_index_clinicalassertionschema (+4 more)

### Community 117 - "medications/vocabulary.ts"
Cohesion: 0.11
Nodes (21): containsDiagnosticProse(), DIAGNOSTIC_PHRASING, DiagnosticGuardResult, stripDiagnosticProse(), DOSE_RATE, DOSE_UNIT, DURATION_DAYS, FREQUENCY_ABBREVIATION (+13 more)

### Community 118 - "use-segment-recorder.test.ts"
Cohesion: 0.11
Nodes (19): DEFAULT_SEGMENT_BOUNDS, DEFAULT_SILENCE_RMS, isSilentThroughout(), rmsFromTimeDomain(), SegmentBounds, SegmentState, shouldCut(), BOUNDS (+11 more)

### Community 119 - "floor-guard.ts"
Cohesion: 0.13
Nodes (24): The Analysis Lease, And Why The Client Polls (#373), What Is Recorded, ref_node_child_process, cannotRun(), Change, count(), findViolations(), firstAddedLine() (+16 more)

### Community 120 - "soniox-stream.ts"
Cohesion: 0.11
Nodes (14): CONNECT_TIMEOUT_MS, FINISH_TIMEOUT_MS, LiveStreamFailure, openSonioxStream(), SonioxMessageSchema, SonioxStream, SonioxStreamHandlers, SonioxTokenSchema (+6 more)

### Community 121 - "PrescriptionTheatre.test.tsx"
Cohesion: 0.08
Nodes (14): doses(), drugs(), FakeRecorder, fields(), LIVE_CONFIG, mocks, NO_SIG, REPORTED_LINES (+6 more)

### Community 122 - "sig.ts"
Cohesion: 0.12
Nodes (21): Claim, DOSE_RULES, DURATION_RULES, DURATION_UNIT, EMPTY, firstUnclaimed(), FOOD_RULES, FREQUENCY_RULES (+13 more)

### Community 123 - "batch-tokens.test.ts"
Cohesion: 0.16
Nodes (21): Measured 07/10/26: Language Coverage On The Production Config (#218), Method, batchWordsToTokens(), FOREIGN_SCRIPTS, liveEndMs(), liveVoices(), MAX_REFINED_TAIL_SHORTFALL_MS, MAX_REFINED_UNITS_PER_MINUTE (+13 more)

### Community 124 - "Contributing To CatatMD"
Cohesion: 0.15
Nodes (18): Branches And Commits, Contributing To CatatMD, Deploys, First Run, Issues, Lanes To Main, Never, Paths That Need A Second Review (+10 more)

### Community 125 - "ilmu.ts"
Cohesion: 0.15
Nodes (15): AsrRelayFailureReason, extensionFor(), getAsrDescriptor(), IlmuRelayError, IlmuWireSchema, REASON_BY_STATUS, audio, relayError() (+7 more)

### Community 126 - "elevenlabs.ts"
Cohesion: 0.16
Nodes (14): BatchSessionFailureReason, BATCH_API_ORIGIN, batchRefinementConfig(), ElevenLabsMintError, getBatchAsrDescriptor(), mintBatchToken(), REASON_BY_STATUS, SingleUseTokenWireSchema (+6 more)

### Community 127 - "elevenlabs-batch.ts"
Cohesion: 0.13
Nodes (15): BatchResponseWireSchema, BatchUploadFailure, BatchUploadResult, BatchWord, BatchWordWireSchema, REASON_BY_STATUS, network, RECORDING (+7 more)

### Community 128 - "react-router-dom"
Cohesion: 0.07
Nodes (28): at(), CLAIMS, LIMITS, CLAIMS, Field(), Login(), Privacy(), Section() (+20 more)

### Community 129 - "overrides"
Cohesion: 0.18
Nodes (11): overrides, adm-zip, compression, deepmerge-ts, fast-uri, js-yaml, proxy-addr, sharp (+3 more)

### Community 130 - "src/no-stray-fetch.test.ts"
Cohesion: 0.15
Nodes (15): EXPECTED_REQUEST_SITES, EXPECTED_UPLOAD_CALLERS, EXTENSIONS, inType(), isRequestReference(), parse(), probe(), REPO_ROOT (+7 more)

### Community 131 - "pipeline.test.ts"
Cohesion: 0.11
Nodes (13): assemble, browserBeats, missing, missingPdfTools, narrate, narration, narrationBeats, NBSP (+5 more)

### Community 132 - "CapturePanel.test.tsx"
Cohesion: 0.13
Nodes (7): Captured, consultationCaptureProps(), open(), openRecordTab(), renderForSubmit(), setup(), ref_capturepanel_js

### Community 140 - "asr-live-sessions.test.ts"
Cohesion: 0.18
Nodes (11): auditState, jsonResponse(), mint(), mintedKey(), nextIp(), readConfig(), sessionState, testEnv (+3 more)

### Community 141 - "AudioSettingsDialog.tsx"
Cohesion: 0.09
Nodes (18): Amended 06/10/26: The Preference Goes, AudioSettings, DEFAULT_AUDIO_SETTINGS, loadAudioSettings(), saveAudioSettings(), toConstraints(), TranscriptionEngine, AudioSettingsDialog() (+10 more)

### Community 142 - "protocol.ts"
Cohesion: 0.12
Nodes (20): Latency Budget (Resolved 13/08/26), Measured Workflow Timing (08/09/26, Issue #224), CHUNK_LENGTH_S, countChunks(), HEARTBEAT_TOKENS, STRIDE_LENGTH_S, TARGET_SAMPLE_RATE, WorkerRequest (+12 more)

### Community 143 - "src/note-templates.test.ts"
Cohesion: 0.17
Nodes (14): Clinical Note & Analysis, Note Template Projections, CaptureModeSchema, ConsultationSchema, MedicalRecordNote, MedicalRecordNoteSchema, NoteTemplateSchema, SoapNote (+6 more)

### Community 144 - "consultations-live-analysis.test.ts"
Cohesion: 0.11
Nodes (9): Body, db, llm, sessionState, testEnv, Turn, Row, rows (+1 more)

### Community 145 - "no-stray-transformers.test.ts"
Cohesion: 0.21
Nodes (12): asPosix(), entryModules(), EXTENSIONS, Import, importsOf(), LIVE, modulesIn(), reachable() (+4 more)

### Community 146 - "use-transcript-audio.ts"
Cohesion: 0.29
Nodes (7): keepRecording(), recordingUrl(), release(), freshStore(), revoked, Store, useTranscriptAudio()

### Community 147 - "20.10 Ambient Capture On Soniox, Browser-Direct, Under An API-Minted Key"
Cohesion: 0.12
Nodes (23): 20.10 Ambient Capture On Soniox, Browser-Direct, Under An API-Minted Key, Amended 10/09/26: Streaming Becomes The Default On That Page, Extended 06/10/26: Mandarin And Tamil, Extended 10/09/26: The Sign-Off Reaches Prescription Dictation, Extended 28/09/26: The Sign-Off Reaches Two-Way Translation, Follow-Ups This Section Creates, Measured 06/09/26: The Policy Pins The Host, And The Host Answers, Measured 06/09/26: What The Endpoint Actually Does (+15 more)

### Community 148 - "20.9 Ambient Capture On ILMU, And The Mechanism Behind 20.8's Post-Correction Row"
Cohesion: 0.25
Nodes (8): 20.9 Ambient Capture On ILMU, And The Mechanism Behind 20.8's Post-Correction Row, Measured 06/09/26: The Segmentation Penalty On ILMU, Post-Correction: The Mechanism Behind 20.8's Row, Provenance Of The Sources In This Section, The Correction Shape That Was Chosen, The Latency Number Is Fixed Overhead, Which Is The Risk, What Choosing ILMU Costs, What Must Be Measured Before This Is Built

### Community 149 - "recordAuditEvent"
Cohesion: 0.11
Nodes (24): MAX_AUDIO_BYTES, purgeAudio(), readAudio(), storeAudio(), sweepExpiredAudio(), eraseConsultation(), erasePatient(), appended (+16 more)

### Community 150 - "batch-refinement.test.ts"
Cohesion: 0.11
Nodes (17): CONFIG, BATCH_ASR_UPLOAD_URL, BatchAsrConfigSchema, BatchSessionRequestSchema, BatchSessionSchema, LiveAsrConfigSchema, MAX_ASR_CONTEXT_TERMS, MAX_BATCH_RECORDING_SECONDS (+9 more)

### Community 151 - "ConsultationReport.test.tsx"
Cohesion: 0.14
Nodes (10): MEDICAL_RECORD, SOAP, analysis(), detail(), soapNote(), AI_NOTE, ref_consultationreport_js, ref_medicalrecordnoteeditor_js (+2 more)

### Community 152 - "no-stray-websocket.test.ts"
Cohesion: 0.22
Nodes (7): EXPECTED_WEBSOCKET_SITES, EXTENSIONS, isWebSocketConstruction(), REPO_ROOT, SKIPPED, SRC, websocketSites()

### Community 153 - "20.7 Live Ambient Capture: Mechanism, Models, And The Accuracy Chain"
Cohesion: 0.25
Nodes (8): 20.7.1 Measured: Reachability, Containers, And The Context Effect, 20.7 Live Ambient Capture: Mechanism, Models, And The Accuracy Chain, Every Model In The Chain, Provider Research, And An Unexplained Gap In The Record, Retraction: Language Detection Was Not The Problem, The Mechanism, What Must Be Measured Before This Is Built, Why This Reopens A Closed Decision

### Community 154 - "deriveGaps"
Cohesion: 0.13
Nodes (16): deriveGaps(), 20.11 The Live Panes, And Why The Note Is Not One Of Them, 20.8.1 The Published Work Closest To This Design, 20.8 How This Design Compares To Industry Practice, Decisions A Reviewer Will Question, No Differential Diagnosis, And The Reason Is Regulatory, The Finding That Matters Most: Nobody De-Identifies Before The Model, The Fold, And Why The Model Never Sees The Previous Facts (+8 more)

### Community 155 - "use-live-panes.test.ts"
Cohesion: 0.25
Nodes (5): apiMock, emptyFacts, FakeApiError, segment(), withClosed()

### Community 156 - "retrieve.ts"
Cohesion: 0.09
Nodes (26): sliceDeidentified(), buildLexicalQuery(), STOP_WORDS, RetrievalOptions, retrieveGuidelines(), embed, findMany, info (+18 more)

### Community 157 - "health.ts"
Cohesion: 0.40
Nodes (3): healthRouter, envMock, health()

### Community 158 - "consultations-audio.test.ts"
Cohesion: 0.24
Nodes (8): clientKey(), db, get(), headers(), put(), sessionState, testEnv, 16. Security Controls

### Community 159 - "createPreviewBackend"
Cohesion: 0.16
Nodes (13): applyDispositions(), conflict(), createPreviewBackend(), errorResponse(), json(), parse(), StubError, installPreviewStub() (+5 more)

### Community 160 - "report-data.ts"
Cohesion: 0.17
Nodes (16): ConsultationReport(), dateFormat, timestampFormat, SEVERITY_ORDER, FOOD_LABELS, titleCase(), decidedAtFormat, displayValue() (+8 more)

### Community 161 - "backend/package.json"
Cohesion: 0.07
Nodes (27): @prisma/client, @shared/types, tsx, @types/node, typescript, vitest, zod, license (+19 more)

### Community 162 - "audio.test.ts"
Cohesion: 0.25
Nodes (6): appended, env(), retention, Row, rows, Controls

### Community 163 - "medications/index.ts"
Cohesion: 0.24
Nodes (14): MedicationEntry, Normalised, admits(), editDistance(), ORTHOGRAPHIC_BAR, orthographicSimilarity(), PHONETIC_BAR, phoneticSimilarity() (+6 more)

### Community 164 - "asr-batch-sessions.test.ts"
Cohesion: 0.18
Nodes (11): auditState, jsonResponse(), mint(), mintedToken(), nextIp(), readConfig(), sessionState, testEnv (+3 more)

### Community 165 - "evidence.ts"
Cohesion: 0.17
Nodes (14): applyEvidenceCheck(), checkAssertion(), checkGroup(), EVIDENCE_REQUIRED_STATES, EvidenceCheckResult, hasVerbatimEvidence(), LlmClinicalFacts, LlmOperationalBlock (+6 more)

### Community 166 - "AudioCapture.tsx"
Cohesion: 0.27
Nodes (10): AudioCapture(), estimateRemaining(), LABEL_TIMEOUT_MS, Phase, UPLOAD_TIMEOUT_MS, belowHardwareFloor(), DICTATION_AUDIO_CONSTRAINTS, STALL_TIMEOUT_MS (+2 more)

### Community 167 - "20.13 Evaluated 15/10/26: ElevenLabs Scribe v2 Realtime As A Soniox Replacement"
Cohesion: 0.14
Nodes (14): 20.13 Evaluated 15/10/26: ElevenLabs Scribe v2 Realtime As A Soniox Replacement, Batch `scribe_v2`: The Non-Streaming Option (Measured 15/10/26), Findings, Follow-Ups, Out Of Scope: Bengali, Urdu And Translation, Platform Constraints From Vendor Docs, Pre-Registered Decision Rule, Provenance Of The Sources In This Section (+6 more)

### Community 168 - "no-stray-audio-persistence.test.ts"
Cohesion: 0.40
Nodes (4): AUDIO_DIR, MAY_PERSIST, MAY_SEND_AUDIO, sourceFiles()

### Community 169 - "policy.ts"
Cohesion: 0.15
Nodes (16): applyEditPolicy(), CleanupEdit, firedIds(), occurrences(), overlaps(), PolicyResult, ruleIds(), transcript (+8 more)

### Community 170 - "consultations-transcript-corrections.test.ts"
Cohesion: 0.18
Nodes (8): db, RECORDED, sessionState, stubClient(), testEnv, UNCERTAIN, upstream, shared_dist_index_transcriptcorrectionsresponseschema

### Community 171 - "manifest.json"
Cohesion: 0.25
Nodes (7): documents, jurisdiction, publisher, source, sourceLicence, verbatimAllowed, verbatimAllowedNote

### Community 172 - "preflight.mjs"
Cohesion: 0.32
Nodes (12): checkBeatNarrationAgreement(), checkFixture(), checkNoApproveInSource(), DEFAULT_DEMO_FIXTURE, extractFinishShotBudgets(), main(), parseDemoUrl(), parseNarrationLines() (+4 more)

### Community 173 - "20.12 Two-Way Translation On Ambient Capture"
Cohesion: 0.17
Nodes (13): liveSessionConfig(), settingsFor(), 20.12 Two-Way Translation On Ambient Capture, Built 09/09/26: Layer 1 Vocabulary, And What It Is Not Evidence Of, Decisions A Reviewer Will Question, Follow-Ups, Measured 28/09/26: Malay Is The Dangerous Case, Measured 28/09/26: Red-Flag Recall On The Translated English (+5 more)

### Community 174 - "asr/vocabulary.ts"
Cohesion: 0.15
Nodes (15): ASR_VOCABULARY_VERSION, dictationContextTerms(), DOSE_UNIT_TERMS, ENGLISH_DRUG_TERMS, FREQUENCY_ABBREVIATION_TERMS, LEXICON_DRUG_TERMS, MALAY_CLINICAL_TERMS, SIG_DICTATION_TERMS (+7 more)

### Community 175 - "medications"
Cohesion: 0.33
Nodes (5): medications, Residual Risks, Stated Rather Than Hidden, The Boundary, Three Things Worth Knowing Before Changing It, What Each File Does

### Community 176 - "asr.ts"
Cohesion: 0.15
Nodes (11): getLLMDescriptor(), acquireRelaySlot, asrRouter, BATCH_FAILURE_RESPONSES, FAILURE_RESPONSES, firedRuleIds(), LIVE_FAILURE_RESPONSES, shared_dist_index_batchsessionrequestschema (+3 more)

### Community 177 - "CPG Corpus"
Cohesion: 0.33
Nodes (5): CPG Corpus, How Scanned Pages Are Handled, How To Add Documents, Licence Status, What Lives Here

### Community 178 - "ConsultationList.test.tsx"
Cohesion: 0.19
Nodes (9): row(), rows(), ConsultationRow(), formatConsultationDate(), STATUS, ref_consultationlist_js, ref_ui_renamefield_js, shared_dist_index_consultationlistitem (+1 more)

### Community 179 - "transcript-cleanup/index.ts"
Cohesion: 0.23
Nodes (9): cleanChunk(), CleanupOutcome, CleanupResponseSchema, mapWithLimit(), proposeModelCorrections(), stubClient(), StubRequest, uncertain (+1 more)

### Community 180 - "LiveConversation.tsx"
Cohesion: 0.30
Nodes (11): INTERPRETED_LANGUAGE_NAMES, speakerNumber(), ConversationMode, directionOf(), elapsed(), LANGUAGE_NAMES, languageName(), LiveConversation() (+3 more)

### Community 181 - "ScoreCard.test.tsx"
Cohesion: 0.18
Nodes (10): AGE, checked(), FEVER, group(), GUIDES, NODES, SCORES, YES_NO (+2 more)

### Community 182 - "scoreWith"
Cohesion: 0.18
Nodes (11): cuePattern(), cueRegExp(), detectAddress(), detectPhone(), escapeCue(), hasContext(), previousNonSpace(), scoreWith() (+3 more)

### Community 183 - "asr-draft-turns.test.ts"
Cohesion: 0.18
Nodes (6): auditState, llmState, sessionState, testEnv, shared_dist_index_draftturnsresponseschema, shared_dist_index_max_draft_text_characters

### Community 184 - "asr-refinement-check.test.ts"
Cohesion: 0.22
Nodes (10): auditState, check(), lostIds(), nextIp(), sessionState, testEnv, upstream, shared_dist_index_max_refinement_check_characters (+2 more)

### Community 185 - "CatatAI.tsx"
Cohesion: 0.35
Nodes (9): CatatAI(), ChipRow(), ToolRuns(), Turn(), FOLLOW_UP_CHIPS, FOLLOW_UP_QUESTIONS, OPENING_CHIPS, OPENING_QUESTIONS (+1 more)

### Community 186 - "analysis/index.test.ts"
Cohesion: 0.22
Nodes (5): stubClient(), StubRequest, stubSplit(), shared_dist_index_clinicalfactsresponse, shared_dist_index_noteandgapsresponse

### Community 187 - "nric.ts"
Cohesion: 0.22
Nodes (9): detectNric(), detectSpokenNumbers(), directlyAfterMrnCue(), longRunLabel(), isStructurallyValidNric(), isValidBirthDate(), NRIC_PATTERN, NRIC_UNHYPHENATED_PATTERN (+1 more)

### Community 188 - "report-data.test.ts"
Cohesion: 0.24
Nodes (5): analysis(), decidedAtFormat, detail(), soapNote(), stamped

### Community 189 - "CatatMD Demo Recorder"
Cohesion: 0.20
Nodes (9): CatatMD Demo Recorder, Narration And Export, Offline Verification, Operator Dependencies, Optional Deck Helpers, Preparation Status, Recording Later, Review Before Sharing (+1 more)

### Community 190 - "copilot/index.test.ts"
Cohesion: 0.28
Nodes (6): chunks, consultation(), RETRIEVED, signed(), stream, withRetrieved()

### Community 191 - "detectNames"
Cohesion: 0.25
Nodes (9): caseInsensitiveLiteral(), detectNames(), isGivenName(), isStopword(), latin(), nameSegments(), normalise(), stripPossessive() (+1 more)

### Community 192 - "request-context.ts"
Cohesion: 0.31
Nodes (5): withRequestContext(), normaliseRoute(), requestContext(), captured, ref_node_crypto

### Community 193 - "20.14 Refinement After Stop: Batch `scribe_v2`, Browser-Direct, Under An API-Minted Token"
Cohesion: 0.25
Nodes (8): 20.14 Refinement After Stop: Batch `scribe_v2`, Browser-Direct, Under An API-Minted Token, Follow-Ups, Gate Results, Known Costs, Sanity Checks, The Sign-Off, Thresholds Pending The Measurement Gate, Why Browser-Direct

### Community 194 - "use-copilot.ts"
Cohesion: 0.32
Nodes (7): CopilotMessage, CopilotProposalCard, CopilotToolRun, frames(), localId(), useCopilot(), shared_dist_index_copilotturn

### Community 197 - "CatatAI.test.tsx"
Cohesion: 0.33
Nodes (4): ask(), CONSULTATION, openPanel(), ref_catatai_js

### Community 199 - "narrate.sh"
Cohesion: 0.53
Nodes (5): KOKORO_HOME, mean_of(), mux(), require_command(), narrate.sh script

### Community 200 - "shared_dist_index_consultationdetail"
Cohesion: 0.40
Nodes (3): NEXT, ref_approvebar_js, shared_dist_index_consultationdetail

### Community 201 - "Migration Flow"
Cohesion: 0.67
Nodes (3): Migration Flow, CaptureMode, NoteTemplate

## Knowledge Gaps
- **1356 isolated node(s):** `name`, `private`, `license`, `type`, `dev` (+1351 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1806 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `cn` to `react-router-dom`, `CapturePanel.test.tsx`, `AudioSettingsDialog.tsx`, `use-transcript-audio.ts`, `theme.tsx`, `20.10 Ambient Capture On Soniox, Browser-Direct, Under An API-Minted Key`, `frontend/package.json`, `api.ts`, `AudioCapture.tsx`, `ProposalCard.test.tsx`, `LiveConversation.tsx`, `CapturePanel.tsx`, `ref_ui_button_js`, `CatatAI.tsx`, `use-live-panes.ts`, `DemoTour.tsx`, `use-copilot.ts`, `ConsultationReview.tsx`, `PrescriptionTheatre.tsx`, `PatientList.tsx`, `MedicalRecordNoteEditor.tsx`, `DemoTour.test.tsx`, `@testing-library/react`, `use-dictation-stream.ts`, `AmbientCapture.tsx`, `ChromeCluster.tsx`, `CursorGlow.tsx`, `../review/SafetyCards.js`, `use-segment-recorder.test.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `react-router-dom`, `ConsultationReview.tsx`, `api.ts`, `AudioCapture.tsx`, `PrescriptionTheatre.tsx`, `AudioSettingsDialog.tsx`, `../review/SafetyCards.js`, `ConsultationList.test.tsx`, `LiveConversation.tsx`, `CapturePanel.tsx`, `MedicalRecordNoteEditor.tsx`, `CatatAI.tsx`, `ref_ui_button_js`, `use-live-panes.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `20. ASR Contract — On-Device Default, Hosted By Exception` connect `20. ASR Contract — On-Device Default, Hosted By Exception` to `20.14 Refinement After Stop: Batch `scribe_v2`, Browser-Direct, Under An API-Minted Token`, `Per-Module Dtype On WebGPU (Issue #144)`, `20.13 Evaluated 15/10/26: ElevenLabs Scribe v2 Realtime As A Soniox Replacement`, `Consultation`, `20.12 Two-Way Translation On Ambient Capture`, `20.2 Draft Speaker Labels: Measured, Gated, Not Diarisation`, `20.4 The Consent Gate (Resolves §19 Row 18)`, `TRD`, `20.3 Measured Finding: Hosted `ilmu-asr-v4.2` Against The Shipped Local Path`, `20.6 Capture Constraints: Dictation DSP Off (Addendum To §20.3)`, `20.10 Ambient Capture On Soniox, Browser-Direct, Under An API-Minted Key`, `20.9 Ambient Capture On ILMU, And The Mechanism Behind 20.8's Post-Correction Row`, `20.7 Live Ambient Capture: Mechanism, Models, And The Accuracy Chain`, `deriveGaps`, `Spoken Digit Runs`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `evaluateRedFlags()` (e.g. with `Built 09/09/26: Layer 3, The Constrained Cleanup Pass (Issue #309)` and `Controls`) actually correct?**
  _`evaluateRedFlags()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `license` to the rest of the system?**
  _1356 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `biome.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._