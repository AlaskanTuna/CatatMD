# Database Operations

Production Postgres runs on Supabase in Singapore. The API uses `DATABASE_URL` through the Supavisor pooler on port 6543. Prisma migrations use `DIRECT_URL` on port 5432.

## Apply A Production Migration

Production does not run migrations during deploy. Render's `buildCommand` generates the Prisma client and builds the API, but does not call `prisma migrate deploy`. Render's `preDeployCommand` is a paid-tier feature, and the database is hosted on Supabase.

Run the following from a controlled checkout with `DIRECT_URL` set to the production direct connection string. The commands read the configured database URL, so verify the target before applying anything:

```bash
bun run db:status
bun run db:migrate:deploy
bun run db:status
```

The final status should report `Database schema is up to date!`. Never point local application work at the production database. Do not put `DIRECT_URL` in CI; the migration jobs deliberately have no production database credential.

The PR `migrations` job lists new migration files and prints these commands. The manual step was tracked under issue #132. Migrations #124 (`notificationsClearedAt`) and #320 (`prescriptions`) reached production unapplied; the post-merge reminder was added under issue #341. It opens an issue but applies nothing and does not gate the API deploy. A code change that needs a new column can therefore reach Render before the manual migration is applied. Have the operator ready to apply it as part of the release and verify the affected production flow after both steps.

## Migration Status And Local Development

Use `bun run db:status` to check the database selected by the configured Prisma environment. Use `bun run db:migrate` for local `prisma migrate dev`; it uses `DIRECT_URL` and may create a migration. Start the local Postgres container with `docker compose up -d`, then point both `DATABASE_URL` and `DIRECT_URL` at its port 5434 endpoint.

## Seed Scripts

Seeds are not part of deploy or migration commands:

- `bun run db:seed` creates the two synthetic doctor accounts when `SEED_DOCTOR_PASSWORD` is set. It creates the guest account only when both `GUEST_EMAIL` and `GUEST_PASSWORD` are set. It skips existing emails.
- `bun run db:seed:demo` calls the API at `DEMO_SEED_BASE_URL`, which defaults to `http://localhost:3001`, signs in to the guest account, and adds five synthetic fixture consultations when missing. It uses the API so lifecycle and audit events remain consistent.

Check the target before running either script. `db:seed:demo` writes to the API named by `DEMO_SEED_BASE_URL`; it is not a database-only seed.

## Backups And Restore On Supabase Free

Supabase Free does not include automatic backups or point-in-time recovery. Supabase recommends regular CLI exports and off-site backups. The repository does not define a backup schedule or storage destination. Treat exports as production data, keep them outside the repository, and use a controller-approved secure location. See [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups).

The Supabase CLI requires Docker for `db dump`. From a controlled operator shell with `DIRECT_URL` available, the documented logical export is:

```bash
supabase db dump --remote="$DIRECT_URL" -f roles.sql --role-only
supabase db dump --remote="$DIRECT_URL" -f schema.sql
supabase db dump --remote="$DIRECT_URL" -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

The default dump excludes Supabase-managed schemas, including `auth` and `storage`. It also excludes Storage API objects. The explicit commands separate roles, schema, and data. A database dump is not a backup of guideline files stored through Supabase Storage. See [Supabase CLI backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) and the [`db dump` reference](https://supabase.com/docs/reference/cli/supabase-db-dump).

The documented logical restore is to a new Supabase project. After creating and configuring that project, use `psql` with the generated files and its direct connection string:

```bash
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file roles.sql \
  --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname '<new-project direct connection string>'
```

The source reviewed here does not define an automated restore or a production restore schedule. Validate the export and restore path with synthetic data before relying on it for recovery.

## Retention And Erasure

`User.retentionYears` records a controller-adopted clinical-record retention period. Settings offers seven years as a starting value, not a legal determination. A null value means no period has been adopted. No retention job, TTL, deletion sweep, or backup expiry enforces this setting.

The production API has `AUDIO_RETENTION_HOURS=720` (30 days), adopted in Render on 09/09/26. Audio expires for reads at the recorded time and is swept opportunistically on upload. Consultation erasure deletes the audio row before writing the consultation tombstone. Approval does not delete audio. The retention and deletion details are in [DPIA](../DPIA.md).

Consultation and patient erasure preserve rows as tombstones so linked audit events remain valid. Consultation erasure clears `transcript`, `analysis`, `editedNote`, `editedMedicalRecordNote`, `prescriptions`, and `title`. Patient erasure clears `name`, `nric`, `age`, and `gender`. The consultation-to-audit foreign key uses `ON DELETE RESTRICT`.

Do not change that foreign key to `CASCADE` or hard-delete consultation or patient rows. Either edit could destroy audit history or break its chain. Any new PHI-bearing column must be included in the matching erasure path before it is used.

## Audit Chain Constraints

New audit events form a SHA-256 chain over `prevHash`, event `id`, `action`, `actorId`, `consultationId`, and `createdAt`. A unique `prevHash` prevents two appends from forking from the same head. The `metadata` field is intentionally excluded from the hash, so metadata edits are not detected by chain verification. Rows written before chain support have null hashes and are not retroactively protected.

Deleting or rewriting rows can orphan later events. Deleting rows from the end is detectable only when the verifier compares against a previously recorded known head. The code exports a verifier, but the reviewed sources do not define a production verification command or scheduled integrity check.
