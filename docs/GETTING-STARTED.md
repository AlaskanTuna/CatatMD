# Getting Started

From a fresh clone to a running CatatMD and a green test run, in about 15 minutes. Day-to-day work is in [`DEVELOPMENT.md`](DEVELOPMENT.md); contributing is in [`../.github/CONTRIBUTING.md`](../.github/CONTRIBUTING.md).

## 1. Install The Tools

| Tool     | Version                                     | Why                                          |
| -------- | ------------------------------------------- | -------------------------------------------- |
| Node.js  | 24 or later                                 | The runtime the API and tooling target       |
| Bun      | Pinned in `package.json` (`packageManager`) | Package manager, workspaces, script runner   |
| Docker   | Any recent                                  | The local Postgres                           |
| Gitleaks | 8.30.1, optional                            | The local secret scan in the pre-commit hook |
| `gh`     | Optional                                    | Issues and pull requests from the terminal   |

On Windows, use WSL, or enable Developer Mode and `git config core.symlinks true` before cloning: the agent skills and `CLAUDE.md` are symlinks.

## 2. Clone And Install

```bash
git clone https://github.com/AlaskanTuna/CatatMD.git
cd CatatMD
bun install            # also installs the Git hooks
```

## 3. Start A Local Database

```bash
docker compose up -d   # Postgres 16 on port 5434 (override with POSTGRES_PORT)
```

> **Never point local work at a shared or production database.** The test suites and every mutating control write real rows, and audit rows cannot be removed because the chain is append-only.

## 4. Configure The Environment

```bash
cp .env.example .env
```

Set at least these values in `.env`:

| Variable             | Local Value                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | `postgresql://catatmd:catatmd@127.0.0.1:5434/catatmd`                                           |
| `DIRECT_URL`         | The same URL (there is no pooler locally)                                                       |
| `BETTER_AUTH_SECRET` | The output of `openssl rand -base64 32`                                                         |
| `LLM_PROVIDER`       | `gemini` with a free `GEMINI_API_KEY` for synthetic local data, or `qwen` with a `QWEN_API_KEY` |

Every other provider key is optional. Without an LLM key the analysis calls fail; without a speech key the hosted speech routes answer 503 and on-device recognition still works. If port 3001 is taken, set `PORT` and `BETTER_AUTH_URL` together. [`DEVELOPMENT.md`](DEVELOPMENT.md#environment-variables) lists every variable.

## 5. Migrate, Seed And Run

```bash
bun run db:migrate     # apply migrations
bun run db:seed        # demo doctor accounts, plus the guest account when GUEST_* is set
bun run dev            # shared watch, API on :3001, web on :5173
```

Check the API with `curl localhost:3001/api/health`, then open <http://localhost:5173> and sign in as `dr.aisyah@catatmd.demo` with the `SEED_DOCTOR_PASSWORD` you set in `.env` (the seed skips the doctors when it is blank). [`USER-GUIDE.md`](USER-GUIDE.md) walks through a first consultation.

## 6. Run The Tests

```bash
bun run verify                         # the full CI gate; needs the migrated database
bun run --cwd frontend test            # no database needed
bun run --cwd backend test src/deid    # one module, no database needed
```

A green `verify` means lint, format, typecheck, every test suite and the floor guard all pass, the same checks CI runs on a pull request.

## Optional: The Guideline Library

Retrieval-backed suggestions need the guideline corpus ingested. It needs Poppler (`pdftotext`, `pdftoppm`) and Tesseract with the `eng` and `msa` language packs.

1. Put the guideline PDFs in `corpus/cpg/raw/` (not committed); `corpus/cpg/manifest.json` is the index they are matched against.
2. `bun run corpus:ingest --dry-run` checks matching, extraction and chunking without writing.
3. `bun run corpus:ingest` embeds, indexes and, when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, uploads each PDF to private storage.

## When Something Goes Wrong

| Symptom                                    | Fix                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `Cannot find module '@shared/types'`       | `bun run --cwd shared build`; the shared package resolves to its `dist/`                    |
| Prisma client type errors                  | `bun run prisma:generate`                                                                   |
| The API refuses to boot                    | Read the env error: `backend/src/config/env.ts` fails fast on a missing or invalid variable |
| Port 5434, 3001 or 5173 already in use     | Set `POSTGRES_PORT`, or `PORT` with `BETTER_AUTH_URL`, or Vite's `--port`                   |
| Skills or `CLAUDE.md` are plain text files | Symlinks were not created; see `.agents/skills/README.md`                                   |

More in [`DEVELOPMENT.md`](DEVELOPMENT.md#troubleshooting).
