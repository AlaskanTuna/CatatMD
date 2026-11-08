import type {
  ConsultationAnalysis,
  GuidelineChunk,
  InformationGap,
  Transcript,
} from '@shared/types'
import { analyseNote, buildEvidenceLinks } from '../analysis/index.js'
import type { AnalysisFailureReason } from '../audit/index.js'
import { scoresFor } from '../calculators/index.js'
import type { ClinicalProfile } from '../clinical-profiles/index.js'
import { DeidentificationError, deidentifyTranscript } from '../deid/index.js'
import { deriveGaps } from '../gaps/index.js'
import { LLMResponseError } from '../lib/llm/index.js'
import { logger, timeStage } from '../lib/logger.js'
import { evaluateRedFlags, mergeRedFlags } from '../redflags/index.js'
import { retrieveGuidelines } from '../retrieval/index.js'
import { generateSuggestions } from '../suggestions/index.js'
import type { SuppressedSuggestionId } from '../suggestions/safety.js'

/**
 * Must stay byte-identical to the serialisation inside `deidentifyTranscript`,
 * so evidence offsets computed against the raw text line up with the
 * de-identified text the model saw. Duplicated rather than imported because
 * `deid/` does not export it — see the note in the handover.
 */
/**
 * Deterministic gaps first, model gaps additive — the same rule the red-flag
 * engine follows. `deriveGaps` reads the structured facts, so its output is
 * reproducible; the model may only add to it, never remove an entry.
 */
function mergeGaps(derived: InformationGap[], modelGaps: InformationGap[]): InformationGap[] {
  const seen = new Set(derived.map((gap) => gap.id))
  return [...derived, ...modelGaps.filter((gap) => !seen.has(gap.id))]
}

/**
 * Rehydrates every `value` and `evidence` string anywhere in an assertion tree.
 *
 * Recursive rather than a per-field map, for two reasons. The structure is not
 * uniform: `ClinicalFacts` nests assertions two levels under four groups, while
 * `OperationalBlock` is flat except for `medicationsDispensed`, which is an
 * array of them. And a hard-coded field list would silently stop covering a
 * field the moment the 29-key checklist grows, which is the same failure the
 * clinical-version guard exists to prevent.
 *
 * `evidence` in particular is a verbatim span from the *de-identified*
 * transcript by construction, so it carries `[PATIENT_1]`-style tokens
 * essentially always rather than occasionally.
 */
export function rehydrateAssertions<T>(node: T, rehydrate: (value: string) => string): T {
  if (Array.isArray(node)) {
    return node.map((item) => rehydrateAssertions(item, rehydrate)) as T
  }
  if (node !== null && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) =>
        (key === 'value' || key === 'evidence') && typeof value === 'string'
          ? [key, rehydrate(value)]
          : [key, rehydrateAssertions(value, rehydrate)],
      ),
    ) as T
  }
  return node
}

export function classifyFailure(error: unknown): AnalysisFailureReason {
  if (error instanceof DeidentificationError) return 'deidentification_failed'
  if (error instanceof LLMResponseError) return 'llm_response_invalid'
  return 'internal_error'
}

/**
 * The analyse pipeline. Ordering here is a safety property, not a preference:
 * de-identify first, run the deterministic rules on the raw transcript
 * in-process, send only de-identified content to the model, then merge as a
 * union so a model response can never suppress a rule hit.
 *
 * Shared by the stored route below and the ephemeral one (#80) so the two
 * cannot drift. Demo Mode's claim is that it narrates the real pipeline, and
 * that claim is only worth making while there is literally one pipeline.
 *
 * It persists nothing and writes no audit row: both are the caller's job,
 * because that is exactly where the two routes legitimately differ.
 */
