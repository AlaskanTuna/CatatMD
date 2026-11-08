<a id="readme-top"></a>

# draft-turns

Uses a constrained model pass to label speaker turns in hosted-ASR text, then reconstructs each turn from the input.

## Owns

- The de-identified prompt and bounded chunking logic in [index.ts](index.ts).
- Exact reconstruction and drift checks in [reconstruction.ts](reconstruction.ts).

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): draftTurns and DraftTurnsError.
- [reconstruction.ts](reconstruction.ts) exports reconstructTurns for the module’s exact re-slicing step.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- routes/asr.ts labels hosted transcription output.
- audit/index.ts provides the closed failure-reason type used by this module.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Send only Deidentified text to the model. Keep every returned turn’s text tied to a verbatim input span.
- Mark failed chunks as undrafted instead of inventing speaker attribution or rewriting speech.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for model egress and clinical text handling.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [index.test.ts](index.test.ts) covers the LLM call shape and failure mapping.
- [reconstruction.test.ts](reconstruction.test.ts) covers exact re-slicing and drift handling. Postgres is not required.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §20, ASR Contract](../../../docs/architecture/20-asr-contract.md) and [TRD §21, LLM Guardrail Architecture](../../../docs/architecture/21-llm-guardrail-architecture.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>
