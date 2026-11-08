<a id="readme-top"></a>
# transcript-cleanup

Proposes constrained transcript corrections for uncertain spans without modifying the stored transcript.

## Owns

- The model prompt and correction proposal request in [index.ts](index.ts) and [prompt.ts](prompt.ts).
- The policy that accepts or drops an edit in [policy.ts](policy.ts).
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): proposeModelCorrections.
- [policy.ts](policy.ts) exports applyEditPolicy for the module’s edit-boundary check.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- routes/consultations.ts returns correction proposals for doctor review.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- De-identify text before provider egress. A proposal does not change the stored transcript.
- Keep accepted edits within the uncertain span and preserve the source text outside it.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for model egress and human review.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [index.test.ts](index.test.ts) checks the constrained model call and proposal locations.
- [policy.test.ts](policy.test.ts) checks uncertain-span boundaries and rejects no-op edits. Postgres is not required.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §20, ASR Contract](../../../docs/architecture/20-asr-contract-on-device-default-hosted-by-exception.md) and [TRD §21, LLM Guardrail Architecture](../../../docs/architecture/21-llm-guardrail-architecture.md).
<p align="right"><a href="#readme-top">&uarr;</a></p>
