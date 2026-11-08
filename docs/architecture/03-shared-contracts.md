# 03. Shared Contracts (`@shared/types`)

Part of the [Technical Reference](../TRD.md).

**Status: `Built`**

All schemas live in `shared/src/index.ts`. Types are inferred (`z.infer`), never hand-written.

## Transcript

| Schema                 | Fields                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `SpeakerSchema`        | `enum(['doctor', 'patient'])`                                                         |
| `TranscriptTurnSchema` | `speaker: Speaker`, `text: string().min(1)`, `offsetSeconds?: number().nonnegative()` |
| `TranscriptSchema`     | `turns: TranscriptTurn[]`, `.min(1)`                                                  |

## Transcript Provenance: `Transcript.source`

**Status: `Built`**, decided and implemented 13/08/26 (issue #31). A **required** field on `TranscriptSchema` (no default: an unstated source silently recorded as `paste` would be a false audit record), persisted with the transcript and shown on the review screen:

```
TranscriptSourceSchema = z.enum(['fixture','paste','upload','asr_local','asr_hosted'])
```

It does double duty, and both jobs are load-bearing enough that neither would justify the field alone:

- **Egress audit.** `asr_hosted` is the only input path on which audio leaves the doctor's device (§20). The field is the durable record of which consultations took that path, alongside the audit event in §15.
- **Fabrication-risk signal for the reviewer.** §20's threat table applies only to `asr_*` sources. A pasted or fixture transcript is what someone typed; a transcribed one may contain a substituted content word carrying a perfectly valid evidence span (§21.4). The review UI can therefore cue closer reading of the transcript itself on `asr_*` sources, and say nothing on the others, which is the difference between a useful warning and a banner the doctor learns to ignore.

**`source` is client-asserted, and the backend cannot verify it.** Transcription runs in the browser on both ASR paths, so the API receives a claim about how the transcript was produced, not evidence of it. This is stated rather than glossed: the field is an honest provenance record for a cooperating client, not a security control, and nothing in the safety architecture rests on it. What is not client-asserted is the de-identification gate (§9), which treats every transcript identically regardless of `source`.

## Clinical Note & Analysis

| Schema                       | Fields                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SoapNoteSchema`             | `subjective`, `objective`, `assessment`, `plan`, all `string`                                                                                                                                                                                                                                                                                                                                                                                              |
| `NoteTemplateSchema`         | `enum(['soap','malaysian'])`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `MedicalRecordNoteSchema`    | `presentingComplaint`, `historyOfPresentingComplaint`, `pastMedicalHistory`, `socialHistory`, `familyHistory`, `objective`, `assessment`, `plan`, all `string`                                                                                                                                                                                                                                                                                             |
| `InformationGapSchema`       | `id: string`, `question: string`, `rationale: string`, `priority: enum(['high','medium','low'])`, `source?: GapSource`                                                                                                                                                                                                                                                                                                                                     |
| `RedFlagSchema`              | `id: string`, `label: string`, `severity: enum(['emergency','urgent','advisory'])`, `evidence: string`, `source: enum(['rule','model'])`, `ruleId?: string`                                                                                                                                                                                                                                                                                                |
| `CitationSchema`             | `guidelineId: string`, `quote?: string`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `ClinicalSuggestionSchema`   | `id: string`, `text: string`, `citations: Citation[]`, `.min(1)`                                                                                                                                                                                                                                                                                                                                                                                           |
| `ConsultationAnalysisSchema` | `note: SoapNote`, `medicalRecordNote?: MedicalRecordNote`, `gaps: InformationGap[]`, `redFlags: RedFlag[]`, `suggestions: ClinicalSuggestion[]`, `retrievedGuidelines?: GuidelineChunk[]` (the retrieved CPG chunks offered to the model, persisted so a citation resolves without re-running retrieval; §11), `scores?: ClinicalScore[]` (the sore-throat scores the doctor completes, each pre-filled only from the transcript; §11, Sore-Throat Scores) |

### Note Template Projections

`MedicalRecordNote` is the canonical editable note for analyses created from 7 September 2026 onward. The LLM returns its eight categories in the existing note-and-gaps call; the analysis pipeline applies the diagnostic guard, then deterministically derives `SoapNote` with `toSoapNote`.

The review screen projects that one record in either order:

| Template    | Projection                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `soap`      | `Subjective` is PC, HPC, PMH, SH, and FH composed in that order; Objective, Assessment, and Plan remain separate                         |
| `malaysian` | Presenting Complaint, History of Presenting Complaint, Past Medical History, Social History, Family History, Objective, Assessment, Plan |

An empty canonical category renders as `Not established`; it is never omitted or converted to a denial. `medicalRecordNote` is optional only for rollout compatibility. When an older analysis lacks it, the Malaysian projection labels all five unavailable history categories `Not recorded by this analysis version` rather than attempting to reverse-parse SOAP Subjective.

## Consultation Lifecycle

| Schema                     | Fields                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ConsultationStatusSchema` | `enum(['draft', 'analyzing', 'awaiting_review', 'approved'])`                                                                                                                                                                                                                                                                              |
| `ConsultationSchema`       | `id: string`, `status: ConsultationStatus`, `noteTemplate: NoteTemplate` (rollout-safe default `soap`), `captureMode: CaptureMode` (rollout-safe projection `manual`, which is not the column default), `createdAt: coerce.date()`, `updatedAt: coerce.date()`, `transcript: Transcript \| null`, `analysis: ConsultationAnalysis \| null` |

`ConsultationSchema` does not carry `doctorId`, `editedNote`, or `editedMedicalRecordNote`, those exist only on the Prisma `Consultation` model (§4). §13's `ConsultationDetailSchema` resolves both edit representations; `doctorId` does not surface in any API response because the authenticated doctor already has it from their own session.

## Load-Bearing Semantics

- **`RedFlag.source`**, `'rule'` hits come from the deterministic engine and are authoritative; they may never be suppressed or downgraded by the model. `'model'` hits are candidates for doctor review only.
- **`RedFlag.ruleId`**, present when `source: 'rule'`; identifies which trigger in the versioned rule list fired. The schema does not enforce this pairing (`ruleId` is unconditionally optional), it is a convention, not a compile-time guarantee.
- **`ClinicalSuggestion.citations`**, `.min(1)`. A suggestion with zero citations fails validation; the schema forbids an uncited clinical suggestion from ever reaching the doctor.

## Structured Clinical-Information Schema: Ratified 13/08/26

**Status: `Built`**, human-ratified (§19 row 10, closed), implemented 13/08/26 (issue #31). `SoapNoteSchema` (above) is four free-text strings and cannot express per-field assertion states. `docs/PRD.md` §10 requires that a symptom, allergy, medication, history item, vital sign, examination finding, safety question, or operational-block field never established must never be represented as denied, which requires distinguishing `NOT_ASSESSED`/`UNKNOWN` from `DENIED`/`PRESENT` at the level of an individual clinical fact. Four opaque note strings cannot do that. The schema therefore grows a structured per-field representation **alongside** `SoapNoteSchema`, which is retained as the review scaffold.

**As built**, the shape is as proposed, but it ships as **two** schemas over one object, which the specification did not anticipate:

```
ClinicalAssertionSchema = z.object({
  state: z.enum(['PRESENT','DENIED','CLINICIAN_OBSERVED','NOT_ASSESSED','UNKNOWN','NOT_APPLICABLE']),
  value: z.string().optional(),   // normalised concept label, paraphrase permitted
  evidence: z.string().optional() // verbatim de-identified transcript span
}).refine(/* PRESENT and DENIED each require a span */)

LlmClinicalAssertionSchema = /* the same object, deliberately unrefined */
```

**Why the split, measured, not preferred.** Against the live `qwen-flash` endpoint on 13/08/26, the model returned `{"state":"DENIED","value":"no fever"}` **with no evidence span**; none of its `PRESENT`/`DENIED` assertions carried one. Enforcing the span rule at the decoding boundary would therefore fail `safeParse`, throw `LLMResponseError` from §6, and leave the doctor with nothing at all.

That is the opposite of what §21.4 specifies: the evidence check runs **after** `safeParse` and forces the individual fact to `NOT_ASSESSED`, so one unsupported assertion costs one gap prompt rather than the entire analysis. The permissive schema is what the model decodes into; the refined one is the persisted and API-facing contract, applied after the check has run, where it acts as a loud backstop against an evidence-less `DENIED` reaching a doctor.

Separately: `.refine()` is **silently dropped** by `z.toJSONSchema()`, so a refinement could never have been a Tier-1 decoding constraint in the first place. The Tier-1 control here is the state enum; the span rule is Tier 3, exactly as §21.3 classifies it.

**`clinicalFacts` is a fixed 29-key set** (`ClinicalFactsSchema`), taken verbatim from `docs/PRD.md` §9 CAP-2's completeness checklist. §12 deferred this shape and this is it. Fixed keys are **required** by `docs/PRD.md` §10: a field the transcript never touches must never be defaulted to `DENIED` _or silently omitted_, and only a fixed key set can guarantee the second half. It is also what lets gaps derive deterministically in code (a Tier-2 control) rather than being asked of the model. This is the template §19 row 16 flags as the largest unvalidated assumption in the guardrail architecture, see the measurement note there.

## Malaysian Operational Block

**Status: `Built`**, human-ratified and implemented 13/08/26 (issue #31). The payer-enforced record schema (PMCare panel GP contract §1.9/§1.15) is condition → treatment → itemised medication dispensed → MC days → referral. Two of those fields have no home in SOAP, so a SOAP-only note is incomplete against the contract the clinic signed. The note therefore carries an operational block alongside the four SOAP strings:

| Field                  | Type                  | Semantics                                                            |
| ---------------------- | --------------------- | -------------------------------------------------------------------- |
| `diagnosis`            | `ClinicalAssertion`   | The impression **the doctor stated**. Transcription-bound, see below |
| `medicationsDispensed` | `ClinicalAssertion[]` | Drugs the doctor named as dispensed, with dose where stated          |
| `mcDays`               | `ClinicalAssertion`   | Medical-certificate days the doctor stated                           |
| `referral`             | `ClinicalAssertion`   | Referral the doctor stated                                           |
| `followUp`             | `ClinicalAssertion`   | Follow-up interval the doctor stated                                 |

**Every operational-block field is extraction, not generation.** Each is subject to the evidence-bound assertion control (§21.4) without exception: `PRESENT` requires a verbatim span in which the doctor states the value, and absent that span the field resolves to `NOT_ASSESSED` and surfaces as an information gap.

**`diagnosis` carries an additional, stricter constraint.** `docs/PRD.md` §10 permits a `diagnosis` field only because it is transcription-bound; it is the one field where a generation failure would put the system on the wrong side of its own intended-purpose statement (`docs/PRD.md` §11). Two consequences bind the implementation:

- The `note_and_gaps` prompt (§12) must never request a diagnosis, differential, or impression. It requests **the diagnosis the doctor stated, if any**, and the schema's `NOT_ASSESSED` state must be the cheapest path for the model, not an error condition.
- The evidence check for `diagnosis` runs at Tier 3 like every other field, but its failure mode is not merely a noisy gap: an inferred label surviving into `diagnosis` is a **CAP-1 acceptance-criteria failure and a `docs/PRD.md` §10 safety-constraint breach**, and must be covered by an explicit test using a fixture in which the doctor examines and prescribes but never names a condition.

## Ratification Conditions (Research-Imposed)

The schema is ratified **as a hypothesis to be tested, not as a mitigation to be assumed.** The one published study that imposed a template on LLM note generation (Asgari et al., _npj Digital Medicine_ 2025) measured an **increase** in major hallucinations. Three conditions attach:

1. **`NOT_ASSESSED` must be the default and cheapest path.** No field may be implicitly required to be filled, in the schema, in the prompt, or in the UI's rendering of an empty field.
2. **The eval must compare schema-constrained output against free-form output on the same sparse transcripts**, the §21.1 fixtures are the baseline. If the schema increases fabrication, that is a finding to report, not a result to bury.
3. **The evidence-span rule is scoped to assertion state, not concept vocabulary** (§21.4), `state` requires a span; `value` may be a normalised term.

---
