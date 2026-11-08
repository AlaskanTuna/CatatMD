# Graphify

Graphify is optional, and not every collaborator has it (`which graphify`). When `graphify-out/graph.json` exists, it is a knowledge graph of this repository's code. `.graphifyignore` keeps prose and binary assets out of it, so a build needs no model and no API key.

- **Query before grepping.** For architecture and relationship questions, run `graphify query "<question>"` first (add `--budget 1500` to cap the answer). Use `graphify path "<A>" "<B>"` for the link between two concepts and `graphify explain "<node>"` for one concept. Then drop to grep and Read for exact `file:line` evidence: the graph gives the file, not the line.
- **Read the report only for broad review.** `graphify-out/GRAPH_REPORT.md` is for an architecture overview, or when query, path and explain miss.
- **Keep it fresh.** The committed `.husky/post-commit` hook runs `graphify update .` after every commit where graphify is installed. Only `graph.json` and `GRAPH_REPORT.md` are committed; the rest of `graphify-out/` is regenerated locally.
