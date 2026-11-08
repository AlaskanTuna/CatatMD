---
paths:
  - 'backend/src/deid/**'
  - 'backend/src/lib/llm/**'
  - 'backend/src/redflags/**'
  - 'backend/src/guidelines/**'
  - 'backend/src/routes/**'
  - 'backend/src/middleware/**'
  - 'backend/src/audit/**'
  - 'backend/src/config/**'
  - 'backend/src/app.ts'
  - 'prisma/**'
  - 'frontend/src/lib/**'
  - 'frontend/src/audio/live/**'
  - '.github/workflows/**'
---

# Security Rules

ai-clinical-assistant handles simulated GP consultation data today, and is built to the standard required to handle real data later. Every rule below names a real file or symbol so it can be checked, not merely agreed with.

**The framing claim that governs everything else:** de-identification is risk reduction, not anonymisation. Tokenised text is still protected health information (`docs/dpia.md`, "Plain-Language De-Identification Statement"). Never write code, comments, or docs implying that de-identified content is safe to treat casually.

| Rule File                            | Coverage                                         |
| ------------------------------------ | ------------------------------------------------ |
| `.claude/rules/phi-egress.md`        | PHI boundary, LLM egress, and ASR egress         |
| `.claude/rules/clinical-safety.md`   | Red flags, citations, and clinician approval     |
| `.claude/rules/auth-http.md`         | Authentication, access control, and HTTP surface |
| `.claude/rules/data-secrets.md`      | Persistence, secrets, logging, and audit         |
| `.claude/rules/frontend-security.md` | Frontend and browser security                    |
| `.claude/rules/supply-chain.md`      | Dependencies, CI, and supply-chain controls      |

## Changes That Need Explicit Human Sign-Off

Document the reason in the PR and ask before merging:

- Any new path from raw transcript text toward a provider, or any second provider SDK import.
- Any new audio egress, whether it leaves the API or the browser. This clause was read as covering raw audio a fortiori when ambient capture was designed, and the sign-off for Soniox was granted on that reading (`docs/trd.md` §20.10); a third would need its own, and that happened: post-Stop refinement with batch `scribe_v2` was signed off separately by @Andersonnn7788 on 16/10/26, scoped as in "The Post-Stop Upload" above (`docs/trd.md` §20.14). That grant does not loosen this rule for a fourth. **A new surface on an existing egress needs a scope extension rather than a fresh sign-off**, because the grants here are written narrowly enough to exclude surfaces they did not name: prescription dictation took one on 10/09/26 (#355). Do not read "same vendor, same socket, same route" as self-evidently covering a surface the grant does not mention.
- Adding a host to `connect-src` in `vercel.json`, or a second `new WebSocket(` site in the SPA.
- Exporting `markDeidentified`, adding a `as Deidentified` cast, or making `assertNoIdentifiers` unconditional on anything new.
- Relaxing a production boot guard, or setting `DEID_FAIL_CLOSED=false` outside a unit test.
- Any filtering, ordering, or deduplication inside `mergeRedFlags`.
- Widening `guidelineId` beyond `z.enum(corpusIds)`.
- Turning `assertOwnedConsultation` into a 403, or adding a route with `:id` that skips it.
- Widening `CORS_ORIGIN` beyond a single origin, or adding an origin to `trustedOrigins`.
- Adding a logger field, log level, or debug branch that widens what may be written.
- Changing the configurable retention default, making anything enforce it, or any doc wording that states a legal position for it or calls de-identified data anonymous.

## See Also

These are the deeper references. Read them rather than duplicating them here.

- `AGENTS.md` "Critical Do-Nots" is the canonical statement; this file is the enforceable mechanics behind it.
- `.claude/skills/healthcare-phi-compliance/` before touching `deid/`, `AuditEvent`, or access control.
- `.claude/skills/healthcare-cdss-patterns/` before touching `redflags/` or any clinical scoring.
- `.claude/skills/better-auth-security-best-practices/` before touching auth wiring.
- `.claude/skills/cso/` for a full OWASP and STRIDE audit pass, invoked on demand.
- `docs/trd.md` for implementation detail. Sections 4 and 16 are stale on the audit cascade and on helmet, rate limiting, and CI; trust the code.
- `docs/dpia.md` for the privacy position, the processor and residency table, and the open residual-risk register.
- `.github/PULL_REQUEST_TEMPLATE.md` Clinical-Safety Checklist is mandatory when the diff touches `deid/`, `lib/llm/`, `lib/asr/`, `redflags/`, `guidelines/`, or logging.
