<a id="readme-top"></a>
# analysis

Builds structured consultation analysis from de-identified text and folds live analysis windows.

## Owns

- Clinical-fact and note-and-gaps model operations, evidence checks and diagnosis-language filtering.
- Live fact folding, evidence links and derived consultation titles.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): analyseNote and buildEvidenceLinks.
- [live.ts](live.ts): analyseLiveWindow, foldFacts and foldOperational.
- [title.ts](title.ts): deriveConsultationTitle.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- routes/consultations.ts coordinates the analysis pipeline.
- bench/workflow.ts measures the pipeline; suggestions/safety.ts uses the diagnostic-language guard.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Model calls accept the Deidentified brand. Assertions must pass transcript evidence checks.
- Remove diagnostic wording from generated assessment text. Keep deterministic rule flags separate from model analysis.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for clinical safety and explicit approval.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [index.test.ts](index.test.ts), [evidence.test.ts](evidence.test.ts) and [diagnostic-guard.test.ts](diagnostic-guard.test.ts) cover output shape, evidence and diagnosis filtering.
- [live.test.ts](live.test.ts) and [title.test.ts](title.test.ts) cover window folding and titles. Postgres is not required; model calls are mocked.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §12, LLM Prompt and Response Contracts](../../../docs/architecture/12-llm-prompt-response-contracts.md) and [TRD §21, LLM Guardrail Architecture](../../../docs/architecture/21-llm-guardrail-architecture.md).
<p align="right"><a href="#readme-top">&uarr;</a></p>
