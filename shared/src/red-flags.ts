import { z } from 'zod'
import { SpeakerSchema } from './transcript.js'

// ─── Red flags / escalation triggers ─────────────────────────────────────────

/**
 * `source` is load-bearing. `rule` hits come from the deterministic engine and
 * may never be suppressed or downgraded by the model; `model` hits are
 * candidates the doctor reviews. See AGENTS.md, clinical-safety do-nots.
 */
export const RedFlagSchema = z.object({
  id: z.string(),
  label: z.string(),
  severity: z.enum(['emergency', 'urgent', 'advisory']),
  /** The transcript evidence that triggered it. */
  evidence: z.string(),
  source: z.enum(['rule', 'model']),
  /** Identifier of the rule that fired, when source is `rule`. */
  ruleId: z.string().optional(),
  /**
   * Corpus chunk ids for the guidance the fired rule is drawn from, copied
   * from the trigger list by `evaluateRedFlags`.
   *
   * Server-populated, exactly like `ruleId`: the model never supplies it,
   * because `makeSuggestionsAndRedFlagsSchema` omits it from the schema the
   * model answers against. A red flag is not a place a model may attach a
   * citation to.
   *
   * Empty is a real answer, not a missing one. `vital-signs-concern` fires on
   * the clinician's own stated severity precisely because the corpus carries
   * no Malaysian numeric vital-sign threshold, and showing that it is uncited
   * is more honest than hiding it.
   */
  guidelineIds: z.array(z.string()).optional(),
  /**
   * Where in the transcript this flag's evidence was found, so the doctor can
   * hear it rather than take it on trust (#293).
   *
   * **Display metadata, and nothing else.** It is resolved server-side by
   * locating the evidence span in the transcript, exactly as `EvidenceLink` is,
   * and it may never influence whether a flag appears, its severity, or its
   * order. A flag whose span cannot be placed in exactly one turn simply has
   * none and renders as it always did.
   *
   * Server-populated like `ruleId` and `guidelineIds`: the model never supplies
   * it, because `makeSuggestionsAndRedFlagsSchema` omits it from the schema the
   * model answers against.
   */
  evidenceLink: z
    .object({
      speaker: SpeakerSchema,
      offsetSeconds: z.number().nonnegative().optional(),
      endSeconds: z.number().nonnegative().optional(),
    })
    .optional(),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type RedFlag = z.infer<typeof RedFlagSchema>
