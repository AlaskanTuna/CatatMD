---
paths:
  - 'prisma/**'
  - 'backend/src/audit/**'
  - 'backend/src/lib/logger.ts'
  - 'backend/src/config/**'
  - 'backend/src/routes/**'
  - '.env*'
  - '.gitignore'
  - 'render.yaml'
  - '.github/workflows/**'
---

# Data, Secrets, And Audit

These rules govern persistence, secrets, logging, and audit records.

## Data And Persistence

- All queries go through Prisma, which parameterises by design. **No `$queryRawUnsafe`, no `$executeRawUnsafe`, no template-string SQL.** If `$queryRaw` is genuinely needed, use the tagged-template form and never interpolate user input.
- `DATABASE_URL` is the pooled Supavisor URL for the app; `DIRECT_URL` is for migrations only. Do not swap them.
- PHI lives in `Consultation.transcript`, `Consultation.analysis`, and `Consultation.editedNote` (all `Json?`). Select only what a caller needs; do not widen a response to the whole row for convenience.
- Erasure is a tombstone: `eraseConsultation()` (`backend/src/audit/erasure.ts`) nulls the three PHI columns and sets `erasedAt`. The `AuditEvent.consultationId` relation is `onDelete: Restrict` **because `consultationId` is a hash-chain input**; a cascading delete would break tamper evidence. Do not change it to `Cascade`.
- Every new migration that adds a PHI-bearing column must state which of the three erasure targets it joins, and update `eraseConsultation` if it is a fourth.
- **Built:** tombstone erasure through two routes. `POST /api/consultations/erase` batch-erases the caller's own consultations via `eraseConsultation`, and `POST /api/patients/:id/erase` erases a patient record and cascades to that patient's consultations via `erasePatient` (PR #212). Both null PHI columns and stamp `erasedAt`; neither deletes a row.
- **Built:** the retention period is recorded, per doctor, on `User.retentionYears` and edited through `GET`/`PATCH /api/settings/retention` (#80). `null` means the controller has not adopted a period and **must never be read as the default**: substituting one turns a convention into a decision nobody made. Every write records a `settings.retention_adopted` audit event carrying the value, withdrawal included, so the policy in force on a given date is attributable to an actor. That value is configuration rather than content, which is why it may sit in `metadata` at all.
- **Not built today:** no retention job, no TTL, no backup expiry, and no identity-verified access-request workflow. **Nothing enforces `retentionYears`**; storing the decision and acting on it are separate work.
- **Never invent a retention period** beyond the configurable default the owner has authorised, and **never state a legal position**: the default is a convention the clinic data controller must review, not a statutory requirement, and no code, comment, or doc may cite legislation for it (`docs/dpia.md`, "Open Retention Decision").

## Secrets, Logging, Audit

OWASP A09:2025 Security Logging and Alerting Failures cuts both ways here: too little logging hides incidents, and too much logging is itself the breach.

- `.env` is gitignored and `.env.example` is committed with blank placeholders. Note the gap: `.gitignore` covers `.env`, `.env.local`, and `.env.*.local`, but **not** `.env.production` or `.env.development`. Do not create those filenames.
- Never commit a key, a connection string, or a `BETTER_AUTH_SECRET`. Deployment secrets are `sync: false` in `render.yaml` and set in the dashboard.
- Secrets stay out of tracked files, commits, issues, and PR bodies. Gitleaks enforces this in the pre-commit hook and in the CI `verify` job.
- **The logger is a positive allowlist**, not a denylist (`backend/src/lib/logger.ts`). Seventeen field names are permitted, each constrained to an enum, an identifier pattern, or a number. **No field accepts free text.** Adding a field means adding a `FIELD_RULES` entry plus a `LogFields` member, and the drift test will fail if you add only one.
- `LOG_LEVEL` is verbosity only. Never add a flag, level, or debug branch that widens what may be written.
- Never log transcript bodies, note contents, gap or suggestion text, vault entries, `err.message`, `err.stack`, or a request body. Log IDs, event types, detector labels, and counts.
- `AuditEvent.metadata` carries detector **labels** only, never values. Audit writes go through `recordAuditEvent`; `backend/src/audit/no-stray-audit-writes.test.ts` fails the build on a direct write.
- The hash chain (`seq`, `prevHash`, `hash`) is tamper-evident, not tamper-proof, and `metadata` is deliberately outside the hash. Do not overstate it in code comments or docs.
