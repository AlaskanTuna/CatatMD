import { z } from 'zod'

// ─── Transcript ───────────────────────────────────────────────────────────────

export const SpeakerSchema = z.enum(['doctor', 'patient'])

/**
 * Bounds on how much text may enter the pipeline in one consultation.
 *
 * Until these existed the 1 MB request-body limit was the only ceiling, which
 * is the wrong instrument: a body that size is roughly 300,000 words, and every
 * one of them would be de-identified, sent to a model priced per token, and
 * scanned again on the way back. The cost of an oversized transcript lands on
 * the LLM bill and the request timeout rather than on the JSON parser, so the
 * bound belongs on the shape rather than on the transport (OWASP LLM10,
 * Unbounded Consumption).
 *
 * Sized well above any real GP consultation and well below anything expensive.
 * The longest transcript measured during development ran about 3,000 words
 * across roughly 120 turns, so a 600-turn ceiling is several times the real
 * ceiling, and a turn longer than 4,000 characters is not a turn.
 */
export const MAX_TRANSCRIPT_TURNS = 600
/**
 * Bounded for the reason `medicationsDispensed` is, and on the same order of
 * magnitude deliberately: a GP consultation dispensing more than ten items is
 * not the scope this prototype claims.
 */
export const MAX_PRESCRIPTIONS = 10
export const MAX_TURN_CHARACTERS = 4_000

/**
 * How many uncertain spans one turn may carry (issue #309).
 *
 * A bound rather than a target, and it is not sized from speech: adjacent
 * sub-threshold words are merged before they get here, so a turn needing more
 * than this many separate spans is one the recogniser was unsure of throughout,
 * where highlighting every run says no more than highlighting the first two
 * hundred. The producer truncates to this rather than letting a pathological
 * turn fail the schema, because a 400 on a stored transcript would cost the
 * doctor the whole consultation to save a display cue.
 */
export const MAX_UNCERTAIN_RANGES_PER_TURN = 200

/**
 * A half-open span of a turn's text, `[start, end)`.
 *
 * **Character offsets, not seconds.** `start` and `end` mean seconds on
 * `HostedAsrSegmentSchema` a hundred lines below, and confusing the two would
 * put a highlight in a place nobody said anything. Named here once so both
 * sides read the same thing.
 */
export const TextRangeSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
})

/**
 * The languages translated ambient capture pairs with English (#392).
 *
 * A closed enum for the reason `LiveAsrModeSchema` is one: the value selects a
 * static recognition config that crosses the audio egress, so a caller chooses
 * which language and never what is sent for it. Urdu and Bengali were measured
 * on this vendor; Mandarin and Tamil were added unmeasured on the owner's
 * grant (docs/decisions/ D-008, docs/TRD.md §20.12).
 */
export const InterpretedLanguageSchema = z.enum(['ur', 'bn', 'zh', 'ta'])

export const TranscriptTurnSchema = z
  .object({
    speaker: SpeakerSchema,
    text: z.string().min(1).max(MAX_TURN_CHARACTERS),
    /**
     * Where the recogniser was unsure of its own words (issue #309).
     *
     * **A cue to re-read, never a finding.** Soniox returns a confidence per
     * token; below a threshold the spans are folded into ranges here so the
     * doctor sees which words to check rather than a score for a whole turn,
     * which nobody can act on. Nothing downstream may read this as evidence
     * that a word is wrong, and no red flag, suggestion or note field may be
     * gated on it.
     *
     * **Absent means nothing is claimed**, not that every word was certain. It
     * is absent on every typed and pasted transcript, on every path whose
     * recogniser reports no confidence, and on any line the doctor edited: once
     * the words are theirs, a machine's doubt about the words it replaced is no
     * longer about anything on screen.
     *
     * Optional so transcripts stored before this field existed still parse, and
     * it lives inside the turn rather than beside it so `Consultation.transcript`
     * stays the single PHI column `eraseConsultation` already nulls.
     */
    uncertain: z.array(TextRangeSchema).max(MAX_UNCERTAIN_RANGES_PER_TURN).optional(),
    /** Seconds from consultation start, when the source provides timing. */
    offsetSeconds: z.number().nonnegative().optional(),
    /**
     * Where this turn's audio ends, for a source that closed the segment.
     *
     * Only ever present alongside `offsetSeconds`, and absent far more often
     * than it is present: Whisper leaves the final segment open, and a line
     * split out of the middle of a segment has no start of its own to end.
     *
     * It exists so playback stops at the end of the sentence the doctor asked
     * for instead of running on into the next one. Absence means "not known",
     * so a caller plays to the end of the recording rather than guessing a
     * duration, the same way an absent `offsetSeconds` never renders as 0:00.
     */
    endSeconds: z.number().nonnegative().optional(),
    /**
     * The same turn in the consultation's other language, when it was captured
     * through two-way machine translation (docs/TRD.md §20.12).
     *
     * **`text` above is always Latin script, the English or Malay the
     * recogniser left untranslated, and nothing that reaches a model reads
     * this.** The red-flag engine matches English and Malay only, and the name
     * detectors read Latin script only, so the other language is kept for the
     * doctor and the record and nowhere else.
     *
     * `spoken` says which half the person actually said. `true`: this is their
     * speech, and the English is the machine translation. `false`: the English
     * was said, and this is what the patient was shown.
     *
     * Inside the turn, like `uncertain`, so `Consultation.transcript` stays the
     * single PHI column `eraseConsultation` already nulls.
     */
    otherLanguage: z
      .object({
        language: InterpretedLanguageSchema,
        text: z.string().min(1).max(MAX_TURN_CHARACTERS),
        spoken: z.boolean(),
      })
      .optional(),
  })
  .refine(
    (turn) =>
      turn.offsetSeconds === undefined ||
      turn.endSeconds === undefined ||
      turn.endSeconds >= turn.offsetSeconds,
    { message: 'endSeconds must not precede offsetSeconds', path: ['endSeconds'] },
  )
  /*
   * Uncertain spans must be in bounds, non-empty, and in ascending order with
   * no overlap. Checked rather than assumed because a renderer walks them once
   * from left to right, so an overlapping or backwards pair would silently
   * duplicate or drop the text between them, and the doctor would be reading a
   * turn that is not the one stored.
   */
  .refine(
    (turn) =>
      turn.uncertain === undefined ||
      turn.uncertain.every(
        (range, index) =>
          range.end > range.start &&
          range.end <= turn.text.length &&
          (index === 0 || range.start >= (turn.uncertain?.[index - 1]?.end ?? 0)),
      ),
    {
      message: 'uncertain ranges must be ordered, non-overlapping and within the text',
      path: ['uncertain'],
    },
  )

