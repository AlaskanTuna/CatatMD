# D-002: Retire The Curated Guideline Corpus For Retrieval-Only Citation

|                |                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| **Date**       | 2026-09-09                                                                                           |
| **Status**     | Adopted                                                                                              |
| **Issues**     | #250 (open)                                                                                          |
| **Supersedes** | The hand-written `guideline-corpus-v4` chunk set that anchored `../TRD.md` Section 11 since issue #8 |

## Decision

The 11 hand-written guideline chunks are retired. The three documents behind them, MOH NAG 2024, Abdullah et al. 2024, and Ooi et al. 2022, are ingested through the same CPG retrieval pipeline as every other guideline in `../../corpus/cpg/manifest.json`, and the model's citable set on `suggestions_and_red_flags` is the retrieved chunks for that consultation and nothing else.

## What This Decision Does Not License

- **No Change To The ID-Constrained Citation Mechanism.** `guidelineId` still fails schema validation for any id outside the live corpus (`../TRD.md` Section 11).
- **No New Clinical Content.** The same three documents, now ingested rather than hand-copied, plus the deterministic layers (red-flag triggers, gap checklist) citing them through stable `doc:<id>[#p<n>]` references instead of a curated chunk id.
- **Issue #250 Stays Open.** Whether MOH-ARR spans may be sent to the model for grounding at all, distinct from whether they may be displayed, is not answered by this decision. The current posture is that they are sent, de-identified, and display is off.
- **Page Anchors On `doc:` References Are Deliberately Left Unset.** No trigger or checklist entry cites a specific page today; this is a scope boundary of the current content, not a limitation of the reference format.
