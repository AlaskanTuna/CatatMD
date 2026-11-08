# 01. Purpose & Relationship To Other Docs

Part of the [Technical Reference](../TRD.md).

**Audience:** implementers, anyone picking up a module directory and building against a contract.

This document does not restate what `README.md` already carries (the capability table, the PHI-boundary narrative, the provider table, the repo tree, getting-started steps, the commit convention). Where a topic overlaps, this document either goes deeper or omits it entirely.

`docs/PRD.md` owns product requirements, acceptance criteria, and scope. This document owns the contracts that realise them: module boundaries, schemas, data models, API surface, and the security and deployment posture.

`docs/DESIGN.md` owns how the interface looks: the visual system, the severity grammar, and the rules a change must not break. This document owns what the browser will actually do with it, which is §24. A frontend change usually needs both, and the two are written so that neither restates the other.

## Status Tag Legend

Every section below carries exactly one tag.

| Tag             | Meaning                                                                                 |
| --------------- | --------------------------------------------------------------------------------------- |
| **`Built`**     | Describes code that exists today. Verified line-by-line against the source.             |
| **`Specified`** | Design is decided and canonical, but not yet implemented.                               |
| **`Open`**      | A decision is genuinely unresolved. States what is undecided and what would unblock it. |

The no-invention rule holds throughout: where a fact is not derivable from existing code or an established decision, the section is tagged `Open` rather than given a fabricated answer.

---

