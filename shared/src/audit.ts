import { z } from 'zod'

/** The audit fields the consultation history client reads. */
export const AuditEventSchema = z.object({
  id: z.string(),
  action: z.string(),
  createdAt: z.coerce.date(),
  metadata: z.unknown().nullable().optional(),
})
export type AuditEvent = z.infer<typeof AuditEventSchema>

/**
 * What a doctor decided about a red flag or a gap.
 *
 * Three states rather than a boolean, because "I have seen this and it is
 * handled" and "this does not apply to this patient" are different clinical
 * judgements and collapsing them loses the one a reviewer would want to read.
 *
 * **A disposition never changes the finding it refers to.** The red flag stays
 * in `analysis` exactly as the rules engine and model produced it; this records
 * a decision *about* it. That is what preserves the invariant on the
 * `acknowledgedRedFlagIds` column, that a flag is never removed or downgraded,
 * while still letting a doctor say a flag does not apply.
 */
export const DispositionStateSchema = z.enum(['acknowledged', 'dismissed', 'not_applicable'])
export type DispositionState = z.infer<typeof DispositionStateSchema>

/**
 * `reason` is required on `dismissed` and forbidden elsewhere.
 *
 * Dismissing is the only one of the three that discards a safety signal on the
 * doctor's own authority, so it is the one that has to be defensible later.
 * Acknowledging and marking not-applicable are self-explanatory and a mandatory
 * free-text box on either would train people to type "n/a" until the field
 * means nothing.
 */
const DispositionShape = z.object({
  id: z.string(),
  state: DispositionStateSchema,
  reason: z.string().trim().min(1).max(500).optional(),
  decidedAt: z.coerce.date(),
})

export const DispositionSchema = DispositionShape.refine(
  (value) =>
    value.state === 'dismissed' ? value.reason !== undefined : value.reason === undefined,
  {
    message: 'A dismissal requires a reason, and only a dismissal may carry one.',
    path: ['reason'],
  },
)
export type Disposition = z.infer<typeof DispositionSchema>

/** The client proposes a decision; the server stamps when it was made. */
export const DispositionInputSchema = DispositionShape.omit({ decidedAt: true }).refine(
  (value) =>
    value.state === 'dismissed' ? value.reason !== undefined : value.reason === undefined,
  {
    message: 'A dismissal requires a reason, and only a dismissal may carry one.',
    path: ['reason'],
  },
)
export type DispositionInput = z.infer<typeof DispositionInputSchema>
