# D-009: Which Language Takes Which Capture Path, And What Is Not Supported

|            |                                                                       |
| ---------- | --------------------------------------------------------------------- |
| **Date**   | 2026-10-07                                                            |
| **Status** | Adopted                                                               |
| **Issues** | #218, #418                                                            |
| **Builds** | §20.10 "Measured 07/10/26" in `../TRD.md`, which supplies the numbers |

## Decision

Each language goes to the path below, and Cantonese is stated as not supported on the Record tab rather than left to fail quietly.

| Language               | Path                                                    | Measured On That Path (Synthetic Voices, `../TRD.md` §20.10)              |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| English, Manglish      | Ambient Auto-Detect, or on-device press-to-record       | English measured elsewhere (§20.1); not re-run here                       |
| Malay                  | Ambient Auto-Detect, or the ILMU relay                  | 9.4% WER                                                                  |
| Mandarin               | Ambient Auto-Detect, or translated with English (D-008) | 6.5% CER                                                                  |
| Tamil                  | Ambient Auto-Detect, or translated with English (D-008) | 8.2% WER                                                                  |
| Urdu, Bengali          | Translated with English only (D-008)                    | Wire and red flags only (#389)                                            |
| **Cantonese**          | **Not Supported.** The Record tab says so               | 62.5% CER, recognised as Mandarin; the real-time API refuses a `yue` hint |
| Other Chinese dialects | Not supported, unmeasured                               | None                                                                      |

## Why

- **Tamil Changed Sides.** #218's 05/09/26 run found Tamil unusable (71.8% WER) on `qwen3-asr-flash`, which does not list it. Ambient capture moved to Soniox on 06/09/26 (§20.10), and Tamil on the production config now reads at 8.2%. The vendor fork #218 asked for is answered by the provider already in place, so no second vendor is needed for it.
- **Cantonese Did Not.** Synthetic Cantonese came back as Mandarin-script text with the clinical content wrong ("我可做生意了" for "我咳咗三日喇"). Part of the 62.5% is the traditional-to-simplified script swap, but not most of it. The vendor's dialect support is not reachable from the real-time endpoint without the hint it refuses.

## What This Decision Does Not License

- **No General Accuracy Claim.** Every number above is synthetic text-to-speech, two voices, six read lines per language. Real consulting-room speech, Malaysian varieties of Tamil and Mandarin, and code-switching remain unmeasured.
- **No New Egress, Surface Or Language Pair.** This records where existing paths already send each language. Translation pairs stay governed by D-008.
- **No Claim That Mandarin Or Tamil Is De-Identified.** On Auto-Detect, a name spoken in either reaches the model in its own script. That gap is #418, pinned as known-bad in `../../backend/src/deid/deid.test.ts`, and stays open until it is decided.
- **Who Recorded It:** @AlaskanTuna's issue triage of 2026-10-07, stating routing already in production plus one sentence of on-screen copy.
