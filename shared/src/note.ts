import { z } from 'zod'

// ─── Structured clinical note (SOAP) ─────────────────────────────────────────

export const SoapNoteSchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
})

export const NoteTemplateSchema = z.enum(['soap', 'malaysian'])
export const CaptureModeSchema = z.enum(['ambient', 'manual'])

/**
 * One canonical note that can be rendered in either supported record order.
 *
 * The five history fields are kept separate because a free-text SOAP
 * Subjective cannot be split back into PC/HPC/PMH/SH/FH without guessing.
 * Objective, Assessment and Plan stay on the same object so switching the
 * presentation never drops the rest of the clinical record.
 */
export const MedicalRecordNoteSchema = z.object({
  presentingComplaint: z.string(),
  historyOfPresentingComplaint: z.string(),
  pastMedicalHistory: z.string(),
  socialHistory: z.string(),
  familyHistory: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type SoapNote = z.infer<typeof SoapNoteSchema>
export type NoteTemplate = z.infer<typeof NoteTemplateSchema>
export type CaptureMode = z.infer<typeof CaptureModeSchema>
export type MedicalRecordNote = z.infer<typeof MedicalRecordNoteSchema>
