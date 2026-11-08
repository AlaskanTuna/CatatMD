import type { Consultation, Prisma } from '@prisma/client'
import {
  CaptureModeSchema,
  ConsultationAnalysisSchema,
  ConsultationTitleSchema,
  type Disposition,
  type DispositionInput,
  DispositionInputSchema,
  MAX_PRESCRIPTIONS,
  type MedicalRecordNote,
  MedicalRecordNoteSchema,
  NoteTemplateSchema,
  PrescriptionSchema,
  type SoapNote,
  SoapNoteSchema,
  type Transcript,
  TranscriptSchema,
  toSoapNote,
} from '@shared/types'
import { z } from 'zod'
import { recordAuditEvent } from '../audit/index.js'
import { HttpError } from '../lib/http-error.js'
import { prisma } from '../lib/prisma.js'

export const PatchBodySchema = z
  .object({
    /*
     * Renaming stays available after approval, and that is a decision rather
     * than an oversight.
     *
     * `approved` is terminal and no clinical content may change after it. A
     * filing label is not clinical content: it is how the record is found
     * later, and an approved consultation is precisely the one somebody will
     * need to find. Locking it would make the archive unsearchable at exactly
     * the moment it starts being an archive. The note, the flags and the
     * dispositions remain immutable, and every rename writes an audit event, so
     * the change is attributable.
     */
    title: ConsultationTitleSchema.optional(),
    /*
     * Captured into the record after it exists, which is what lets the capture
     * panel live on the consultation screen rather than on a page of its own.
     *
     * Gated to `draft` below, and deliberately not folded into the
     * `awaiting_review` gate the clinical fields use: those two states protect
     * opposite things. A transcript may only be set *before* anything has been
     * derived from it, because every finding, gap and evidence span is anchored
     * to it — replacing it afterwards would leave an analysis attributed to
     * words nobody said.
     */
    transcript: TranscriptSchema.optional(),
    editedNote: SoapNoteSchema.partial().optional(),
    editedMedicalRecordNote: MedicalRecordNoteSchema.partial().optional(),
    /*
     * The whole confirmed list, not a delta. A prescription is authored by the
     * doctor rather than merged into a server-side base like the note fields
     * above, so there is nothing to merge onto and a partial would be
     * ambiguous about whether an absent entry was removed or untouched.
     */
    prescriptions: z.array(PrescriptionSchema).max(MAX_PRESCRIPTIONS).optional(),
    noteTemplate: NoteTemplateSchema.optional(),
    captureMode: CaptureModeSchema.optional(),
    acknowledgedRedFlagIds: z.array(z.string()).optional(),
    reviewedGapIds: z.array(z.string()).optional(),
    redFlagDispositions: z.array(DispositionInputSchema).optional(),
    gapDispositions: z.array(DispositionInputSchema).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'empty patch' })
  /*
   * Capture is patched on its own, because it returns early below. Accepting a
   * transcript alongside a clinical field would take the capture branch and
   * silently drop the rest, which is worse than refusing the request.
   */
  .refine((body) => body.transcript === undefined || Object.keys(body).length === 1, {
    message: 'transcript must be patched on its own',
  })
  .refine((body) => body.editedNote === undefined || body.editedMedicalRecordNote === undefined, {
    message: 'supply one note edit representation at a time',
  })

export type ConsultationPatch = z.infer<typeof PatchBodySchema>

/**
 * Whether an ambient transcript's recording also went to the refinement vendor
 * after Stop, and whether its transcript was kept (#436). Two booleans because
 * a refused refinement still sent the audio, and a row that could only say
 * "refined" would hide that egress.
 */
export function batchMetadata(transcript: Transcript): {
  batchUploaded: boolean
  batchUsed: boolean
} {
  return {
    batchUploaded: transcript.batchTranscription !== undefined,
    batchUsed: transcript.batchTranscription?.used === true,
  }
}

