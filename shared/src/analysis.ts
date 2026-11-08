import { z } from 'zod'
import { ClinicalFactsSchema } from './assertions.js'
import { ClinicalSuggestionSchema, EvidenceLinkSchema, GuidelineChunkSchema } from './citations.js'
import { InformationGapSchema } from './gaps.js'
import { MedicalRecordNoteSchema, SoapNoteSchema } from './note.js'
import { OperationalBlockSchema } from './operational.js'
import { RedFlagSchema } from './red-flags.js'

// ─── Analysis envelope ───────────────────────────────────────────────────────

/**
 * A guideline score the doctor completes (#221), as the analysis hands it over:
 * each item's options with their points, and a suggested option only where the
 * transcript plainly established it, with the sentence that did.
 *
 * **The score is the doctor's.** A suggestion is never selected for them: the
 * review page shows it beside the item for the doctor to use or ignore, sums
 * only what they choose, and points at the guidance that defines the score.
 * Nothing interprets the total or writes it into the note. `suggestion` is
 * `null` wherever the transcript said nothing plain, and a reader must never
 * treat that as a default.
 */
export const ScoreOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  points: z.number().int(),
})

export const ScoreItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  options: z.array(ScoreOptionSchema).min(2),
  suggestion: z.object({ optionId: z.string(), evidence: z.string() }).nullable(),
})

export const ClinicalScoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** The version of the score's definition, stamped like every clinical artefact. */
  version: z.string(),
  /** Document references (`doc:...`) that define the score. */
  guidelineIds: z.array(z.string()),
  items: z.array(ScoreItemSchema).min(1),
})
export type ClinicalScore = z.infer<typeof ClinicalScoreSchema>

export const ConsultationAnalysisSchema = z.object({
  note: SoapNoteSchema,
  /**
   * The canonical categorized note used by analyses created from the
   * Malaysian medical-record template onward.
   *
   * Optional so consultations analysed before this field existed still parse;
   * absence means the categorization was not recorded, never that every
   * category was unestablished.
   */
  medicalRecordNote: MedicalRecordNoteSchema.optional(),
  gaps: z.array(InformationGapSchema),
  redFlags: z.array(RedFlagSchema),
  suggestions: z.array(ClinicalSuggestionSchema),
  /**
   * CPG chunks retrieved for this consultation and offered to the model as
   * citation candidates alongside the curated corpus. Persisted with the
   * analysis so the review UI can resolve a citation without re-running
   * retrieval, which would not be reproducible.
   */
  retrievedGuidelines: z.array(GuidelineChunkSchema).optional(),
  /**
   * Guideline scores the doctor may complete for this presentation (#221).
   * Optional: consultations analysed before it shipped carry none.
   */
  scores: z.array(ClinicalScoreSchema).optional(),
  /**
   * The reviewed checklist, surfaced rather than discarded.
   *
   * `docs/PRD.md` §10 requires that a field the consultation never touched
   * reads as unestablished rather than as absent, and Demo Script step 5 asks
   * an evaluator to see exactly that. Both are unsatisfiable if the facts stay
   * inside the analysis pipeline: a UI cannot render a `NOT_ASSESSED` it was
   * never sent, and "we checked 29 fields" is not a claim a reviewer can
   * verify from four paragraphs of prose.
   *
   * Optional because consultations analysed before 13/08/26 have no facts
   * persisted. A reader must treat absence as "not recorded by this version",
   * never as "nothing was assessed" (which is the exact confusion §10 exists
   * to prevent) and the UI says so in as many words.
   */
  clinicalFacts: ClinicalFactsSchema.optional(),
  operational: OperationalBlockSchema.optional(),
  /**
   * Each established checklist field paired with the verbatim transcript span
   * behind it, so a doctor can check what the system read rather than trusting
   * it (GitHub issue #10, docs/TRD.md §19 row 17).
   *
   * **These trace checklist fields, never note sentences.** The note is
   * generated prose from a separate model call (§12) and is not composed from
   * these facts, so no sentence in it has a provenance link and none can be
   * recovered afterwards. Matching note text back to the transcript by
   * similarity would manufacture provenance the system does not have, which in
   * a clinical record is worse than showing none.
   *
   * Every span here already survived the evidence check (§21.4), so a link is
   * a span that was matched against the de-identified transcript rather than
   * one the model asserted.
   *
   * Optional for the same reason as `clinicalFacts`: consultations analysed
   * before this shipped have none, and absence means "not recorded by this
   * version", never "nothing was evidenced".
   */
  evidenceLinks: z.array(EvidenceLinkSchema).optional(),
  /**
   * Whether the consultation fell outside the guideline corpus, carried through
   * to the reader rather than stopping at the pipeline.
   *
   * The model already produces this and `makeSuggestionsAndRedFlagsSchema`
   * documents why it exists: an empty `suggestions` array conflates "out of
   * scope, suggestions suppressed" with "in scope, nothing to suggest"
   * (docs/TRD.md §19 row 7). That reasoning only pays off if the distinction
   * survives to the UI, and until now it was dropped when the analysis was
   * assembled, leaving the review screen to hedge with "this **may be** outside
   * the corpus's scope" about something the system already knew.
   *
   * Optional because consultations analysed before this shipped have no value
   * persisted. Absence means "not recorded by this version" and must keep the
   * old hedge, never be read as `false`.
   */
  outOfScope: z.boolean().optional(),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type ConsultationAnalysis = z.infer<typeof ConsultationAnalysisSchema>
