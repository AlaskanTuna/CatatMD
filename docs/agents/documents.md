# Documents

Read each document when its row applies. Paths are from the repository root.

| Read When                                                         | Document                               |
| ----------------------------------------------------------------- | -------------------------------------- |
| Landing on the project, or explaining it to someone new           | `README.md`                            |
| Finding which doc answers a question                              | `docs/README.md`                       |
| Proposing a feature, or checking who CatatMD is for               | `docs/PRD.md`                          |
| Finding how a piece works, a contract, or a data model            | `docs/TRD.md`                          |
| Asking why something is built as it is                            | `docs/DECISIONS.md`                    |
| Building or restyling any UI                                      | `docs/DESIGN.md` and `docs/PRODUCT.md` |
| Assessing privacy risk, retention, or a data-protection control   | `docs/DPIA.md`                         |
| Editing `backend/src/deid/`, `lib/llm/`, `lib/asr/` or logging    | `.claude/rules/phi-egress.md`          |
| Editing `redflags/`, `guidelines/`, `analysis/` or `suggestions/` | `.claude/rules/clinical-safety.md`     |
| Editing auth, routes or middleware                                | `.claude/rules/auth-http.md`           |
| Editing the schema, persistence, audit or secrets handling        | `.claude/rules/data-secrets.md`        |
| Editing `frontend/src/`                                           | `.claude/rules/frontend-security.md`   |
| Changing dependencies, CI or deploy config                        | `.claude/rules/supply-chain.md`        |
| Branching, committing, or opening an issue or pull request        | `.github/CONTRIBUTING.md`              |
| Writing or restructuring Markdown                                 | `docs/agents/markdown-style.md`        |
| Adding, changing or debugging a hook                              | `docs/agents/hooks.md`                 |
| Choosing, installing or changing an agent skill                   | `docs/agents/skills.md`                |
