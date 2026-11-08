# Glossary

Use this glossary for CatatMD's preferred names for concepts and workflows.
Meanings describe the current product for adult GP consultations using synthetic data; doctors review and approve its outputs.
See the [PRD](PRD.md) for product scope and the [TRD](TRD.md) for contracts and implementation details.

## Clinical Terms

| Term | Meaning | In Code |
| --- | --- | --- |
| Diagnosis | The `diagnosis` field records only a clinician-stated impression supported by transcript evidence; CatatMD does not infer a diagnosis. | `OperationalBlockSchema.diagnosis` in `shared/src/index.ts`; `backend/src/analysis/diagnostic-guard.ts` |
| Medical Certificate | The doctor-stated medical-certificate days are captured in `mcDays`; CatatMD does not generate a duration (Also seen as: MC, MC days). | `OperationalBlockSchema.mcDays` in `shared/src/index.ts`; [PRD.md](PRD.md) |
| Prescription | A doctor-dictated or manually entered medication order with instructions, saved as a confirmed list and distinct from model-extracted medications dispensed. | `PrescriptionSchema` in `shared/src/index.ts`; `prisma/schema.prisma`; `frontend/src/review/PrescriptionTheatre.tsx` |
| Red Flag | An escalation signal produced by deterministic rules or added as a model candidate; deterministic hits cannot be suppressed or downgraded (Also seen as: escalation trigger). | `RedFlagSchema` in `shared/src/index.ts`; `backend/src/redflags/` |
| Red-Flag Candidate | A model-sourced red flag offered for doctor review, never a substitute for the deterministic rules engine's findings. | `RedFlagCandidatesSchema` in `shared/src/index.ts`; `source: 'model'` |
| Safety-Netting | A clinician's advice about when to return or seek care, which red-flag matching treats as advice rather than evidence of a current symptom. | `backend/src/redflags/triggers.ts`; `backend/src/redflags/safety-netting.test.ts` |
| SOAP Note | The four-section `Subjective`, `Objective`, `Assessment`, and `Plan` scaffold used for clinician review (Also seen as: SOAP scaffold). | `SoapNoteSchema` in `shared/src/index.ts`; `backend/src/note-templates/` |
| Sore-Throat Score | The single adult score the doctor completes for a sore throat, implemented from Modified Centor without a treatment threshold (Also seen as: Modified Centor Score; McIsaac score in Abdullah et al. 2024, with differing edge criteria). | `SORE_THROAT_SCORE` (`source: 'moh-nag-2024'`) in `backend/src/calculators/sore-throat-score.ts`; `ClinicalScoreSchema` |
| TPA / Corporate Panel | The PRD's terms for third-party administrator and corporate-panel payer arrangements; the operational block captures doctor-stated claim fields used in that context. | [PRD.md](PRD.md); `OperationalBlockSchema` in `shared/src/index.ts` |
| URTI | The adult acute GP profile for upper-respiratory presentations (Also seen as: upper respiratory tract infection). | `adult-acute-urti` in `backend/src/clinical-profiles/`; `docs/PRD.md` |

## Consultation Lifecycle

| Term | Meaning | In Code |
| --- | --- | --- |
| `analyzing` | Set when a doctor starts or reruns analysis; success moves the consultation to `awaiting_review`, while a handled failure restores its previous status. | `ConsultationStatusSchema` in `shared/src/index.ts`; `backend/src/routes/consultations.ts` |
| `approved` | Reached only when a doctor explicitly approves a consultation in `awaiting_review`; a model cannot approve it. | `ConsultationStatusSchema`; `POST /api/consultations/:id/approve` in `backend/src/routes/consultations.ts` |
| `awaiting_review` | Set after analysis succeeds; the consultation is ready for doctor review and approval. | `ConsultationStatusSchema`; `backend/src/routes/consultations.ts` |
| `draft` | The initial consultation status, set on creation and restored if analysis started from draft fails. | `ConsultationStatusSchema`; `ConsultationStatus` in `prisma/schema.prisma` |

