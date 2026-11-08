import { z } from 'zod'
import type { Transcript, TranscriptTurn } from './transcript.js'
import { MAX_TRANSCRIPT_TURNS, MAX_TURN_CHARACTERS } from './transcript.js'

// ─── Transcript corrections ──────────────────────────────────────────────────

/**
 * One suspected mishear the doctor may accept or reject (#308).
 *
 * Both words travel. The doctor is choosing between them, so a payload carrying
 * only `suggested` would ask them to approve a replacement without showing what
 * it displaces, and `docs/TRD.md` §20.7 admits this feature only as "a proposal
 * on screen, never an automatic edit".
 *
 * `start` is a character offset into the turn's stored text, so the client can
 * splice the correction back without re-running the matcher. It is a position in
 * the transcript the server read, which is why Accept sends the whole corrected
 * transcript rather than the offset: a stale offset applied to an edited turn
 * would corrupt a word nobody chose.
 */
export const MishearProposalSchema = z.object({
  turnIndex: z.number().int().nonnegative(),
  start: z.number().int().nonnegative(),
  original: z.string().min(1).max(MAX_TURN_CHARACTERS),
  suggested: z.string().min(1).max(MAX_TURN_CHARACTERS),
  /**
   * Which layer proposed this, and it is a safety field rather than a label
   * (issue #309).
   *
   * `mishear` is the measured 11-entry confusable table in
   * `backend/src/redflags/mishears.ts`, which the red-flag matcher already
   * expands internally, so accepting one only moves the transcript the way the
   * engine had already read it. `model` is a constrained LLM pass over spans the
   * recogniser itself flagged as uncertain, and it carries no such guarantee.
   *
   * **The two are treated differently by the server, not merely rendered
   * differently.** A `model` proposal overlapping the evidence of a fired rule
   * flag is dropped before it is ever offered, because a doctor accepting it
   * would change a word the engine matched and the flag would stop firing on
   * re-analysis. A `mishear` proposal is not dropped by that rule.
   *
   * Server-set. The model-facing schema in `backend/src/transcript-cleanup/`
   * omits this field entirely, so a model response is structurally unable to
   * claim it came from the table.
   */
  source: z.enum(['mishear', 'model']),
})

/**
 * Whether the constrained model pass ran, and what became of it (issue #309).
 *
 * Reported rather than inferred from an empty array, because "the pass found
 * nothing" and "the pass never ran" are different facts and a doctor reading a
 * correction surface should not have them collapsed. `disabled` is the default
 * posture: `docs/TRD.md` §20.9 requires the model pass to earn its place
 * against the free deterministic table before it is turned on.
 */
export const TranscriptCleanupStatusSchema = z.enum(['ok', 'failed', 'disabled'])

/**
 * The transcript as it would be if the doctor accepted this proposal.
 *
 * **Shared because two very different callers must agree exactly.** The client
 * uses it to build the `PATCH` body when the doctor taps Accept; the server uses
 * it to ask whether accepting would remove a red flag, and drops the proposal if
 * it would. If those two ever computed a different result, the safety check
 * would be checking a transcript nobody was about to store.
 *
 * **A range overlapping the replaced span is dropped rather than moved.** The
 * words under it are gone, so a recogniser's doubt about them is no longer about
 * anything; ranges after it shift by the length delta, because two of the
 * measured pairs change length ("penkak" to "bengkak", "tongsel" to "tonsil")
 * and leaving them unshifted would drift every later cue one character off the
 * word it describes.
 *
 * `source` and `labelsReviewed` are carried through untouched. The second is the
 * trap: it gates the red-flag engine's question-denial suppression, and
 * accepting a spelling is not confirming every speaker on every turn.
 */
export function applyMishearProposal(
  transcript: Transcript,
  proposal: MishearProposal,
): Transcript {
  const delta = proposal.suggested.length - proposal.original.length
  const from = proposal.start
  const to = proposal.start + proposal.original.length

  return {
    ...transcript,
    turns: transcript.turns.map((turn, index) => {
      if (index !== proposal.turnIndex) return turn

      const next: TranscriptTurn = {
        ...turn,
        text: turn.text.slice(0, from) + proposal.suggested + turn.text.slice(to),
      }

      if (turn.uncertain === undefined) return next

      const moved = turn.uncertain
        .filter((range) => range.end <= from || range.start >= to)
        .map((range) =>
          range.start >= to ? { start: range.start + delta, end: range.end + delta } : range,
        )

      if (moved.length === 0) delete next.uncertain
      else next.uncertain = moved
      return next
    }),
  }
}

/**
 * Bounded for the same reason `medicationsDispensed` is: an unbounded array is
 * an unbounded response. The cap is generous against the 11-entry table, which
 * can only fire on whole tokens, and it is a bound rather than a target.
 *
 * **The deterministic proposals survive a model failure.** `cleanup` may be
 * `failed` alongside a non-empty `proposals`, and that combination is the
 * normal one when the provider is down: layer 2 shipped unconditionally in #308
 * and must not be taken off the screen by layer 3 falling over.
 */
export const TranscriptCorrectionsResponseSchema = z.object({
  proposals: z.array(MishearProposalSchema).max(MAX_TRANSCRIPT_TURNS),
  cleanup: TranscriptCleanupStatusSchema,
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type MishearProposal = z.infer<typeof MishearProposalSchema>
export type TranscriptCleanupStatus = z.infer<typeof TranscriptCleanupStatusSchema>
export type TranscriptCorrectionsResponse = z.infer<typeof TranscriptCorrectionsResponseSchema>
