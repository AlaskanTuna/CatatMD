import { z } from 'zod'
import { DispositionSchema } from './audit.js'
import type { ConsultationStatus } from './consultation.js'
import { ConsultationSchema } from './consultation.js'
import { PrescriptionSchema } from './medications.js'
import { MedicalRecordNoteSchema, SoapNoteSchema } from './note.js'
import { PatientNameSchema, PatientSchema } from './patient.js'
import { MAX_PRESCRIPTIONS } from './transcript.js'

// ─── API contracts (docs/trd.md §13) ─────────────────────────────────────────

/*
 * `title` is the one clinical field this projection carries, and the widening
 * is deliberate rather than incidental.
 *
 * The list was PHI-free: id, status and two timestamps. A title changes that,
 * because a doctor renaming a record will use whatever makes it findable and
 * that is frequently a patient's name. The derived title carries no transcript
 * text by construction (`backend/src/analysis/title.ts`), but a renamed one is
 * free text and is treated as PHI everywhere it matters: erased with the other
 * three columns, never logged, never sent to a provider.
 */
export const ConsultationListItemSchema = ConsultationSchema.pick({
  id: true,
  status: true,
  title: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  /*
   * Who the visit is for, so a row names its patient rather than showing an id
   * fragment nobody reads. The doctor already holds this name on the patient
   * list, and the projection only ever reaches that same doctor. Null for a
   * visit filed to nobody and for an erased patient. Defaulted so a response
   * from an API that predates the field still parses.
   */
  patientName: z.string().nullable().default(null),
})

/**
 * The profile page: the card, plus this patient's visits.
 *
 * The visit list is the same shape the cross-patient queue uses, so one renderer
 * serves both. The two views answer different questions — this one is the file,
 * `/consultations` is the in-tray — but a row is a row.
 */
export const PatientDetailSchema = PatientSchema.extend({
  consultations: z.array(ConsultationListItemSchema),
})

/**
 * The events worth telling a doctor about after the fact (issue #116).
 *
 * A deliberate subset of the audit taxonomy, not all of it. `AuditEvent` records
 * everything that happened, including starts, edits and per-finding
 * dispositions; a feed of that is a log, and a log nobody reads is worse than no
 * feed. These four are the ones with an outcome: work finished, work failed, a
 * record was signed, a record was erased.
 *
 * Everything a notification carries is already constrained to an id and a member
 * of this enum, because the audit row it comes from is. There is no free-text
 * field to leak clinical content into, and that is a property of the substrate
 * rather than a rule this feature has to remember to follow.
 */
export const NotificationActionSchema = z.enum([
  'consultation.analysis_completed',
  'consultation.analysis_failed',
  'consultation.approved',
  'consultation.erased',
])

/**
 * `NotificationItem`, not `Notification`, because the DOM already has a
 * `Notification` global for the Web Notifications API. A shared type shadowing
 * it in browser code is a footgun for whoever later reaches for the real one.
 */
export const NotificationItemSchema = z.object({
  id: z.string(),
  action: NotificationActionSchema,
  /** Absent only on a row written before consultations carried the link. */
  consultationId: z.string().nullable(),
  createdAt: z.coerce.date(),
})

/** How many notifications one request returns. */
export const NOTIFICATION_FEED_LIMIT = 20

/**
 * The demo account's target state, shared so the seed script and the in-app
 * restore cannot drift (issue #123).
 *
 * It lives here rather than in `prisma/seed-demo.ts` because two things now
 * rebuild the demo: that script, and Settings for the guest account. If they
 * disagreed, the account restored from the UI would not be the account the
 * script produces, and only one of them would match what a demo was rehearsed
 * against.
 */
export const DEMO_PLAN = [
  { fixtureId: 'urti-gap-heavy', target: 'awaiting_review' },
  { fixtureId: 'urti-hard-red-flag', target: 'awaiting_review' },
  { fixtureId: 'urti-diagnosis-not-assessed', target: 'awaiting_review' },
  { fixtureId: 'urti-identifier-dense-routine', target: 'approved' },
  { fixtureId: 'urti-hard-uncertain', target: 'draft' },
] as const satisfies readonly { fixtureId: string; target: ConsultationStatus }[]

/**
 * How many consultations one erase request may carry.
 *
 * The handler erases sequentially rather than concurrently, because every
 * erasure appends to the audit hash chain and `AuditEvent.prevHash` is unique
 * precisely so two concurrent appends cannot silently fork it. A batch is
 * therefore a serial run of transactions, and this bound is what keeps its
 * duration predictable.
 *
 * `GET /api/consultations` is unpaginated, so a doctor holding more than this
 * many cannot clear them in a single gesture. That is a known edge of the
 * missing pagination rather than of erasure, and it fails loudly at validation
 * instead of silently erasing a prefix of the selection.
 */
