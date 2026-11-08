# D-001: Dictated Medication Capture

|                |                                                               |
| -------------- | ------------------------------------------------------------- |
| **Date**       | 2026-09-09                                                    |
| **Status**     | Adopted. Amended 2026-09-10 three times, and 2026-10-06 twice |
| **Issues**     | #310, #311, #312, #313, #355, #356, #357, #363                |
| **Supersedes** | Nothing. Clarifies `../PRD.md` Section 6                      |

## Decision

Capturing a medication **the doctor dictates** is inside the scope boundary. Generating, suggesting, selecting, or validating a medication remains outside it.

## The Distinction It Turns On

The hinge is the one Section 10 already applies to `diagnosis`: the system may record what the practitioner decided, and may not produce the decision. A dictated prescription is the practitioner deciding out loud, so the system's role is transcription and structuring.

Section 11's intended-purpose statement already describes exactly this, and is **not amended by this decision**: CatatMD "structures a record of what the practitioner said and did", and is "not intended to ... recommend or select treatment". Recording a treatment the practitioner selected is not selecting one.

## Why The Wording Needed Fixing

**"Prescribing" was carrying two meanings in one word**, and the two halves of the document disagreed about which it meant.

| Where        | What It Said                                                    | Reading                                                                           |
| ------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Section 11   | "not intended to recommend or select treatment"                 | Unambiguous, and untouched here                                                   |
| Section 6    | "Diagnosis, triage decisions, prescribing"                      | Ambiguous, and read literally it forbade transcribing a sentence the doctor spoke |
| `../DPIA.md` | "does not diagnose, prescribe, or approve a note automatically" | The word "automatically" was already doing the work                               |

**The literal reading was already untrue in the shipped product.** `medicationsDispensed` in the operational block (Section 9, CAP-1) has been populated by extraction since that block shipped: drugs the doctor named, each carrying a verbatim transcript span, resolving to `NOT_ASSESSED` when the doctor said nothing. This decision does not widen scope so much as make the written boundary match behaviour that already exists and was already reviewed.

## What Changes In Practice

- A structured `prescriptions` record, authored by the doctor and confirmed by the doctor, separate from the model-extracted `medicationsDispensed`
- A microphone on the review page, **streaming by default since 2026-09-10, with on-device recognition as the fallback and the floor**. Both amendments below record how that arrived and what it cost
- A versioned drug-name lexicon used to offer spelling candidates for names the recogniser garbled

## Amended 2026-09-10: The Transport, Not The Boundary

**What changed is how the words are recognised. What did not change is anything this decision actually decided.** Recording a drug the doctor spoke is still extraction, generating or selecting one is still outside scope, and every row of the table below stands unmoved. The amendment reaches one bullet above, whose original wording, "on device only, so no new audio egress is created", is now false rather than merely narrow.

