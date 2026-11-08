# D-004: Ambient Capture Stops Naming Where The Audio Goes

|                |                                                                   |
| -------------- | ----------------------------------------------------------------- |
| **Date**       | 2026-09-10                                                        |
| **Status**     | Adopted                                                           |
| **Issues**     | Follows #365 on the other Soniox surface. No issue filed for this |
| **Supersedes** | The residency disclosure shipped with ambient capture (#268)      |

## Decision

The paragraph above the ambient consent tick is removed. The tick stays, and is reworded to name what is being agreed to: that this patient is recorded and transcribed, for this consultation only.

The removed sentence read: "This consultation leaves this device as it happens: streamed from this browser to Soniox and transcribed in the United States. Our server issues the session key and never receives the audio."

## What Changes, And What Does Not

|                         |                                                                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**        | The residency paragraph is gone from the ambient panel. The tick now reads "This patient has agreed to be recorded and transcribed, for this consultation only"                                                                                            |
| **What it costs**       | **No screen in the product names the processor or the region for ambient capture.** The doctor is asked to record, and is told nothing about where the audio goes                                                                                          |
| **What still gates it** | Both halves of the two-control rule, untouched: the Capture Mode preference and the per-consultation tick. Nothing streams without the tick, enforced in the dispatcher. **The Capture Mode half was superseded on 21/09/26, see D-007; the tick was not** |
| **What did not weaken** | The trail. `LiveSessionRequestSchema` still refuses an ambient body without `consent: true`, and that mint still records `consentAsserted: true`                                                                                                           |
| **What moved with it**  | Three claims elsewhere pointed at the removed sentence and were corrected in the same change: two in the Audio dialog, one in the theatre header comment                                                                                                   |
| **Who authorised it**   | The repository owner, 2026-09-10, scoped to the ambient panel and nothing else                                                                                                                                                                             |

## The Reason Given Was Usability, And It Is Recorded As That

The owner's words were that the sentence is not important to show, and that the consent is the part that matters. No measurement supports the removal and none is claimed. It is the same reason and the same shape as the third amendment to D-001, one surface later.

**The difference from D-001 is the half worth reading.** Dictation lost its disclosure **and** its tick, so the honest count of consent controls there is zero. Ambient loses the disclosure only. A doctor still has to tick a box per patient before anything streams, so what went is the explanation, not the asking.

**What is genuinely lost is worth naming precisely.** MMC 003/2023 cl.18 wants consent specific to the purpose before capture, and a purpose stated without a recipient is a weaker statement of it. `../DPIA.md` carries that as a residual risk rather than a closed one, and the release gate for real data is unchanged: synthetic data only until the controller decides otherwise.

## What This Decision Does Not License

- **No change to the two-control rule.** `../../.claude/rules/security.md` still governs this surface in full. The tick may not be folded into the preference, and the start dispatcher may not fall through to another path instead of refusing.
- **No claim, anywhere, that the interface discloses residency on this path.** A document or comment that says the ambient gate names the processor is now false. This is the failure the Audio dialog has already shipped twice.
- **No second disclosure appearing somewhere quieter.** Moving the sentence into a tooltip, a title bar, or a settings card would be a claim made by a surface the doctor is not reading at the moment of consent, which is worse than the absence recorded here.
- **No change to the egress.** Same vendor, socket, region, minting route, session cap and audit pair. Nothing about what leaves the browser moves.
