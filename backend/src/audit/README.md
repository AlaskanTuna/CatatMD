<a id="readme-top"></a>
# audit

Writes consultation audit events, verifies the hash chain, serves history and notifications, and handles erasure.

## Owns

- Event validation and persistence in [index.ts](index.ts).
- Hash-chain operations in [chain.ts](chain.ts) and data erasure in [erasure.ts](erasure.ts).
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): recordAuditEvent, getAuditHistory, getActorNotifications and clearActorNotifications.
- [chain.ts](chain.ts): computeAuditHash and verifyAuditChain.
- [erasure.ts](erasure.ts): eraseConsultation and erasePatient.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- Routes for auth, consultations, patients, ASR, settings and notifications.
- lib/auth.ts, audio/index.ts, draft-turns/index.ts and lib/asr adapters.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Route every AuditEvent write through this module. Preserve the verifiable chain during erasure.
- Use closed event and failure categories. Do not write transcript or note text into audit metadata.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for privacy-safe records.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [audit.test.ts](audit.test.ts) covers event writes and history; [chain.test.ts](chain.test.ts) covers stable hashes and chain verification.
- [erasure.test.ts](erasure.test.ts) checks erasure and chain preservation; [no-stray-audit-writes.test.ts](no-stray-audit-writes.test.ts) checks write ownership.
- Postgres is not required; Prisma is mocked.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §15, Audit Logging](../../../docs/architecture/15-audit-logging.md).
<p align="right"><a href="#readme-top">&uarr;</a></p>
