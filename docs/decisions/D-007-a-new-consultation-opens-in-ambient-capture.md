# D-007: A New Consultation Opens In Ambient Capture

|                |                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Date**       | 2026-09-21                                                                                                               |
| **Status**     | Adopted                                                                                                                  |
| **Issues**     | #378                                                                                                                     |
| **Supersedes** | `Consultation.captureMode @default(manual)` (#272), and D-004's "What still gates it" row for the Capture Mode half only |
| **Follows**    | D-001's third amendment, which made the same move on the dictation surface on 10/09/26                                   |

## Decision

A consultation **that opens empty** is created in `ambient`. Press To Record remains a full capture path, selectable per consultation in Consultation Settings until a transcript exists.

Two populations are deliberately excluded, for the same reason.

- **Any consultation whose transcript did not stream.** A `source` other than `asr_live` means the audio was captured some other way or never existed, so the mode is written `manual`, both on a create that carries the transcript and on the `PATCH` that later brings one in. The mode locks the instant a transcript exists, and a row asserting a stream that never happened could never be corrected afterwards. The transcript's `source` stays the record of which path ran; this only stops the mode contradicting it.
- **Consultations created before 21/09/26.** The migration issues `SET DEFAULT` and no `UPDATE`, so it rewrites no row at all. That leaves untranscribed drafts on `manual` too, which is the conservative reading and is chosen rather than overlooked: the mode is consent-adjacent state, and a migration is the wrong place to change one on a record a doctor already opened.

## What Changes, And What Does Not

|                               |                                                                                                                                                                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**              | `Consultation.captureMode` defaults to `ambient`, and the create route writes it on the empty-create path so the value does not depend on migration-versus-deploy ordering                                                                                                   |
| **What backing it out takes** | A forward migration, `SET DEFAULT 'manual'`, plus removing the write. Reverting the code alone is a no-op, because the column default then supplies `ambient` anyway. Never delete this migration directory: Prisma would see an applied migration with no local counterpart |
| **What it costs**             | Capture Mode is one half of the ambient two-control rule, and it now ships pre-set to the value that can stream. A doctor who changes nothing lands on ambient                                                                                                               |
| **What still gates it**       | The per-consultation tick, unchanged. `AmbientCapture`'s start dispatcher refuses without it, and `LiveSessionRequestSchema` rejects an ambient body lacking it                                                                                                              |
| **What did not weaken**       | The trail. The mint still records `consentAsserted: true` for ambient, and a stream nobody agreed to still cannot be opened                                                                                                                                                  |
| **What did not move**         | The egress. Same vendor, socket, region, minting route and session cap. Nothing new leaves the browser and no new surface may open it                                                                                                                                        |
| **Who authorised it**         | @Andersonnn7788, 2026-09-21, scoped to the capture-mode default and nothing else                                                                                                                                                                                             |

## The Reason Given Was Workflow, And It Is Recorded As That

The owner's words were that a coming consultation should land on ambient scribe rather than press to record. No measurement supports the change and none is claimed: ambient was already the mode a doctor reaches for when the consultation is the thing being recorded, and the default was asking them to say so every time.

**What it costs is honest to state as a count.** On ambient the rule was two chosen controls; it is now one defaulted preference plus one deliberate tick, which is the shape the dictation surface took on 10/09/26. The difference from that surface is the half worth reading: dictation ended with zero live controls, ambient keeps its tick, so a doctor still agrees per patient before anything streams.

**The asymmetry with the relay is deliberate.** `DEFAULT_AUDIO_SETTINGS.engine` stays `'local'`, so the press-to-record path still sends nothing by default. Only the mode moved.

## What This Decision Does Not License

- **No change to the two-control rule.** `../../.claude/rules/security.md` still governs this surface in full. The tick may not be folded into the mode, and the start dispatcher may not fall through to another path instead of refusing.
- **No backfill.** Rewriting `captureMode` on a consultation that already has a transcript would make the column claim audio was taken a way it was not. The transcript's own `source` remains the record of which path actually ran.
- **No weakening of the transcript lock.** The mode is still immutable once `Consultation.transcript` is non-null, and the API still answers `409 invalid_state` to a late write.
- **No second disclosure, and no restored one.** D-004 removed the residency paragraph above the ambient tick and that stands. This decision makes the unexplained path the default one, which sharpens D-004's recorded cost rather than reopening it.
- **No silent substitution, and no dishonest one.** Where the provider answers `asr_unavailable` the Record tab shows press-to-record instead of an unusable ambient panel, says on screen that it did, and **moves the consultation's mode with it**. Showing one path while the record claims the other is how a consultation ends up locked at `ambient` with nothing having streamed, which is the same falsehood the first bullet refuses. The substitution reads the error code and not just the `503`, so a cold start cannot trigger it.
- **No change to the release gate.** Synthetic data only until the controller decides otherwise.
