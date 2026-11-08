<a id="readme-top"></a>

# config

Loads and validates backend runtime configuration before the API starts.

## Owns

- The Zod environment schema and parsed env object in [env.ts](env.ts).
- Loading the repository-root .env file for local runs.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [env.ts](env.ts) exports env, imported by app startup, routes, middleware and service adapters.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- app.ts, server.ts, lib/auth.ts, lib/logger.ts, lib/prisma.ts and modules that configure LLM, ASR or audio behavior.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Fail at startup when required values are absent or malformed.
- Keep production provider restrictions and de-identification fail-closed behavior enforced by the schema module.
- Optional provider keys disable their feature when absent; do not invent defaults for controller decisions such as audio retention.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for environment and privacy constraints.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [env.test.ts](env.test.ts) covers required configuration, malformed values and production provider guards.
- Postgres is not required; tests validate startup parsing in isolated processes.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §7, Environment Contract](../../../docs/architecture/07-environment-contract.md) and [TRD §17, Environments and Deployment](../../../docs/architecture/17-environments-and-deployment.md).

<p align="right"><a href="#readme-top">&uarr;</a></p>
