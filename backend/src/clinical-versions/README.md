<a id="readme-top"></a>

# clinical-versions

Centralizes the version stamps for active clinical content and selects stamps for a profile.

## Owns

- The active registry for clinical artefacts and profile versions in [index.ts](index.ts).
- The shared ClinicalArtefactVersion type in [types.ts](types.ts).

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): getActiveClinicalVersions, ACTIVE_CLINICAL_VERSIONS and ACTIVE_PROFILE_VERSIONS.
- [types.ts](types.ts): ClinicalArtefactVersion.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- Routes stamp analysis output. Profiles, gaps, audit, guidelines, redflags, medications, note-templates, calculators and ASR vocabulary import versions or types.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Keep clinical constants in their versioned data files and give each artefact a distinct id and effective date.
- Stamp the version matching the selected profile and content used for the result.
- Follow the [repository invariants](../../../docs/agents/invariants.md) when changing clinical rules or content.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [index.test.ts](index.test.ts) covers artefact IDs, dates and active profile versions.
- [no-stray-clinical-constants.test.ts](no-stray-clinical-constants.test.ts) checks that versioned constants stay in their data files.
- Postgres is not required; the tests read local constants.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §18, Traceability](../../../docs/architecture/18-traceability.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>
