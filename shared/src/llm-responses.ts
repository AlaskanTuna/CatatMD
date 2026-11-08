import { z } from 'zod'
import { LlmClinicalFactsSchema } from './assertions.js'
import { CitationSchema, ClinicalSuggestionSchema } from './citations.js'
import { InformationGapSchema } from './gaps.js'
import { MedicalRecordNoteSchema } from './note.js'
import { LlmOperationalBlockSchema } from './operational.js'
import { RedFlagSchema } from './red-flags.js'

// ─── LLM response contracts (docs/trd.md §12) ────────────────────────────────

/**
 * Operation 1a. The 34-assertion checklist (29 clinical fields plus the five
 * operational ones) and nothing else. The prompt never asks for a diagnosis,
 * differential, or impression, only for the diagnosis the doctor stated.
 *
 * Split out from `note_and_gaps` on 13/08/26 (docs/trd.md §19 row 19). One
 * combined response averaged 3,337 completion tokens and ranged over 533 of
 * them, and it is that variance rather than the mean that pushed runs past the
 * provider's reliable ceiling and past CAP-1's 30s budget: 2 of 8 measured runs
 * exceeded it, the worst at 36.1s. Asking for the fixed checklist on its own
 * makes the response nearly constant-size, measured at 2,652 to 2,779 tokens
 * (a spread of 127), because every key is known in advance and only the spans
 * vary.
 */
export const ClinicalFactsResponseSchema = z.object({
  clinicalFacts: LlmClinicalFactsSchema,
  operational: LlmOperationalBlockSchema,
})

/**
 * Operation 1b. The generated-prose half, run concurrently with 1a against the
 * same transcript. It carries no dependency on the facts call: the note is
 * written from the transcript rather than composed from the assertions
 * (docs/trd.md §12), so ordering the two would only cost wall-clock.
 */
export const NoteAndGapsResponseSchema = z.object({
  note: MedicalRecordNoteSchema,
  /**
   * Bounded for the same reason as `medicationsDispensed`. The checklist holds
   * 29 fields, so more than 30 gaps cannot correspond to anything real, and an
   * unbounded array is where a strict-decoding loop escapes.
   */
  /**
   * `source` is omitted from the model-facing shape. Provenance is attached by
   * the deterministic checklist only; a model-authored reason string would be
   * free-text provenance shown to the doctor, which the citation rule forbids.
   */
  gaps: z.array(InformationGapSchema.omit({ source: true })).max(30),
})

/**
 * Operation 2a — `red_flags`. Split out of `suggestions_and_red_flags` by
 * issue #340, and the half that always runs: it needs no corpus, so it is a
 * fixed schema rather than a factory.
 *
 * `outOfScope` lives here, on the call that cannot be skipped, precisely
 * because it must stay a real judgement about the presentation. It is an
 * explicit signal rather than an inference from an empty `suggestions` array,
 * since that inference would conflate "out of scope, suggestions suppressed"
 * with "in scope, nothing to suggest" (docs/trd.md §19 row 7), and the review
 * page renders those two, plus "nothing was retrieved", as three distinct
 * sentences. Deriving it from an empty corpus instead would collapse the
 * distinction the UI exists to make.
 *
 * Red flags returned here are candidates only: `source` is pinned to `'model'`
 * and `ruleId` is absent, so a model response is structurally incapable of
 * impersonating a deterministic rule hit.
 *
 * `evidenceLink` is omitted for the same class of reason. It says where in the
 * recording a finding can be heard, and a model that could assert it could
 * point a doctor at a moment that says something else, or at nothing at all.
 * It is resolved from the transcript afterwards, never accepted from a model.
 *
 * `guidelineIds` is omitted because a red flag is not a place a model may
 * attach a citation. This half never receives a corpus at all, which makes
 * that structural rather than merely asserted.
 */
export const RedFlagCandidatesSchema = z.object({
  outOfScope: z.boolean(),
  redFlags: z.array(
    RedFlagSchema.omit({
      source: true,
      ruleId: true,
      guidelineIds: true,
      evidenceLink: true,
    }).extend({
      source: z.literal('model'),
    }),
  ),
})

/**
 * Operation 2b — `suggestions`. `corpusIds` is the live list of retrieved
 * guideline chunk ids at request time, which narrows `guidelineId` from a free
 * `string` to a decoding constraint: a citation naming an id outside the corpus
 * fails `safeParse` inside the adapter and never reaches the doctor.
 *
 * The parameter is a **non-empty tuple**, not `string[]`, so a caller cannot
 * reach an empty `z.enum`. That is not a nicety: an empty corpus admits no
 * citation, every suggestion requires one, and the previous shape answered
 * that by widening `guidelineId` back to a plain `string` and capping the
 * array at zero. Making it unrepresentable is stronger, and it is why the
 * caller skips this operation entirely rather than calling it with nothing
 * (#340). Build the argument with `corpusIdsFor()`.
 */
export const makeSuggestionsSchema = (corpusIds: readonly [string, ...string[]]) =>
  z.object({
    suggestions: z.array(
      ClinicalSuggestionSchema.extend({
        citations: z.array(CitationSchema.extend({ guidelineId: z.enum(corpusIds) })).min(1),
      }),
    ),
  })
// ─── Inferred types ──────────────────────────────────────────────────────────

export type ClinicalFactsResponse = z.infer<typeof ClinicalFactsResponseSchema>
export type NoteAndGapsResponse = z.infer<typeof NoteAndGapsResponseSchema>
export type RedFlagCandidatesResponse = z.infer<typeof RedFlagCandidatesSchema>
export type SuggestionsResponse = z.infer<ReturnType<typeof makeSuggestionsSchema>>
