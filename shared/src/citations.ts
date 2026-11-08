import { z } from 'zod'
import { AssertionStateSchema } from './assertions.js'
import { SpeakerSchema } from './transcript.js'

// ─── Citations ───────────────────────────────────────────────────────────────

/**
 * The model may only cite guideline IDs supplied to it from the corpus.
 * Free-text references fail validation — hallucinated references are
 * structurally impossible rather than merely unlikely.
 */
export const CitationSchema = z.object({
  guidelineId: z.string(),
  /** Optional verbatim span from the cited guideline. */
  quote: z.string().optional(),
})

export const ClinicalSuggestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  citations: z.array(CitationSchema).min(1),
})

/**
 * One established checklist field and the transcript span that evidenced it.
 *
 * `speaker` and `offsetSeconds` are optional and are resolved by locating the
 * span in the transcript rather than asserted by the model. They are omitted
 * when the span cannot be located in exactly one turn, or when the transcript
 * carries no timings (`offsetSeconds` is itself optional on a turn, and a
 * pasted or uploaded transcript has none). Omission means "not resolvable",
 * never "the start of the consultation".
 */
export const EvidenceLinkSchema = z.object({
  /** e.g. `clinicalFacts.symptoms.cough`, `operational.diagnosis`. */
  fieldId: z.string(),
  state: AssertionStateSchema,
  evidence: z.string(),
  speaker: SpeakerSchema.optional(),
  offsetSeconds: z.number().nonnegative().optional(),
  /** Copied from the located turn, so playback can stop where the turn does. */
  endSeconds: z.number().nonnegative().optional(),
})
export type EvidenceLink = z.infer<typeof EvidenceLinkSchema>

/**
 * `verbatimAllowed` is legally load-bearing, not metadata: MOH NAG 2024 is
 * all-rights-reserved and may be summarised and linked but never quoted, while
 * the two CC-licensed sources may be. A `quote` on a chunk that forbids one is
 * a corpus-authoring defect and fails here (docs/trd.md §11).
 */
export const GuidelineChunkSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    publisher: z.string(),
    year: z.number().int(),
    url: z.string().url(),
    /** Short, non-verbatim summary shown in the UI. */
    summary: z.string(),
    sourceLicence: z.string(),
    verbatimAllowed: z.boolean(),
    quote: z.string().optional(),
    /** The ingested document and page a retrieved chunk came from. */
    documentId: z.string().optional(),
    page: z.number().int().optional(),
    /** True when the span was OCRed from a scanned page, so it may carry recognition errors. */
    ocr: z.boolean().optional(),
  })
  .refine((chunk) => chunk.verbatimAllowed || chunk.quote === undefined, {
    path: ['quote'],
    message: 'quote is not permitted on a chunk whose licence forbids verbatim reuse',
  })

/** One ingested guideline document, as listed on the guideline library page. */
export const GuidelineDocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  year: z.number().int(),
  sourceUrl: z.string().url(),
  jurisdiction: z.string(),
  sourceLicence: z.string(),
  pageCount: z.number().int(),
  chunkCount: z.number().int(),
  ingestedAt: z.coerce.date(),
  /** Clinical profiles this document is retrievable for; empty means never. */
  profiles: z.array(z.string()),
  verbatimAllowed: z.boolean(),
})
// ─── Inferred types ──────────────────────────────────────────────────────────

export type Citation = z.infer<typeof CitationSchema>
export type ClinicalSuggestion = z.infer<typeof ClinicalSuggestionSchema>
export type GuidelineChunk = z.infer<typeof GuidelineChunkSchema>
export type GuidelineDocument = z.infer<typeof GuidelineDocumentSchema>
