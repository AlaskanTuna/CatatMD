# Agents

This folder holds the project rules and references for coding agents. `AGENTS.md` at the repository root imports the always-on files by name, so this index is for people and is never loaded into an agent's context. The rest are read on demand, when `documents.md` routes to them.

| File                                                   | Loaded    | What It Answers                                                                     |
| ------------------------------------------------------ | --------- | ----------------------------------------------------------------------------------- |
| [project.md](project.md)                               | Always    | What CatatMD is, its architecture commitments, layout, stack and commands.          |
| [invariants.md](invariants.md)                         | Always    | Which clinical-safety and repository rules hold everywhere, and what enforces each. |
| [rules.md](rules.md)                                   | Always    | Which rules govern issues, changes, verification and reporting.                     |
| [documents.md](documents.md)                           | Always    | Which document to read for a task.                                                  |
| [andrej-karpathy-skills.md](andrej-karpathy-skills.md) | Always    | Which behaviours reduce common coding mistakes.                                     |
| [graphify.md](graphify.md)                             | Always    | How to use the optional repository knowledge graph.                                 |
| [rtk.md](rtk.md)                                       | Always    | How RTK condenses command output, and when to recover raw output.                   |
| [markdown-style.md](markdown-style.md)                 | On demand | How Markdown is written, and the README's stricter rules.                           |
| [hooks.md](hooks.md)                                   | On demand | Which hooks enforce the rules, and how they are wired.                              |
| [skills.md](skills.md)                                 | On demand | Which skills and subagents the project ships, and how they are installed.           |

Area rules live in `.claude/rules/*.md`, each scoped to its paths by frontmatter.
