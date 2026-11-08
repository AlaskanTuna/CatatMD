<a id="readme-top"></a>
# middleware

Implements request context, client address resolution, session checks, rate limits, audio parsing and error handling.

## Owns

- Request-scoped identifiers and trusted client IP resolution.
- Authentication guards, per-operation rate limits, bounded audio parsing and HTTP error conversion.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- request-context.ts: requestContext. client-ip.ts: clientIp and resolveClientIp.
- require-session.ts: requireSession. error-handler.ts: errorHandler.
- rate-limit.ts: route-specific limiters. audio-body.ts: parseAudioBody and inFlightGate.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- app.ts installs global middleware and route-specific limiters.
- routes/asr.ts, routes/consultations.ts, routes/copilot.ts and lib/auth.ts import middleware helpers.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Establish request context and the trusted client address before limiters and auth consume them.
- Apply session checks to protected clinical routes. Bound uploads before reading large request bodies.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for authorization and privacy-safe logging.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [request-context.test.ts](request-context.test.ts) covers request IDs; [client-ip.test.ts](client-ip.test.ts) covers trusted proxy resolution.
- [rate-limit.test.ts](rate-limit.test.ts) covers caller buckets; [error-handler.test.ts](error-handler.test.ts) covers safe error responses.
- Postgres is not required; tests exercise Express requests with mocked dependencies.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §13, API Contracts](../../../docs/architecture/13-api-contracts.md), [TRD §14, Auth Model](../../../docs/architecture/14-auth-model.md) and [TRD §16, Security Controls](../../../docs/architecture/16-security-controls.md).
<p align="right"><a href="#readme-top">&uarr;</a></p>
