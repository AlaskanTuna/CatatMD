<a id="readme-top"></a>

# retrieval

Ranks guideline chunks with lexical and semantic search and returns validated chunks for clinical suggestions.

## Owns

- Lexical query construction in [query.ts](query.ts).
- Profile and jurisdiction constrained retrieval, rank fusion and response validation in [retrieve.ts](retrieve.ts).

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): retrieveGuidelines.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- routes/consultations.ts retrieves chunks for the analysis flow.
- bench/workflow.ts runs the same retrieval step in local measurements.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Accept only Deidentified query text. Preserve the returned guideline chunk IDs for downstream citation validation.
- Keep results scoped to the requested clinical profile and jurisdiction.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for de-identification and cited suggestions.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [query.test.ts](query.test.ts) checks stop-word and de-identification-token removal.
- [retrieve.test.ts](retrieve.test.ts) covers empty corpora and lexical-semantic rank fusion. Postgres is not required; Prisma is mocked.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §11, Guideline Corpus](../../../docs/architecture/11-guideline-corpus.md) and [TRD §6, LLM Port and Adapter](../../../docs/architecture/06-llm-port-and-adapter.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>
