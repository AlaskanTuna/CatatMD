# User Guide

This guide is for a GP documenting an adult consultation for acute cough, sore throat, or other upper respiratory symptoms, and anyone trying the live guided tour. CatatMD creates a reviewable note. The doctor checks, edits, and approves it.

## Before You Start

1. On the landing page, select `Try the Demo` to open sign-in.
2. Select `Sign In as Guest` if it is available. Otherwise enter `Email` and `Password`, then select `Sign In`. To create an account, select `Create an account instead`, enter `Name`, `Email`, and `Password`, then select `Create Account`.
3. Use synthetic patient details, transcripts, audio, and prescription instructions only.

**Notes:** Guest access uses one shared demo account. Other guest users can see changes made to its records. Guest access depends on the server configuration and a seeded account. Use synthetic information only.

## Patients

1. Open `Patients` to find a record. Search with `Search by patient name` and use `Filter by visit history` to choose `All Patients`, `Has Visits`, or `No Visits`.
2. To register someone, select `Register Patient`. Enter the required `Name`; add `NRIC`, `Age`, and `Gender` when available. Select `Register Patient` to save.
3. Open a patient name to view `Consultation History`. Select `Start Consultation` to begin a visit for that patient.

**Notes:** A name is the only required patient field. The profile shows the recorded NRIC, age, gender, and visits.

## Starting a Consultation

1. From `Consultations`, select `New Consultation`. Choose `New Patient` to register first, or `Existing Patient` to search and select a record. You can also start from a patient's profile with `Start Consultation`.
2. Before adding a transcript, open `Consultation Settings`. Choose `Ambient` or `Press To Record` under `Capture Mode`. Choose `SOAP` or `Malaysian Medical Record` under `Clinical Note Layout`, then select `Save Settings`.
3. Choose an input:
   - **Guided Fixture:** On a page outside a consultation review, select the `?` button labelled `Take the guided tour`, then select `Start Tour`. The tour analyzes a bundled synthetic transcript in the current tab. It does not create a saved consultation. The regular capture tabs do not include a fixture picker.
   - **Paste:** Select `Paste`, enter the transcript with speaker labels such as `Doctor:` and `Patient:`, then select `Use This Transcript`.
   - **Transcript File:** Select `Upload` and choose a `.txt` or `.json` transcript file. The file is submitted to the consultation. To revise it, switch to `Paste`, edit the text, and select `Use This Transcript`.
   - **Record on This Device or Use an Audio File:** Select `Record`. In `Audio`, choose `On this device (whisper-small · WebGPU)`, which is the default. Select `Start Recording`, then `Stop and Transcribe`. Use `Pause Recording` and `Resume Recording` as needed. To transcribe an existing audio file, select `Use an Audio File` in the Record panel.
   - **Hosted Speech Recognition:** In `Audio`, choose `ILMU (Malaysia) · ilmu-asr-v4.2` and select `Save`. Read the disclosure, then tick `This patient has agreed to be recorded and transcribed, for this consultation only. This is not remembered.` before selecting `Start Recording` or `Use an Audio File`. The disclosure says: `This recording leaves this device: sent via our server to ILMU, processed in Malaysia.`
   - **Ambient Capture:** In `Consultation Settings`, choose `Ambient` before a transcript exists. Tick the agreement for this consultation, then select `Start Ambient Capture`. Check the live transcript and select `Stop and Finish` when done. If `Refine After Stop` is enabled, the full recording is sent again for transcription; select `Use Live Transcript` to keep the live text instead.
4. When the transcript is ready, select `Analyse Consultation`.

**Notes:**

- `Capture Mode` locks after a transcript exists. If Ambient is unavailable on the deployment, select `Use Press To Record`.
- Audio preferences apply to this device. Choosing hosted speech recognition does not send audio by itself. The patient agreement is required for each consultation and is not remembered.
- `On this device` means speech recognition runs in the browser. A recording with transcript timing can also be uploaded to CatatMD for turn playback and may be held for the configured retention window.
- Ambient streams through `Soniox (streaming)` and sends audio while it is happening. If offered, `Refine After Stop` sends the full recording again for transcription. Use synthetic audio only.
- Audio recording labels are automatic. Check the transcript before relying on speaker attribution. A transcript file upload is separate from `Use an Audio File`, which transcribes audio through the selected speech recognition engine.
- When offered, `Patient's Language` can use `Auto-Detect` or a listed translated language. Translations are machine-generated and should be checked with the patient.

![Consultations list](assets/01-consultation-list.png)

## Reviewing the Note

1. Review the three panels: `Transcript`, `Clinical Note`, and `Clinical safety`. On a narrow screen, use `Transcript` and `Hide Transcript` to show or hide the transcript.
2. Compare the transcript with the note. While the consultation is still a draft, use `Correct the transcript` to review `Suspected mishears`; corrections are only available before analysis. Select `View Conversation` to read the turns in a larger view. If a recording is available, play a turn to check what was heard. In `Clinical Note`, select `Edit`, then `Save` or `Cancel` for each section.
3. Review `Red Flags`, `Missing Information`, and `Suggestions`. Check the `Rule` or `AI Suggested` badge on each red flag. Use `Acknowledge` for a red flag and `Mark Reviewed` for a gap. `More Options` offers `Dismiss`, which requires a reason, and `Not Applicable`; these decisions remain in the record.
4. Open `Completeness Checklist` and review each field and its status. Select a row with a quote icon to reveal its transcript evidence, speaker, and timestamp when available.
5. If a `Modified Centor Score` appears, answer each item yourself. Transcript-based `Heard` text is a prompt, not a selected answer. Use `Source` to open its guideline source.

