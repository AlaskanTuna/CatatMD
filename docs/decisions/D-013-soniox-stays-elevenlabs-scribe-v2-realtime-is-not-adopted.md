# D-013: Soniox Stays; ElevenLabs Scribe v2 Realtime Is Not Adopted

|                |            |
| -------------- | ---------- |
| **Date**       | 2026-10-15 |
| **Status**     | Adopted    |
| **Issues**     | None       |
| **Supersedes** | None       |

## Decision

Speech recognition stays on Soniox for ambient, dictation and translated capture, and this decision is about the **realtime** model only. Scribe v2 Realtime was measured on English, Malay, Mandarin and Tamil with code-switching, and does not diarise, drops a speaker under overlap, and fabricates or rewrites short turns when tuned to commit per turn. Numbers and method: `../TRD.md` §20.13.

Batch `scribe_v2` is not decided here: it diarised and read the four languages well, and is an open owner question (`../TRD.md` §20.13).

## Why

| Finding                                                             | Consequence                                                                             |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| No diarisation, in any language                                     | Ambient capture is a doctor and a patient, so the hard requirement fails                |
| Drops a speaker under overlap                                       | A lost doctor's question changes what the red-flag engine reads                         |
| Fabricates or rewrites short turns                                  | "Sore throat?" became "blocked nose", and "no difficulty breathing" became its opposite |
| Clean-turn accuracy better on Malay and Mandarin but worse on Tamil | Mixed, not the decisive win the motive needed                                           |

## What This Decision Does Not License

- **No ElevenLabs Audio Egress Of Any Kind.** The evaluation sent synthetic audio only.
- **Not A Rejection Of Batch `scribe_v2`.** It is measured and open, not adopted.
- **No Claim That Soniox Is More Accurate Everywhere.** Scribe Realtime read clean Malay and Mandarin better, and Soniox flipped a symptom to its denial in 3 of 12 Malay-with-English results.
- **No Claim About Soniox Accuracy On Real Speech.** §20.10's unmeasured table still applies.
- **What Reverses It:** a realtime model with documented and measured diarisation that reads English, Malay, Mandarin and Tamil without dropping or rewriting turns, taken through a fresh owner sign-off.