/**
 * How the transcript was produced. Client-asserted and unverifiable by the API
 * even now that hosted transcription passes through it, because nothing ties a
 * relayed recording to the consultation later submitted with this field. It is
 * an honest provenance record for a cooperating client, never a security
 * control. See docs/TRD.md §3.
 *
 * Two values mean audio left the doctor's device, by different routes:
 *
 * - `asr_hosted`: the browser posts a finished recording to
 *   `POST /api/asr/transcriptions`, which relays it to the provider (#154).
 * - `asr_live`: ambient capture streams the consultation from the browser
 *   straight to the provider, under a short-lived key the API minted
 *   (docs/TRD.md §20.10). The API never holds this audio, so the server-side
 *   half of the record is the minted session rather than the audio itself.
 *
 * Both egresses are server-observed and audited at the point the API can see
 * them; this field remains the client-asserted linkage recorded at creation.
 */
export const TranscriptSourceSchema = z.enum([
  'fixture',
  'paste',
  'upload',
  'asr_local',
  'asr_hosted',
  'asr_live',
])

export const TranscriptSchema = z.object({
  source: TranscriptSourceSchema,
  turns: z.array(TranscriptTurnSchema).min(1).max(MAX_TRANSCRIPT_TURNS),
  /**
   * Whether a human stands behind the speaker on every turn.
   *
   * **This is a safety input, not metadata.** `backend/src/redflags/triggers.ts`
   * may drop a trigger hit when a doctor's question is answered by a patient's
   * leading denial (issue #70), and that judgement is only as good as the two
   * speaker labels it rests on. A guessed pair of labels can manufacture that
   * exact shape, which would suppress a real escalation trigger: the one
   * failure the engine exists to prevent.
   *
   * So the engine only suppresses when this is `true`. Labels a person typed or
   * confirmed earn the question-denial reading; labels a model drafted do not,
   * and there the engine fails open and lets the flag stand for the doctor to
   * dismiss.
   *
   * `false` on the recorded paths, where labels are drafted from the words and
   * segment timing and, since the review step was removed for the real-time
   * workflow, are applied without a person seeing them. `true` where a person
   * wrote the `Doctor:` / `Patient:` prefixes themselves.
   *
   * Optional so transcripts stored before this field existed still parse. Absent
   * is read as unreviewed everywhere it is used, because the safe reading of
   * "nobody recorded whether a human checked" is that nobody did.
   *
   * Client-asserted and unverifiable by the API, exactly like `source` above. A
   * client claiming `true` regains only the suppression it would have had before
   * this field existed: the same client already chose the labels themselves. It
   * narrows the surface for an honest client and opens nothing new for a
   * dishonest one, so no safety control may rest on it alone.
   */
  labelsReviewed: z.boolean().optional(),
  /**
   * Whether any pass of this consultation went through two-way machine
   * translation, and with which languages (docs/TRD.md §20.12).
   *
   * **Provenance for the doctor, not a control.** It tells the review page that
   * some English on screen is a machine translation, and it outlives the
   * per-turn pairs: a line the doctor rewrites loses its `otherLanguage`, but
   * the consultation was still translated. Client-asserted, like `source`.
   *
   * Deliberately not tied to the pairs by a refine. A pair without this marker
   * is a missing banner; a refine would turn it into a refused save, and the
   * doctor would lose the transcript over a display fact.
   */
  machineTranslation: z
    .object({
      languages: z
        .array(InterpretedLanguageSchema)
        .min(1)
        .max(InterpretedLanguageSchema.options.length),
    })
    .optional(),
  /**
   * Whether this consultation's recording was uploaded for refinement after
   * Stop, and whether the refined transcript is the one used (#436,
   * docs/TRD.md §20.14).
   *
   * **Present whenever an upload started, including one that was refused.** A
   * refined transcript the client did not use still sent the whole recording
   * to a second processor, so `used: false` is a record of an egress, not of a
   * non-event. Absent means nothing was uploaded.
   *
   * Client-asserted, like `source`. The server-observed half is the
   * `asr.batch_session_minted` row; this is the consultation-linked half,
   * copied onto `consultation.asr_live_used`.
   */
  batchTranscription: z.object({ used: z.boolean() }).optional(),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type Speaker = z.infer<typeof SpeakerSchema>
export type TextRange = z.infer<typeof TextRangeSchema>
export type TranscriptTurn = z.infer<typeof TranscriptTurnSchema>
export type TranscriptSource = z.infer<typeof TranscriptSourceSchema>
export type Transcript = z.infer<typeof TranscriptSchema>
export type InterpretedLanguage = z.infer<typeof InterpretedLanguageSchema>
