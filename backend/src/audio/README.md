<a id="readme-top"></a>
# audio

Stores consultation recordings under an adopted retention window and enforces expiry on reads and cleanup.

## Owns

- Recording storage, retrieval, purge and expired-recording sweeps in [index.ts](index.ts).
- The 25 MiB upload size constant used by the audio path.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Entry Points

- [index.ts](index.ts): audioRetentionEnabled, storeAudio, readAudio, purgeAudio and sweepExpiredAudio.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Used By

- routes/consultations.ts stores and reads recordings and runs the expiry sweep.
- audit/erasure.ts purges recordings during consultation erasure.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Invariants

- Do not store recordings until a retention period is configured. Reads must reject expired audio even before a sweep runs.
- Purge audio on erasure. Approval does not shorten the configured retention window.
- Follow the [repository invariants](../../../docs/agents/invariants.md) for handling identifiable consultation data.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Tests

- [audio.test.ts](audio.test.ts) covers retention gating, storage expiry, reads, purge and expiry sweeps.
- Postgres is not required; Prisma operations are mocked.
<p align="right"><a href="#readme-top">&uarr;</a></p>

## Read More

- [TRD §13, API Contracts](../../../docs/architecture/13-api-contracts.md) and [TRD §16, Security Controls](../../../docs/architecture/16-security-controls.md).
<p align="right"><a href="#readme-top">&uarr;</a></p>