/**
 * Applies decisions onto the stored set, last decision per id winning.
 *
 * A doctor revising a judgement is legitimate, so this is not append-only the
 * way `acknowledgedRedFlagIds` is. The invariant that column protects is
 * untouched by that: the red flag itself still lives in `analysis` and is never
 * removed or downgraded here, and every change writes an `AuditEvent`, so the
 * history of a reversal survives even though only the current state is stored.
 */
function applyDispositions(
  stored: Prisma.JsonValue | null,
  incoming: DispositionInput[],
  decidedAt: Date,
) {
  const next = new Map(
    ((stored as Disposition[] | null) ?? []).map((entry) => [entry.id, entry] as const),
  )
  for (const decision of incoming) {
    next.set(decision.id, { ...decision, decidedAt })
  }
  return [...next.values()]
}

export async function updateConsultation(
  consultation: Consultation,
  patch: ConsultationPatch,
  actor: string,
): Promise<Consultation> {
  /*
   * The state gate applies to clinical content, and a filing name is not
   * clinical content.
   *
   * A rename carries no note text, no finding and no disposition, so nothing it
   * can change is part of the record `approved` freezes. Letting it through is
   * what keeps an archive searchable, since the consultations somebody needs to
   * find later are exactly the signed ones. Any patch touching anything else
   * still meets the original gate unchanged, and a mixed patch is judged by the
   * clinical half rather than excused by the title.
   */
  const presentationOnly = Object.keys(patch).every(
    (key) => key === 'title' || key === 'noteTemplate' || key === 'captureMode',
  )

  if (patch.captureMode !== undefined && consultation.transcript !== null) {
    throw new HttpError(409, 'invalid_state', 'Capture Mode is locked after transcript capture.')
  }

  /*
   * Capture has the opposite gate to every other field: a transcript may only
   * be set while the record is still `draft`, because everything downstream is
   * anchored to it. It is checked before the clinical gate rather than beside
   * it, so a transcript patch is never excused by a state that exists to
   * protect derived content.
   */
  if (patch.transcript !== undefined) {
    if (consultation.status !== 'draft') {
      throw new HttpError(
        409,
        'invalid_state',
        'The transcript can only be set before the consultation is analysed.',
      )
    }
    const captured = await prisma.consultation.update({
      where: { id: consultation.id },
      data: {
        transcript: patch.transcript,
        /*
         * Reconciled in the same write that closes the lock, because this is
         * the last moment the mode can be made true (#378).
         *
         * `asr_live` is the only source that means the browser streamed to the
         * provider, so anything else is a consultation captured some other way
         * and the mode says so, whatever it was configured to before. A doctor
         * who opened in ambient and then pasted, uploaded, or recorded
         * press-to-record leaves a row that claims a stream that never
         * happened, and it is uncorrectable from the next line onward.
         *
         * Server-side rather than in the browser, and that is the whole point:
         * the Record tab also moves the mode when ambient is unavailable, but
         * that write can fail, and the failure is silent enough that the
         * doctor carries on recording. This one cannot be skipped.
         */
        ...(patch.transcript.source === 'asr_live' ? {} : { captureMode: 'manual' }),
      },
    })
    await recordAuditEvent({
      action: 'consultation.edited',
      actorId: actor,
      consultationId: consultation.id,
    })
    /*
     * Recorded here as well as on create, because capture moved: a hosted
     * transcript now usually arrives by this route rather than with the row.
     * Losing the fact on the path that became the common one would have made
     * the audit trail quietly stop answering which consultations used a hosted
     * relay (docs/TRD.md §15).
     */
    if (patch.transcript.source === 'asr_hosted') {
      await recordAuditEvent({
        action: 'consultation.asr_hosted_used',
        actorId: actor,
        consultationId: consultation.id,
      })
    }
    if (patch.transcript.source === 'asr_live') {
      await recordAuditEvent({
        action: 'consultation.asr_live_used',
        actorId: actor,
        consultationId: consultation.id,
        metadata: batchMetadata(patch.transcript),
      })
    }
    return captured
  }

  if (!presentationOnly && consultation.status !== 'awaiting_review') {
    throw new HttpError(
      409,
      'invalid_state',
      consultation.status === 'approved'
        ? 'An approved consultation is final and cannot be edited.'
        : 'This consultation is not open for review.',
    )
  }

  /**
   * The PATCH body is a `Partial<SoapNote>`, but `editedNote` on the wire is a
   * complete `SoapNote` — so a partial edit has to land on a complete base.
   * That base is the doctor's existing copy, or the AI's note the first time
   * they touch it. Merging onto `{}` instead would persist a half-note that
   * fails validation on the way back out.
   *
   * `analysis.note` is only ever *read* here. The AI's original output is
   * never written to, so the two stay independently inspectable.
   */
  let nextEditedNote: SoapNote | undefined
  let nextEditedMedicalRecordNote: MedicalRecordNote | undefined
  if (patch.editedMedicalRecordNote !== undefined) {
    const base =
      consultation.editedMedicalRecordNote ??
      (consultation.analysis as { medicalRecordNote?: unknown } | null)?.medicalRecordNote ??
      null
    const merged = MedicalRecordNoteSchema.safeParse({
      ...(base as Record<string, unknown> | null),
      ...patch.editedMedicalRecordNote,
    })
    if (!merged.success) {
      throw new HttpError(
        409,
        'invalid_state',
        'This consultation has no categorized note to edit yet.',
      )
    }
    nextEditedMedicalRecordNote = merged.data
    nextEditedNote = toSoapNote(merged.data)
  }
  if (patch.editedNote !== undefined) {
    const storedAnalysis = ConsultationAnalysisSchema.safeParse(consultation.analysis)
    if (storedAnalysis.success && storedAnalysis.data.medicalRecordNote !== undefined) {
      throw new HttpError(409, 'invalid_state', 'This categorized note must be edited by category.')
    }
    const base =
      consultation.editedNote ?? (consultation.analysis as { note?: unknown } | null)?.note ?? null
    const merged = SoapNoteSchema.safeParse({
      ...(base as Record<string, unknown> | null),
      ...patch.editedNote,
    })
    if (!merged.success) {
      throw new HttpError(409, 'invalid_state', 'This consultation has no note to edit yet.')
    }
    nextEditedNote = merged.data
  }

  // Acknowledgment is additive: a red flag can be acknowledged, never removed,
  // and the AI's own output in `analysis` is never overwritten by an edit.
  const previousFlags = new Set((consultation.acknowledgedRedFlagIds as string[] | null) ?? [])
  const previousGaps = new Set((consultation.reviewedGapIds as string[] | null) ?? [])
  const newFlags = (patch.acknowledgedRedFlagIds ?? []).filter((id) => !previousFlags.has(id))
  const newGaps = (patch.reviewedGapIds ?? []).filter((id) => !previousGaps.has(id))

  /*
   * A decision is only an event when it changes something. Re-sending the same
   * state on an unrelated patch would otherwise fill the audit trail with
   * restatements and bury the reversals, which are the entries anyone reading
   * this back actually cares about.
   */
  const decidedAt = new Date()
  const priorFlagState = new Map(
    ((consultation.redFlagDispositions as Disposition[] | null) ?? []).map(
      (entry) => [entry.id, entry] as const,
    ),
  )
  const priorGapState = new Map(
    ((consultation.gapDispositions as Disposition[] | null) ?? []).map(
      (entry) => [entry.id, entry] as const,
    ),
  )
  const changed = (prior: Map<string, Disposition>, decision: DispositionInput) => {
    const before = prior.get(decision.id)
    return before?.state !== decision.state || before?.reason !== decision.reason
  }
  const flagDecisions = (patch.redFlagDispositions ?? []).filter((d) => changed(priorFlagState, d))
  const gapDecisions = (patch.gapDispositions ?? []).filter((d) => changed(priorGapState, d))

  const updated = await prisma.consultation.update({
    where: { id: consultation.id },
    data: {
      ...(patch.title === undefined ? {} : { title: patch.title }),
      ...(patch.noteTemplate === undefined ? {} : { noteTemplate: patch.noteTemplate }),
      ...(patch.captureMode === undefined ? {} : { captureMode: patch.captureMode }),
      ...(nextEditedNote === undefined ? {} : { editedNote: nextEditedNote }),
      ...(nextEditedMedicalRecordNote === undefined
        ? {}
        : { editedMedicalRecordNote: nextEditedMedicalRecordNote }),
      ...(patch.prescriptions === undefined ? {} : { prescriptions: patch.prescriptions }),
      ...(patch.acknowledgedRedFlagIds === undefined
        ? {}
        : { acknowledgedRedFlagIds: [...previousFlags, ...newFlags] }),
      ...(patch.reviewedGapIds === undefined
        ? {}
        : { reviewedGapIds: [...previousGaps, ...newGaps] }),
      ...(patch.redFlagDispositions === undefined
        ? {}
        : {
            redFlagDispositions: applyDispositions(
              consultation.redFlagDispositions,
              patch.redFlagDispositions,
              decidedAt,
            ),
          }),
      ...(patch.gapDispositions === undefined
        ? {}
        : {
            gapDispositions: applyDispositions(
              consultation.gapDispositions,
              patch.gapDispositions,
              decidedAt,
            ),
          }),
    },
  })

  if (patch.title !== undefined) {
    await recordAuditEvent({
      action: 'consultation.renamed',
      actorId: actor,
      consultationId: consultation.id,
    })
  }
  if (patch.editedNote !== undefined) {
    await recordAuditEvent({
      action: 'consultation.edited',
      actorId: actor,
      consultationId: consultation.id,
    })
  }
  if (patch.editedMedicalRecordNote !== undefined) {
    await recordAuditEvent({
      action: 'consultation.edited',
      actorId: actor,
      consultationId: consultation.id,
    })
  }
  if (patch.prescriptions !== undefined) {
    await recordAuditEvent({
      action: 'consultation.prescription_recorded',
      actorId: actor,
      consultationId: consultation.id,
      metadata: { prescriptionCount: patch.prescriptions.length },
    })
  }

  if (patch.noteTemplate !== undefined) {
    await recordAuditEvent({
      action: 'consultation.template_selected',
      actorId: actor,
      consultationId: consultation.id,
      metadata: { template: patch.noteTemplate },
    })
  }
  for (const redFlagId of newFlags) {
    await recordAuditEvent({
      action: 'redflag.acknowledged',
      actorId: actor,
      consultationId: consultation.id,
      metadata: { redFlagId },
    })
  }
  for (const gapId of newGaps) {
    await recordAuditEvent({
      action: 'gap.reviewed',
      actorId: actor,
      consultationId: consultation.id,
      metadata: { gapId },
    })
  }

  /*
   * The decision is audited; the reason text is not.
   *
   * A dismissal reason is clinician free text about a specific patient, so it
   * is clinical content and falls under the same rule as note bodies and
   * transcripts: ids and event types only. It is stored once, on the
   * consultation, which is the clinical record and the right home for it.
   * Copying it into `AuditEvent` would put unredacted clinical prose in a
   * second table whose whole purpose is to be widely readable for verification.
   */
  for (const decision of flagDecisions) {
    await recordAuditEvent({
      action: 'redflag.disposition_set',
      actorId: actor,
      consultationId: consultation.id,
      metadata: { redFlagId: decision.id, state: decision.state },
    })
  }
  for (const decision of gapDecisions) {
    await recordAuditEvent({
      action: 'gap.disposition_set',
      actorId: actor,
      consultationId: consultation.id,
      metadata: { gapId: decision.id, state: decision.state },
    })
  }

  return updated
}