## Note And Analysis

| Term | Meaning | In Code |
| --- | --- | --- |
| Assertion State | A closed enum that distinguishes asserted facts from unassessed or inapplicable fields; only `PRESENT` and `DENIED` require verbatim evidence. | `AssertionStateSchema` in `shared/src/index.ts`: `PRESENT`, `DENIED`, `CLINICIAN_OBSERVED`, `NOT_ASSESSED`, `UNKNOWN`, `NOT_APPLICABLE` |
| Citation ID | The citation's `guidelineId` must match an identifier supplied from the retrieved guideline corpus, so free-text references fail validation (Also seen as: guideline ID). | `CitationSchema`; `makeSuggestionsSchema` in `shared/src/index.ts` |
| Clinical Assertion | A structured record for one clinical fact whose assertion state and evidence are checked before persistence. | `ClinicalAssertionSchema` in `shared/src/index.ts`; `backend/src/analysis/evidence.ts` |
| Clinical Suggestion | A clinician-facing suggestion with at least one citation from the supplied corpus (Also seen as: suggestion). | `ClinicalSuggestionSchema`; `makeSuggestionsSchema` in `shared/src/index.ts`; `backend/src/suggestions/` |
| Evidence Link | A server-resolved pointer from a clinical field or red flag to transcript speaker and timing when a unique turn can be found; it helps locate evidence but does not change the finding. | `EvidenceLinkSchema` and `RedFlagSchema.evidenceLink` in `shared/src/index.ts` |
| Evidence Span | Verbatim text from the de-identified transcript supporting a `PRESENT` or `DENIED` assertion; the analysis pipeline checks that the span appears in the transcript. | `ClinicalAssertionSchema.evidence` in `shared/src/index.ts`; `backend/src/analysis/evidence.ts` |
| Gap Checklist | The deterministic, profile-specific field list that analysis checks to derive prompts from unestablished assertions. | `GAP_CHECKLIST` in `backend/src/gaps/checklist.ts`; `backend/src/gaps/derive.ts` |
| Information Gap | A doctor-facing question about information the consultation did not establish, with context explaining why it matters (Also seen as: gap). | `InformationGapSchema` in `shared/src/index.ts`; `backend/src/gaps/` |
| Medical Record Note | The canonical structured note that keeps history categories separate from the SOAP sections; the SOAP note is derived from it. | `MedicalRecordNoteSchema` in `shared/src/index.ts`; `backend/src/analysis/note.ts` |
| NOT_ASSESSED | The default state when the source does not establish a fact; it remains distinct from `DENIED` and may surface as an information gap. | `AssertionStateSchema`; `ClinicalFactsSchema` in `shared/src/index.ts` |
| Note Template | A presentation choice, `soap` or `malaysian`, that changes section order without changing clinical content. | `NoteTemplateSchema` in `shared/src/index.ts`; `NoteTemplate` in `prisma/schema.prisma` |

## Privacy And Safety

