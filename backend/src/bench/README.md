<a id="readme-top"></a>

# bench

Runs the analysis workflow against a fixed synthetic transcript to measure stage durations and output counts.

## Owns

- The benchmark input in [fixture.ts](fixture.ts).
- The sequential workflow and its bounded run-count option in [workflow.ts](workflow.ts).

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [workflow.ts](workflow.ts) is the executable entry point. The backend package exposes it as bench:workflow.
- [fixture.ts](fixture.ts) exports BENCH_TRANSCRIPT for the workflow; no production module imports it.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- Run locally through the backend package script. No route imports this directory.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Keep benchmark input synthetic. Output only stage durations and result counts, never transcript text or model output.
- Preserve the measured pipeline order so the benchmark reflects the route workflow.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for privacy-safe handling.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- No module-local tests are present. There is no Postgres requirement for a test suite in this directory.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §18, Traceability](../../../docs/architecture/18-traceability.md) lists the backend capability crosswalk.

<p align="right"><a href="#readme-top">&uarr;</a></p>
