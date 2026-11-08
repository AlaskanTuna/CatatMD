# D-006: The Printed Report Is A Separate Artefact From The EHR Export

|                |                                                                                     |
| -------------- | ----------------------------------------------------------------------------------- |
| **Date**       | 2026-09-20                                                                          |
| **Status**     | Adopted                                                                             |
| **Issues**     | #376                                                                                |
| **Supersedes** | The `@media print` subtraction approach shipped for #26, for the approved-note case |

## Decision

An approved consultation's printed report is a separate document with its own field contract (`../TRD.md` §26), not a print rendering of the §23 EHR export payload and not governed by that contract's field list.

## Reasoning

- **Two Recipients, Two Minimum-Necessary Answers.** §23's contract pushes to a clinic EHR and excludes patient identifiers and `ClinicalAssertion.evidence` for that recipient. The printed report goes into the patient's chart or the patient's hand, so the patient name and the prescriptions belong on it.
- **A Document, Not A Filtered Screen.** The replaced approach subtracted chrome from the live review page through scattered `data-print="hide"` attributes and printed the DOM dump that remained. The report is a dedicated route whose entire DOM is the document, so print correctness no longer depends on attributes staying in sync with the layout.
- **The Browser Already Holds Everything It Prints.** The report renders from the consultation detail payload at `/consultations/:id/report` and prints through `window.print()`: no new egress, no new logging, no server round trip, no stored file.

## What This Decision Does Not License

- **No Patient Identifiers In The §23 Payload.** The EHR export contract still excludes them; this decision runs the other way only, licensing identifiers on the printed report because its recipient differs.
- **No Reading Of The Report As An EHR Integration.** It is a browser-rendered document. §23's push direction, authentication, transport and FHIR assessment are untouched and still unbuilt.
- **No Citation Of The De-Identification Gate As Protecting Either Artefact.** The gate guards LLM egress. The report never crosses it, and a real EHR export is an identifiable-data path the gate does not protect; §23's PHI-boundary subsection already makes this point, recorded here from the other end.
