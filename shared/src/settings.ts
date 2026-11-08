import { z } from 'zod'

/**
 * How long clinical records are kept, in whole years.
 *
 * `RETENTION_DEFAULT_YEARS` is a **configurable default reflecting the common
 * clinical-records retention convention, which the clinic data controller must
 * review and adopt or override.** It is not a legal determination and not a
 * statutory requirement; `docs/dpia.md` states that the period must be verified
 * against Malaysian legal and professional-recordkeeping advice, and nothing
 * here substitutes for that.
 *
 * **`adoptedYears: null` is a real state, not a missing value.** It means the
 * controller has not reviewed the default yet. Reading it as
 * `RETENTION_DEFAULT_YEARS` would turn a suggestion nobody has looked at into a
 * decision somebody made, which is the one thing this shape exists to prevent.
 *
 * **Nothing enforces this.** There is no retention job, no TTL, and no deletion
 * sweep. Storing the decision and acting on it are separate pieces of work, and
 * only the first is built.
 */
export const RETENTION_DEFAULT_YEARS = 7

/** Whole years. Bounded so a typo cannot record a century or a zero. */
export const RetentionYearsSchema = z.number().int().min(1).max(50)

/**
 * Read and written through the same shape, because the only thing a doctor can
 * say about retention is which period, if any, has been adopted.
 */
export const RetentionPolicySchema = z.object({
  adoptedYears: RetentionYearsSchema.nullable(),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>
