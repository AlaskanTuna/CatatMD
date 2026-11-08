import { z } from 'zod'

// ─── Missing clinical information ────────────────────────────────────────────

export const GapSourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('guideline'), guidelineIds: z.array(z.string()).min(1) }),
  z.object({ kind: z.literal('unsourced'), reason: z.string().min(1) }),
])

export const InformationGapSchema = z.object({
  id: z.string(),
  /** What the doctor did not establish, phrased as a prompt to ask. */
  question: z.string(),
  /** Why it matters for this presentation — shown to justify the prompt. */
  rationale: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  /**
   * Where the prompt comes from: corpus chunks in `backend/src/guidelines/`,
   * or a stated reason when no chunk covers the field.
   */
  source: GapSourceSchema.optional(),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type GapSource = z.infer<typeof GapSourceSchema>
export type InformationGap = z.infer<typeof InformationGapSchema>
