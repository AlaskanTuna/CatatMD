<a id="readme-top"></a>
# calculators

Prefills the sore-throat score from transcript evidence and returns the score for a selected clinical profile.

## Owns

- The score definition and its clinical version in [sore-throat-score.ts](sore-throat-score.ts).
- Transcript evidence extraction and profile-aware score selection in [prefill.ts](prefill.ts).
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): scoresFor and SORE_THROAT_SCORE_VERSION.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- routes/consultations.ts requests profile-specific scores.
- clinical-versions/index.ts includes the score version in the active registry.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Leave score inputs empty when the transcript does not establish them. Keep evidence spans tied to the transcript.
- Keep the clinical score definition versioned and do not present a score as a diagnosis.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for clinical-safety rules.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [sore-throat-score.test.ts](sore-throat-score.test.ts) covers evidence-based prefill, score calculation, source citation and unset values.
- Postgres is not required; the tests use transcript fixtures and pure inputs.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §3, Shared Contracts](../../../docs/architecture/03-shared-contracts.md) and [TRD §18, Traceability](../../../docs/architecture/18-traceability.md).
<p align="right"><a href="#readme-top">&uarr;</a></p>
