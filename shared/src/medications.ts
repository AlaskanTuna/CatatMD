import { z } from 'zod'

// ─── Prescriptions ───────────────────────────────────────────────────────────

/**
 * The three closed sets a parsed sig resolves to (#311, #312).
 *
 * They live here rather than beside the parser because both sides read them:
 * `backend/src/medications/vocabulary.ts` re-exports them for `parseSig`, and
 * `PrescriptionSchema` below turns them into wire enums. One definition, so a
 * value the parser produces can never fail the schema that stores it.
 *
 * **`every-6-hours` is deliberately distinct from `four-times-daily`.** They are
 * different instructions, and folding them would be the system interpreting what
 * the doctor said rather than recording it.
 */
export const SIG_ROUTES = ['oral', 'topical', 'inhaled', 'nasal'] as const
export type SigRoute = (typeof SIG_ROUTES)[number]

export const SIG_FREQUENCIES = [
  'once-daily',
  'twice-daily',
  'three-times-daily',
  'four-times-daily',
  'every-4-hours',
  'every-6-hours',
  'every-8-hours',
  'every-12-hours',
  'at-night',
  'when-required',
  'immediately',
] as const
export type SigFrequency = (typeof SIG_FREQUENCIES)[number]

export const SIG_FOOD_TIMINGS = ['before', 'after', 'with'] as const
export type SigFoodTiming = (typeof SIG_FOOD_TIMINGS)[number]

/**
 * One medication the doctor dictated and then confirmed (`docs/decisions/`
 * D-001).
 *
 * **Doctor-authored, and separate from `medicationsDispensed` for that reason.**
 * That field is model-extracted from the consultation and carries a verbatim
 * transcript span; this one is spoken deliberately afterwards and confirmed
 * before it is stored. Merging them would put a model's reading and a doctor's
 * decision in one array with no way to tell them apart.
 *
 * `drug` is free text with an optional `lexiconId`, **not** an enum over the
 * lexicon. The `z.enum(corpusIds)` pattern exists on `guidelineId` because the
 * *model* authors citations and must not invent one; here the *doctor* authors
 * the prescription, and a drug outside a URTI-scoped list is a clinician's
 * decision rather than a hallucination. `lexiconId` records when they accepted
 * a lexicon candidate, so provenance is visible without the cliff.
 *
 * Every parsed field is nullable. `parseSig` leaves what it could not read as
 * `null` rather than guessing, and a prescription is stored with the gaps the
 * doctor left rather than with a value nobody said.
 *
 * `dictated` is the verbatim phrase, kept as the evidence the structured fields
 * were derived from, the same role a transcript span plays elsewhere. Since
 * #365 it is the stretch of the dictation belonging to this drug rather than
 * the whole utterance, because one dictation can name several drugs and a
 * phrase quoting all of them says nothing about where this row's dose came
 * from. The bound is 2000 rather than 400 for the same change: at 400 a
 * four-drug prescription was cut off mid-sentence while the doctor was still
 * speaking.
 */
export const PrescriptionSchema = z.object({
  drug: z.string().min(1).max(80),
  lexiconId: z.string().max(80).optional(),
  dose: z.string().max(40).nullable(),
  route: z.enum(SIG_ROUTES).nullable(),
  frequency: z.enum(SIG_FREQUENCIES).nullable(),
  duration: z.string().max(40).nullable(),
  food: z.enum(SIG_FOOD_TIMINGS).nullable(),
  dictated: z.string().min(1).max(2000),
})

/**
 * One lexicon match offered for a drug name the recogniser may have garbled.
 *
 * `heard` and `generic` both travel because the doctor is choosing between
 * them, and `start`/`end` locate the span in the dictation. **Together those are
 * a splice instruction, and nothing may act on it without the doctor.** The
 * matcher guarantees only that it never rewrites text; the confirm step is a
 * control this layer and the UI have to keep, not one they inherit.
 */
export const MedicationCandidateSchema = z.object({
  lexiconId: z.string().max(80),
  generic: z.string().max(80),
  heard: z.string().max(80),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  score: z.number(),
})

