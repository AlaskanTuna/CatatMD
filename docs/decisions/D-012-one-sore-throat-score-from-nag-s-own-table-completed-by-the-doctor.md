# D-012: One Sore-Throat Score, From NAG's Own Table, Completed By The Doctor

|                |            |
| -------------- | ---------- |
| **Date**       | 2026-10-08 |
| **Status**     | Adopted    |
| **Issues**     | #221       |
| **Supersedes** | None       |

## Decision

A consultation on the respiratory profile that plainly reports a sore throat carries the Modified Centor score on its analysis, rendered on the review page as a card the doctor completes. **Nothing is selected for the doctor.** Where the transcript plainly established an item, the card shows the sentence it heard and offers that answer for one tap.

| Item                                   | Points   | Read From The Transcript                     |
| -------------------------------------- | -------- | -------------------------------------------- |
| Cough absent                           | 1        | A plain statement, or a direct denial        |
| Swollen and tender anterior neck nodes | 1        | Both words in one clause, or a direct denial |
| Temperature above 38 °C                | 1        | A stated reading, never a cut-off or advice  |
| Tonsillar exudate, or severe swelling  | 1        | A plain statement, or a direct denial        |
| Age 15 to 44, or 45 or older           | 0, or −1 | Never; the doctor answers                    |

- **Defined by MOH's National Antimicrobial Guideline 2024, §A10,** read from the guideline's own table on 08/10/26, restated in our own words because the source is all rights reserved. Cited to that document alone.
- **Versioned** as `SORE_THROAT_SCORE_VERSION` in `../../backend/src/calculators/sore-throat-score.ts`, the only file allowed to name the score, and registered in the analysis stamp.

## Why One Score, And Why NAG's

- **Both sources tabulate the same instrument.** Abdullah et al. 2024 call it McIsaac and differ only at its edges: 38 °C itself scores, age 45 itself does not, and the node criterion is "tender" without "swollen". Two near-identical forms would ask the doctor the same questions twice.
- **NAG is the national guideline** and the corpus's primary anchor (`../TRD.md` §11).
- **The earlier corpus summary was wrong.** It recorded NAG's score as four criteria with no age term and "fever by history". The guideline's table has five rows, including age, and a measured temperature.

## Why Suggestions, And Why They Read Narrowly

Two clinical-safety review rounds each found new free-text phrasings that pre-selected a wrong answer, so the card offers rather than selects: a residual misread now needs the doctor to read the sentence and tap it. The red-flag engine over-fires on purpose, because a missed flag is the worse error; here a wrong answer offered is the worse error, so the reader is its own. A sentence counts only when it is:

- **A statement, not a question.** Speaker labels are never trusted to read "Any cough?" / "No.", and a turn answered by a bare "No." is read as a question even unpunctuated.
- **About this patient, now.** Not someone else, not last month, and not advice about what to watch for.
- **Plain or directly denied.** A clause with any negator states nothing, nor does a list after a denial ("no fever, cough or cold"). A denial must govern the finding and end its clause, so "no cough at night" offers nothing, while "No fever, coughing a lot" reads as a cough.
- **Uncontradicted.** Said both ways, the item is left for the doctor.

The evidence shown is the whole sentence, so the doctor can see what was read.

## What This Decision Does Not License

- **No interpretation of the total.** No band, likelihood, threshold or treatment line, on screen or in the note. NAG and Abdullah read the total against different cut-offs; the card links to the source instead.
- **No writing the score into the note or saving it,** and no printing it. Saving is a follow-up that would need its own audit and erasure story.
- **No paediatric band.** The product's scope is adults.
- **No further scores** until the jurisdiction work (#220) settles which guideline families are in force.
