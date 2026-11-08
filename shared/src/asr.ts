import { z } from 'zod'
import { MAX_TRANSCRIPT_TURNS, MAX_TURN_CHARACTERS, SpeakerSchema } from './transcript.js'

// ─── Hosted ASR ──────────────────────────────────────────────────────────────

/**
 * One hosted-ASR segment, field-for-field with the local worker's
 * `TranscriptSegment` (frontend/src/audio/protocol.ts) so segments from either
 * path feed `segmentsToDraft` unchanged.
 */
export const HostedAsrSegmentSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number().nullable(),
})

/**
 * What `POST /api/asr/transcriptions` returns. `segments` is empty on today's
 * path: the provider does not honour `verbose_json` (docs/TRD.md §20.3,
 * finding 5), and the frontend's `usable()` gate already falls back to plain
 * prose on an empty array. The field stays so provider-side segments can start
 * flowing without a contract change.
 */
export const HostedAsrResultSchema = z.object({
  text: z.string(),
  /** Billed seconds from the provider's `usage` object, stamped into the audit trail. */
  durationSeconds: z.number(),
  segments: z.array(HostedAsrSegmentSchema),
})

// ─── Hosted draft speaker labels ─────────────────────────────────────────────

/**
 * One drafted turn of a hosted transcript. Deliberately narrower than
 * `TranscriptTurnSchema`: no `offsetSeconds`, because the hosted path carries
 * no timing and a fabricated offset would assert a wrong time in the evidence
 * trace (the same rule `segmentsToDraft` applies to split lines).
 */
export const DraftTurnSchema = z.object({
  speaker: SpeakerSchema,
  text: z.string().min(1).max(MAX_TURN_CHARACTERS),
  /**
   * Set when no label was drafted for this span and `speaker` is a placeholder.
   *
   * The labelling pass runs in chunks, and a chunk whose echo fails the
   * verbatim reconstruction has no labels to give. The two alternatives were
   * both wrong: failing the whole request threw away the labels every other
   * chunk produced, and quietly giving the span its neighbour's speaker
   * presents unlabelled patient speech as the doctor's with nothing marking it
   * invented.
   *
   * So the span ships with its text intact and its uncertainty declared, and
   * the client renders it as needing a label rather than as a drafted one.
   * **Server-set only.** The model may emit this field and it is discarded:
   * `reconstructTurns` builds each returned turn from scratch.
   */
  undrafted: z.boolean().optional(),
})

/**
 * Bound on one hosted transcript submitted for turn drafting, reconciled with
 * the drafting call's 16,384-token output ceiling rather than with transport:
 * the output is a verbatim echo of the input, and at a conservative 2.5
 * characters per token for code-switched Malay, 30,000 characters is roughly
 * 12,000 echoed tokens plus per-turn JSON scaffolding, inside the ceiling
 * with margin. A larger cap would accept text whose echo is guaranteed to
 * truncate, paying the full output budget for a certain failure (OWASP
 * LLM10). Still ~1.6x the longest consultation measured during development
 * (~18,000 characters). Exported so the client can skip a call the API would
 * refuse.
 */
export const MAX_DRAFT_TEXT_CHARACTERS = 30_000

/** Body of `POST /api/asr/draft-turns`. */
export const DraftTurnsRequestSchema = z.object({
  text: z.string().trim().min(1).max(MAX_DRAFT_TEXT_CHARACTERS),
})

/**
 * What `POST /api/asr/draft-turns` returns, and also the schema the model's
 * own output is validated against (precedent: `ClinicalFactsResponseSchema`).
 * The turn list is the only content field, and the backend accepts it only
 * when the concatenated turn text reconstructs the input verbatim, so the
 * model can relabel speech but never rewrite it.
 */
export const DraftTurnsResponseSchema = z.object({
  turns: z.array(DraftTurnSchema).min(1).max(MAX_TRANSCRIPT_TURNS),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type HostedAsrSegment = z.infer<typeof HostedAsrSegmentSchema>
export type HostedAsrResult = z.infer<typeof HostedAsrResultSchema>
export type DraftTurn = z.infer<typeof DraftTurnSchema>
export type DraftTurnsRequest = z.infer<typeof DraftTurnsRequestSchema>
export type DraftTurnsResponse = z.infer<typeof DraftTurnsResponseSchema>