**Notes:**

- Each note section is labelled `AI Generated` or `You Edited This`.
- The checklist shows fields that were not established as `Not Assessed`. Evidence links belong to checklist fields, not individual sentences in the generated note. Older analyses can show `Not recorded for this consultation`; that does not mean the fields were assessed and found absent.
- Suggestion cards show guideline ID chips. Select a chip to expand its source and open the cited page. The model can cite only supplied guideline IDs. Some sources show a quoted span; sources whose licence does not permit quotation are attributed and linked without a quote. For a gap's source, use `More Options` and `Sources`.
- Score answers and totals are not saved with the note. The transcript may show evidence for an answer, but the score starts unanswered and the doctor chooses each item.
- During Ambient capture, the live safety panel can show `Ask Next` prompts. Select `Asked` after asking a prompt, `Skip` to leave it, or `Show All` to open the full list. After analysis, the full panels are `Red Flags`, `Missing Information`, and `Suggestions`.

![Consultation review with three panels](assets/02-review-three-panels.png)

![Red flag provenance labels](assets/03-red-flag-provenance.png)

![Completeness checklist and gap review](assets/04-completeness-checklist-gap.png)

## CatatAI

1. On a saved consultation, select the floating `Open CatatAI` control.
2. Choose a suggested question or type into `Ask about this consultation`, then select `Send` or press Enter. The conversation is not saved.
3. Review any proposal card in full. Select `Apply` to make the proposed change or `Discard` to leave the record unchanged. If the proposal dismisses a red flag, enter your own reason before applying it.

**Notes:**

- CatatAI reads the consultation as it stands, including your edits. It can propose note or review changes, but it cannot approve a note or retract a red flag.
- In the guided tour, CatatAI is inactive because the tour's consultation is not saved.

![CatatAI proposal card](assets/05-catatai-proposal-card.png)

## Prescriptions

1. Open `Prescriptions`. Select `Dictate` to start listening, or `Add` to open the prescription workspace without a microphone.
2. Review the `What You Prescribed` text and the parsed `Prescription Lines`. Check each drug and complete or correct `Dose`, `Duration`, `Frequency`, `With Food`, and `Route`. Use `Add Line` for a line you enter manually.
3. Select `Confirm Prescription` or `Confirm N Prescriptions` to save the checked lines. Select `Discard` to remove unconfirmed work. On the review page, use `Remove` to remove a saved line while the consultation is awaiting review.

**Notes:**

- Dictated text is parsed into editable fields. A drug name must be identified or entered before its line can be confirmed.
- Only the lines you confirm are recorded. The report presents confirmed prescriptions in a table.

## Approving

1. Finish checking the note, transcript, flags, gaps, and prescriptions.
2. Select `Approve Note`. Read the confirmation and select `Confirm Approval`, or select `Cancel` to return to review.
3. Check the `Approved` status and approver and time shown on the record.

**Notes:**

- Approval finalizes the clinical record. Its clinical content cannot be edited afterward. The consultation title can still be renamed.
- Unacknowledged red flags are shown, but they do not block approval. CatatMD never approves automatically.

![Approval confirmation](assets/06-approval-gate-confirm.png)

## Reports and Export

1. On an approved consultation, select `Copy Note` to copy the note.
2. Select `Export` to open `Consultation Report`. Review the note and approval details, plus any prescription table and recorded red flags.
3. Select `Print` to open the browser print dialog, or `Back to Review` to return to the consultation.

**Notes:** Export is available after approval. The report includes the approved note and approval details. Prescription and clinical safety sections appear when there is content for them.

## Settings

1. Open `Settings` from the navigation.
2. Under `Appearance`, select `Light` or `Dark`. `Default Language` currently offers `English` only.
3. Under `Data Retention`, enter a whole number from 1 to 50 in `Retention period, in years`. Select `Adopt Period` or `Save Period` to record the decision.
4. To clear an existing adoption, select `Mark As Not Adopted`.

**Notes:**

- Saving a retention period records the decision only. CatatMD does not automatically delete records when that period ends.
- Audio engine preferences are in `Audio` on the Record panel, not this page. Patient consent for hosted audio is asked per consultation and is not remembered.

## Erasing Data

1. To erase consultations on your account, open `Settings` and select `Delete My Data`. Review `Erase everything on this account?`, then select `Erase Everything`.
2. To erase a patient profile and all visits filed to it, open the patient profile and select `Erase Patient Record`. Tick the acknowledgement in the confirmation, then select `Erase 1` for one patient.
3. To erase selected patient records from the patient list, review the number of linked consultations in the confirmation before selecting `Erase N`, where N is the selected patient count.

**Notes:**

- Erasure cannot be undone. `Delete My Data` erases the account's consultation content and recordings, but patient profiles have a separate erasure action.
- `Erase This Patient Record` also removes the patient's name, NRIC, age, and gender, along with each linked consultation's transcript, analysis, note edits, prescriptions, and audio.
- A tamper-evident audit record remains and cannot be removed.
- The guest account is shared. `Delete My Data` affects its shared consultations, then rebuilds the account from synthetic cases. This takes a few minutes and is visible to other guest users.

## What CatatMD Will Not Do

1. It will not diagnose or replace the doctor's clinical judgment.
2. It will not approve a note without the doctor's explicit confirmation.
3. It will not suppress or downgrade a deterministic red flag. Model-suggested candidates are labelled `AI Suggested` for the doctor to review.

**Notes:** CatatMD is scoped to adult GP consultations for acute cough, sore throat, and related upper respiratory symptoms. The doctor remains responsible for every clinical decision.
