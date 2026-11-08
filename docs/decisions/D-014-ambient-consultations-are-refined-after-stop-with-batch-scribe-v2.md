# D-014: Ambient Consultations Are Refined After Stop With Batch `scribe_v2`

|                |                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| **Date**       | 2026-10-16                                                                                                   |
| **Status**     | Adopted                                                                                                      |
| **Issues**     | #436                                                                                                         |
| **Supersedes** | D-013's "No ElevenLabs audio egress of any kind", for this one surface only. Everything else in D-013 stands |

## Decision

- **Soniox Is Unchanged During Capture.** It still streams the live panes and the live red-flag hints.
- **After Stop, On An Untranslated Ambient Consultation,** the whole recording is re-transcribed with batch ElevenLabs `scribe_v2`, and that is the transcript the doctor reviews.
- **On Any Failure The Live Soniox Transcript Is Used,** with a notice, never silently.
- **Default On When Configured,** with a per-device opt-out.
- **Decided By @Andersonnn7788 On 2026-10-16** (option b), together with the audio-egress sign-off. Mechanism and controls: `../TRD.md` §20.14.
- **Production Stays Inert** until the owner confirms the vendor account's "use data to improve models" setting is off and the Render account holder sets `ELEVENLABS_API_KEY`.
- **Refinement Depends On #435.** Batch writes identifiers as words, which the current de-identification gate cannot see (§20.13 measured the synthetic IC number returned as words in 8 of 8 results), so this change must not merge before #435.

## Why

| Finding                                                              | Consequence                                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Batch `scribe_v2` diarised and read the four languages well (§20.13) | It meets the doctor-and-patient requirement that the realtime model failed                              |
| Non-streaming removes the realtime failures D-013 recorded           | Soniox stays live, so nothing the doctor sees during capture changes                                    |
| A relay through `/api/*` hits Vercel's 120 s time-to-first-byte cap  | The upload goes browser-direct under a single-use token the API mints and audits                        |
| Any failure falls back to the live transcript                        | Refinement can only improve the transcript the doctor reviews, never leave the consultation without one |

## What This Decision Does Not License

- **No Realtime Use** of ElevenLabs.
- **No Dictation** and **no translated sessions** on this path.
- **No `scribe_v2_medical`.**
- **No Relay Through `/api/*`.**
- **No Panel Disclosure Naming The Vendor.** The switch and the busy label stay vendor-neutral (D-004).
- **No Setting Of Any Key.** That belongs to the Render account holder, after the retention setting is confirmed.
- **No claim that retention, the token's single use, or long-recording behaviour is measured.** The list is in `../TRD.md` §20.14.
- **What Reverses It:** a failed measurement gate, a vendor retention answer the owner will not accept, or the owner withdrawing the sign-off. Unsetting `ELEVENLABS_API_KEY` switches it off without a deploy.
