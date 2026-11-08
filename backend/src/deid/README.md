<a id="readme-top"></a>
# deid

Detects identifiers, replaces them with request-scoped tokens, and provides the vault used to rehydrate responses.

## Owns

- Identifier detection, tokenization, transcript serialization and request token vault.
- The Deidentified brand and the assertion that model-bound text contains no detected identifiers.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): detect, deidentify, deidentifyTranscript, sliceDeidentified, assertNoIdentifiers and DeidentificationError.
- [vault.ts](vault.ts): RequestTokenVault. [types.ts](types.ts) defines Deidentified and TokenVault.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- Analysis, copilot, draft-turns, retrieval, suggestions, transcript-cleanup and ASR or consultation routes.
- lib/llm, logging and the guideline ingestion script use the type or detector guard.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- This is the only module allowed to mint the Deidentified brand. Model egress requires that brand.
- Use a request-scoped vault. Fail closed when the configured de-identification gate cannot complete.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for all clinical-data egress.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [deid.test.ts](deid.test.ts) covers identifier detection and tokenization; [spoken-numbers.test.ts](spoken-numbers.test.ts) covers spoken identifiers.
- [no-stray-brand-casts.test.ts](no-stray-brand-casts.test.ts), [no-stray-other-language.test.ts](no-stray-other-language.test.ts) and [system-prompts.test.ts](system-prompts.test.ts) guard egress paths.
- Postgres is not required; tests use synthetic fixtures and local inputs.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §9, De-Identification Pipeline](../../../docs/architecture/09-de-identification-pipeline.md) and [TRD §5, The PHI Boundary](../../../docs/architecture/05-phi-boundary-type-level-contract.md).
<p align="right"><a href="#readme-top">&uarr;</a></p>
