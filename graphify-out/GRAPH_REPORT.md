# Graph Report - ai-clinical-assistant-qwen  (2026-11-10)

## Corpus Check
- 515 files · ~506,570 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: (none) 11, .toml 2, .example 1)

## Summary
- 4040 nodes · 8221 edges · 225 communities (202 shown, 23 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 117 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3427d79c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- dependencies
- biome.json
- ref_zod
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
- src/copilot.ts
- app.ts
- shared/tsconfig.json
- backend/README.md
- theme.tsx
- frontend/package.json
- live-asr.ts
- PRD
- 9. Capabilities & Acceptance Criteria
- use-live-panes.ts
- deid.test.ts
- speak-chatterbox.py
- detail.ts
- gazetteer.ts
- vercel.json
- diagrams/render.mjs
- src/api.ts
- bilingual.ts
- ref_vitest
- lib/api.ts
- spoken-numbers.ts
- src/transcript.ts
- detectors.ts
- 5. Market Fit
- 11. Regulatory Posture
- 12. Known Limitations
- 14. Guided Demo Tour
- 1. Domain Background
- 13. Success Metrics
- 6. Scope
- audit/index.ts
- ChecklistPanel.tsx
- medications.ts
- cn
- draft-turns.ts
- logger.ts
- consultations.ts
- medications/index.ts
- NotificationPanel.tsx
- copilot/index.ts
- clinical-profiles/index.ts
- shared_dist_index
- evals/package.json
- live-prompt.ts
- CatatAI.tsx
- draft-turns/index.ts
- DemoTour.tsx
- src/index.test.ts
- asr-ab.ts
- evals/tsconfig.json
- ReviewPanes.tsx
- PrescriptionLineRow.tsx
- package.json
- README.md
- shared_dist_index_consultationdetail
- env.ts
- backend.ts
- prescription-draft.ts
- openai-compatible.test.ts
- asr.test.ts
- protocol.ts
- bilingual.test.ts
- ref_ui_button_js
- no-stray-provider-sdk.test.ts
- consultations.test.ts
- lib/note-templates.ts
- shared/tsconfig.typecheck.json
- no-stray-dev-references.test.ts
- ingest-cpg.ts
- no-stray-brand-casts.test.ts
- MedicalRecordNoteEditor.tsx
- PrescriptionBlock.test.tsx
- live-tokens.ts
- no-stray-approval.test.ts
- backend/tsconfig.typecheck.json
- DemoTour.test.tsx
- consultations/analysis.ts
- lint-staged
- lines.ts
- record.mjs
- InputMeter.test.tsx
- Evals
- @testing-library/react
- AmbientCapture.test.tsx
- no-stray-clinical-constants.test.ts
- devDependencies
- use-dictation-stream.test.ts
- createPreviewBackend
- routes/asr.ts
- createApp
- AmbientCapture.tsx
- Guidelines.tsx
- seed-demo.ts
- CursorGlow.tsx
- ../review/SafetyCards.js
- Acceptance
- Analysis
- prefill.ts
- acceptance/safety.test.ts
- asr/vocabulary.ts
- segment-policy.test.ts
- floor-guard.ts
- soniox-stream.ts
- PrescriptionTheatre.test.tsx
- sig.ts
- batch-tokens.test.ts
- Contributing To CatatMD
- ilmu.ts
- Audio
- elevenlabs-batch.ts
- Login.tsx
- overrides
- src/no-stray-fetch.test.ts
- pipeline.test.ts
- CapturePanel.test.tsx
- asr-batch-sessions.test.ts
- AudioSettingsDialog.tsx
- transcribe.worker.ts
- consultation.ts
- consultations-live-analysis.test.ts
- no-stray-transformers.test.ts
- Audit
- CapturePanel.tsx
- Bench
- Calculators
- batch-refinement.test.ts
- ConsultationReport.test.tsx
- no-stray-websocket.test.ts
- Clinical-Profiles
- Clinical-Versions
- use-live-panes.test.ts
- retrieve.ts
- Config
- Copilot
- stub.test.ts
- report-data.ts
- backend/package.json
- audio.test.ts
- Deid
- Draft-Turns
- Gaps
- AudioCapture.tsx
- Lib
- ref_node_fs
- policy.ts
- consultations-transcript-corrections.test.ts
- manifest.json
- preflight.mjs
- Middleware
- Note-Templates
- Medications
- live-window.test.ts
- CPG Corpus
- ConsultationList.tsx
- deid/index.ts
- LiveConversation.tsx
- ScoreCard.test.tsx
- detectSpokenNumbers
- asr-draft-turns.test.ts
- Retrieval
- Routes
- analysis/index.test.ts
- nric.ts
- report-data.test.ts
- CatatMD Demo Recorder
- copilot/index.test.ts
- Scripts
- suggestions/index.test.ts
- Suggestions
- Transcript-Cleanup
- SafetyCards.test.tsx
- run.ts
- frontend/README.md
- Frontend SPA
- narrate.sh
- Module Guide
- About The Project
- assemble.sh
- assemble-deck.sh
- film-scale.sh
- Module Guide
- Module Guide
- Module Guide
- PrescriptionDictationHeader.tsx
- Module Guide
- frontend/src/routes/README.md
- Module Guide
- Module Guide
- Backend
- Prisma
- WorkerResponse
- LiveConversation.test.tsx
- release-please-config.json
- Shared Types

## God Nodes (most connected - your core abstractions)
1. `cn()` - 107 edges
2. `react` - 76 edges
3. `lucide-react` - 46 edges
4. `@testing-library/react` - 41 edges
5. `evaluateRedFlags()` - 39 edges
6. `@tanstack/react-query` - 37 edges
7. `api` - 37 edges
8. `react-router-dom` - 35 edges
9. `../review/SafetyCards.js` - 34 edges
10. `scripts` - 25 edges

## Surprising Connections (you probably didn't know these)
- `What It Grades` --references--> `applyEvidenceCheck()`  [INFERRED]
  evals/README.md → backend/src/analysis/evidence.ts
- `Engineering Highlights` --references--> `Deidentified`  [INFERRED]
  README.md → backend/src/deid/types.ts
- `Issues` --references--> `api()`  [INFERRED]
  .github/CONTRIBUTING.md → prisma/seed-demo.ts
- `Tech Stack` --references--> `LLMClient`  [INFERRED]
  README.md → backend/src/lib/llm/types.ts
- `8. Primary Flow` --references--> `Consultation`  [INFERRED]
  docs/PRD.md → shared/src/consultation.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **PHI Boundary Components** — backend_src_deid, backend_src_lib_llm [EXTRACTED 1.00]

## Communities (225 total, 23 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.08
Nodes (25): scripts, build, corpus:ingest, db:migrate, db:migrate:deploy, db:seed, db:seed:demo, db:status (+17 more)

### Community 1 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, better-auth, compression, cors, dotenv, double-metaphone, express, express-rate-limit (+5 more)

### Community 2 - "biome.json"
Cohesion: 0.06
Nodes (30): files, includes, formatter, enabled, indentStyle, indentWidth, lineWidth, quoteStyle (+22 more)

### Community 3 - "ref_zod"
Cohesion: 0.05
Nodes (59): ref_zod, ClinicalScore, ClinicalScoreSchema, ScoreItemSchema, ScoreOptionSchema, AssertionState, AssertionStateSchema, ClinicalAssertion (+51 more)

### Community 4 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, @fontsource-variable/outfit, jsdom, tailwindcss, @tailwindcss/vite, @testing-library/react, @types/react, @types/react-dom (+5 more)

### Community 5 - "llm/index.ts"
Cohesion: 0.16
Nodes (16): Deidentified, EMBEDDING_DIMENSIONS, EmbeddingClient, getEmbeddingClient(), build(), OpenAICompatibleClient, OpenAICompatibleEmbeddingClient, GenerateRequest (+8 more)

### Community 6 - "AudioCapture.test.tsx"
Cohesion: 0.09
Nodes (14): agree(), consentBox(), FakeAudioContext, FakeMediaRecorder, FakeOfflineAudioContext, recorders, settle(), startButton() (+6 more)

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
Cohesion: 0.24
Nodes (11): assertions(), gradeAll(), gradeCitationValidity(), gradeEvidenceGrounding(), gradeFactCoverage(), gradeModelContribution(), gradeRedFlagRecall(), gradeRuleAttribution() (+3 more)

### Community 12 - "frontend/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, jsx, lib, noEmit, types, extends, include, ../tsconfig.json (+1 more)

### Community 13 - "backend/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, outDir, rootDir, types, exclude, extends, include, ../tsconfig.json (+1 more)

### Community 14 - "src/copilot.ts"
Cohesion: 0.08
Nodes (24): AuditEvent, AuditEventSchema, Disposition, DispositionInput, DispositionInputSchema, DispositionSchema, DispositionShape, DispositionState (+16 more)

### Community 15 - "app.ts"
Cohesion: 0.08
Nodes (35): PROTECTED_PREFIXES, CLIENT_IP_HEADER, clientIp(), leftmostForwardedFor(), resolveClientIp(), load(), trustedProxies, analyzeRateLimit (+27 more)

### Community 16 - "shared/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, declaration, outDir, rootDir, exclude, extends, include (+1 more)

### Community 17 - "backend/README.md"
Cohesion: 0.23
Nodes (3): backend/src/deid/, backend/src/lib/llm/, Technical Reference

### Community 18 - "theme.tsx"
Cohesion: 0.36
Nodes (6): readStored(), systemPrefersDark(), ThemeContext, ThemeContextValue, ThemePreference, ThemeProvider()

### Community 21 - "frontend/package.json"
Cohesion: 0.06
Nodes (29): @shared/types, typescript, vitest, zod, license, name, private, scripts (+21 more)

### Community 23 - "live-asr.ts"
Cohesion: 0.09
Nodes (21): INCONSISTENT, LIVE_ASR_RELAY_PATH, LIVE_ASR_RELAY_URL, LIVE_ASR_WEBSOCKET_URL, LiveAsrConfig, LiveAsrConfigObject, LiveAsrConfigSchema, LiveAsrMode (+13 more)

### Community 25 - "PRD"
Cohesion: 0.20
Nodes (10): 15. Product Documentation Map, 2. Problem Statement, 3. Aim & Objectives, 4. Who It Is For, 7. Product Principles, Aim, Market And Regulatory Context, Objectives (+2 more)

### Community 26 - "9. Capabilities & Acceptance Criteria"
Cohesion: 0.33
Nodes (6): 9. Capabilities & Acceptance Criteria, CAP-1 — Generate A Structured Clinical Note, CAP-2 — Identify Missing Documentation, CAP-3 — Detect Predefined Red Flags And Escalation Triggers, CAP-4 — Provide Clinical Suggestions With Cited References, CAP-5 — Doctor Reviews, Edits, And Approves Before Saving

### Community 27 - "use-live-panes.ts"
Cohesion: 0.22
Nodes (16): appendOnly(), closedSegments(), deltaFor(), LiveFoldSegment, mergeFlags(), segmentsToDelta(), EMPTY, useLivePanes() (+8 more)

### Community 28 - "deid.test.ts"
Cohesion: 0.15
Nodes (16): labelsIn(), detect(), GIVEN_NAMES, HONORIFICS, NAME_STOPWORDS, FIXTURES, LANGUAGE_SAMPLES, LanguageSample (+8 more)

### Community 29 - "speak-chatterbox.py"
Cohesion: 0.08
Nodes (46): hashlib, json, os, pathlib, allocate_durations(), apply_slides(), deconflict(), main() (+38 more)

### Community 30 - "detail.ts"
Cohesion: 0.16
Nodes (17): classifyFailure(), dispositionsFor(), persistedProfileId(), toDetail(), toDetailWithApprover(), Consultations, Entry Points, Invariants (+9 more)

### Community 31 - "gazetteer.ts"
Cohesion: 0.11
Nodes (17): DRUG_NAME_WORDS, HAN_BEFORE_SURNAME, HAN_COMPOUND_SURNAMES, HAN_GREETINGS, HAN_NAME_INTRODUCERS, HAN_NOT_NAMES, HAN_RELATIVES, HAN_SURNAME_INTRODUCERS (+9 more)

### Community 32 - "vercel.json"
Cohesion: 0.20
Nodes (9): buildCommand, framework, git, deploymentEnabled, headers, installCommand, outputDirectory, rewrites (+1 more)

### Community 33 - "diagrams/render.mjs"
Cohesion: 0.12
Nodes (12): ref_node_child_process, ref_node_module, candidate, { chromium }, dir, fromFrontend, OUTFIT, root (+4 more)

### Community 34 - "src/api.ts"
Cohesion: 0.05
Nodes (37): 10. Safety Constraints, Why "The Doctor Reviews Everything" Is Not, By Itself, The Safety Argument, ConsultationDetail, ConsultationDetailSchema, ConsultationListItem, ConsultationListItemSchema, DEMO_PLAN, ERASE_BATCH_LIMIT (+29 more)

### Community 35 - "bilingual.ts"
Cohesion: 0.13
Nodes (18): BilingualTurn, bounded(), Building, INTERPRETED_LANGUAGE_NAMES, Line, OtherLanguage, readable(), RoledSegment (+10 more)

### Community 36 - "ref_vitest"
Cohesion: 0.08
Nodes (41): ScoreDefinition, ALL_GAP_CHECKLIST, CitableDocumentIdSchema, cited(), DocumentRefSchema, GapChecklistSource, GapChecklistSourceSchema, NAG_ACUTE_COUGH_PATHWAY (+33 more)

### Community 37 - "lib/api.ts"
Cohesion: 0.03
Nodes (63): api, ApiError, ConsultationEnvelope, ErasePatientEnvelope, FixturesEnvelope, GuidelineDocumentsEnvelope, HistoryEnvelope, ListEnvelope (+55 more)

### Community 38 - "spoken-numbers.ts"
Cohesion: 0.07
Nodes (45): anchorAfter(), BREAKERS, buildRuns(), ClauseCues, clauseFrom(), continues(), count(), Counts (+37 more)

### Community 39 - "src/transcript.ts"
Cohesion: 0.07
Nodes (28): 8. Primary Flow, ConsultationAnalysis, shared_src_index_max_transcript_turns, shared_src_index_max_turn_characters, shared_src_index_transcriptschema, transcript(), turn(), MishearProposal (+20 more)

### Community 40 - "detectors.ts"
Cohesion: 0.06
Nodes (38): ACCEPT_THRESHOLD, ADDRESS_CONTEXT, ADDRESS_PATTERN, caseInsensitiveLiteral(), CLAUSE_CUES, CLAUSE_STOPS, CUE_PATTERNS, DATE_NEAR_CUE (+30 more)

### Community 41 - "5. Market Fit"
Cohesion: 0.25
Nodes (8): 5. Market Fit, Claim-Related Product Scope, Competitor Feature Coverage, Existing Competitor Capabilities, Existing Products And Listed Prices, Market Findings, Pricing And Distribution Estimates, Product Scope In The Market

### Community 42 - "11. Regulatory Posture"
Cohesion: 0.40
Nodes (5): 11. Regulatory Posture, Data Protection, Intended Purpose Statement, The Architecture Is The Compliance Strategy, The Concession, Volunteered

### Community 43 - "12. Known Limitations"
Cohesion: 0.40
Nodes (5): 12. Known Limitations, Audio And ASR, Clinical And Evidential, Language, Product And Delivery

### Community 44 - "14. Guided Demo Tour"
Cohesion: 0.40
Nodes (5): 14. Guided Demo Tour, Close, Fixture Content, Guardrail Checks (~60 Seconds), Happy Path

### Community 45 - "1. Domain Background"
Cohesion: 0.40
Nodes (5): 1. Domain Background, The Load-Bearing Gap In This Picture, The Setting, What The Note Actually Is, Who Reads The Note

### Community 46 - "13. Success Metrics"
Cohesion: 0.50
Nodes (4): 13. Success Metrics, Future Production Metrics, Internal Evaluation Results, MVP Success

### Community 47 - "6. Scope"
Cohesion: 0.50
Nodes (4): 6. Scope, In Scope, Out Of Scope, Out-Of-Scope Presentations At Runtime

### Community 48 - "audit/index.ts"
Cohesion: 0.07
Nodes (36): appended, write(), AUDIT_CHAIN_GENESIS, AuditChainFailure, AuditChainInput, AuditChainRow, AuditChainVerification, computeAuditHash() (+28 more)

### Community 49 - "ChecklistPanel.tsx"
Cohesion: 0.16
Nodes (15): timestamp(), CHECKLIST_SECTION_LABELS, CHECKLIST_SECTION_ORDER, ChecklistEntry, ChecklistPanel(), ChecklistRow(), ChecklistSection, CLINICAL_FACT_GROUPS (+7 more)

### Community 50 - "medications.ts"
Cohesion: 0.12
Nodes (16): MedicationCandidateSchema, MedicationCandidateWire, Prescription, PrescriptionLine, PrescriptionLineSchema, PrescriptionParseResponse, PrescriptionParseResponseSchema, PrescriptionSchema (+8 more)

### Community 51 - "cn"
Cohesion: 0.04
Nodes (70): ConsentGate(), InputMeter(), LevelWave(), MeterState, prefersReducedMotion(), WAVE, DemoStepBar(), Spotlight() (+62 more)

### Community 52 - "draft-turns.ts"
Cohesion: 0.21
Nodes (17): classify(), DOCTOR_PATTERNS, DraftLine, draftLinesFor(), endsWithQuestion(), MarkedSegment, matches(), normalise() (+9 more)

### Community 53 - "logger.ts"
Cohesion: 0.05
Nodes (37): DEIDENTIFICATION_PAYLOAD_ORIGINS, DeidentificationFailureStage, DeidentificationPayloadOrigin, ALLOWED_FIELDS, currentRequestId(), DETECTOR_LABELS, ERROR_CLASSES, ErrorClass (+29 more)

### Community 54 - "consultations.ts"
Cohesion: 0.08
Nodes (46): audioRetentionEnabled(), MAX_AUDIO_BYTES, purgeAudio(), readAudio(), storeAudio(), sweepExpiredAudio(), eraseConsultation(), erasePatient() (+38 more)

### Community 55 - "medications/index.ts"
Cohesion: 0.15
Nodes (25): BOTH, lexiconFor(), MEDICATION_LEXICON, MEDICATION_LEXICON_VERSION, MedicationEntry, URTI, UTI, bestSimilarity() (+17 more)

### Community 56 - "NotificationPanel.tsx"
Cohesion: 0.28
Nodes (8): ago(), NotificationPanel(), NotificationRow(), relative, SHAPE, UNITS, shared_dist_index_notificationaction, shared_dist_index_notificationitem

### Community 57 - "copilot/index.ts"
Cohesion: 0.12
Nodes (20): CopilotChunk, keepPartial(), ReasoningFilter, rehydrateArgs(), runCopilotTurn(), buildCopilotSystemPrompt(), serialiseCorpus(), drip() (+12 more)

### Community 58 - "clinical-profiles/index.ts"
Cohesion: 0.10
Nodes (22): ADULT_ACUTE_UNCOMPLICATED_UTI_PROFILE_VERSION, ADULT_ACUTE_URTI_PROFILE_VERSION, CLINICAL_PROFILES, DEFAULT_PROFILE_ID, PROFILE_DEFINITIONS, selectProfileContent(), ClinicalArtefactVersion, PROFILE_IDS (+14 more)

### Community 59 - "shared_dist_index"
Cohesion: 0.05
Nodes (62): AppendSourceMappedText, appendSourceRange(), buildSourceMappedText(), SourceMappedText, evaluateRedFlags(), TRIGGER_FIXTURES, MALAY_TRIGGER_FIXTURES, patient() (+54 more)

### Community 60 - "evals/package.json"
Cohesion: 0.10
Nodes (19): dependencies, @shared/types, devDependencies, tsx, @types/node, typescript, vitest, @shared/types (+11 more)

### Community 61 - "live-prompt.ts"
Cohesion: 0.13
Nodes (14): LivePanes, Dismissed, FlagState, GAP_PRIORITY_ORDER, PanelModel, PROMPT_LIMIT, selectPrompts(), SEVERITY_ORDER (+6 more)

### Community 62 - "CatatAI.tsx"
Cohesion: 0.06
Nodes (38): CLICK_INSTRUCTION, hasPhantomClickInstruction(), CONTROL_REQUESTS, EDIT_REQUESTS, main(), rate(), REPS, runTurn() (+30 more)

### Community 63 - "draft-turns/index.ts"
Cohesion: 0.16
Nodes (17): DraftTurnsFailureReason, draftChunk(), draftTurns(), DraftTurnsError, mapWithLimit(), mergeAdjacent(), stubClient(), StubRequest (+9 more)

### Community 64 - "DemoTour.tsx"
Cohesion: 0.14
Nodes (15): DEMO_CONSULTATION_ID, DemoTourContext, DemoTourProvider(), DemoTourValue, FallbackReason, pickConsultations(), resolveStepRoute(), runEphemeral() (+7 more)

### Community 65 - "src/index.test.ts"
Cohesion: 0.06
Nodes (33): DraftTurn, DraftTurnSchema, DraftTurnsRequest, DraftTurnsRequestSchema, DraftTurnsResponse, DraftTurnsResponseSchema, HostedAsrResult, HostedAsrResultSchema (+25 more)

### Community 66 - "asr-ab.ts"
Cohesion: 0.09
Nodes (38): levenshtein(), Args, asPercent(), CallResult, checkIntegrity(), Chunk, Container, CONTAINER_CODEC (+30 more)

### Community 67 - "evals/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, noEmit, types, exclude, extends, include, ../tsconfig.json, references

### Community 68 - "ReviewPanes.tsx"
Cohesion: 0.06
Nodes (43): keepRecording(), recordingUrl(), release(), freshStore(), revoked, Store, useTranscriptAudio(), spaceBelow() (+35 more)

### Community 69 - "PrescriptionLineRow.tsx"
Cohesion: 0.14
Nodes (15): FOOD_OPTIONS, FREQUENCY_OPTIONS, ROUTE_OPTIONS, FIELD_LABEL, FieldName(), PrescriptionLineRow(), PrescriptionLineRowProps, Quote() (+7 more)

### Community 70 - "package.json"
Cohesion: 0.09
Nodes (21): dependencies, @prisma/client, engines, node, @prisma/client, typescript, license, name (+13 more)

### Community 71 - "README.md"
Cohesion: 0.13
Nodes (14): Acknowledgments, AI Disclosure, Challenges And Learnings, Documentation, Engineering Highlights, Future Improvements, Getting Started, Installation (+6 more)

### Community 72 - "shared_dist_index_consultationdetail"
Cohesion: 0.26
Nodes (11): decisionFor(), MAX_DIGEST_CHARS, renderChecklist(), renderDigest(), renderGaps(), renderNote(), renderRedFlags(), renderSuggestions() (+3 more)

### Community 73 - "env.ts"
Cohesion: 0.12
Nodes (17): env, EnvSchema, parsed, auth, Express, Request, requireSession(), authRouter (+9 more)

### Community 74 - "backend.ts"
Cohesion: 0.10
Nodes (24): frontend_src_lib_api_auditevent, DOCTOR, LiveDeltaSchema, PatchBodySchema, SEED_FILING, SEED_PATIENTS, StoredConsultation, StoredEvent (+16 more)

### Community 75 - "prescription-draft.ts"
Cohesion: 0.10
Nodes (31): acceptCandidate(), EMPTY_DRAFT, evidenceOf(), fromSig(), LineEdit, lineKeys(), LineRow, manualRow() (+23 more)

### Community 76 - "openai-compatible.test.ts"
Cohesion: 0.24
Nodes (7): client(), { completionsCreate, embeddingsCreate, constructed, envMock }, emittedFor(), request(), Schema, send(), SMUGGLED

### Community 77 - "asr.test.ts"
Cohesion: 0.22
Nodes (7): auditState, post(), postAudio(), sessionState, testEnv, upstream, webmBytes()

### Community 78 - "protocol.ts"
Cohesion: 0.23
Nodes (7): CHUNK_LENGTH_S, countChunks(), HEARTBEAT_TOKENS, STRIDE_LENGTH_S, TARGET_SAMPLE_RATE, asr, progressEvents

### Community 79 - "bilingual.test.ts"
Cohesion: 0.21
Nodes (8): bengali, end, said(), urdu, LiveToken, BENGALI_DIALOGUE, CapturedToken, URDU_DIALOGUE

### Community 80 - "ref_ui_button_js"
Cohesion: 0.09
Nodes (32): headline(), ProposalCard(), formatGender(), formatLastSeen(), count(), NoteEditor(), SECTIONS, summarise() (+24 more)

### Community 81 - "no-stray-provider-sdk.test.ts"
Cohesion: 0.25
Nodes (9): isComment(), isProviderSdk(), packageName(), PROVIDER_PACKAGES, PROVIDER_SCOPES, providerImports(), REPO_ROOT, SCANNED_TREES (+1 more)

### Community 82 - "consultations.test.ts"
Cohesion: 0.15
Nodes (11): AI_MEDICAL_RECORD, AI_NOTE, analysed(), ANALYSIS, auditEvent, audits, call(), LEGACY_ANALYSIS (+3 more)

### Community 83 - "lib/note-templates.ts"
Cohesion: 0.26
Nodes (10): displayValue(), formatNoteForClipboard(), HISTORY_KEYS, LEGACY_CATEGORY_UNAVAILABLE, MedicalRecordSection, medicalRecordSections(), SECTIONS, MEDICAL_RECORD (+2 more)

### Community 84 - "shared/tsconfig.typecheck.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, declaration, noEmit, exclude, extends, include, ./tsconfig.json

### Community 85 - "no-stray-dev-references.test.ts"
Cohesion: 0.18
Nodes (8): ../backend/src/c.js, EXTENSIONS, FORBIDDEN, REGEX_MAY_FOLLOW, REPO_ROOT, SKIPPED, sourceFiles(), SRC

### Community 86 - "ingest-cpg.ts"
Cohesion: 0.09
Nodes (45): bucketName(), chunkPage(), ChunkSpec, cleanPage(), collapseSpaces(), computeRunningHeaders(), EXEC_OPTIONS, execFile (+37 more)

### Community 87 - "no-stray-brand-casts.test.ts"
Cohesion: 0.15
Nodes (11): brandCasts(), EXPECTED_CASTS, namesBrand(), REPO_ROOT, SCANNED_TREES, sourceFiles(), EXPECTED_FETCH_CALLS, fetchCalls() (+3 more)

### Community 88 - "MedicalRecordNoteEditor.tsx"
Cohesion: 0.24
Nodes (10): CLINICAL_SECTIONS, displayValue(), EditTarget, HISTORY_SECTIONS, HistoryKey, LegacyMedicalRecordView(), MALAYSIAN_SECTIONS, MedicalRecordNoteEditor() (+2 more)

### Community 89 - "PrescriptionBlock.test.tsx"
Cohesion: 0.22
Nodes (8): expand(), getToggle(), mocks, STORED, useDemoTour, ref_prescriptionblock_js, shared_dist_index_max_prescriptions, shared_dist_index_prescription

### Community 90 - "live-tokens.ts"
Cohesion: 0.15
Nodes (24): absorb(), continuesWord(), dominantSpeaker(), EMPTY_LIVE_TRANSCRIPT, interimSpeaker(), interimText(), joinTokens(), LiveSegment (+16 more)

### Community 91 - "no-stray-approval.test.ts"
Cohesion: 0.36
Nodes (7): approvalWrites(), EXPECTED, isComment(), isExempt(), REPO_ROOT, SCANNED_TREES, sourceFiles()

### Community 92 - "backend/tsconfig.typecheck.json"
Cohesion: 0.29
Nodes (6): compilerOptions, noEmit, exclude, extends, include, ./tsconfig.json

### Community 93 - "DemoTour.test.tsx"
Cohesion: 0.06
Nodes (23): App(), RequireSession(), catatai, CurrentPath(), renderTour(), Wander(), ref_demostepbar_js, ref_helpbutton_js (+15 more)

### Community 94 - "consultations/analysis.ts"
Cohesion: 0.08
Nodes (40): DIAGNOSTIC_PHRASING, DiagnosticGuardResult, stripDiagnosticProse(), analyseNote(), buildClinicalFactsSystemPrompt(), buildNoteAndGapsSystemPrompt(), sharedPreamble(), BENCH_TRANSCRIPT (+32 more)

### Community 95 - "lint-staged"
Cohesion: 0.29
Nodes (6): lint-staged, AGENTS.md, biome.json, commitlint.config.js, {docs,.github}/**/*.{md,yml,yaml}, {shared,backend,frontend,evals,scripts}/**/*.{ts,tsx,js,json}

### Community 96 - "lines.ts"
Cohesion: 0.15
Nodes (30): clausesOf(), Cluster, clustersOf(), COUNTED, cut(), dosed(), fill(), FILLER (+22 more)

### Community 97 - "record.mjs"
Cohesion: 0.14
Nodes (21): ref_bun_test, ref_node_os, assertCompleteTake(), normalizedBeatOffsets(), REQUIRED_BEATS, SHOT_COUNT, SHOT_NAMES, beats (+13 more)

### Community 98 - "InputMeter.test.tsx"
Cohesion: 0.22
Nodes (3): FakeAudioContext, STREAM, ref_inputmeter_js

### Community 99 - "Evals"
Cohesion: 0.20
Nodes (9): Adding A Case, Cost And Data, Cost And Data, Evals, Running It, The ASR A/B Harness, What It Grades, Why This Is Not `tests/` (+1 more)

### Community 100 - "@testing-library/react"
Cohesion: 0.03
Nodes (43): NEXT, at(), ConsultationReportPage(), Report(), unapprovedDetail, CLAIMS, LIMITS, nativeDialog (+35 more)

### Community 101 - "AmbientCapture.test.tsx"
Cohesion: 0.07
Nodes (29): AmbientProps, BATCH_SESSION, choose(), config, createBatchSession, createLiveSession, draftHostedTurns, drain() (+21 more)

### Community 102 - "no-stray-clinical-constants.test.ts"
Cohesion: 0.32
Nodes (7): CLINICAL_IDS, isExempt(), REPO_ROOT, SCANNED_TREES, sourceFiles(), VERSIONED_DATA_FILES, violations()

### Community 103 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, tsx, @types/compression, @types/cors, @types/express, @types/node, typescript, vitest

### Community 104 - "use-dictation-stream.test.ts"
Cohesion: 0.11
Nodes (9): DROPPED_ERROR, SHORT_TAIL_NOTICE, FakeMediaRecorder, FakeWebSocket, mocks, recorders, session, sockets (+1 more)

### Community 105 - "createPreviewBackend"
Cohesion: 0.31
Nodes (8): applyDispositions(), conflict(), createPreviewBackend(), errorResponse(), json(), parse(), previewAnalysis(), StubError

### Community 106 - "routes/asr.ts"
Cohesion: 0.05
Nodes (55): BatchSessionFailureReason, LiveSessionFailureReason, BATCH_API_ORIGIN, batchRefinementConfig(), ElevenLabsMintError, getBatchAsrDescriptor(), mintBatchToken(), REASON_BY_STATUS (+47 more)

### Community 107 - "createApp"
Cohesion: 0.04
Nodes (43): createApp(), auditEvent, captured, FIXTURE, store, auditState, check(), lostIds() (+35 more)

### Community 108 - "AmbientCapture.tsx"
Cohesion: 0.17
Nodes (20): AmbientCapture(), Availability, buildRecorder(), clock(), discardRecorder(), Phase, RECONNECT_DELAYS_MS, Reconnecting() (+12 more)

### Community 109 - "Guidelines.tsx"
Cohesion: 0.44
Nodes (8): formatDescription(), formatIngested(), formatList(), formatProfile(), Guidelines(), matchesDocument(), SOURCE_ORDER, sourceOf()

### Community 110 - "seed-demo.ts"
Cohesion: 0.50
Nodes (8): api(), DEMO_PLAN, existingSignatures(), expectOk(), main(), seedOne(), signature(), Target

### Community 111 - "CursorGlow.tsx"
Cohesion: 0.60
Nodes (4): alphaAt(), CursorGlow(), DISCS, sizeAt()

### Community 112 - "../review/SafetyCards.js"
Cohesion: 0.23
Nodes (18): ../review/SafetyCards.js, AttributionSource(), ChunkProvenance(), ClampedSummary(), CorpusLink(), DispositionControl(), GAP_PRIORITY, GapCard() (+10 more)

### Community 113 - "Acceptance"
Cohesion: 0.25
Nodes (7): Acceptance, Entry Points, Invariants, Owns, Read More, Tests, Used By

### Community 114 - "Analysis"
Cohesion: 0.25
Nodes (7): Analysis, Entry Points, Invariants, Owns, Read More, Tests, Used By

### Community 115 - "prefill.ts"
Cohesion: 0.14
Nodes (22): allIn(), clausesOf(), denies(), measure(), Prefill, prefillItem(), prefillSoreThroatScore(), read() (+14 more)

### Community 116 - "acceptance/safety.test.ts"
Cohesion: 0.05
Nodes (44): formatReport(), Measurement, measurements, record(), applyEvidenceCheck(), checkAssertion(), checkGroup(), EVIDENCE_REQUIRED_STATES (+36 more)

### Community 117 - "asr/vocabulary.ts"
Cohesion: 0.08
Nodes (30): containsDiagnosticProse(), ASR_VOCABULARY_VERSION, dictationContextTerms(), DOSE_UNIT_TERMS, ENGLISH_DRUG_TERMS, FREQUENCY_ABBREVIATION_TERMS, LEXICON_DRUG_TERMS, MALAY_CLINICAL_TERMS (+22 more)

### Community 118 - "segment-policy.test.ts"
Cohesion: 0.24
Nodes (8): DEFAULT_SEGMENT_BOUNDS, DEFAULT_SILENCE_RMS, isSilentThroughout(), rmsFromTimeDomain(), SegmentBounds, SegmentState, shouldCut(), BOUNDS

### Community 119 - "floor-guard.ts"
Cohesion: 0.17
Nodes (21): cannotRun(), Change, count(), findViolations(), firstAddedLine(), hookChanges(), HookInput, hookResponse (+13 more)

### Community 120 - "soniox-stream.ts"
Cohesion: 0.11
Nodes (13): CONNECT_TIMEOUT_MS, FINISH_TIMEOUT_MS, LiveStreamFailure, openSonioxStream(), SonioxMessageSchema, SonioxStreamHandlers, SonioxTokenSchema, SPEECH_STATUSES (+5 more)

### Community 121 - "PrescriptionTheatre.test.tsx"
Cohesion: 0.09
Nodes (13): doses(), drugs(), FakeRecorder, fields(), LIVE_CONFIG, mocks, NO_SIG, REPORTED_LINES (+5 more)

### Community 122 - "sig.ts"
Cohesion: 0.10
Nodes (18): What Each File Does, Claim, DOSE_RULES, DURATION_RULES, DURATION_UNIT, EMPTY, firstUnclaimed(), FOOD_RULES (+10 more)

### Community 123 - "batch-tokens.test.ts"
Cohesion: 0.18
Nodes (18): batchWordsToTokens(), FOREIGN_SCRIPTS, liveEndMs(), liveVoices(), MAX_REFINED_TAIL_SHORTFALL_MS, MAX_REFINED_UNITS_PER_MINUTE, MIN_REFINED_UNIT_RATIO, MIN_SPEAKER_COVERAGE (+10 more)

### Community 124 - "Contributing To CatatMD"
Cohesion: 0.17
Nodes (11): Branches And Commits, Contributing To CatatMD, Deploys, First Run, Issues, Lanes To Main, Never, Paths That Need A Second Review (+3 more)

### Community 125 - "ilmu.ts"
Cohesion: 0.16
Nodes (14): AsrRelayFailureReason, extensionFor(), getAsrDescriptor(), IlmuRelayError, IlmuWireSchema, REASON_BY_STATUS, audio, relayError() (+6 more)

### Community 126 - "Audio"
Cohesion: 0.25
Nodes (7): Audio, Entry Points, Invariants, Owns, Read More, Tests, Used By

### Community 127 - "elevenlabs-batch.ts"
Cohesion: 0.13
Nodes (16): BatchResponseWireSchema, BatchUploadFailure, BatchUploadResult, BatchWord, BatchWordWireSchema, REASON_BY_STATUS, network, RECORDING (+8 more)

### Community 128 - "Login.tsx"
Cohesion: 0.15
Nodes (14): CLAIMS, Field(), Login(), activePath(), Item, ITEMS, SidebarIsland(), LINKS (+6 more)

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
Cohesion: 0.14
Nodes (8): Captured, consultationCaptureProps(), Harness(), open(), openRecordTab(), renderForSubmit(), setup(), ref_capturepanel_js

### Community 140 - "asr-batch-sessions.test.ts"
Cohesion: 0.09
Nodes (21): auditState, jsonResponse(), mint(), mintedToken(), nextIp(), readConfig(), sessionState, testEnv (+13 more)

### Community 141 - "AudioSettingsDialog.tsx"
Cohesion: 0.19
Nodes (12): AudioSettings, DEFAULT_AUDIO_SETTINGS, loadAudioSettings(), saveAudioSettings(), toConstraints(), TranscriptionEngine, AudioSettingsDialog(), ENGINES (+4 more)

### Community 142 - "transcribe.worker.ts"
Cohesion: 0.23
Nodes (11): AsrOptions, ChunkCounter, doLoad(), hasWebGpuAdapter(), load(), loadWasm(), MODEL_HOST, onProgress() (+3 more)

### Community 143 - "consultation.ts"
Cohesion: 0.09
Nodes (26): ConsultationAnalysisSchema, ANALYSIS_POLL_MS, ConsultationSchema, ConsultationStatusSchema, ConsultationTitleSchema, STALE_ANALYSIS_MS, shared_src_index_capturemodeschema, shared_src_index_consultationschema (+18 more)

### Community 144 - "consultations-live-analysis.test.ts"
Cohesion: 0.11
Nodes (9): Body, db, llm, sessionState, testEnv, Turn, Row, rows (+1 more)

### Community 145 - "no-stray-transformers.test.ts"
Cohesion: 0.21
Nodes (12): asPosix(), entryModules(), EXTENSIONS, Import, importsOf(), LIVE, modulesIn(), reachable() (+4 more)

### Community 146 - "Audit"
Cohesion: 0.25
Nodes (7): Audit, Entry Points, Invariants, Owns, Read More, Tests, Used By

### Community 147 - "CapturePanel.tsx"
Cohesion: 0.20
Nodes (17): carryUncertain(), draftToTurns(), parseTranscript(), reattachOtherLanguage(), serialiseTurns(), applyProposal, context(), keyOf() (+9 more)

### Community 148 - "Bench"
Cohesion: 0.25
Nodes (7): Bench, Entry Points, Invariants, Owns, Read More, Tests, Used By

### Community 149 - "Calculators"
Cohesion: 0.25
Nodes (7): Calculators, Entry Points, Invariants, Owns, Read More, Tests, Used By

### Community 150 - "batch-refinement.test.ts"
Cohesion: 0.09
Nodes (28): BATCH_ASR_UPLOAD_URL, BatchAsrConfig, BatchAsrConfigSchema, BatchKeytermSchema, BatchSession, BatchSessionRequest, BatchSessionRequestSchema, BatchSessionSchema (+20 more)

### Community 151 - "ConsultationReport.test.tsx"
Cohesion: 0.17
Nodes (9): NoteAndGapsResult, analysis(), detail(), soapNote(), AI_NOTE, ref_consultationreport_js, ref_medicalrecordnoteeditor_js, shared_dist_index_medicalrecordnote (+1 more)

### Community 152 - "no-stray-websocket.test.ts"
Cohesion: 0.22
Nodes (7): EXPECTED_WEBSOCKET_SITES, EXTENSIONS, isWebSocketConstruction(), REPO_ROOT, SKIPPED, SRC, websocketSites()

### Community 153 - "Clinical-Profiles"
Cohesion: 0.25
Nodes (7): Clinical-Profiles, Entry Points, Invariants, Owns, Read More, Tests, Used By

### Community 154 - "Clinical-Versions"
Cohesion: 0.25
Nodes (7): Clinical-Versions, Entry Points, Invariants, Owns, Read More, Tests, Used By

### Community 155 - "use-live-panes.test.ts"
Cohesion: 0.25
Nodes (5): apiMock, emptyFacts, FakeApiError, segment(), withClosed()

### Community 156 - "retrieve.ts"
Cohesion: 0.18
Nodes (12): sliceDeidentified(), buildLexicalQuery(), STOP_WORDS, RetrievalOptions, retrieveGuidelines(), embed, findMany, info (+4 more)

### Community 157 - "Config"
Cohesion: 0.25
Nodes (7): Config, Entry Points, Invariants, Owns, Read More, Tests, Used By

### Community 158 - "Copilot"
Cohesion: 0.25
Nodes (7): Copilot, Entry Points, Invariants, Owns, Read More, Tests, Used By

### Community 159 - "stub.test.ts"
Cohesion: 0.29
Nodes (6): installPreviewStub(), mountBadge(), PREVIEW_MARKER, readJson(), ROUTINE, STRIDOR

### Community 160 - "report-data.ts"
Cohesion: 0.18
Nodes (15): ConsultationReport(), dateFormat, timestampFormat, FOOD_LABELS, titleCase(), decidedAtFormat, displayValue(), dispositionText() (+7 more)

### Community 161 - "backend/package.json"
Cohesion: 0.07
Nodes (27): @prisma/client, @shared/types, tsx, @types/node, typescript, vitest, zod, license (+19 more)

### Community 162 - "audio.test.ts"
Cohesion: 0.29
Nodes (4): appended, retention, Row, rows

### Community 163 - "Deid"
Cohesion: 0.25
Nodes (7): Deid, Entry Points, Invariants, Owns, Read More, Tests, Used By

### Community 164 - "Draft-Turns"
Cohesion: 0.25
Nodes (7): Draft-Turns, Entry Points, Invariants, Owns, Read More, Tests, Used By

### Community 165 - "Gaps"
Cohesion: 0.25
Nodes (7): Entry Points, Gaps, Invariants, Owns, Read More, Tests, Used By

### Community 166 - "AudioCapture.tsx"
Cohesion: 0.21
Nodes (16): AudioCapture(), estimateRemaining(), LABEL_TIMEOUT_MS, Phase, UPLOAD_TIMEOUT_MS, createChunkedRecorder(), belowHardwareFloor(), DICTATION_AUDIO_CONSTRAINTS (+8 more)

### Community 167 - "Lib"
Cohesion: 0.25
Nodes (7): Entry Points, Invariants, Lib, Owns, Read More, Tests, Used By

### Community 168 - "ref_node_fs"
Cohesion: 0.10
Nodes (16): REPO_ROOT, SCANNED_TREES, PROMPT_SITES, RETRIEVED, SRC, SYSTEM_PROMPTS, AUDIO_DIR, MAY_PERSIST (+8 more)

### Community 169 - "policy.ts"
Cohesion: 0.15
Nodes (16): firedRuleIds(), applyEditPolicy(), CleanupEdit, occurrences(), overlaps(), PolicyResult, ruleIds(), transcript (+8 more)

### Community 170 - "consultations-transcript-corrections.test.ts"
Cohesion: 0.18
Nodes (8): db, RECORDED, sessionState, stubClient(), testEnv, UNCERTAIN, upstream, shared_dist_index_transcriptcorrectionsresponseschema

### Community 171 - "manifest.json"
Cohesion: 0.25
Nodes (7): documents, jurisdiction, publisher, source, sourceLicence, verbatimAllowed, verbatimAllowedNote

### Community 172 - "preflight.mjs"
Cohesion: 0.32
Nodes (12): checkBeatNarrationAgreement(), checkFixture(), checkNoApproveInSource(), DEFAULT_DEMO_FIXTURE, extractFinishShotBudgets(), main(), parseDemoUrl(), parseNarrationLines() (+4 more)

### Community 173 - "Middleware"
Cohesion: 0.25
Nodes (7): Entry Points, Invariants, Middleware, Owns, Read More, Tests, Used By

### Community 174 - "Note-Templates"
Cohesion: 0.25
Nodes (7): Entry Points, Invariants, Note-Templates, Owns, Read More, Tests, Used By

### Community 175 - "Medications"
Cohesion: 0.40
Nodes (4): Medications, Residual Risks, Stated Rather Than Hidden, The Boundary, Three Things Worth Knowing Before Changing It

### Community 176 - "live-window.test.ts"
Cohesion: 0.36
Nodes (6): flagIds(), live(), STRADDLING_PAIR, unionOfWindows(), windows(), shared_dist_index_live_delta_lookback_segments

### Community 177 - "CPG Corpus"
Cohesion: 0.33
Nodes (5): CPG Corpus, How Scanned Pages Are Handled, How To Add Documents, Licence Status, What Lives Here

### Community 178 - "ConsultationList.tsx"
Cohesion: 0.09
Nodes (19): CATEGORY, ConsultationView, row(), rows(), VIEW_OPTIONS, ConsultationRow(), formatConsultationDate(), STATUS (+11 more)

### Community 179 - "deid/index.ts"
Cohesion: 0.12
Nodes (20): DetectorLabel, Match, assertNoIdentifiers(), DEIDENTIFICATION_FAILURE_STAGES, DeidentificationError, deidentify(), deidentifyTranscript(), detectOutsideTokens() (+12 more)

### Community 180 - "LiveConversation.tsx"
Cohesion: 0.35
Nodes (10): speakerNumber(), ConversationMode, directionOf(), elapsed(), LANGUAGE_NAMES, languageName(), LiveConversation(), onRight() (+2 more)

### Community 181 - "ScoreCard.test.tsx"
Cohesion: 0.20
Nodes (9): AGE, checked(), FEVER, group(), GUIDES, NODES, SCORES, YES_NO (+1 more)

### Community 182 - "detectSpokenNumbers"
Cohesion: 0.15
Nodes (13): cuePattern(), cueRegExp(), detectAddress(), detectPhone(), detectSpokenNumbers(), directlyAfterMrnCue(), escapeCue(), hasContext() (+5 more)

### Community 183 - "asr-draft-turns.test.ts"
Cohesion: 0.18
Nodes (6): auditState, llmState, sessionState, testEnv, shared_dist_index_draftturnsresponseschema, shared_dist_index_max_draft_text_characters

### Community 184 - "Retrieval"
Cohesion: 0.25
Nodes (7): Entry Points, Invariants, Owns, Read More, Retrieval, Tests, Used By

### Community 185 - "Routes"
Cohesion: 0.25
Nodes (7): Entry Points, Invariants, Owns, Read More, Routes, Tests, Used By

### Community 186 - "analysis/index.test.ts"
Cohesion: 0.22
Nodes (5): stubClient(), StubRequest, stubSplit(), shared_dist_index_clinicalfactsresponse, shared_dist_index_noteandgapsresponse

### Community 187 - "nric.ts"
Cohesion: 0.33
Nodes (6): detectNric(), isStructurallyValidNric(), isValidBirthDate(), NRIC_PATTERN, NRIC_UNHYPHENATED_PATTERN, UNASSIGNED_PB

### Community 188 - "report-data.test.ts"
Cohesion: 0.24
Nodes (5): analysis(), decidedAtFormat, detail(), soapNote(), stamped

### Community 189 - "CatatMD Demo Recorder"
Cohesion: 0.13
Nodes (13): CatatMD Demo Recorder, Narration And Export, Offline Verification, Operator Dependencies, Optional Deck Helpers, Preparation Status, Recording Later, Review Before Sharing (+5 more)

### Community 190 - "copilot/index.test.ts"
Cohesion: 0.28
Nodes (6): chunks, consultation(), RETRIEVED, signed(), stream, withRetrieved()

### Community 191 - "Scripts"
Cohesion: 0.25
Nodes (7): Entry Points, Invariants, Owns, Read More, Scripts, Tests, Used By

### Community 192 - "suggestions/index.test.ts"
Cohesion: 0.25
Nodes (4): { generate }, Overrides, sampleChunk, { text: content }

### Community 193 - "Suggestions"
Cohesion: 0.25
Nodes (7): Entry Points, Invariants, Owns, Read More, Suggestions, Tests, Used By

### Community 194 - "Transcript-Cleanup"
Cohesion: 0.25
Nodes (7): Entry Points, Invariants, Owns, Read More, Tests, Transcript-Cleanup, Used By

### Community 196 - "run.ts"
Cohesion: 0.39
Nodes (7): Finding, analyse(), CaseResult, main(), render(), signIn(), shared_dist_index_consultationanalysisschema

### Community 197 - "frontend/README.md"
Cohesion: 0.25
Nodes (6): Browser Library, Invariants, Module Guide, Owns, Tests, Used By

### Community 198 - "Frontend SPA"
Cohesion: 0.25
Nodes (8): Commands, Data Fetching, Directory Map, Frontend Security, Frontend SPA, Preview Stub, Routing, Styling

### Community 199 - "narrate.sh"
Cohesion: 0.53
Nodes (5): KOKORO_HOME, mean_of(), mux(), require_command(), narrate.sh script

### Community 200 - "Module Guide"
Cohesion: 0.25
Nodes (7): Audio, Invariants, Key Files, Module Guide, Purpose, Tests, Used By

### Community 201 - "About The Project"
Cohesion: 0.25
Nodes (8): About The Project, Architecture, Features, How It Works, Links, Project Structure, Screenshots, Walkthrough Film

### Community 211 - "Module Guide"
Cohesion: 0.29
Nodes (6): Copilot, Invariants, Module Guide, Owns, Tests, Used By

### Community 212 - "Module Guide"
Cohesion: 0.29
Nodes (6): Guided Demo Tour, Invariants, Module Guide, Owns, Tests, Used By

### Community 213 - "Module Guide"
Cohesion: 0.29
Nodes (6): Invariants, Module Guide, Owns, Preview Stub, Tests, Used By

### Community 214 - "PrescriptionDictationHeader.tsx"
Cohesion: 0.33
Nodes (6): clock(), DictationStream, PrescriptionDictationHeader(), PrescriptionDictationHeaderProps, STOP_LABEL, ref_audio_inputmeter_js

### Community 215 - "Module Guide"
Cohesion: 0.29
Nodes (6): Invariants, Module Guide, Owns, Review, Tests, Used By

### Community 216 - "frontend/src/routes/README.md"
Cohesion: 0.29
Nodes (6): Invariants, Module Guide, Owns, Routes, Tests, Used By

### Community 217 - "Module Guide"
Cohesion: 0.29
Nodes (6): Application Shell, Invariants, Module Guide, Owns, Tests, Used By

### Community 218 - "Module Guide"
Cohesion: 0.29
Nodes (6): Invariants, Module Guide, Owns, Tests, UI Primitives, Used By

### Community 219 - "Backend"
Cohesion: 0.33
Nodes (6): Backend, Configuration, Directory Map, Read More, Request Path, Run, Build, And Test

### Community 220 - "Prisma"
Cohesion: 0.33
Nodes (5): Connections And Audit Constraints, Migration Workflow, Models, Prisma, Seeds

### Community 223 - "release-please-config.json"
Cohesion: 0.40
Nodes (4): bootstrap-sha, include-component-in-tag, packages, $schema

### Community 224 - "Shared Types"
Cohesion: 0.40
Nodes (4): Add A Schema, Build And Resolution, Modules, Shared Types

## Knowledge Gaps
- **1426 isolated node(s):** `name`, `private`, `license`, `type`, `dev` (+1421 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1924 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PRD` connect `PRD` to `src/api.ts`, `src/transcript.ts`, `5. Market Fit`, `11. Regulatory Posture`, `12. Known Limitations`, `14. Guided Demo Tour`, `1. Domain Background`, `13. Success Metrics`, `6. Scope`, `backend/README.md`, `9. Capabilities & Acceptance Criteria`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `react` connect `cn` to `Login.tsx`, `CapturePanel.test.tsx`, `AudioSettingsDialog.tsx`, `theme.tsx`, `CapturePanel.tsx`, `frontend/package.json`, `use-live-panes.ts`, `bilingual.ts`, `lib/api.ts`, `AudioCapture.tsx`, `ChecklistPanel.tsx`, `ConsultationList.tsx`, `LiveConversation.tsx`, `NotificationPanel.tsx`, `live-prompt.ts`, `CatatAI.tsx`, `DemoTour.tsx`, `ReviewPanes.tsx`, `prescription-draft.ts`, `ref_ui_button_js`, `MedicalRecordNoteEditor.tsx`, `live-tokens.ts`, `DemoTour.test.tsx`, `@testing-library/react`, `AmbientCapture.tsx`, `Guidelines.tsx`, `CursorGlow.tsx`, `../review/SafetyCards.js`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `name`, `private`, `license` to the rest of the system?**
  _1426 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `biome.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `ref_zod` be split into smaller, more focused modules?**
  _Cohesion score 0.04627766599597585 - nodes in this community are weakly interconnected._
- **Should `AudioCapture.test.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08831908831908832 - nodes in this community are weakly interconnected._