export async function runAnalysis(
  transcript: Transcript,
  profile: ClinicalProfile,
  consultationId?: string,
): Promise<{
  analysis: ConsultationAnalysis
  detected: readonly string[]
  discardedFieldIds: readonly string[]
  suppressedSuggestionIds: readonly SuppressedSuggestionId[]
}> {
  const { text, vault, detected } = await timeStage('deidentification', () =>
    deidentifyTranscript(transcript),
  )

  // Labels and a count, never the matched values (GitHub issue #15).
  logger.info('de-identification complete', {
    ...(consultationId === undefined ? {} : { consultationId }),
    detectorLabels: detected,
    detectorCount: detected.length,
  })

  // Runs on the raw transcript, in-process, regardless of model output. It
  // never leaves the API, so it needs no gate.
  const ruleFlags = await timeStage('rules', () =>
    evaluateRedFlags(transcript, profile.redFlagTriggers),
  )

  // Like the rules, read from the raw transcript in-process and never sent
  // anywhere (#221). The doctor completes and scores it; nothing reads it back.
  const scores = scoresFor(transcript, profile.id)

  const [noteResult, { retrieved, result: suggestionResult }] = await Promise.all([
    // Not wrapped in a stage of its own: `analyseNote` times its two concurrent
    // calls separately, as `extraction` and `note_generation` (#340). One timer
    // around the pair could not say which of them ran long.
    analyseNote(text, text, profile),
    timeStage('retrieval', async () => {
      let retrieved: GuidelineChunk[] = []
      try {
        retrieved = await retrieveGuidelines(text, { profileId: profile.id })
      } catch (error) {
        // Retrieval is the only source of a citable corpus. A failure means no
        // citable corpus is available for this consultation; it does not fall
        // back to any previously curated corpus.
        logger.warn('guideline retrieval failed; no citable corpus available', {
          errorClass: 'retrieval_error',
          errorName: error instanceof Error ? error.name : 'unknown',
        })
      }
      const result = await generateSuggestions(text, profile, retrieved)
      return { retrieved, result }
    }),
  ])

  const rehydrate = (value: string) => vault.rehydrate(value)

  /**
   * Attributes a span to the turn it came from, for the evidence trace (#10).
   *
   * Resolved by locating the rehydrated span rather than asked of the model,
   * so a link is only ever attributed to a turn that demonstrably contains it.
   * A span matching zero turns, or more than one, resolves to nothing: a
   * confidently wrong attribution on a clinical record is worse than an absent
   * one, and "which of these two turns" is not a question this can answer.
   */
  const attribute = (
    span: string,
  ): {
    speaker?: Transcript['turns'][number]['speaker']
    offsetSeconds?: number
    endSeconds?: number
  } => {
    const needle = span.replace(/\s+/g, ' ').trim().toLowerCase()
    if (needle.length === 0) return {}
    const hits = transcript.turns.filter((turn) =>
      turn.text.replace(/\s+/g, ' ').toLowerCase().includes(needle),
    )
    const turn = hits.length === 1 ? hits[0] : undefined
    if (turn === undefined) return {}
    return {
      speaker: turn.speaker,
      ...(turn.offsetSeconds === undefined ? {} : { offsetSeconds: turn.offsetSeconds }),
      // Only ever alongside a start, matching the turn it was copied from: an
      // end with nothing to seek from cannot be played, and the pair is what
      // `TranscriptTurnSchema` orders against.
      ...(turn.offsetSeconds === undefined || turn.endSeconds === undefined
        ? {}
        : { endSeconds: turn.endSeconds }),
    }
  }

  const analysis = {
    note: {
      subjective: rehydrate(noteResult.note.subjective),
      objective: rehydrate(noteResult.note.objective),
      assessment: rehydrate(noteResult.note.assessment),
      plan: rehydrate(noteResult.note.plan),
    },
    medicalRecordNote: {
      presentingComplaint: rehydrate(noteResult.medicalRecordNote.presentingComplaint),
      historyOfPresentingComplaint: rehydrate(
        noteResult.medicalRecordNote.historyOfPresentingComplaint,
      ),
      pastMedicalHistory: rehydrate(noteResult.medicalRecordNote.pastMedicalHistory),
      socialHistory: rehydrate(noteResult.medicalRecordNote.socialHistory),
      familyHistory: rehydrate(noteResult.medicalRecordNote.familyHistory),
      objective: rehydrate(noteResult.medicalRecordNote.objective),
      assessment: rehydrate(noteResult.medicalRecordNote.assessment),
      plan: rehydrate(noteResult.medicalRecordNote.plan),
    },
    profileId: profile.id,
    gaps: mergeGaps(
      deriveGaps(noteResult.clinicalFacts, noteResult.operational, profile.gapChecklist),
      noteResult.gaps,
    ).map((gap) => ({
      ...gap,
      question: rehydrate(gap.question),
      rationale: rehydrate(gap.rationale),
    })),
    /*
     * `mergeRedFlags` is still a bare concat, and this map still runs after it
     * on whatever it returned. Nothing here filters, reorders, dedupes or
     * re-ranks: it rehydrates the two text fields and attaches where the
     * evidence was heard, so a doctor can play the sentence that raised the
     * flag rather than take it on trust (#293).
     *
     * `attribute` returns nothing for a span it cannot place in exactly one
     * turn, and a flag with no link renders exactly as it did before. A flag's
     * presence, severity and order never depend on any of this.
     */
    redFlags: mergeRedFlags(ruleFlags, suggestionResult.redFlags).map((flag) => {
      const evidence = rehydrate(flag.evidence)
      const { speaker, ...timing } = attribute(evidence)
      return {
        ...flag,
        label: rehydrate(flag.label),
        evidence,
        ...(speaker === undefined ? {} : { evidenceLink: { speaker, ...timing } }),
      }
    }),
    // The reviewed checklist, surfaced rather than discarded. Without these
    // the UI cannot render a `NOT_ASSESSED` it was never sent, and docs/PRD.md
    // §10's "unestablished, never absent" requirement has nothing to display
    // (Demo Script step 5).
    clinicalFacts: rehydrateAssertions(noteResult.clinicalFacts, rehydrate),
    operational: rehydrateAssertions(noteResult.operational, rehydrate),
    suggestions: suggestionResult.suggestions.map((suggestion) => ({
      ...suggestion,
      text: rehydrate(suggestion.text),
    })),
    // Carried rather than dropped. An empty `suggestions` array cannot tell the
    // reader whether the corpus had nothing to say or was never consulted, which
    // is the conflation this flag exists to prevent (docs/TRD.md §19 row 7).
    outOfScope: suggestionResult.outOfScope,
    ...(retrieved.length === 0 ? {} : { retrievedGuidelines: retrieved }),
    ...(scores.length === 0 ? {} : { scores }),
    // Built from the post-evidence-check facts, so every link is a span that
    // survived §21.4 rather than one the model asserted. Checklist fields only:
    // the note is independent prose and has no traceable provenance (#10).
    evidenceLinks: buildEvidenceLinks(noteResult.clinicalFacts, noteResult.operational).map(
      (link) => {
        const evidence = rehydrate(link.evidence)
        return { ...link, evidence, ...attribute(evidence) }
      },
    ),
  }

  return {
    analysis,
    detected,
    discardedFieldIds: noteResult.discardedFieldIds,
    suppressedSuggestionIds: suggestionResult.suppressedSuggestionIds ?? [],
  }
}
