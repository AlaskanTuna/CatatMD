<a id="readme-top"></a>

# Scripts

Provides the backend command for ingesting clinical practice guideline documents into the retrieval corpus.

## Owns

- Corpus ingestion, normalization and optional document upload in [ingest-cpg.ts](ingest-cpg.ts).

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [ingest-cpg.ts](ingest-cpg.ts) is run by the root corpus:ingest script after shared types are built.
- No production module imports this directory.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- The root package script corpus:ingest invokes the ingestion CLI.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Keep ingestion scoped to guideline source documents and their metadata.
- Use the configured embedding client and database path rather than adding provider calls outside their adapters.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for model egress and synthetic-data handling.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [ingest-cpg.test.ts](ingest-cpg.test.ts) covers command flags and input normalization.
- Postgres is not required; tests exercise parsing helpers without running the ingestion workflow.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §11, Guideline Corpus](../../../docs/architecture/11-guideline-corpus.md) and [TRD §7, Environment Contract](../../../docs/architecture/07-environment-contract.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>
