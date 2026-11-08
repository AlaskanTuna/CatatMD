# 23. Clinic EHR Integration Interface

Part of the [Technical Reference](../TRD.md).

**Status: `Specified`** (GitHub issue #17)

This is an interface decision, not an integration. No EHR route, adapter, vendor connection, credential, or export job exists in the MVP. `docs/PRD.md` §6 keeps external write-back out of scope; copy and PDF/print are the only current exports.

## Approved-Note Export Contract

**Decision:** export one immutable approved-note document. Its SOAP content is `editedNote` when it is non-null, otherwise `analysis.note`. The fallback matters because a doctor can review and approve an unedited analysis; approval, not whether text changed, is what makes the note final.

| Export Field                                                                                                                      | Source                                | Rule                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `consultationId`                                                                                                                  | `ConsultationSchema.id`               | Opaque source-record correlation id. It is not a patient or encounter identifier.                                                                             |
| `approvedAt`                                                                                                                      | `ConsultationDetailSchema.approvedAt` | Required only after the terminal `approved` transition.                                                                                                       |
| `note.subjective`                                                                                                                 | `SoapNoteSchema.subjective`           | Approved narrative.                                                                                                                                           |
| `note.objective`                                                                                                                  | `SoapNoteSchema.objective`            | Approved narrative.                                                                                                                                           |
| `note.assessment`                                                                                                                 | `SoapNoteSchema.assessment`           | Approved narrative, still subject to the no-generated-diagnosis constraint in §3.                                                                             |
| `note.plan`                                                                                                                       | `SoapNoteSchema.plan`                 | Approved narrative.                                                                                                                                           |
| `operational.diagnosis`, `operational.medicationsDispensed`, `operational.mcDays`, `operational.referral`, `operational.followUp` | `OperationalBlockSchema`              | Include only when `analysis.operational` exists. Each exported assertion carries `state` and, when present, `value`; `medicationsDispensed` remains an array. |

`ClinicalAssertion.evidence` is deliberately excluded. It is transcript-derived source material, may contain identifiers after re-hydration, and is useful for internal review rather than an EHR write-back. The export also excludes `transcript`, the unapproved `analysis.note` when `editedNote` exists, `gaps`, `redFlags`, `suggestions`, `clinicalFacts`, acknowledgment and review id arrays, `doctorId`, and all audit records. Those are either raw source, AI-review support, internal workflow state, or insufficiently mapped to a receiving EHR record.

The current shared contracts contain no patient identifier, patient demographics, EHR encounter identifier, or clinic practitioner identifier. A future implementation must not invent any of them at export time. It needs a separately ratified patient-and-encounter correlation contract before this payload can be written into a patient chart.

## Direction And Trigger

**Decision:** push the approved-note document to a clinic-side consumer after the local approval transaction succeeds. `POST /api/consultations/:id/approve` is the sole trigger because it already requires `awaiting_review` with `analysis` attached, sets `approvedAt`, and records `consultation.approved` (§13, §15).

The local approval remains final if delivery is unavailable. Export is an asynchronous, idempotent follow-on action keyed by `consultationId`, never a network dependency that can prevent a doctor from finalising a reviewed note. A pull design would require the clinic system to poll or query this API for patient-linked records, widening the read surface and making timing, authorisation, and minimum-necessary disclosure harder to constrain. Push limits disclosure to one explicit, approved artefact.

## Authentication And Transport

**Decision:** require a clinic-registered HTTPS endpoint using TLS 1.3, mutual TLS, and OAuth 2.0 client-credentials tokens scoped to one clinic integration and one export audience. Reject static shared API keys and browser-session authentication.

Mutual TLS authenticates the receiving system at the transport boundary; short-lived OAuth tokens authorise the specific machine-to-machine action and can be revoked without changing the endpoint certificate. The future implementation must validate the endpoint certificate and token audience, keep client credentials and certificates in a secret manager, rotate them, and omit them from logs and audit metadata. This is appropriate for a clinic-side service, not for a doctor browser or an unauthenticated vendor webhook.

## PHI Boundary Under A Real Integration

**Decision:** a production EHR integration is a new identifiable-data path outside the LLM egress boundary. It must be treated as such, not described as de-identification preserving the existing boundary.

Today, identifiable transcript text enters the API and is retained there; only de-identified text may leave for an LLM (§5, §9). Under a real integration, the clinic must also provide enough patient, encounter, and practitioner context to associate the approved note with an EHR record. Those identifiers enter the API or an approved clinic-side correlation service. After approval, the API assembles the re-hydrated, identifiable note and sends it, with the EHR correlation context, to the authenticated clinic consumer. Identifiable data therefore leaves the API for the EHR.

That path puts identifiable data back onto a path the MVP deliberately keeps clear of it. The de-identification gate does not protect this export and must never be cited as doing so. Before production, the integration requires an approved correlation design, DPIA update, data-processing and cross-border-transfer assessment, receiving-system access-control review, retention terms, and privacy-safe export audit events. None is optional because the EHR is a real PHI recipient, not an LLM adapter.

## Candidate Standards Assessment

**Decision:** define the future interchange as an HL7 FHIR R4 document Bundle, with a `Composition` as the immutable approved-note document. Use `Patient`, `Practitioner`, and `Encounter` references only after the clinic-specific correlation contract exists. Put the four SOAP fields and the operational block in `Composition` sections, and do not create discrete `Condition`, `MedicationRequest`, or referral resources from AI output. `DocumentReference` is optional only where the receiving EHR needs a registry entry for the resulting FHIR document.

| Candidate                          | Decision                    | Reasoning                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FHIR R4 `Bundle` and `Composition` | **Recommended.**            | FHIR documents preserve an attested, immutable clinical note and let a receiving system retain patient, practitioner, and encounter context without turning transcribed content into autonomous orders or diagnoses. This is the forward-compatible choice for a fragmented Malaysian primary-care market: `docs/PRD.md` §6 records that no published GP CMS API standard can be assumed, while Malaysia's national digital-health direction is FHIR-enabled. |
| HL7v2                              | **Not a primary contract.** | HL7v2 can be transformed by a clinic-specific integration gateway when a legacy EHR offers no FHIR endpoint, but it is not the system interface. Its message and segment mappings would be vendor-specific, make the approved document harder to preserve as one attested artefact, and would duplicate the safety-critical mapping work for every clinic.                                                                                                    |

FHIR is the recommended future target, not a claim that any current clinic system can receive it. Each clinic integration must first demonstrate its supported FHIR version, profiles, endpoint behaviour, identity mapping, and receiving-record workflow against synthetic data before any real note is sent.

---