| Term | Meaning | In Code |
| --- | --- | --- |
| Audit Chain | An append-only sequence of audit events linked by hashes to make row edits and broken predecessor links detectable; metadata is excluded from the hash (Also seen as: audit hash chain). | `backend/src/audit/chain.ts`; `AuditEvent` in `prisma/schema.prisma` |
| De-Identification | Replaces detected identifiers in transcript text with request-scoped pseudonymous tokens before model egress; model output is restored before it reaches the doctor (Also seen as: `deid`, the module name). | `backend/src/deid/` |
| Deidentified Brand | A TypeScript brand minted inside `backend/src/deid/` and required by `LLMClient` at compile time; a runtime scan remains the backstop because casts can bypass the type check (Also seen as: `Deidentified`). | `Deidentified` in `backend/src/deid/types.ts`; `backend/src/lib/llm/types.ts` |
| Egress | A transfer beyond the API or device to a model or speech provider; text sent to an LLM passes through de-identification, while audio uses separate ASR routes because it cannot be tokenized. | `backend/src/lib/llm/`; `backend/src/lib/asr/`; `frontend/src/audio/live/` |
| PHI | Protected health information linked to an individual; consultation data in this repository are synthetic. | `Patient` and `Consultation` in `prisma/schema.prisma`; `backend/src/deid/` |
| Pseudonymous Token | A request-stable marker such as `[PATIENT_1]` that replaces a detected identifier and maps back to the original value only inside that request (Also seen as: token). | `RequestTokenVault.tokenFor` in `backend/src/deid/vault.ts` |
| Rehydration | Restoring original identifier spans from the request's token vault into model response text before it reaches the doctor (Also seen as: re-hydration in prose; `rehydrate` in code). | `TokenVault.rehydrate` in `backend/src/deid/types.ts`; `backend/src/deid/vault.ts` |
| Token Vault | A request-scoped map from substitution tokens to original spans that is never persisted, serialized, or logged (Also seen as: `RequestTokenVault`, its concrete class). | `TokenVault` in `backend/src/deid/types.ts`; `RequestTokenVault` in `backend/src/deid/vault.ts` |
| Tombstone Erasure | Clears PHI fields and sets `erasedAt` while keeping patient and consultation rows for audit references; associated audio is hard-deleted. | `erasePatient` and `eraseConsultation` in `backend/src/audit/erasure.ts`; `prisma/schema.prisma` |

## Speech And Capture

| Term | Meaning | In Code |
| --- | --- | --- |
| Ambient Capture | The live `ambient` mode for a two-speaker consultation, streamed from the browser to Soniox using a short-lived credential minted by the API. | `LiveAsrModeSchema` in `shared/src/index.ts`; `frontend/src/audio/live/AmbientCapture.tsx`; `backend/src/lib/asr/soniox.ts` |
| Automatic Speech Recognition (ASR) | Speech recognition that converts microphone audio into transcript text. | `TranscriptSourceSchema` in `shared/src/index.ts`; `backend/src/lib/asr/`; `frontend/src/audio/` |
| Consent | The app's per-consultation agreement for audio; ambient and batch requests require `consent: true`, which remains a client assertion rather than verified proof. | `LiveSessionRequestSchema` and `BatchSessionRequestSchema` in `shared/src/index.ts`; `frontend/src/audio/ConsentGate.tsx` |
| Diarisation | Speaker attribution in recognized audio; hosted configurations can request it, while the on-device Whisper path drafts local turn labels without voice identification (Also seen as: `speakerDiarization` in code). | `LiveSessionConfigSchema.speakerDiarization`; `BatchAsrConfigSchema.diarize`; `frontend/src/audio/draft-turns.ts` |
| Dictation | The live `dictation` mode for one doctor to read a prescription aloud; it omits the app's ambient-consultation consent assertion. | `LiveAsrModeSchema` in `shared/src/index.ts`; `frontend/src/review/PrescriptionTheatre.tsx` |
| ElevenLabs Scribe v2 | The batch recognizer for post-stop refinement of untranslated ambient audio, with the model ID pinned to `scribe_v2`. | `BatchSessionSchema` and `BatchAsrConfigSchema` in `shared/src/index.ts`; `frontend/src/audio/live/elevenlabs-batch.ts` |
| Hosted ASR | Speech recognition handled by an external provider; the code distinguishes API-relayed audio from browser-direct live streams. | `TranscriptSourceSchema`: `asr_hosted` and `asr_live`; `backend/src/lib/asr/`; `frontend/src/audio/live/` |
| ILMU | The hosted speech service used by the API relay to transcribe uploaded audio (Also seen as: `ilmu` in provider fields). | `transcribeWithIlmu` in `backend/src/lib/asr/ilmu.ts`; `backend/src/routes/asr.ts` |
| On-Device ASR | Speech is transcribed in a browser worker without sending audio bytes to the API, though model weights are downloaded from the configured host (Also seen as: local ASR, `asr_local`). | `frontend/src/audio/transcribe.worker.ts`; `frontend/src/audio/AudioSettingsDialog.tsx` |
| Provider Credential | A short-lived credential minted for one ASR session or upload, not the doctor's account key (Also seen as: `apiKey` for live sessions; `token` for batch uploads). | `LiveSessionSchema.apiKey` and `BatchSessionSchema.token` in `shared/src/index.ts` |
| Soniox | The provider for live ambient consultation and prescription-dictation streams; the API mints a credential and the browser sends the audio directly. | `LiveAsrConfigSchema.provider` in `shared/src/index.ts`; `backend/src/lib/asr/soniox.ts`; `frontend/src/audio/live/soniox-stream.ts` |
| Transcript Source | A client-asserted provenance field that records how transcript text was produced; the API cannot verify the claim. | `TranscriptSourceSchema` in `shared/src/index.ts`: `fixture`, `paste`, `upload`, `asr_local`, `asr_hosted`, `asr_live` |
| Whisper Small | The on-device model `onnx-community/whisper-small`, run in a browser worker. | `MODEL` in `frontend/src/audio/transcribe.worker.ts` |

