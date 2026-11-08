# Invariants

These rules hold everywhere in the repository, for every agent and every collaborator. A change that breaks one is a **critical defect**, not a style issue. Tools that do not load `.claude/rules/*.md` by path should open the rule file named for the area they edit (`docs/agents/documents.md`).

## Clinical Safety

| Never                                                                                                                                                              | Enforced By                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Send un-de-identified text to any LLM provider. Every egress goes through `backend/src/deid/`, then `LLMClient`.                                                   | The `Deidentified` type on `LLMClient`, `assertNoIdentifiers`, and `deid/no-stray-brand-casts.test.ts` |
| Import a provider SDK, or call a model, outside `backend/src/lib/llm/`.                                                                                            | `no-stray-provider-sdk.test.ts`                                                                        |
| Let the LLM suppress, downgrade or filter a deterministic red-flag hit. It may only add candidates for the doctor to review.                                       | `mergeRedFlags` and the acceptance suite in `backend/src/acceptance/`                                  |
| Accept a free-text medical citation. The model cites guideline **IDs** from the supplied corpus; anything else fails schema validation.                            | Zod schemas in `shared/`                                                                               |
| Present any output as a diagnosis, or auto-approve a note. Approval is an explicit state transition by the doctor, never a default.                                | The approve route in `backend/src/routes/consultations.ts`, and `routes/no-stray-approval.test.ts`     |
| Point `LLM_PROVIDER=gemini` at anything but synthetic local data. The free tier's terms let Google use submitted content for product improvement and human review. | `backend/src/config/env.ts` refuses Gemini in production                                               |
| Log transcript bodies, note contents, or de-identification vault entries. Log IDs and event types only.                                                            | Redaction in `backend/src/lib/logger.ts`                                                               |
| Commit real patient data, real NRICs, or anything taken from a real clinical system. Fixtures are **synthetic** and live in `backend/src/fixtures/`.               | Review, and the clinical-data guard in `.gitignore`                                                    |

**Speech audio is the one accepted exception to "de-identify before egress".** Audio cannot be tokenised, so the ASR adapters in `backend/src/lib/asr/` send it to the speech provider directly. `.claude/rules/phi-egress.md` states the controls that apply instead.

## Repository

- **Do not** force-push, rewrite published history, or delete any branch other than a merged feature branch. `.claude/hooks/block-dangerous-git.mjs` enforces this.
- **Do not** commit or push without explicit human authorization.
- **Do not** commit a secret. `.env.example` is committed and `.env` is gitignored. Gitleaks scans staged changes in the pre-commit hook and every pull request in CI.
- **Do not** lower the quality floor to go green. `bun run verify` fails on a new suppression, a skipped or focused test, or a new empty `catch` or `TODO` (`scripts/floor-guard.ts`). When one is truly intended, ask the human; only they add a `Floor-Guard-Allow: <reason>` trailer to the commit.
