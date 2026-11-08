<a id="readme-top"></a>

# Prisma

Prisma schema, migrations, and seed entry points for the Postgres database.

## Models

| Model             | Purpose                                                                |
| ----------------- | ---------------------------------------------------------------------- |
| User              | Doctor account and account-level settings                              |
| Session           | better-auth login sessions                                             |
| Account           | better-auth credential and provider account records                    |
| Verification      | better-auth verification values                                        |
| RateLimit         | Persistent better-auth rate-limit counters                             |
| Patient           | Registered patient identity and ownership                              |
| Consultation      | Transcript, analysis, note edits, review state, and prescriptions      |
| ConsultationAudio | Optional retained recording, stored separately from consultation reads |
| AuditEvent        | Append-only record of event types and identifiers                      |
| GuidelineDocument | Guideline provenance and retrieval scope                               |
| GuidelineChunk    | Searchable text spans for guideline retrieval                          |

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Migration Workflow

Run these from the repository root:

- **Develop:** bun run db:migrate applies local development migrations.
- **Deploy:** bun run db:migrate:deploy applies committed migrations.
- **Inspect:** bun run db:status reports migration state.
- **Generate:** bun run prisma:generate regenerates the Prisma client.

The datasource reads DATABASE_URL for the application connection and DIRECT_URL for migrations. Local development should use the local Postgres settings in .env.example.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Seeds

- **seed.ts:** bun run db:seed creates the configured seeded doctor accounts and guest account through better-auth.
- **Seed-demo.ts:** bun run db:seed:demo signs in as the guest and creates synthetic fixture consultations through the API. It skips fixtures already present.

Both root seed commands build shared/ first.

<p align="right"><a href="#readme-top">&uarr;</a></p>

## Connections And Audit Constraints

DATABASE_URL is the Supavisor pooled connection on port 6543, with pgbouncer=true; the running API uses it. DIRECT_URL uses port 5432 and is reserved for Prisma migrations.

AuditEvent.seq and AuditEvent.prevHash are unique. The previous-hash link prevents a concurrent append from silently forking the chain. The hash covers identifiers and event type, not metadata or clinical content.

AuditEvent.consultation uses onDelete: Restrict. Erasure keeps the consultation row as a tombstone with erasedAt and removes clinical fields, preserving the audit references. Patient erasure follows the same tombstone approach. Retention years are stored as a decision only; the schema does not enforce a retention schedule.

See the [database operations guide](../docs/operations/database.md) for database procedures.

<p align="right"><a href="#readme-top">&uarr;</a></p>