|                            |                                                                                                                                                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What is added**          | Streaming recognition on the same Soniox socket ambient capture uses, browser-direct, US region (`../TRD.md` §20.10, issues #356 and #357)                                                                                                    |
| **What stays the default** | On-device Whisper. A doctor who changes nothing sends no audio anywhere, and no consent tick is offered on that path. **Superseded the same day, see the next amendment**                                                                     |
| **What stays the floor**   | On-device is also the fallback. Key unset, consent withheld, socket dropped, or hardware below the floor all land back on it or on typing, never silently on the cloud. **The hardware clause narrowed the same day, see the next amendment** |
| **What gates it**          | The two-control consent rule in `../../.claude/rules/security.md`, unchanged and now binding on the review page: a standing device preference plus a per-consultation tick that dies with the component                                       |
| **Who authorised it**      | @Andersonnn7788, 2026-09-10, scoped to prescription dictation on the review page and nothing else                                                                                                                                             |

**Why the original wording was right when it was written.** #313 chose on-device deliberately, reasoning that the review page had no consent surface and that rebuilding one in a third place was worse than removing the question. That reasoning is not overturned so much as paid for: the gate is now built there rather than avoided. What forced the question is measurement in `../TRD.md` §20: on the 83.4 s reference recording the WebGPU path stamped a real-time factor of 0.89, against 2.14 for the WASM q8 baseline, and §20.1 puts browser WASM generally at 1.5 to 3.0. Anything at or above 1.0 cannot keep pace with speech. Words appearing as the doctor speaks was therefore never reachable on the fallback path most clinic hardware runs, and only marginally reachable on the best of them.

## Amended 2026-09-10: Streaming Becomes The Default, At The Cost Of One Control

**The transport amendment above left on-device as the default. This one moves it, and what it costs is a control rather than a boundary.** Nothing about the egress changes: same vendor, socket, region and minting route, and the same sign-off covers it. What changes is what a doctor who touches nothing gets, and therefore how many deliberate acts stand between a patient's voice and the United States.

|                                 |                                                                                                                                                                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**                | `DEFAULT_AUDIO_SETTINGS.dictationEngine` is `'streaming'`. Only the default moved. The on-device path is untouched and still selectable in the Audio dialog                                                                                                                  |
| **What it costs**               | The standing device preference now ships already set to send. A preference the doctor has not moved is not a choice they made, so this surface rests on **one defaulted preference plus one deliberate tick**, not on two chosen controls                                    |
| **What still gates it**         | The per-consultation tick, unchanged: plain `useState`, remembered by nothing, enforced in the start dispatcher rather than by a disabled button. **Nothing sends without it**                                                                                               |
| **What stays the floor**        | Every failure still lands on the device or on typing. Key unset, config unreachable, consent withheld, mint refused, socket dropped: no path falls through to the cloud, and none falls through silently                                                                     |
| **What narrowed**               | The hardware floor no longer forces typing by default. A socket loads no weights, so a machine below the floor is now offered streaming, and typing is what it falls to only when consent is withheld or the socket is unavailable                                           |
| **What made it a real control** | Until #363 the preference was written only in `CapturePanel`, which renders only before a transcript exists, while the card it governs needs one. The switch and the microphone could never be on screen together, so the standing half was unreachable from its own surface |
| **Who authorised it**           | @Andersonnn7788, 2026-09-10, scoped to prescription dictation on the review page and nothing else                                                                                                                                                                            |

**This is the same shape as #228, and the difference is the half worth reading.** #228 collapsed the two controls into one remembered setting and left the interface claiming each patient was asked while nothing asked; #254 undid it. Here the per-consultation half is untouched, still asked once per consultation, and still the only thing that opens the socket, so the failure #228 had, a remembered agreement applying to the patient after the consenting one, is not reintroduced. What is genuinely weaker is defence in depth: one of the two acts is now a default rather than a decision, and a doctor who never opens the Audio dialog is offered the cross-border path on every consultation. That is recorded here rather than argued away, because the honest count of live controls on this surface is one.

**Why the default moved at all.** The measurement in the amendment above is the whole argument. A real-time factor of 0.89 on the best path and 2.14 on the fallback most clinic hardware runs, against a threshold of 1.0 for keeping pace with speech, means an on-device default is one most doctors would have to leave. A default nobody keeps and a preference nobody could reach, which is what #363 also found, together made the on-device default a claim the product was making rather than a protection it was giving.

## Amended 2026-09-10: The Tick Goes, And The Surface Becomes A Theatre

**The two amendments above cost a control each by degrees. This one removes the last of them outright, on the owner's instruction, and the honest count of live consent controls on this surface is now zero.** Nothing about the egress changes: same vendor, socket, region and minting route, and the same sign-off covers it.

|                             |                                                                                                                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**            | The residency disclosure and the per-consultation tick were removed from prescription dictation. Pressing Dictate opens the socket                                                                   |
| **What it costs**           | Every deliberate consent act on this surface. A doctor who touches nothing sends a patient's voice to a United States endpoint on one press, with nothing on screen saying so                        |
| **What still gates it**     | Nothing on this surface. `SONIOX_API_KEY` unset still fails closed to on-device, and the device preference is still selectable, but neither is a consent control                                     |
| **What did not weaken**     | The audit trail. `createLiveSession` now takes `consent` as an argument, dictation passes none, and the row records `consentAsserted: false`. A client that collects no agreement must not claim one |
| **What ambient keeps**      | Both halves, untouched. `LiveSessionRequestSchema` still refuses an ambient body without `consent: true`, and that mint still records `true`                                                         |
| **What else moved with it** | The compose surface became a full-viewport theatre (#365). One dictation now yields several prescriptions, each with its own sig re-parsed from its own stretch of text, confirmed together          |
| **Who authorised it**       | @Andersonnn7788, 2026-09-10, scoped to prescription dictation on the review page and nothing else                                                                                                    |

**The reason given was usability, and it is recorded as that rather than dressed up.** The disclosure and the tick sat between Dictate and the box on a card already too small for its contents, and the owner asked for them gone. No measurement supports the removal and none was claimed.

**What is genuinely lost is worth naming precisely.** MMC 003/2023 cl.18 wants consent specific to the purpose before capture, and the PDPA 2024 amendment makes voice biometric data requiring explicit consent. The interface no longer asks for either on this path. `../DPIA.md` carries that as a residual risk rather than a closed one, and the release gate for real data is unchanged: synthetic data only until the controller decides otherwise.

**What was deliberately not done, because it would have been the #228 failure again.** The tick was not folded into the device preference, and no remembered agreement was introduced. There is simply no agreement now, which is a smaller claim than a false one.

**One thing got stronger.** `consentAsserted` was the literal `true` in the audit type, so the route could not have recorded anything else even had it wanted to. It is a boolean now, derived as `mode === 'ambient' && consent === true`, which is what lets the trail tell an asked patient from an unasked one. Derived rather than read from the body on purpose: the schema constrains `consent` on ambient only, so an older SPA reaching a newer API during a deploy skew could otherwise assert an agreement on a surface that no longer asks for one.

## Amended 2026-10-06: The Engine Choice Goes

**The last device-level choice on this surface is removed, on the owner's instruction.** Nothing about the egress changes: same vendor, socket, region and minting route.

|                       |                                                                                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What changed**      | The Prescription Dictation section left the Audio dialog, the dialog's mount in the dictation theatre went with it, and `AudioSettings.dictationEngine` no longer exists                        |
| **What runs now**     | Streaming, always, falling back to this device when streaming is unavailable or unreachable, with the notice that says so. A stored `dictationEngine` is dropped on load                        |
| **What it costs**     | The doctor's last way to keep dictation on this device by choice. A device that had chosen on-device now streams. This is the owner's call, recorded here rather than argued away               |
| **What still holds**  | Every failure lands on this device or on typing, never silently on the cloud: key unset, config unreachable, mint refused, socket dropped. The audit row still records `consentAsserted: false` |
| **Who authorised it** | @AlaskanTuna, 2026-10-06, scoped to prescription dictation on the review page                                                                                                                   |

## Amended 2026-10-06: One Read, One Table Of Lines

**A doctor dictated three drugs and the theatre found two.** "Amoxicillin 500 mg, paracetamol 350 mg, antibiotic 200 mg, all of them 2 times a day" offered amoxicillin and paracetamol, folded "antibiotic 200 mg" into paracetamol's quote, and gave "2 times a day" to paracetamol alone. Every drug also needed its own Accept, even when it was heard exactly.

**The parse now reads the whole dictation into lines, one per drug, and the theatre shows them as one table.** Still deterministic, still no model, and still nothing stored before Confirm. Three decisions came with it, each authorised by @AlaskanTuna on 2026-10-06.

| Decision                                                 | What it means                                                                                                                                                                                                                                                                                                                    | Why it stays inside this decision                                                                                                                                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1. An exact name starts ticked**                       | A name heard exactly as the lexicon spells it is ticked, so Confirm accepts it. Never ticked for the doctor: a near-match, a single agent inside a combination also heard, or a drug said in one breath with another. A near-match holds Confirm until the doctor ticks it, picks another reading, types a name or leaves it out | Nothing is substituted: the name on the line is the name said. Confirm is still the act that records it, and a reading the matcher had to guess at can be neither saved nor dropped without the doctor |
| **2. A shared clause fills every line, except the dose** | "All of them", "both" or "semua", followed by a frequency, duration, route or food timing, fills that field on every line that left it unsaid. Each filled field names the clause it came from, and the clause travels in `dictated`                                                                                             | A dose belongs to one drug. A shared clause that carries a dose becomes a line of its own instead, so it is neither spread nor dropped                                                                 |
| **3. A line nobody named holds Confirm**                 | A line with a sig but no recognised name, such as "antibiotic 200 mg" or a brand, is shown with a dashed outline and an empty drug field. Confirm stays held until the doctor names it or unticks it                                                                                                                             | No drug is proposed for it. Generic names are offered as typing suggestions only, and a typed name carries no `lexiconId`                                                                              |

**Where a line ends is a heuristic, and it shows its working.** Each line quotes the words it was read from, and the TRD lists the rules. The clinical review on 2026-10-06 reproduced three ways a dose reached the wrong drug, each fixed and pinned by a test:

| Dictation                                       | Was                                       | Now                                                                 |
| ----------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| "Paracetamol, Brufen, 400 mg three times a day" | 400 mg on paracetamol, ticked             | A line for "Brufen, 400 mg", unnamed; paracetamol's dose left empty |
| "Cefuroxime, cefixime 200 mg twice a day"       | Merged as one cefuroxime line with 200 mg | Two lines; the look-alike is a near-match that needs a decision     |
| "amoxicillin three times a day 1 g paracetamol" | Both ticked, 1 g on amoxicillin           | Neither ticked, because whose dose it is is a guess                 |

**A dictation benchmark on 2026-10-07 found three more,** running accented synthetic speech through the production recogniser. Each is fixed and pinned by a test:

| Dictation, as the recogniser wrote it                                | Was                                                                                    | Now                                                                                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| "Paracetamol 1 g, 4 times a day. Amoxicillin 500 mg, 3 times a day." | Paracetamol's frequency on amoxicillin, ticked; amoxicillin's an unnamed line          | Each frequency on its own drug. "day. Amoxicillin" also reads as doxycycline, and that reading no longer hides the full stop |
| "cetirizine 10 mg sekali sehari waktu malam"                         | Cetirizine empty and unticked, beside an amoxicillin-clavulanate line holding its dose | One cetirizine line, ticked. A reading of sig words alone is not a name                                                      |
| "Paracetamol three times a day, for 7 days Brufen 400 mg"            | 400 mg on paracetamol, ticked, and Brufen gone                                         | An unnamed line for "for 7 days Brufen 400 mg"; paracetamol's dose left empty                                                |

**One known gap stays.** A brand with no dose and no repeated field, as in "amoxicillin 500 mg, Panadol four times a day", still joins the line before it. That line's quote shows it.

**The box is read again about 0.6 s after the doctor stops editing it**, and the Check button is gone. Fields the doctor changed are kept across reads, keyed by drug rather than by offset. Confirm is held while the table is behind the text.

The two sections below describe the mechanism this replaces. They stay as the history of why a line has the boundaries it has.

## The Per-Drug Sig, And Why It Is Not The Whole Phrase

_Superseded 2026-10-06 by One Read, One Table Of Lines above._

One dictation naming four drugs gets one sig back from the parse endpoint, because `parseSig` reads a phrase and not a list. Attaching that sig to every accepted drug would put paracetamol's 500 mg on cetirizine, which is the wrong-dose failure the Not Built table below exists to prevent.

The theatre instead re-sends each accepted drug's own stretch of text to the same endpoint, bounded by the next drug name the matcher heard. Three properties make it safe to rely on:

- **It shows its working.** The slice is printed on the row it filled, so a bad boundary is visible rather than hidden inside a number.
- **It fails toward the empty field.** The slice starts at the drug's own name, so a dose spoken before the name ("500 mg of amoxicillin") is lost and the field stays empty. Starting earlier would catch it and would also open drug two's slice with drug one's trailing sig. An empty field asks the doctor a question; an inherited dose answers one they never asked.
- **It is still a draft.** Every field remains editable and nothing is stored until the doctor confirms.

It stays a client-side heuristic against an unchanged endpoint. The endpoint is deterministic, stores nothing, writes no audit row and allows thirty calls a minute, so the extra calls buy correctness at no boundary cost.

## The Stretch No Row Claims

_Superseded 2026-10-06 by One Read, One Table Of Lines above. The #369 dictation now reads as two lines, the brand left unnamed for the doctor._

**Bounding a slice at the next drug name is only half a boundary, and the missing half lost a drug.** Reported 2026-09-10 (#369): a dictation naming Dextromethorphan and then Strepsils recorded one prescription. Strepsils is a brand, brands are outside the lexicon by the Not Built table below, so the matcher offered a single candidate. With no second name to bound it, the first slice ran to the end of the utterance, and the row's quote presented the second drug's entire sig as evidence for fields none of that text supplied.

Three things were wrong at once, and only the third is new.

| Symptom                                               | Standing                                            |
| ----------------------------------------------------- | --------------------------------------------------- |
| The brand raised no candidate                         | Correct, and unchanged. Generic names only          |
| The doctor had to type the second drug by hand        | Correct, and unchanged. The system proposes no drug |
| Nothing said a second drug had been heard and dropped | The defect. Fixed                                   |

**The second boundary is the sig's own reach.** `parseSigWithSpan` reports the offset past which no field was read, the row's quote is cut there, and every stretch left over is shown under "Not Claimed By Any Row" for the doctor to add or ignore.

- **A gap is evidence, never a proposal.** It is quoted verbatim and no drug name is read out of it. The reason a gap is a gap is that the matcher recognised no name in it, so naming one would be the substitution the Not Built table bans.
- **A row staged from a gap does get its sig parsed**, because a gap has known bounds and there is a right answer to what dose was said inside it. Add By Hand, which has only the whole box, still does not.
- **It fails toward showing too much.** Where the first drug's half omits a field the second supplies, the parse reads across the boundary and the gap starts late. That is a visible wrong split, which is the direction the slice already chooses.

## What This Decision Does Not License

Each of these is a safety boundary in its own right, and none is a deferred feature. **All of them were re-read on 2026-09-10 and all stand unchanged**, but one deserves an explicit answer rather than silence.

**Streaming audio to a recogniser is not "transmission of a prescription anywhere".** That row bans sending a prescription to a pharmacy, printing it as a legal script, or sharing it. What crosses the socket is speech on its way to becoming text. The structured prescription it becomes still goes nowhere but this database, still behind the doctor's confirmation. The row is about the artefact's destination, not the recogniser's. Separately, "brand names in the lexicon" is unaffected: the recognition vocabulary primes some brands because a patient says "Panadol", and that list is not the lexicon, which still holds generics only and is still the only thing a candidate can be drawn from.

| Not Built                                              | Why                                                                                                                    |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Dose validation or maximum-dose checking               | Clinical decision support, and a different intended purpose                                                            |
| Interaction or allergy checking                        | The same, and it would require drug data this corpus deliberately does not hold                                        |
| Drug suggestion or selection                           | The system never proposes a drug the doctor did not say                                                                |
| Automatic substitution of a drug name                  | Look-alike sound-alike confusion is a leading medication-error class. A candidate is offered; the doctor accepts it    |
| Pre-filling a prescription from `medicationsDispensed` | That field is model-extracted. Seeding from it would turn a mis-extraction into a prescription behind one confirmation |
| Transmission of a prescription anywhere                | Nothing is sent to a pharmacy, printed as a legal script, or shared                                                    |
| Brand names in the lexicon                             | Generic names only                                                                                                     |

## Reasoning Recorded Against Later Drift

**The feature is deterministic end to end.** No LLM participates: the sig parser is regex, the drug-name matcher is phonetic plus orthographic distance against a static versioned list. This is not incidental. It keeps the capability out of the "adaptive logic" framing that separates a documentation aid from decision support, and it matches the existing posture that patient safety must not depend on model behaviour.

**The lexicon is a spelling aid, not a formulary.** It holds names and synonyms, and no dose, indication, or recommendation data. The ingested CPG chunks draw the identical line for themselves: "This prototype does not encode drug choice, dose, duration, or treatment thresholds."

**The confirm step is the control.** Published guidance on speech recognition in medication documentation names selection from a list, plus prescriber review before submission, as the mitigations for exactly this failure mode. `../TRD.md` Section 20.7 reached the same place independently for transcript corrections: "a proposal on screen, never an automatic edit, and never a rewrite of stored text."
