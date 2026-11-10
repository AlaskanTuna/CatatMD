# Decision Records

Scope decisions that change what CatatMD does are recorded here rather than silently applied. Records capture choices where reasoning matters more than the diff. Implementation choices belong in [TRD](../TRD.md) Section 19. An open implementation question stays there until it is answered.

A decision record has an ID, a date, a status, the decision in one sentence, the reasoning, and what it does not license. Entries are not rewritten; a reversal is a new record.

Write one when you make a choice a later developer would question. Record it in the same pull request as the change. To add one, copy [template.md](template.md) and use the next D-number.

| ID                                                                                   | Decision                                                                      | Status                                                        | Date       |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------- |
| [D-001](D-001-dictated-medication-capture.md)                                        | Dictated Medication Capture                                                   | Adopted. Amended 2026-09-10 three times, and 2026-10-06 twice | 2026-09-09 |
| [D-002](D-002-retire-the-curated-guideline-corpus-for-retrieval-only-citation.md)    | Retire The Curated Guideline Corpus For Retrieval-Only Citation               | Adopted                                                       | 2026-09-09 |
| [D-003](D-003-one-longer-provider-attempt-instead-of-two-short-ones.md)              | One Longer Provider Attempt Instead Of Two Short Ones                         | Adopted                                                       | 2026-09-09 |
| [D-004](D-004-ambient-capture-stops-naming-where-the-audio-goes.md)                  | Ambient Capture Stops Naming Where The Audio Goes                             | Adopted                                                       | 2026-09-10 |
| [D-005](D-005-the-browser-stops-depending-on-the-analyze-response.md)                | The Browser Stops Depending On The Analyze Response                           | Adopted                                                       | 2026-09-11 |
| [D-006](D-006-the-printed-report-is-a-separate-artefact-from-the-ehr-export.md)      | The Printed Report Is A Separate Artefact From The EHR Export                 | Adopted                                                       | 2026-09-20 |
| [D-007](D-007-a-new-consultation-opens-in-ambient-capture.md)                        | A New Consultation Opens In Ambient Capture                                   | Adopted                                                       | 2026-09-21 |
| [D-008](D-008-two-way-machine-translation-for-urdu-and-bengali-speakers.md)          | Two-Way Machine Translation For Urdu And Bengali Speakers                     | Adopted                                                       | 2026-09-28 |
| [D-009](D-009-which-language-takes-which-capture-path-and-what-is-not-supported.md)  | Which Language Takes Which Capture Path, And What Is Not Supported            | Adopted                                                       | 2026-10-07 |
| [D-010](D-010-ambient-capture-survives-a-dropped-connection-not-a-reload.md)         | Ambient Capture Survives A Dropped Connection, Not A Reload                   | Adopted                                                       | 2026-10-08 |
| [D-011](D-011-a-name-in-chinese-or-tamil-script-is-found-by-its-cue.md)              | A Name In Chinese Or Tamil Script Is Found By Its Cue                         | Adopted                                                       | 2026-10-08 |
| [D-012](D-012-one-sore-throat-score-from-nag-s-own-table-completed-by-the-doctor.md) | One Sore-Throat Score, From NAG's Own Table, Completed By The Doctor          | Adopted                                                       | 2026-10-08 |
| [D-013](D-013-soniox-stays-elevenlabs-scribe-v2-realtime-is-not-adopted.md)          | Soniox Stays; ElevenLabs Scribe v2 Realtime Is Not Adopted                    | Adopted                                                       | 2026-10-15 |
| [D-014](D-014-ambient-consultations-are-refined-after-stop-with-batch-scribe-v2.md)  | Ambient Consultations Are Refined After Stop With Batch `scribe_v2`           | Adopted                                                       | 2026-10-16 |
| [D-015](D-015-live-capture-moves-to-the-qwen-realtime-relay-on-alibaba-singapore.md) | Live Capture Moves To The Qwen3-ASR Realtime Relay On Alibaba Cloud Singapore | Accepted, pending the owner's approval of the pull request    | 2026-11-10 |
