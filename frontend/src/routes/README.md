<a id="readme-top"></a>

# Routes

Page-level components and the consultation capture panel mounted by App.tsx.

## Module Guide

### Owns

- [Landing.tsx](Landing.tsx), [Privacy.tsx](Privacy.tsx), and [Login.tsx](Login.tsx) provide public and sign-in pages.
- [PatientList.tsx](PatientList.tsx), [PatientNew.tsx](PatientNew.tsx), and [PatientDetail.tsx](PatientDetail.tsx) provide patient pages.
- [ConsultationList.tsx](ConsultationList.tsx), [ConsultationReview.tsx](ConsultationReview.tsx), and [ConsultationReportPage.tsx](ConsultationReportPage.tsx) provide consultation pages.
- [Guidelines.tsx](Guidelines.tsx) and [Settings.tsx](Settings.tsx) provide the remaining signed-in pages.
- [CapturePanel.tsx](CapturePanel.tsx) coordinates transcript entry and audio capture inside consultation review.
- [ConsultationRow.tsx](ConsultationRow.tsx), [ConsultationRows.tsx](ConsultationRows.tsx), and [StartConsultationDialog.tsx](StartConsultationDialog.tsx) are route-level workflow components.

### Used By

App.tsx maps URL paths to these pages. Consultation review composes components from [audio](../audio/README.md), [review](../review/README.md), and [copilot](../copilot/README.md).

### Invariants

- **Session gate:** Patient and consultation records render under RequireSession.
- **Report route:** The report has its own session gate and sits outside AppShell.
- **API boundary:** Route queries and mutations use lib/api.ts and TanStack Query.

### Tests

Route tests cover patient pages, consultation list and review, capture, guidelines, settings, and the report page.

<p align="right"><a href="#readme-top">&uarr;</a></p>
