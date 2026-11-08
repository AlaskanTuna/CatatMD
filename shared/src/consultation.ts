import { z } from 'zod'
import { ConsultationAnalysisSchema } from './analysis.js'
import { CaptureModeSchema, NoteTemplateSchema } from './note.js'
import { TranscriptSchema } from './transcript.js'

// ─── Consultation lifecycle ──────────────────────────────────────────────────

/**
 * `approved` is only reachable through an explicit doctor action. Nothing
 * auto-approves.
 */
export const ConsultationStatusSchema = z.enum([
  'draft',
  'analyzing',
  'awaiting_review',
  'approved',
])

/**
 * How long an `analyzing` claim is honoured before it is treated as dead (#373).
 *
 * `analyzing` is written before the pipeline runs and cleared by the route's own
 * `catch`, so a process that dies mid-run leaves it written with nothing left to
 * clear it. Without a lease that row 409s every retry forever, and the review
 * page polls a status that will never change.
 *
 * Five minutes is chosen against the worst legitimate run: the retrieval branch
 * is a 10s embedding call then a 90s chat call, sequential, and around that sit
 * de-identification, the rules engine, rehydration, two writes and two audit
 * rows. That is about three minutes, and this leaves headroom without stranding
 * a doctor behind a run that is not coming back.
 *
 * Shared because the server enforces it and the client displays it. Two copies
 * would drift into a window where the page still spins and the API already
 * accepts a retry.
 */
export const STALE_ANALYSIS_MS = 5 * 60_000

/**
 * How often the review page re-reads a consultation while it is `analyzing`.
 *
 * The payload is a transcript and a null analysis, a few KB, so the cost of
 * asking often is low and the win is that the note appears without the doctor
 * touching anything.
 */
export const ANALYSIS_POLL_MS = 3_000

/**
 * The record's filing name, or `null` when it has never been named.
 *
 * Bounded, unlike `TranscriptSchema`, whose missing `.max()` is named as a gap
 * in `.claude/rules/security.md`. 120 characters is a filing label with room to
 * spare, and past that a title stops being scannable, which is the whole reason
 * it exists.
 *
 * Trimmed to `null` rather than kept as an empty string, so "cleared" and
 * "never named" are one state instead of two that render identically and sort
 * differently.
 */
export const ConsultationTitleSchema = z
  .string()
  .max(120)
  .transform((value) => value.trim())
  .refine((value) => value.length <= 120)
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()

export const ConsultationSchema = z.object({
  id: z.string(),
  status: ConsultationStatusSchema,
  /**
   * Additive and rollout-safe: an older API response is SOAP, which was the
   * only presentation before this field existed.
   */
  noteTemplate: NoteTemplateSchema.nullish().transform((value) => value ?? 'soap'),
  /**
   * Additive and rollout-safe: manual was the device default before capture
   * mode became consultation state.
   *
   * **`manual` here is not the default a new consultation gets**, which is
   * `ambient` since #378. This fallback answers a narrower question: what an
   * absent field means, and only an API predating #272 can omit it. Those
   * deployments genuinely were manual, so moving this to `ambient` would
   * assert a stream on evidence that does not exist, and in the direction that
   * overstates rather than understates the egress.
   */
  captureMode: CaptureModeSchema.nullish().transform((value) => value ?? 'manual'),
  /*
   * Absent reads as "no title", rather than failing the parse.
   *
   * Vercel and Render deploy from their own triggers on the same merge, so the
   * new SPA reaches the old API for as long as the slower build takes. This
   * field is the first thing added to the consultations list since, and the
   * frontend `safeParse`s every response into `invalid_response`, so requiring
   * it would black out the list and the detail page for that whole window.
   *
   * PR #124 shipped exactly this shape of mismatch and was caught by hand
   * (`.github/workflows/ci.yml`, "Migration notice"). Tolerating an absent
   * additive field is what makes the rollout ordering-independent.
   *
   * Output stays `string | null`, so nothing downstream handles `undefined`.
   */
  title: z
    .string()
    .nullish()
    .transform((value) => value ?? null),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  transcript: TranscriptSchema.nullable(),
  analysis: ConsultationAnalysisSchema.nullable(),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type ConsultationStatus = z.infer<typeof ConsultationStatusSchema>
export type Consultation = z.infer<typeof ConsultationSchema>
