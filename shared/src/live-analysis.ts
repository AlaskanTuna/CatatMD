import { z } from 'zod'
import { ClinicalFactsSchema } from './assertions.js'
import { InformationGapSchema } from './gaps.js'
import { OperationalBlockSchema } from './operational.js'
import { RedFlagSchema } from './red-flags.js'

// ─── Live analysis (ambient capture) ─────────────────────────────────────────

/**
 * Bounds on one live window. Sized for a window rather than a consultation:
 * the whole point of the fold below is that a cycle never carries the running
 * transcript, so these are two orders of magnitude under `analyze-ephemeral`'s.
 */
export const MAX_LIVE_DELTA_TURNS = 60
export const MAX_LIVE_DELTA_CHARACTERS = 8_000

/**
 * How many closed segments one window may carry, whatever has failed since.
 *
 * A client only advances its committed count on a successful cycle, so without
 * a ceiling a run of failures grows the next window until it breaches the two
 * bounds above, and the route then refuses it as invalid for the rest of the
 * consultation. Well under `MAX_LIVE_DELTA_TURNS`, because one segment can
 * split into several turns.
 */
export const MAX_LIVE_DELTA_SEGMENTS = 20

/**
 * A ceiling on `cycle`, so an honest client cannot loop forever. It bounds
 * nothing else: a dishonest one simply sends `previous: null` every time, which
 * is why the rate limiter and not this number is the real cost control.
 */
export const MAX_LIVE_CYCLES = 200

/**
 * How many already-sent closed segments a delta repeats.
 *
 * **This is a safety requirement, not an optimisation.** `findDeniedAbility`
 * (`backend/src/redflags/triggers.ts`) is an adjacency-pair matcher: it reads
 * `turns[index + 1]`, and unlike `asserts()` it does so regardless of
 * `labelsReviewed`. A doctor's question closing one window with the patient's
 * denial opening the next would be invisible to a strictly disjoint delta, and
 * that pair is the only path by which some emergency triggers fire at all.
 */
export const LIVE_DELTA_LOOKBACK_SEGMENTS = 1

/**
 * Floor on the gap between model-backed cycles (docs/TRD.md §20.7). It is a
 * minimum interval, not a timer: a cycle also waits for the previous one to
 * return, so the real cadence is the slower of this and provider latency.
 */
export const LIVE_ANALYSIS_INTERVAL_MS = 12_000

/**
 * The previous cycle's result, handed back unchanged by the client.
 *
 * **There is deliberately no field here carrying the running transcript.**
 * docs/TRD.md §20.8 adopts the fold over re-extraction, and expressing it in
 * the type rather than in a convention is what stops a later caller quietly
 * resending a growing transcript to buy accuracy.
 *
 * Reusing `ClinicalFactsSchema` and `OperationalBlockSchema` rather than a
 * loose shape is load-bearing too: `ClinicalAssertionSchema`'s refinement rides
 * along, so a client cannot hand back a `PRESENT` with no evidence span and
 * have the fold treat it as established.
 */
export const LiveAnalysisStateSchema = z.object({
  cycle: z.number().int().min(0).max(MAX_LIVE_CYCLES),
  clinicalFacts: ClinicalFactsSchema,
  operational: OperationalBlockSchema,
})

export const LiveAnalysisResponseSchema = z.object({
  state: LiveAnalysisStateSchema,
  /**
   * Derived by `deriveGaps` over the merged facts, never asked of the model.
   * Live or not, absence detection stays an enumeration over assertion states
   * (docs/TRD.md §20.8.1: judges score 0.50 to 0.63 at spotting what is
   * missing, which is guessing).
   */
  gaps: z.array(InformationGapSchema),
  /** Field ids the evidence check forced back to `NOT_ASSESSED`. Ids only. */
  discardedFieldIds: z.array(z.string()),
})

/**
 * The deterministic pane. Separate from the response above because the
 * cadences differ by roughly 40x: rules run on every closed segment and must
 * feel immediate, while the model fold is allowed to lag (docs/TRD.md §20.8.1).
 */
export const LiveFlagsResponseSchema = z.object({
  redFlags: z.array(RedFlagSchema),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type LiveAnalysisState = z.infer<typeof LiveAnalysisStateSchema>
export type LiveAnalysisResponse = z.infer<typeof LiveAnalysisResponseSchema>
export type LiveFlagsResponse = z.infer<typeof LiveFlagsResponseSchema>
