# D-008: Two-Way Machine Translation For Urdu And Bengali Speakers

|             |                                                                           |
| ----------- | ------------------------------------------------------------------------- |
| **Date**    | 2026-09-28                                                                |
| **Status**  | Adopted                                                                   |
| **Issues**  | #389, #390, #391, #392, #393                                              |
| **Follows** | `../TRD.md` §20.10's grant, extended the same day to translation (§20.12) |

## Decision

Ambient capture can pair English with Urdu or Bengali, in both directions.

- **On Screen.** The patient's words show with English beneath, and the doctor's English shows with the patient's language beneath.
- **What The Product Keeps.** The English is what it stores, analyses and raises red flags from.

## What The Owner Decided, And What Each Costs

| Decision                                                           | What It Costs                                                                                                                                                           |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Both Directions**, so each side can read the other               | The doctor's words reach the patient through machine translation too, and nothing measures its quality on real speech                                                   |
| **The Original Words Are Kept** with each turn, beside the English | More PHI at rest, in a script no detector reads. It sits in the transcript column, so erasure reaches it, and nothing sends it to a model                               |
| **Consent Stays English Only**, naming machine translation         | A patient who reads neither English nor Malay cannot read what the doctor asserts they agreed to. The tick records the doctor's assertion, which is all it ever records |

## What Was Decided With It

- **Soniox Stays.** Research across Soniox, the hyperscalers, and specialist and open models found it the only candidate that adds no egress. Qwen LiveTranslate, with a Singapore endpoint, is the follow-up pilot (§20.12).
- **Roles Come From The Spoken Language.** English is drafted as the doctor and anything else as the patient, with no labelling pass. Labels stay unreviewed, so the red-flag engine keeps its fail-open reading.
- **The Audit Trail Records Nothing About Translation.** With two languages on offer, even a boolean names a likely national origin, and the trail outlives erasure.

## What This Decision Does Not License

- **No Claim Of Interpreting.** This is machine translation. NHS England advises against it replacing an interpreter for consent and high-stakes content, and the product says "machine-translated" wherever it shows the result.
- **No Other Language Pair** without its own measurement and its own grant row. That includes Punjabi, and Malay as the doctor's half of the pair.
- **No Unreadable Script In Model Input.** Only Latin script reaches `turn.text`, and the `SCRIPT` detector (#391) tokenises Bengali, Arabic and Devanagari at the gate whatever a client sends. Chinese and Tamil are the exception; see the amendment below.
- **No Claim About Accuracy.** #389 measured the wire and the red-flag engine on synthetic voices, never recognition or translation quality on real speech.
- **Who Authorised It:** @Andersonnn7788, 2026-09-28, for the scope above and nothing else.

## Amended 06/10/26: Mandarin And Tamil, Unmeasured

The same two-way translation now pairs English with Mandarin (`zh`) or Tamil (`ta`), for Mandarin- and Tamil-speaking patients (#385).

|                                        |                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What It Adds**                       | Two rows in `translatedAmbientConfig`, each hinting `[language, 'en', 'ms']` with diarisation off and endpoint detection on, exactly as Urdu and Bengali                                                                                                                                                                                                                                                      |
| **What It Skips**                      | The measurement this decision asks of every new pair. Neither language has been streamed through Soniox's translation here, and red-flag recall on their translated English is unknown. The grant comes ahead of the measurement and is recorded as that                                                                                                                                                      |
| **What Differs From Urdu And Bengali** | The gate's `SCRIPT` detector does not read Chinese or Tamil, because the untranslated Auto-detect path relies on both reaching the note. On a translated session the script guard in `../../frontend/src/audio/live/bilingual.ts`, now an allowlist of Latin script, keeps them out of `turn.text`. It runs in the browser, so a client other than the SPA, or a doctor's edit to the transcript, bypasses it |
| **Names**                              | Mandarin translation spells a name in Pinyin ("Chen", not "Tan"), so thirty common Pinyin surnames join the gazetteer, leaving out any that are also an English or Malay word                                                                                                                                                                                                                                 |
| **Cantonese**                          | Not a pair of its own. Chinese-script speech the recogniser tags as anything but `zh` is still kept out of `turn.text`: its English is used if a translation arrives, and otherwise the turn reads as untranslated                                                                                                                                                                                            |
| **Who Authorised It**                  | @AlaskanTuna, 2026-10-06, for these two languages on ambient capture and nothing else                                                                                                                                                                                                                                                                                                                         |
