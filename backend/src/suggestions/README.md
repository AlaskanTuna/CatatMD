<a id="readme-top"></a>
# suggestions

Generates model suggestion and red-flag candidates, then filters unsafe or unsupported suggestion text.

## Owns

- Prompts for suggestion and model red-flag operations.
- ID-constrained response validation and post-generation safety filtering.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): generateSuggestions.
- [safety.ts](safety.ts): SuppressedSuggestionId, imported by routes and audit code.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- routes/consultations.ts displays generated suggestions and merges model red-flag candidates with deterministic flags.
- analysis/diagnostic-guard.ts and audit/index.ts import safety helpers or types.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Model citations must come from the supplied guideline IDs. Suppress uncited or unsafe text.
- Model red-flag candidates may add to review but cannot suppress deterministic rule hits.
- Suggestions are not diagnoses or prescriptions.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for citation and red-flag safety.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [index.test.ts](index.test.ts) checks the LLM call shape and ID-constrained schema.
- [safety.test.ts](safety.test.ts) checks citations and unsafe or diagnostic wording. Postgres is not required; model calls are mocked.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §11, Guideline Corpus](../../../docs/architecture/11-guideline-corpus.md), [TRD §12, LLM Prompt and Response Contracts](../../../docs/architecture/12-llm-prompt-response-contracts.md) and [TRD §21, LLM Guardrail Architecture](../../../docs/architecture/21-llm-guardrail-architecture.md).
<p align="right"><a href="#readme-top">&uarr;</a></p>
