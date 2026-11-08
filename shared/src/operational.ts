import { z } from 'zod'
import { ClinicalAssertionSchema, LlmClinicalAssertionSchema } from './assertions.js'

// ─── Malaysian operational block ─────────────────────────────────────────────

/**
 * The payer-enforced record schema — condition → treatment → itemised
 * medication dispensed → MC days → referral (docs/PRD.md §1). Two of those
 * fields have no home in SOAP, so a SOAP-only note is incomplete against the
 * contract the clinic signed.
 *
 * Every field here is extraction, never generation. `diagnosis` carries the
 * stricter constraint: it records only an impression the doctor stated, and
 * absent that span it resolves to `NOT_ASSESSED`. The system may not produce a
 * diagnosis the doctor did not say (docs/PRD.md §10).
 */
const buildOperationalBlock = <T extends z.ZodType>(field: T) =>
  z.object({
    diagnosis: field,
    /**
     * Bounded deliberately. An unbounded array under strict decoding is a
     * runaway vector: measured against qwen-flash, a single `note_and_gaps`
     * call occasionally failed to terminate, generating 16,384 completion
     * tokens without closing the response. `maxItems` makes the ceiling
     * structural (Tier 1) rather than a token budget to tune — raising
     * `max_tokens` only buys a longer loop.
     *
     * Ten dispensed items is far beyond any single GP consultation.
     *
     * Lowered from twenty on 14/08/26 (GitHub issue #96, docs/TRD.md §6).
     * Gemini expands a bounded array into `maxItems` copies of the item schema
     * before measuring it against its own schema budget, so twenty assertion
     * objects pushed `clinical_facts` past that budget and every request
     * failed with a bodiless 400. Measured: the same schema passes at ten and
     * below. The bound is now load-bearing for two unrelated reasons, and
     * raising it back stops Gemini running at all rather than merely widening
     * a ceiling.
     */
    medicationsDispensed: z.array(field).max(10).default([]),
    mcDays: field,
    referral: field,
    followUp: field,
  })

export const OperationalBlockSchema = buildOperationalBlock(
  ClinicalAssertionSchema.default({ state: 'NOT_ASSESSED' }),
)

export const LlmOperationalBlockSchema = buildOperationalBlock(
  LlmClinicalAssertionSchema.default({ state: 'NOT_ASSESSED', value: '', evidence: '' }),
)
// ─── Inferred types ──────────────────────────────────────────────────────────

export type OperationalBlock = z.infer<typeof OperationalBlockSchema>
