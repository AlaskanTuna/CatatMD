<a id="readme-top"></a>
# acceptance

Checks the backend safety guarantees against synthetic fixtures and records compact measurements.

## Owns

- Fixture-driven checks for the privacy gateway, deterministic red flags, cited suggestions, evidence and information gaps.
- Measurement helpers in [report.ts](report.ts).
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [report.ts](report.ts) exports record and formatReport for [safety.test.ts](safety.test.ts). No production module imports them.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- No production module imports this directory. The local safety suite uses its report helpers.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Keep fixtures synthetic and outcomes deterministic. These checks do not replace the doctor’s review.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for privacy, red-flag and approval rules.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [safety.test.ts](safety.test.ts) checks zero identifier leaks, all 20 red-flag cases, citation constraints, evidence support and missing-information behavior.
- Postgres is not required. The suite uses synthetic fixtures and mocked service boundaries.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §16, Security Controls](../../../docs/architecture/16-security-controls.md) and [TRD §21, LLM Guardrail Architecture](../../../docs/architecture/21-llm-guardrail-architecture.md).
<p align="right"><a href="#readme-top">&uarr;</a></p>
