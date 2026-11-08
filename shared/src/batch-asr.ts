import { z } from 'zod'
import { MAX_ASR_CONTEXT_TERMS } from './live-asr.js'
import { RedFlagSchema } from './red-flags.js'
import { MAX_TURN_CHARACTERS } from './transcript.js'

// ─── Batch refinement after Stop ─────────────────────────────────────────────

/**
 * The one address the browser may upload a finished ambient recording to, for
 * re-transcription after Stop (#436, docs/TRD.md §20.14).
 *
 * **A literal, compared exactly.** It is the third audio egress, and the
 * second the API never sees, so the same belt-and-braces as
 * `LIVE_ASR_WEBSOCKET_URL` applies: our own API hands the address over, the
 * schema below refuses any other, `elevenlabs-batch.ts` re-checks it before
 * sending, and the CSP `connect-src` in `vercel.json` pins the host at the
 * platform layer. Redirecting this egress takes all of them.
 */
export const BATCH_ASR_UPLOAD_URL = 'https://api.elevenlabs.io/v1/speech-to-text'

/**
 * The longest recording refinement is offered for, in seconds.
 *
 * The ambient session cap is 1800 s, and the minute above it is slack for the
 * recorder's last chunk and the stop drain. **Provisional until the
 * measurement gate** (docs/TRD.md §20.14): the batch evaluation only ran files
 * of at most 40 s, so nothing has yet measured a recording this long.
 */
export const MAX_BATCH_RECORDING_SECONDS = 1_860

/** One keyterm crossing the egress. Bounds are the vendor's documented ceilings. */
const BatchKeytermSchema = z
  .string()
  .min(1)
  .max(49)
  .regex(/^[^<>{}[\]\\]+$/)
  .refine((term) => term.trim().split(/\s+/u).length <= 5, {
    message: 'A keyterm may be at most five words.',
  })

/**
 * The recognition settings the browser uploads under.
 *
 * **Literals throughout, and `.strict()`, and both are the control.** The SPA
 * parses what our own API sends against this, so even a compromised or
 * misconfigured API cannot have it ask for `scribe_v2_medical`, which the
 * evaluation measured merging voices (docs/TRD.md §20.13), or for speaker
 * roles, which would be a second role mechanism beside `voteRolesBySpeaker`.
 * The keyterms are the ambient vocabulary, bounded the way the vendor bounds
 * them. Nothing here is derived from a request, for the reason
 * `LiveSessionConfigSchema.context` gives: it crosses an egress where nothing
 * can be de-identified.
 */
export const BatchAsrConfigSchema = z
  .object({
    modelId: z.literal('scribe_v2'),
    diarize: z.literal(true),
    numSpeakers: z.literal(2),
    timestampsGranularity: z.literal('word'),
    tagAudioEvents: z.literal(false),
    keyterms: z.array(BatchKeytermSchema).max(MAX_ASR_CONTEXT_TERMS),
  })
  .strict()

/**
 * Body of `POST /api/asr/batch-sessions`.
 *
 * `consent` is the ambient tick, asserted exactly as `LiveSessionRequestSchema`
 * asserts it on ambient. `durationSeconds` is the client's measure of the
 * recording: unverifiable, so it is bounded here and written to the audit row
 * as what the client said rather than as a fact.
 */
export const BatchSessionRequestSchema = z.object({
  consent: z.literal(true),
  durationSeconds: z.number().int().min(1).max(MAX_BATCH_RECORDING_SECONDS),
})

/**
 * What `POST /api/asr/batch-sessions` returns: where to upload, under which
 * credential, with which settings.
 *
 * `token` is a single-use credential minted by the API for this one upload; it
 * is never the account key. The browser holds it for one request and never
 * stores it.
 */
export const BatchSessionSchema = z.object({
  provider: z.literal('elevenlabs'),
  uploadUrl: z.literal(BATCH_ASR_UPLOAD_URL),
  token: z.string().min(1).max(4_096),
  config: BatchAsrConfigSchema,
})

/**
 * Bounds on one refinement check. Neither side is a stored transcript, so
 * neither borrows `MAX_TRANSCRIPT_TURNS`: a turn here is a segment the
 * recogniser cut, which is shorter and more numerous than a drafted turn. Sized
 * for the longest recording above, at well over one segment every two seconds,
 * and well inside the 1 MB body limit.
 */
export const MAX_REFINEMENT_CHECK_TURNS = 1_500
export const MAX_REFINEMENT_CHECK_CHARACTERS = 100_000

const RefinementTurnsSchema = z
  .array(z.string().trim().min(1).max(MAX_TURN_CHARACTERS))
  .min(1)
  .max(MAX_REFINEMENT_CHECK_TURNS)
  .refine(
    (turns) =>
      turns.reduce((total, turn) => total + turn.length, 0) <= MAX_REFINEMENT_CHECK_CHARACTERS,
    { message: 'Too much text to check.' },
  )

/**
 * Body of `POST /api/asr/refinement-check`: the live transcript as the segment
 * texts its recogniser cut, and the refined one as the turns that will be
 * stored, after labelling, because where turns break changes what the rules
 * raise.
 *
 * **Text only, and that is deliberate.** No speaker, no source, no
 * `labelsReviewed`: each of those can only ever weaken the red-flag engine, so
 * the server sets all three itself, the `transcript-cleanup/policy.ts` pattern.
 */
export const RefinementCheckRequestSchema = z.object({
  live: RefinementTurnsSchema,
  refined: RefinementTurnsSchema,
})

/**
 * The rule hits the live transcript raised that the refined one does not. Any
 * entry at all means the client keeps the live transcript.
 */
export const RefinementCheckResponseSchema = z.object({
  lost: z.array(RedFlagSchema),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type BatchAsrConfig = z.infer<typeof BatchAsrConfigSchema>
export type BatchSessionRequest = z.infer<typeof BatchSessionRequestSchema>
export type BatchSession = z.infer<typeof BatchSessionSchema>
export type RefinementCheckRequest = z.infer<typeof RefinementCheckRequestSchema>
export type RefinementCheckResponse = z.infer<typeof RefinementCheckResponseSchema>
