<a id="readme-top"></a>
# Shared Types

@shared/types is the workspace package for Zod contracts and their inferred TypeScript types. The frontend and backend import the same schemas at their boundaries.

## Build And Resolution

The package exports dist/index.js and dist/index.d.ts. Consumers resolve @shared/types through those package exports, so dist/ must exist before they typecheck or run.

Root scripts build shared/ before frontend and backend work. The frontend development wrapper, bun run dev:frontend, also builds shared first.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Add A Schema

1. Define the Zod schema in [src/index.ts](src/index.ts), beside the related contract.
2. Derive its type with z.infer<typeof Schema>. Do not declare a duplicate type by hand.
3. Export the schema and inferred type from src/index.ts so both workspaces can import it.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Main Schema Groups

| Group | Examples In src/index.ts |
| --- | --- |
| Transcript And Capture | TranscriptSchema, TranscriptTurnSchema, CaptureModeSchema, NoteTemplateSchema |
| Speech Recognition | HostedAsrResultSchema, DraftTurnSchema, LiveAsrConfigSchema, LiveSessionSchema |
| Notes And Clinical Assertions | SoapNoteSchema, MedicalRecordNoteSchema, ClinicalFactsSchema, AssertionStateSchema |
| Safety And Evidence | InformationGapSchema, RedFlagSchema, CitationSchema, GuidelineDocumentSchema, ClinicalSuggestionSchema |
| Analysis And Consultation | ConsultationAnalysisSchema, ConsultationSchema, ConsultationDetailSchema, ConsultationListItemSchema |
| Prescriptions | PrescriptionSchema, PrescriptionLineSchema, PrescriptionParseResponseSchema |
| Patients And Notifications | PatientSchema, PatientDetailSchema, NotificationItemSchema |
| Review And Retention | DispositionSchema, EraseConsultationsResultSchema, ErasePatientResultSchema, RetentionPolicySchema |
| Copilot And Live Analysis | CopilotRequestSchema, CopilotProposalSchema, LiveAnalysisResponseSchema, LiveFlagsResponseSchema |
| Common Responses | ErrorEnvelopeSchema, FixtureSchema, TranscriptCorrectionsResponseSchema |

<p align="right"><a href="#readme-top">&uarr;</a></p>