/**
 * The sig fields one shared clause ("all of them twice a day", "semua lima
 * hari") may fill on every line that left them unsaid.
 *
 * **`dose` is absent, and that is the rule.** A dose belongs to one drug, and
 * spreading "500 mg" across a list is how paracetamol's dose lands on
 * cetirizine. D-001 amended 06/10/26.
 */
export const SHAREABLE_SIG_FIELDS = ['route', 'frequency', 'duration', 'food'] as const

/**
 * One line of a dictated prescription: the stretch of the dictation it was
 * read from, the drug names heard in it, and its sig.
 *
 * **An empty `candidates` is a line with a dose or sig but no drug name the
 * lexicon knows**, such as "antibiotic 200 mg" or a brand name. It is returned
 * rather than folded into its neighbour so the doctor sees a line nobody named,
 * and the SPA holds Confirm until they name it or dismiss it. No drug is
 * proposed for it.
 *
 * `exact` is true only when the first candidate is the name exactly as heard
 * and no other candidate reaches past it. A near-match, or a single agent
 * inside a combination that was also heard, is never exact.
 *
 * `shared` records each field filled from a shared clause and where that
 * clause sits in the dictation, so the provenance is shown on the line.
 */
export const PrescriptionLineSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  candidates: z.array(MedicationCandidateSchema).max(20),
  exact: z.boolean(),
  sig: PrescriptionSchema.pick({
    dose: true,
    route: true,
    frequency: true,
    duration: true,
    food: true,
  }),
  shared: z
    .array(
      z.object({
        field: z.enum(SHAREABLE_SIG_FIELDS),
        start: z.number().int().nonnegative(),
        end: z.number().int().nonnegative(),
      }),
    )
    .max(SHAREABLE_SIG_FIELDS.length),
})

/**
 * What the parse endpoint returns: a draft, never a stored record.
 *
 * `candidates` is ordered by the matcher (score, then span length, then id) and
 * **must not be re-sorted downstream**. A clinical-safety review on #311 found
 * a contained single agent outranking the combination the doctor actually said,
 * so the ordering is a fix, not a presentation choice.
 */
export const PrescriptionParseResponseSchema = z.object({
  sig: PrescriptionSchema.pick({
    dose: true,
    route: true,
    frequency: true,
    duration: true,
    food: true,
  }),
  /**
   * The offset in `dictated` past which no sig field was read, or `null` when
   * none was.
   *
   * **It is what lets a caller tell where one drug's sig stops.** The parse
   * reads a phrase and not a list, so a slice taken for one drug runs on into
   * the next whenever the matcher offered no candidate to bound it, and a brand
   * name is outside the lexicon by D-001, which makes that the ordinary case.
   * Everything past this offset is text no row can account for (#369).
   *
   * `nullish` rather than required, so a response from an API deployed before
   * this field still parses. `noteTemplate` on `ConsultationSchema` is the
   * precedent. It cannot live inside `sig`, which is a `PrescriptionSchema`
   * pick and may hold only fields a stored prescription has.
   */
  sigReadTo: z.number().int().nonnegative().nullish(),
  candidates: z.array(MedicationCandidateSchema).max(20),
  /**
   * The dictation cut into prescription lines, one per drug said (D-001,
   * amended 06/10/26).
   *
   * `sig`, `sigReadTo` and `candidates` above stay for an SPA deployed before
   * this field. `nullish` for the reverse case, an SPA reaching an API that
   * predates it; `noteTemplate` is the precedent.
   */
  lines: z.array(PrescriptionLineSchema).nullish(),
  /**
   * The generic names in the profile's lexicon, offered as suggestions when
   * the doctor types a drug the matcher did not recognise. A suggestion list,
   * never a constraint: `drug` stays free text.
   */
  generics: z.array(z.string().max(80)).max(200).nullish(),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type Prescription = z.infer<typeof PrescriptionSchema>
export type MedicationCandidateWire = z.infer<typeof MedicationCandidateSchema>
export type PrescriptionParseResponse = z.infer<typeof PrescriptionParseResponseSchema>
export type PrescriptionLine = z.infer<typeof PrescriptionLineSchema>
export type ShareableSigField = (typeof SHAREABLE_SIG_FIELDS)[number]
