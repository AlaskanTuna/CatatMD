<a id="readme-top"></a>
# clinical-profiles

Defines typed clinical profiles and selects the profile-specific rule and checklist content used by analysis.

## Owns

- Profile identifiers, the profile registry, the default profile and profile lookup in [index.ts](index.ts).
- The ClinicalProfile shape and ProfileId schema.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): getClinicalProfile, DEFAULT_PROFILE_ID, ClinicalProfile, ProfileId and ProfileIdSchema.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- Analysis, suggestions, gaps, redflags, medications and calculators.
- Routes and clinical-versions use the profile selector or profile types.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Resolve a requested identifier through ProfileIdSchema before selecting profile content.
- Carry the selected profile into clinical versions and model prompts.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for the clinical scope and review requirements.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [index.test.ts](index.test.ts) covers profile-specific content, URTI regression behavior and profile version stamps.
- Postgres is not required; these tests exercise local profile data.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §3, Shared Contracts](../../../docs/architecture/03-shared-contracts.md) and [TRD §18, Traceability](../../../docs/architecture/18-traceability.md).
<p align="right"><a href="#readme-top">&uarr;</a></p>