## Product Surfaces

| Term | Meaning | In Code |
| --- | --- | --- |
| CatatAI | The review copilot that answers questions and proposes note edits or disposition changes for the doctor to apply. | `frontend/src/copilot/CatatAI.tsx`; `backend/src/copilot/`; `backend/src/routes/copilot.ts` |
| Guest Demo Account | A single shared seeded account, available when guest credentials are configured, with an ordinary authentication session; concurrent guests share its synthetic consultations (Also seen as: shared guest account). | `backend/src/routes/auth.ts`; `prisma/seed.ts`; `frontend/src/routes/Login.tsx` |
| Guided Demo Tour | A step-by-step product walkthrough whose own consultation stays in browser state and is not persisted; if live analysis fails, it falls back to seeded demo consultations (Also seen as: guided walkthrough). | `frontend/src/demo/DemoTour.tsx`; `frontend/src/demo/DemoStepBar.tsx` |
| Prescription Theatre | A dialog for reviewing and confirming prescription entries prepared from dictated or typed medication instructions. | `frontend/src/review/PrescriptionTheatre.tsx`; `frontend/src/review/prescription-draft.ts` |
| Preview Stub | A frontend replacement for `/api/` requests in pull-request previews that returns synthetic responses and answers unknown API paths with 501 `not_in_preview`. | `frontend/src/preview/stub.ts`; `frontend/src/preview/backend.ts` |
| Proposal Card | A card showing the copilot's proposed full change and rationale; the record updates only after the doctor applies it, and dismissing a flag requires the doctor's own reason. | `frontend/src/copilot/ProposalCard.tsx`; `CopilotProposalSchema` in `shared/src/index.ts` |

## Engineering

| Term | Meaning | In Code |
| --- | --- | --- |
| Branch Lane | The branch-and-pull-request workflow for changes that are not prose-only, including mixed changes. | [CONTRIBUTING.md](../.github/CONTRIBUTING.md) |
| Docs Lane | The workflow for prose-only changes under `docs/` or in root prose, with a direct-to-main path. | [CONTRIBUTING.md](../.github/CONTRIBUTING.md) |
| Floor Guard | A diff-based script that prevents changes from lowering defined source and test quality checks. | `scripts/floor-guard.ts` |
| No-Stray Guard Test | A source-scanning test that pins a sensitive operation to its permitted module (Also seen as: `no-stray-*` test). | `backend/src/lib/llm/no-stray-provider-sdk.test.ts`; `backend/src/deid/no-stray-brand-casts.test.ts`; `backend/src/audit/no-stray-audit-writes.test.ts` |
