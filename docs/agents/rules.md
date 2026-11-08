# Rules

- **Issue first, then branch.** GitHub Issues is the shared task list. Every issue has an assignee and labels, and work that crosses between collaborators is an issue before it starts. Branching, lanes, commits and merging: `.github/CONTRIBUTING.md`.
- **Search before opening.** Read the existing issues and pull requests with `gh`, open and closed, and link any that overlap.
- **Fill in the templates.** An issue filed from the CLI reproduces the sections of its `.github/ISSUE_TEMPLATE/` form; one without **Acceptance Criteria** and **File Scope** is incomplete. A pull request fills in `.github/PULL_REQUEST_TEMPLATE.md`, and its **Clinical-Safety Checklist** is required when the diff touches `deid/`, `lib/llm/`, `lib/asr/`, `redflags/`, `guidelines/` or logging.
- **Run the gate before claiming done.** `bun run verify` is the same check CI runs. "It compiles" is not "it works": exercise the changed flow, and say exactly what was and was not exercised.
- **CLI first.** Use `gh`, `supabase`, `vercel`, `render` and `prisma` before any dashboard. When a GUI step is unavoidable, record the exact steps in `docs/` so it can be repeated.
- **Zod at every boundary.** HTTP requests and responses, LLM output and env are parsed with schemas from `shared/`. Types are inferred with `z.infer`, never written alongside a schema, and a shared type is never redeclared locally. No `any`: use `unknown` and narrow.
- **Surgical changes.** Touch only what the task needs, match the existing style, and do not refactor what is not broken. Comment only a non-obvious _why_, never the _what_.
- **Parallel work runs in worktrees.** One worktree and one session per concurrent branch. Review agents stay in the main checkout, because a reviewer in a fresh worktree reviews a clean tree. A new worktree needs `.env` copied in (`.worktreeinclude` lists the files), then `bun install` and `bun run prisma:generate`.
- **A PR that changes an API route updates its preview stub** in `frontend/src/preview/` in the same PR. Pull request previews run on that stub, never on the real API; an unhandled route answers 501 `not_in_preview`.
- **Add a rule only after an agent repeats a mistake,** and say why in the rule.
- **Report concisely.** Lead with the outcome in a few bullets or a small table; past about 10 lines it is too long. Do not paste whole files, long diffs or command transcripts. **Brevity never hides a problem:** blockers, risks, failed checks and skipped work are always stated.
