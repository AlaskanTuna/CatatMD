# 18. Traceability

Part of the [Technical Reference](../TRD.md).

**Status: `Specified`**

| Capability    | Realised By                                                                                                                                                                                                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CAP-1**     | §12 (`note_and_gaps` operation), §3 (`SoapNoteSchema`), §13 (analyse route)                                                                                                                                                                                                                                                                    |
| **CAP-2**     | §12 (`note_and_gaps` operation, `gaps`), §3 (`InformationGapSchema`), §13 (`PATCH` route, `reviewedGapIds`), §4 (proposed `Consultation.reviewedGapIds`)                                                                                                                                                                                     |
| **CAP-3**     | §10 (Red-Flag Rules Engine, authoritative), §12 (`red_flags`, model candidates), §3 (`RedFlagSchema`)                                                                                                                                                                                                                                        |
| **CAP-4**     | §11 (Guideline Corpus), §12 (`suggestions_and_red_flags`), §3 (`ClinicalSuggestionSchema`, `citations.min(1)`), §13 (`GET /api/guidelines`)                                                                                                                                                                                                    |
| **CAP-5**     | §13 (`PATCH` and `/approve` routes), §4 (`Consultation.editedNote`/`approvedAt`), §15 (Audit Logging)                                                                                                                                                                                                                                          |
| Cross-cutting | §2 (module boundaries), §5 (PHI boundary), §6 (LLM adapter), §7 (environment contract), §8 (HTTP surface as built), §9 (de-identification), §14 (auth model), §16 (security controls), §17 (environments & deployment), §20 (ASR contract), these underwrite `docs/PRD.md` §10 (Safety Constraints) as a whole rather than any single `CAP-n` |

---

