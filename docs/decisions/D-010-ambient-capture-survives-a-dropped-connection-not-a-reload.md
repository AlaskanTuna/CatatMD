# D-010: Ambient Capture Survives A Dropped Connection, Not A Reload

|            |            |
| ---------- | ---------- |
| **Date**   | 2026-10-08 |
| **Status** | Adopted    |
| **Issues** | #256       |

## Decision

A dropped socket is reopened on its own, with the audio spoken during the outage queued and sent late. A reload is guarded by the browser's leave-page prompt and is **not** survived: no draft transcript is stored server-side.

| Event                     | What Happens Now                                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Socket drops              | A fresh recorder queues the audio, a new key is minted, and the socket reopens: at once, then after one and three seconds. The doctor sees how many seconds are held |
| Reopened                  | Queued audio is sent in order, and a note says words around the drop may be missing                                                                                  |
| Not back within the tries | The settled transcript is kept and the doctor is told capture stopped, as before                                                                                     |
| Stop while reconnecting   | The settled transcript is delivered, and the doctor is told the last seconds were not transcribed                                                                    |
| Cap reached, or refused   | Not retried. Reopening past the minted cap would make it a number rather than a bound, so the whole capture is bounded by `maxSessionSeconds`                        |
| Reload or tab close       | The browser asks the doctor to confirm while a capture is live or a transcript is unsubmitted. If they leave anyway, it is lost                                      |

## Why Not A Server-Side Draft

#256 named the fork: a draft stored server-side, or nothing. A draft would be a fourth PHI column, which means a migration applied by hand to production, a fourth erasure target in `eraseConsultation`, a new DPIA row, and an expiry rule for drafts nobody finishes. That is a lot of new surface for the one event left uncovered, an accidental reload, and the leave-page prompt catches most of those.

## What This Decision Does Not License

- **No Audio Stored.** The queue lives in memory for at most 60 seconds and goes only to the socket.
- **No New Egress Or Surface.** A reopened socket uses the same minting route, vendor, region and audit row as the first; each reopen is its own audited mint.
- **No Cap Bypass.** A reconnect never extends a capture past the cap the API minted.
- **What Reverses It:** a server-side draft column, taken through `db-migrator`, `eraseConsultation` and `../DPIA.md` together.
