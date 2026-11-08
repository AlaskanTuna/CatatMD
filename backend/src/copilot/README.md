<a id="readme-top"></a>

# Copilot

Runs CatatAI review turns and returns streamed text and constrained proposal tool calls.

## Owns

- Consultation digest and system prompt construction.
- Tool definitions, proposal parsing, reasoning filtering and phantom-click checks.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): runCopilotTurn, the route-facing turn generator.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- routes/copilot.ts streams CatatAI turns for one consultation.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- De-identify the consultation digest, doctor message and prior conversation turns before provider egress.
- Expose proposal tools only. The copilot cannot approve a note or apply a proposal without the doctor’s explicit action.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for the PHI boundary and approval transition.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [index.test.ts](index.test.ts) and [digest.test.ts](digest.test.ts) cover de-identification and digest content.
- [tools.test.ts](tools.test.ts) checks the proposal-only tool surface; [reasoning-filter.test.ts](reasoning-filter.test.ts) checks reasoning removal.
- [phantom-click.test.ts](phantom-click.test.ts) checks references to proposals that were not shown. Postgres is not required.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §25, Review Copilot Tool-Call Behaviour](../../../docs/architecture/25-review-copilot-tool-call-behaviour.md) and [TRD §21, LLM Guardrail Architecture](../../../docs/architecture/21-llm-guardrail-architecture.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>
