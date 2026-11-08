<a id="readme-top"></a>

# gaps

Derives missing-information prompts from the clinical checklist and records where each gap came from.

## Owns

- Profile-tagged gap checklist content in [checklist.ts](checklist.ts).
- Deterministic gap derivation and provenance in [derive.ts](derive.ts) and [provenance.ts](provenance.ts).

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): deriveGaps and withGapProvenance. [checklist.ts](checklist.ts): ALL_GAP_CHECKLIST and GapChecklistEntry.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- routes/consultations.ts derives and returns gaps.
- clinical-profiles/index.ts imports checklist entries for profile selection.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Missing or unknown information stays unassessed. A gap asks for documentation and does not recommend a diagnosis.
- Derivation stays pure and keeps source and provenance attached to each gap.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for clinical safety and review requirements.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [derive.test.ts](derive.test.ts) checks determinism and input immutability.
- [checklist.test.ts](checklist.test.ts) and [provenance.test.ts](provenance.test.ts) check source validation and gap provenance.
- Postgres is not required; tests use local checklist data.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §3, Shared Contracts](../../../docs/architecture/03-shared-contracts.md) and [TRD §21, LLM Guardrail Architecture](../../../docs/architecture/21-llm-guardrail-architecture.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>
