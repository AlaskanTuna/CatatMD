import { z } from 'zod'

// ─── Per-field clinical assertion ────────────────────────────────────────────

/**
 * Six explicit states, so a fact the consultation never established can never
 * be represented as denied. See docs/prd.md §10 (Unknown ≠ Negative) — the
 * absolute half of that rule, measured failing in 5 of 5 runs without it
 * (docs/trd.md §21.1).
 */
export const AssertionStateSchema = z.enum([
  'PRESENT',
  'DENIED',
  'CLINICIAN_OBSERVED',
  'NOT_ASSESSED',
  'UNKNOWN',
  'NOT_APPLICABLE',
])

const EVIDENCE_REQUIRED_STATES: ReadonlySet<z.infer<typeof AssertionStateSchema>> = new Set([
  'PRESENT',
  'DENIED',
])

const ClinicalAssertionShape = z.object({
  state: AssertionStateSchema,
  /** Normalised concept label. Paraphrase permitted. */
  value: z.string().optional(),
  /** Verbatim span from the de-identified transcript. */
  evidence: z.string().optional(),
})

/**
 * What the model is permitted to emit.
 *
 * `value` and `evidence` are **required here but optional in the persisted
 * schema**, and that asymmetry is the whole point. Under strict JSON-Schema
 * decoding an optional property is simply absent from `required`, and the model
 * takes that permission every time: measured against qwen-flash on a 3,085-word
 * consultation, **0 of 18** `PRESENT`/`DENIED` assertions carried a span. The
 * evidence check (docs/trd.md §21.4) then downgraded every one of them, so a
 * thorough consultation produced a note asserting nothing and 23 documentation
 * gaps. The safety property held; the product did not.
 *
 * Requiring the field flipped that to **18 of 18 emitted, 12 of 18 matching
 * verbatim** on the same transcript, with `diagnosis` correctly `PRESENT`.
 *
 * The empty string is permitted so `NOT_ASSESSED` stays the cheapest path
 * (docs/trd.md §3, ratification condition 1): a field the transcript never
 * touched costs `"value":"","evidence":""` and nothing more. The condition
 * forbids a field being implicitly required to be *filled*, which this respects
 * — it requires only that the key be present.
 *
 * It is deliberately **not** refined. Enforcing the span rule at the decoding
 * boundary would throw `LLMResponseError` and leave the doctor with nothing;
 * §21.4 wants the individual fact downgraded instead.
 */
export const LlmClinicalAssertionSchema = z.object({
  state: AssertionStateSchema,
  /**
   * Bounded, like `evidence` below. An unbounded string under strict decoding
   * is the other runaway vector alongside an unbounded array, and a normalised
   * concept label has no business being longer than this.
   */
  value: z.string().max(120),
  /**
   * A span long enough to carry the finding and no longer. The bound does
   * double duty: it caps output tokens, and it pushes the model toward the
   * short single-turn quote that the evidence check can actually match — a
   * span that wanders across speaker turns is exactly the one that fails.
   */
  evidence: z.string().max(400),
})

/**
 * The persisted and API-facing contract, applied *after* the §21.4 evidence
 * check has run. By that point every surviving `PRESENT`/`DENIED` carries a
 * span, so this schema is the loud backstop: a bug that lets an evidence-less
 * `DENIED` through fails here rather than reaching a doctor.
 *
 * `NOT_ASSESSED` is the cheapest path by construction — `{ state:
 * 'NOT_ASSESSED' }` is a complete, valid assertion costing no further tokens,
 * and nothing here implicitly requires a field to be filled.
 *
 * The span requirement binds `state`, not `value` (docs/trd.md §21.4):
 * `value` may carry a normalised concept label. Scoping it to vocabulary
 * instead would force `NOT_ASSESSED` onto legitimate paraphrase.
 */
export const ClinicalAssertionSchema = ClinicalAssertionShape.refine(
  (a) => !EVIDENCE_REQUIRED_STATES.has(a.state) || (a.evidence?.trim().length ?? 0) > 0,
  {
    path: ['evidence'],
    message: 'PRESENT and DENIED each require a verbatim transcript span',
  },
)

/**
 * A fixed key set, not a model-chosen one. docs/prd.md §10 requires that a
 * field the transcript never touches is never defaulted to `DENIED` *or
 * silently omitted* — only a fixed key set can guarantee the second half, and
 * it is what lets gaps be derived deterministically in code (a Tier-2 control)
 * rather than asked of the model.
 *
 * Keys are taken verbatim from the completeness checklist in docs/prd.md §9
 * (CAP-2). docs/trd.md §12 deferred this shape; this is it. One key list feeds
 * both the permissive decoding schema and the strict persistence schema, so
 * the two cannot drift.
 */
const buildClinicalFacts = <T extends z.ZodType>(field: T) =>
  z.object({
    symptoms: z.object({
      cough: field,
      coughDuration: field,
      sputumProduction: field,
      sputumCharacteristics: field,
      haemoptysis: field,
      soreThroat: field,
      fever: field,
      dyspnoea: field,
      chestPain: field,
      swallowingDifficulty: field,
      oralIntake: field,
      onsetAndProgression: field,
    }),
    history: z.object({
      asthma: field,
      copd: field,
      cardiacDisease: field,
      immunosuppression: field,
      smoking: field,
      recentInfectionExposure: field,
      currentMedications: field,
      drugAllergies: field,
    }),
    observations: z.object({
      temperature: field,
      heartRate: field,
      respiratoryRate: field,
      bloodPressure: field,
      oxygenSaturation: field,
    }),
    examination: z.object({
      throat: field,
      tonsillar: field,
      cervicalLymphNodes: field,
      chest: field,
    }),
  })

export const ClinicalFactsSchema = buildClinicalFacts(
  ClinicalAssertionSchema.default({ state: 'NOT_ASSESSED' }),
)

export const LlmClinicalFactsSchema = buildClinicalFacts(
  LlmClinicalAssertionSchema.default({ state: 'NOT_ASSESSED', value: '', evidence: '' }),
)
// ─── Inferred types ──────────────────────────────────────────────────────────

export type AssertionState = z.infer<typeof AssertionStateSchema>
export type ClinicalAssertion = z.infer<typeof ClinicalAssertionSchema>
export type ClinicalFacts = z.infer<typeof ClinicalFactsSchema>
