<a id="readme-top"></a>

# Review

Components and helpers for reviewing consultation output before approval.

## Module Guide

### Owns

- [NoteEditor.tsx](NoteEditor.tsx) and [MedicalRecordNoteEditor.tsx](MedicalRecordNoteEditor.tsx) edit note content.
- [ChecklistPanel.tsx](ChecklistPanel.tsx), [SafetyCards.tsx](SafetyCards.tsx), and [LivePrompter.tsx](LivePrompter.tsx) present assertions, red flags, gaps, and live prompts.
- [TranscriptCorrections.tsx](TranscriptCorrections.tsx) presents transcript corrections.
- [PrescriptionBlock.tsx](PrescriptionBlock.tsx) and [PrescriptionTheatre.tsx](PrescriptionTheatre.tsx) support dictated and edited prescriptions.
- [prescription/](prescription/) holds the theatre's parts: `use-prescription-dictation.ts` (the recording state machine), `use-prescription-draft.ts` (draft lines), and the dictation header, lines table and line row components.
- [ApproveBar.tsx](ApproveBar.tsx), [ConsultationReport.tsx](ConsultationReport.tsx), and [ScoreCard.tsx](ScoreCard.tsx) render approval and report views.

### Used By

routes/ConsultationReview.tsx composes the working review surface. routes/ConsultationReportPage.tsx renders the print-ready report.

### Invariants

- **Doctor Review:** The components keep generated content editable and approval explicit.
- **Safety State:** Red flags and information gaps remain visible with their review dispositions.
- **Transcript Evidence:** Correction UI applies proposals to the transcript through the API flow.
- **Prescription Ownership:** The doctor confirms and edits dictated prescription lines before they are saved.

### Tests

- **Report And Checklist:** ConsultationReport.test.tsx and ChecklistPanel.test.tsx.
- **Safety And Approval:** SafetyCards.test.tsx and ApproveBar.test.tsx.
- **Prescription And Transcript:** PrescriptionTheatre.test.tsx, TranscriptCorrections.test.ts, and prescription-draft.test.ts.

<p align="right"><a href="#readme-top">&uarr;</a></p>
