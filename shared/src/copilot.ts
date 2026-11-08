import { z } from 'zod'
import { DispositionStateSchema } from './audit.js'
import { TranscriptSchema } from './transcript.js'

// ─── CatatAI copilot ─────────────────────────────────────────────────────────

/**
 * The review-screen copilot's wire contract (GitHub issue #169).
 *
 * **The copilot proposes; the doctor disposes.** Every schema below is shaped
 * around that single rule. A model turn may only ever emit prose, citations,
 * and *proposals*; nothing here can express a completed write. Applying a
 * proposal is a separate authenticated request the doctor initiates by
 * clicking Approve, which is why `CopilotProposal` carries no `applied` field
 * for the model to set and no id it can forge.
 *
 * That structure is also this feature's anti-injection control, and it is
 * doing more work here than elsewhere. The rest of the system defends against
 * a transcript shaped like an instruction by giving the model a closed
 * response schema with no free-text escape hatch (`.claude/rules/security.md`,
 * "LLM Egress"). A copilot answering in prose cannot have one. What replaces
 * it is that prose has no side effects: the worst a successful injection can
 * do is put wrong words in a chat bubble, because every consequential action
 * requires a human click on a surface the model does not control.
 */
export const CopilotRoleSchema = z.enum(['doctor', 'copilot'])

export const CopilotTurnSchema = z.object({
  role: CopilotRoleSchema,
  content: z.string(),
})

/**
 * Bounded for the same reason `medicationsDispensed` is (docs/trd.md §21.3):
 * an unbounded history is a runaway prompt, and the digest already carries the
 * consultation state, so old turns are conversational context rather than the
 * record. The oldest turns are dropped, never summarised, because a summary of
 * clinical dialogue is another generation nobody reviewed.
 */
export const COPILOT_HISTORY_MAX = 20

export const CopilotRequestSchema = z.object({
  message: z.string().min(1).max(2_000),
  history: z.array(CopilotTurnSchema).max(COPILOT_HISTORY_MAX).default([]),
  /**
   * The doctor pressed Propose as Edit on an answer that came back as prose
   * (#185), so this turn must end in a tool call rather than more prose.
   */
  propose: z.boolean().optional(),
})

/**
 * What the copilot may ask to change, and nothing else.
 *
 * **The one absence that is not negotiable: no proposal approves a note.**
 * Sign-off is the doctor's explicit state transition and may never originate
 * from a model (`AGENTS.md`, Critical Do-Nots). There is no tool, and no
 * permission dialog would make one acceptable.
 *
 * Dispositions, including dismissal, *are* proposable, and the reasoning is
 * worth stating because it looks at first like the suppression path the rules
 * engine exists to close. It is not. A disposition records a decision *about* a
 * flag; it never removes, downgrades or hides it, and `mergeRedFlags` stays a
 * pure concat regardless. The flag is on the record either way, which is the
 * invariant. What a dismissal adds is the doctor's stated reason for setting it
 * aside, and that reason is deliberately **not** part of this schema: the model
 * may open the dialog, but the justification for discarding a safety signal is
 * typed by the doctor and travels on `CopilotApplyRequest`. A model-authored
 * reason would be the system writing its own excuse.
 *
 * `rationale` here is a different thing entirely: it is the copilot explaining
 * to the doctor why it is proposing this, shown on the card, and never stored.
 */
export const CopilotProposalSchema = z.discriminatedUnion('tool', [
  z.object({
    tool: z.literal('edit_note_section'),
    section: z.enum(['subjective', 'objective', 'assessment', 'plan']),
    /** The replacement text in full, never a patch: a diff the doctor cannot
     *  read in a chat bubble is not something they can meaningfully approve. */
    text: z.string().min(1).max(4_000),
    rationale: z.string().min(1).max(400),
  }),
  z.object({
    tool: z.literal('set_red_flag_disposition'),
    redFlagId: z.string().min(1),
    state: DispositionStateSchema,
    rationale: z.string().min(1).max(400),
  }),
  z.object({
    tool: z.literal('set_gap_disposition'),
    gapId: z.string().min(1),
    state: DispositionStateSchema,
    rationale: z.string().min(1).max(400),
  }),
])

/**
 * **There is deliberately no copilot apply endpoint.**
 *
 * When the doctor presses Approve on a proposal, the client turns it into an
 * ordinary `PATCH /api/consultations/:id` body and sends it down the same route
 * their manual edits already use. A dedicated copilot write route was the
 * obvious design and is the worse one, for three reasons:
 *
 * - It would be a **second write path** to the clinical record, needing its own
 *   ownership check, its own validation and its own audit calls, all of which
 *   already exist and are tested once.
 * - "The proposal grants no capability the doctor did not already have" stops
 *   being an argument and becomes a fact: it is byte-for-byte the request the
 *   doctor's own keyboard produces.
 * - The dismissal-reason rule needs no restatement. `DispositionInputSchema`
 *   already requires a reason on `dismissed` and forbids one elsewhere, so the
 *   doctor's typed justification is validated by the same refinement that
 *   guards the checkbox on screen.
 *
 * **Known gap, stated rather than skipped.** Because the write is
 * indistinguishable from a manual edit, the audit trail records
 * `consultation.edited` without recording that CatatAI proposed it. Provenance
 * of a copilot-originated change is worth having and is filed separately; it is
 * not silently absent.
 */

/**
 * Server-sent events, in order:
 * `tool* -> token* -> proposal* -> done`, with `error` possible at any point.
 *
 * `tool` exists so the panel can show what the copilot is reading while it
 * reads it, then collapse once prose starts. It carries the tool's name and
 * nothing it returned: what a read tool returns is consultation content, and
 * streaming that to a log-adjacent surface is how transcript bodies end up
 * somewhere `AGENTS.md` forbids them.
 */
export const makeCopilotEventSchema = (corpusIds: readonly string[]) => {
  const hasIds = corpusIds.length > 0
  const citations = z.array(
    z.object({
      guidelineId: hasIds ? z.enum(corpusIds as [string, ...string[]]) : z.string(),
    }),
  )
  return z.discriminatedUnion('type', [
    z.object({ type: z.literal('tool'), name: z.string(), label: z.string() }),
    z.object({ type: z.literal('token'), text: z.string() }),
    z.object({ type: z.literal('proposal'), proposal: CopilotProposalSchema }),
    z.object({
      type: z.literal('done'),
      messageId: z.string(),
      /** Same constraint as every other citation path: an id from the supplied
       *  corpus or nothing. Free text fails here rather than reaching a doctor. */
      citations: hasIds ? citations : citations.max(0),
    }),
    z.object({ type: z.literal('error'), message: z.string() }),
  ])
}

export const ErrorEnvelopeSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
})

export const FixtureSchema = z.object({
  id: z.string(),
  label: z.string(),
  transcript: TranscriptSchema,
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>
export type Fixture = z.infer<typeof FixtureSchema>
export type CopilotRole = z.infer<typeof CopilotRoleSchema>
export type CopilotTurn = z.infer<typeof CopilotTurnSchema>
export type CopilotRequest = z.infer<typeof CopilotRequestSchema>
export type CopilotProposal = z.infer<typeof CopilotProposalSchema>
export type CopilotEvent = z.infer<ReturnType<typeof makeCopilotEventSchema>>