export const ERASE_BATCH_LIMIT = 100

export const EraseConsultationsInputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(ERASE_BATCH_LIMIT),
})

/**
 * Partial success is a real outcome here, so it is in the contract rather than
 * collapsed into a status code. An id lands in `failed` when the ownership gate
 * refuses it, which covers both "not this doctor's" and "already erased" and
 * deliberately does not distinguish them, for the same reason
 * `assertOwnedConsultation` returns 404 rather than 403.
 */
export const EraseConsultationsResultSchema = z.object({
  erased: z.array(z.string()),
  failed: z.array(z.string()),
})

/**
 * One patient per request, deliberately. An erasure here cascades to every
 * consultation filed under the patient, which makes a single one heavier than
 * any direct consultation erase, so there is no batch shape to widen into.
 * Ids only, like every result above — never a name or an NRIC.
 */
export const ErasePatientResultSchema = z.object({
  patientId: z.string(),
  erasedConsultationIds: z.array(z.string()),
})

export const ConsultationDetailSchema = ConsultationSchema.extend({
  editedNote: SoapNoteSchema.nullable(),
  editedMedicalRecordNote: MedicalRecordNoteSchema.nullish().transform((value) => value ?? null),
  /*
   * Nullish rather than required, like every field added after launch. Vercel
   * and Render deploy independently from one merge and the SPA `safeParse`s
   * every response, so a required new field breaks the SPA against the older
   * API for the length of one deploy skew.
   */
  prescriptions: z
    .array(PrescriptionSchema)
    .max(MAX_PRESCRIPTIONS)
    .nullish()
    .transform((value) => value ?? null),
  approvedAt: z.coerce.date().nullable(),
  /**
   * The clinician who approved, by name, and `null` until one has.
   *
   * Stated by the server rather than inferred by the client from the session.
   * Today a consultation is only ever visible to the account that owns it, so
   * the viewer and the approver are provably the same person and the client
   * could shortcut this. That equivalence is an access-control property, not a
   * fact about the document: the moment a clinic or admin boundary exists, a
   * note would start being attributed to whoever opened it. An approval is the
   * transition that makes the record someone's, so who performed it belongs in
   * the payload.
   *
   * A name is not an identifier. A production deployment needs an MMC
   * registration number, which the schema does not carry today.
   */
  approvedBy: z.string().nullable(),
  /**
   * The patient this visit is filed to, or `null` when it was captured without
   * one — a pasted, uploaded or ad-hoc consultation.
   *
   * Carried on the detail payload rather than left to a second request,
   * because a doctor reading a note has to be able to see whose note it is
   * without leaving the screen. Only `id` and `name`: the profile holds the
   * rest, and a review screen has no use for an identity number.
   *
   * Absent reads as "no patient", rather than failing the parse, for the same
   * rollout reason `title` documents above — Vercel and Render deploy from
   * their own triggers on one merge, so a new SPA reaches the old API for as
   * long as the slower build takes.
   */
  patient: z
    .object({ id: z.string(), name: PatientNameSchema.nullable() })
    .nullish()
    .transform((value) => value ?? null),
  acknowledgedRedFlagIds: z.array(z.string()),
  reviewedGapIds: z.array(z.string()),
  /**
   * What the doctor decided about each red flag and each gap (issue #10, AC4).
   *
   * Kept alongside `acknowledgedRedFlagIds` rather than replacing it, because
   * consultations reviewed before this shipped carry only the boolean form.
   * Those rows project forward as `acknowledged`, which is what they meant, and
   * no data migration is needed to read them.
   */
  redFlagDispositions: z.array(DispositionSchema),
  gapDispositions: z.array(DispositionSchema),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type ConsultationListItem = z.infer<typeof ConsultationListItemSchema>
export type PatientDetail = z.infer<typeof PatientDetailSchema>
export type ConsultationDetail = z.infer<typeof ConsultationDetailSchema>
export type NotificationAction = z.infer<typeof NotificationActionSchema>
export type NotificationItem = z.infer<typeof NotificationItemSchema>
export type EraseConsultationsInput = z.infer<typeof EraseConsultationsInputSchema>
export type EraseConsultationsResult = z.infer<typeof EraseConsultationsResultSchema>
export type ErasePatientResult = z.infer<typeof ErasePatientResultSchema>
