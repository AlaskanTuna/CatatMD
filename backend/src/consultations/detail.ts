import type { Consultation, Prisma } from '@prisma/client'
import { type ConsultationAnalysis, ConsultationDetailSchema } from '@shared/types'
import { ProfileIdSchema } from '../clinical-profiles/index.js'
import { withGapProvenance } from '../gaps/index.js'
import { withLegacyCitations } from '../guidelines/index.js'
import { prisma } from '../lib/prisma.js'

/**
 * Maps a persisted row onto the wire contract, validating on the way out — the
 * JSON columns are `Json?` to Prisma, so this is the only place their shape is
 * actually checked.
 */
/**
 * Reads dispositions, projecting a pre-#10 row forward rather than migrating it.
 *
 * A consultation reviewed before dispositions existed carries only a list of
 * ids, and every id in it meant "acknowledged". Deriving that on read is
 * lossless and leaves the stored data untouched, which is preferable to a
 * backfill that rewrites clinical review history to fit a newer shape.
 *
 * `decidedAt` is unknowable for those rows. `updatedAt` is the closest honest
 * answer: the decision happened at or before the row was last written.
 */
function dispositionsFor(
  stored: Prisma.JsonValue | null,
  legacyIds: Prisma.JsonValue | null,
  fallbackAt: Date,
) {
  if (stored !== null && stored !== undefined) return stored
  return ((legacyIds as string[] | null) ?? []).map((id) => ({
    id,
    state: 'acknowledged' as const,
    decidedAt: fallbackAt,
  }))
}

function persistedProfileId(analysis: Prisma.JsonValue | null) {
  if (analysis === null || typeof analysis !== 'object' || Array.isArray(analysis)) return undefined

  const parsed = ProfileIdSchema.safeParse((analysis as Record<string, unknown>).profileId)
  return parsed.success ? parsed.data : undefined
}

export function toDetail(
  row: Consultation,
  approvedBy: string | null = null,
  patient: { id: string; name: string | null } | null = null,
) {
  const analysis =
    row.analysis === null || row.analysis === undefined
      ? null
      : withGapProvenance(
          withLegacyCitations(row.analysis as unknown as ConsultationAnalysis | null),
        )

  const detail = ConsultationDetailSchema.parse({
    id: row.id,
    status: row.status,
    // `?? null` for the same reason the JSON columns below carry it: a row
    // built before this column existed, or by a caller that did not select it,
    // arrives as `undefined`, and the contract distinguishes "no title" from
    // "field absent" only by rejecting the second.
    title: row.title ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    transcript: row.transcript ?? null,
    analysis,
    editedNote: row.editedNote ?? null,
    editedMedicalRecordNote: row.editedMedicalRecordNote ?? null,
    prescriptions: row.prescriptions ?? null,
    noteTemplate: row.noteTemplate ?? 'soap',
    /*
     * Not the default a new consultation gets, which is `ambient` and is
     * written at the create route below (#378). `row` is the full Prisma model
     * and the column is `NOT NULL`, so this branch is statically unreachable
     * outside the suite's stand-in store. It stays `manual` because that is the
     * reading that understates the egress rather than claiming one that did
     * not happen.
     */
    captureMode: row.captureMode ?? 'manual',
    approvedAt: row.approvedAt,
    approvedBy,
    patient,
    acknowledgedRedFlagIds: row.acknowledgedRedFlagIds ?? [],
    reviewedGapIds: row.reviewedGapIds ?? [],
    redFlagDispositions: dispositionsFor(
      row.redFlagDispositions,
      row.acknowledgedRedFlagIds,
      row.updatedAt,
    ),
    gapDispositions: dispositionsFor(row.gapDispositions, row.reviewedGapIds, row.updatedAt),
  })

  /*
   * `profileId` predates the shared detail schema and lives inside the
   * analysis JSON rather than as a column. Preserve this one validated key so
   * CatatAI can select the same corpus as the analysis; legacy analyses keep
   * the schema's ordinary shape and therefore use its default profile.
   */
  const profileId = persistedProfileId(row.analysis)
  if (profileId === undefined || detail.analysis === null) return detail

  return {
    ...detail,
    analysis: { ...detail.analysis, profileId },
  }
}

/**
 * Attaches the approving clinician's name (issue #26).
 *
 * Resolved from `doctorId` rather than from the approval audit event, because
 * `assertOwnedConsultation` scopes every read and write on that column, so the
 * owner is the only account that can reach the approve transition at all. If a
 * clinic or admin boundary is ever added, that stops being true and the actor
 * on the `consultation.approved` event becomes the authority instead. The
 * `AuditEvent` row already records it, so the fix is a join, not a migration.
 *
 * Costs a query only on approved consultations; there is nothing to name until
 * the transition has happened.
 */
/** Exported so the copilot route projects a consultation exactly as GET does. */
export async function toDetailWithApprover(row: Consultation) {
  /*
   * Resolved on every read, not only after approval, because a doctor reading
   * an unapproved note needs to know whose note it is just as much — arguably
   * more, since that is the point at which they can still act on it.
   *
   * An erased patient resolves to null rather than to a tombstoned name: the
   * filing link survives for the audit chain, but nothing identifying should
   * come back through a screen after erasure.
   */
  const patient = row.patientId
    ? await prisma.patient.findFirst({
        where: { id: row.patientId, erasedAt: null },
        select: { id: true, name: true },
      })
    : null

  if (row.approvedAt === null) return toDetail(row, null, patient)

  const doctor = await prisma.user.findUnique({
    where: { id: row.doctorId },
    select: { name: true },
  })
  return toDetail(row, doctor?.name ?? null, patient)
}
