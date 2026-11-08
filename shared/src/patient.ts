import { z } from 'zod'

/*
 * ─── Patient ────────────────────────────────────────────────────────────────
 *
 * Registration, as reception performs it: a card is created before the doctor
 * sees anyone, and the consultation is filed against it. Consultations were
 * previously standalone, so this is the first longitudinal store in the system
 * and the first place identity is held rather than inferred.
 *
 * Two consequences follow, and neither is incidental.
 *
 * **It is a PHI store by construction, not by accident.** `Consultation` holds
 * four PHI columns that are all derived from a transcript. These are entered by
 * a human and are the identity itself, which is a stricter class. Every field
 * here is erasable, and `erasedAt` carries the same tombstone semantics as
 * `Consultation.erasedAt`: the row survives because `AuditEvent` chains on ids,
 * and the identifying values are nulled.
 *
 * **It makes de-identification exact rather than probabilistic.** Detection in
 * `backend/src/deid/` is pattern- and gazetteer-based, and is documented as
 * best-effort in `docs/prd.md` §12. A registered patient supplies a known
 * identifier list for the consultation, so the vault can be seeded with real
 * values and the detectors demoted to a backstop for whatever was never
 * registered — a spouse named in passing, a number read aloud.
 */

/**
 * Recorded sex, as stated at registration.
 *
 * Kept because it is clinically load-bearing rather than merely descriptive:
 * suggestion and red-flag reasoning differ by sex, and a note generated without
 * it is wrong rather than vague. It is a quasi-identifier and is treated as one
 * — erasable here, and never the basis of a lookup.
 */
export const PatientGenderSchema = z.enum(['male', 'female', 'other'])

/**
 * Age in years at registration, not a date of birth.
 *
 * Deliberate, and the reasoning is the same line the de-identification gate
 * already draws: `DOB` is one of its seven detectors because a date of birth is
 * a direct identifier, while age is a clinical attribute the model needs in
 * order to reason correctly. Storing the weaker of the two is the same choice,
 * made one layer earlier.
 *
 * The cost is that it goes stale, which is acceptable while a patient card is
 * scoped to a course of visits rather than a lifetime record, and is the number
 * reception writes down today.
 */
export const PatientAgeSchema = z.number().int().min(0).max(130)

/**
 * Malaysian identity card number.
 *
 * Optional, because a walk-in without one must still be registerable — refusing
 * to create the record would push the consultation outside the system entirely,
 * which is worse for both privacy and the note. Structural validation lives in
 * `backend/src/deid/nric.ts` and is not duplicated here; this bounds length so
 * an unbounded string cannot be filed in the field.
 */
export const PatientNricSchema = z.string().trim().min(1).max(20)

export const PatientNameSchema = z.string().trim().min(1).max(120)

export const PatientSchema = z.object({
  id: z.string(),
  name: PatientNameSchema.nullable(),
  nric: PatientNricSchema.nullable(),
  age: PatientAgeSchema.nullable(),
  gender: PatientGenderSchema.nullable(),
  /** Set when the record is tombstoned; every identifying field is null by then. */
  erasedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

/**
 * Registration input. Only the name is required, matching what a receptionist
 * can always obtain; everything else is filled when the patient supplies it.
 */
export const CreatePatientInputSchema = z.object({
  name: PatientNameSchema,
  nric: PatientNricSchema.nullish(),
  age: PatientAgeSchema.nullish(),
  gender: PatientGenderSchema.nullish(),
})

export const UpdatePatientInputSchema = CreatePatientInputSchema.partial()

/**
 * The directory row.
 *
 * Carries `consultationCount` so the list can show visit history without a
 * second request per row, and deliberately omits `nric`: a directory is browsed
 * far more often than it is acted on, and the strongest identifier in the system
 * has no reason to be on screen during browsing.
 */
export const PatientListItemSchema = PatientSchema.pick({
  id: true,
  name: true,
  age: true,
  gender: true,
  erasedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  consultationCount: z.number().int().min(0),
  /**
   * When this patient was last seen, derived from their newest unerased
   * consultation — **not** from `updatedAt`, which moves whenever the card is
   * edited and would report a corrected phone number as a visit.
   *
   * Null means never seen, which is a real state: reception registers a patient
   * before the doctor has met them, so a card with no visit is the normal case
   * for the length of a waiting room.
   */
  lastSeenAt: z.string().datetime().nullable(),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type PatientGender = z.infer<typeof PatientGenderSchema>
export type Patient = z.infer<typeof PatientSchema>
export type CreatePatientInput = z.infer<typeof CreatePatientInputSchema>
export type UpdatePatientInput = z.infer<typeof UpdatePatientInputSchema>
export type PatientListItem = z.infer<typeof PatientListItemSchema>
