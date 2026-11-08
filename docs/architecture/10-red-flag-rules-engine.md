# 10. Red-Flag Rules Engine

Part of the [Technical Reference](../TRD.md).

**Status: `Built`**, implemented 13/08/26 (issue #7). The concrete trigger content is in `backend/src/redflags/triggers.ts`; see the note under "What Stays Undecided" for the one threshold that could not be sourced.

Read `.claude/skills/healthcare-cdss-patterns/SKILL.md` before implementing this module, its posture is adopted here without modification: a pure function library, zero side effects, zero tolerance for false negatives.

## Trigger Record Shape

```
interface RedFlagTrigger {
  id: string             // stable id; becomes RedFlag.ruleId
  label: string          // becomes RedFlag.label
  severity: 'emergency' | 'urgent' | 'advisory'
  matcher: (transcript: Transcript) => string | null  // matched evidence span, or null
  clinicalSource: string // citation for where this trigger comes from (Q7)
  listVersion: string    // version of the trigger list this entry belongs to
}
```

`listVersion` is `RED_FLAG_LIST_VERSION.id`, and every entry carries the same value. The list is one of the five versioned clinical artefacts stamped on each analysis; see §15 (Clinical Content Versioning).

## Evaluation

- `evaluateRedFlags(transcript: Transcript): RedFlag[]`, a pure function over the transcript directly. It runs in-process and never leaves the API, so it does not need to pass through `deid/` first (§9 exists for the LLM egress path only).
- Runs independently of, and is never gated by, the LLM call, `docs/PRD.md` §8 (Primary Flow) step 3 states rules run "regardless of model output."
- Every trigger whose `matcher` returns non-null becomes a `RedFlag` with `source: 'rule'`, `ruleId: trigger.id`, `evidence` set to the matched span.

## Whose Words Assert The Symptom (Issue #70)

**Status: `Built`.** A matcher originally tested every turn as though it asserted whatever it mentioned. A doctor working through a review of systems therefore raised a flag for each symptom she asked about: `urti-identifier-dense-routine` produced three, one of them `EMERGENCY`, while the patient denied all three in the following turn. That fixture's rubric had said for as long as it existed that any flag on it is a false positive.

Two narrow rules now decide whether a matched span asserts anything. Both default to firing, because the direction this engine must fail in is toward too many flags.

| Rule                    | Applies To                  | Effect                                                                                     |
| ----------------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| **Question Resolution** | A doctor turn ending in `?` | Contributes a match unless the immediately following patient turn opens with a denial      |
| **Adjacent Negation**   | Any turn                    | A match is skipped when an unambiguous negator sits directly before it, in the same clause |

A patient turn always asserts, including a question of their own ("is it bad that I am coughing up blood?"). A doctor's statement always asserts, so an observed finding ("I can hear stridor") still fires.

**Why Questions Are Not Simply Discarded**, which was the obvious fix and a worse one: a patient answering "Yes, since this morning" to "Any chest pain?" never says the words. The question is the only place the symptom is named, so dropping it would lose the flag entirely. That case is covered by a test.

**Negation Is Scoped Deliberately Tightly.** Only the run of text since the last clause break counts, and a "but" ends the negation's reach, so "no fever but chest pain" still fires. A denial frequently repeats the phrase it denies, which is why "no pain in the chest" needed handling at all.

**Residual False-negative Risk, Stated Rather Than Implied.** A patient who answers a screening question with a bare denial and then contradicts it later in the same turn is not modelled. So is a negator separated from its subject by more than a clause. Both are judged less likely than the failure they replace, which fired on essentially every consultation, because alert fatigue is a false-negative mechanism wearing a false-positive costume: a flag that is always present is a flag nobody reads.

**The Rubrics Are Now Executable.** Each `FixtureRubric` carries `expectedRedFlagIds`, derived by reading the transcript against the trigger list rather than by recording output, and a test asserts exact equality for every fixture. The prose alone could not fail a build, which is how three false flags survived a passing suite.

## Merge Rule: The Zero-Suppression Invariant

- Assembly is a union, never a filter: `finalRedFlags = ruleFlags.concat(modelCandidates)`.
- `modelCandidates` come from the `red_flags` LLM call (§12), constrained by schema to `source: 'model'` with no `ruleId`.
- Nothing in assembly may drop, downgrade, or reorder a `rule`-sourced entry based on model output, the model call runs after rule evaluation and is never shown the rule engine's results to "reconcile" against, so it cannot suppress them even if instructed to.
- Testable consequence, mirroring the skill's pass criterion: for every trigger in the list, a fixture transcript containing its matching evidence must produce that `RedFlag` on 100% of runs, a single missed trigger is a patient-safety regression, not a quality issue.

## Engine Posture

Pure function library, zero side effects (no I/O, no LLM call, no database access), consistent with the module-import constraint already recorded in §2 (`redflags/` may import only `@shared/types`).

## What Stays Undecided

The concrete trigger content, the actual list of clinical triggers, their thresholds, and each `clinicalSource` citation, is not specified here. Q7 records that no clinician is available to draft or validate it; inventing specific clinical thresholds without that review would itself violate the no-invention rule this document runs on. Sourcing the initial list from the §11 corpus, **MOH NAG 2024, the 2024 Malaysian sore-throat Delphi consensus, and Ooi et al. 2022**, is implementation work against this contract, not a further TRD design decision. NICE is **not** a permitted source here for the same licence reason that excludes it from the corpus (§11); the Centor and McIsaac criteria themselves are clinical algorithms whose criteria are restated in the Malaysian sources, so they are expressed in our own words and attributed to those sources.

---
