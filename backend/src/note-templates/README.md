<a id="readme-top"></a>
# note-templates

Stores the version stamp for the Malaysian medical-record template used by the backend.

## Owns

- The template artefact identifier and effective date in [index.ts](index.ts).
- The shared note shape remains defined by @shared/types.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): MEDICAL_RECORD_TEMPLATE_VERSION, imported by clinical-versions/index.ts.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- clinical-versions/index.ts includes the template stamp in the active clinical version registry.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Keep the template version stamp aligned with the artefact it identifies.
- Do not duplicate the shared note contract in this directory.
- Follow the [repository invariants](../../../docs/agents/invariants.md) when changing clinical output contracts.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- No module-local tests are present. There is no Postgres requirement for a test suite in this directory.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §3, Shared Contracts](../../../docs/architecture/03-shared-contracts.md) and [TRD §26, Approved-Note Printed Report](../../../docs/architecture/26-approved-note-printed-report.md).
<p align="right"><a href="#readme-top">&uarr;</a></p>
