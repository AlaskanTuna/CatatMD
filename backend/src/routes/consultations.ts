import {
  ConsultationAnalysisSchema,
  ConsultationListItemSchema,
  ERASE_BATCH_LIMIT,
  EraseConsultationsInputSchema,
  LiveAnalysisResponseSchema,
  LiveAnalysisStateSchema,
  LiveFlagsResponseSchema,
  MAX_LIVE_DELTA_CHARACTERS,
  MAX_LIVE_DELTA_TURNS,
  MAX_TRANSCRIPT_TURNS,
  PrescriptionParseResponseSchema,
  STALE_ANALYSIS_MS,
  type TranscriptCleanupStatus,
  TranscriptCorrectionsResponseSchema,
  TranscriptSchema,
} from '@shared/types'
import { type RequestHandler, Router } from 'express'
import { z } from 'zod'
import { analyseLiveWindow, foldFacts, foldOperational } from '../analysis/live.js'
import { deriveConsultationTitle } from '../analysis/title.js'
import { audioRetentionEnabled, readAudio, storeAudio, sweepExpiredAudio } from '../audio/index.js'
import { eraseConsultation } from '../audit/erasure.js'
import {
  getAuditHistory,
  recordAuditEvent,
  type TranscriptCleanupFailureReason,
} from '../audit/index.js'
import {
  DEFAULT_PROFILE_ID,
  getClinicalProfile,
  ProfileIdSchema,
} from '../clinical-profiles/index.js'
import { getActiveClinicalVersions } from '../clinical-versions/index.js'
import { env } from '../config/env.js'
import {
  batchMetadata,
  classifyFailure,
  PatchBodySchema,
  rehydrateAssertions,
  runAnalysis,
  toDetailWithApprover,
  updateConsultation,
} from '../consultations/index.js'
import { DeidentificationError, deidentifyTranscript } from '../deid/index.js'
import { deriveGaps } from '../gaps/index.js'
import { assertOwnedConsultation, assertOwnedPatient } from '../lib/authz.js'
import { HttpError } from '../lib/http-error.js'
import { getLLMDescriptor } from '../lib/llm/index.js'
import { logger, timeStage } from '../lib/logger.js'
import { prisma } from '../lib/prisma.js'
import {
  lexiconFor,
  matchMedication,
  parsePrescriptionLines,
  parseSigWithSpan,
} from '../medications/index.js'
import { inFlightGate, parseAudioBody } from '../middleware/audio-body.js'
import { evaluateRedFlags, proposeMishearCorrections } from '../redflags/index.js'
import { proposeModelCorrections } from '../transcript-cleanup/index.js'

export { toDetailWithApprover }

export const consultationsRouter = Router()

/** `req.doctorId` is set by `requireSession`, which guards every route here. */
/** Exported for the copilot route, which is scoped to a consultation too. */
export function doctorId(req: { doctorId?: string }): string {
  if (!req.doctorId) throw new HttpError(401, 'unauthenticated', 'Authentication required.')
  return req.doctorId
}

// ─── Routes (docs/trd.md §13) ────────────────────────────────────────────────

consultationsRouter.get('/', async (req, res) => {
  const rows = await prisma.consultation.findMany({
    where: { doctorId: doctorId(req), erasedAt: null },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      status: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      patient: { select: { name: true } },
    },
  })

  res.json({
    consultations: rows.map(({ patient, ...row }) =>
      ConsultationListItemSchema.parse({ ...row, patientName: patient?.name ?? null }),
    ),
  })
})

/*
 * `patientId` is optional and stays optional. Four of the five capture modes —
 * paste, upload, fixture, and an ad-hoc recording — begin without a registered
 * patient, and requiring one would push that work outside the system rather
 * than into it. Only the queue path carries an id.
 */
/*
 * The transcript is optional, because a consultation is now created *before*
 * it is captured: the doctor opens the patient, the record exists, and the
 * capture panel writes into it. Requiring one here forced the old two-screen
 * flow, where a transcript was assembled somewhere else and the record only
 * came into being once it was complete.
 *
 * A consultation with no transcript is a real, reachable state and is exactly
 * what the capture panel renders against — not an incomplete row.
 */
const CreateBodySchema = z.object({
  transcript: TranscriptSchema.optional(),
  patientId: z.string().nullish(),
})

consultationsRouter.post('/', async (req, res) => {
  const parsed = CreateBodySchema.safeParse(req.body)
  if (!parsed.success) {
    throw new HttpError(400, 'invalid_body', 'A valid transcript is required.')
  }

  const actor = doctorId(req)

  /*
   * Filed against a patient only after that patient is proven to be this
   * doctor's. Writing the id straight through would let a caller attach a
   * consultation to someone else's patient row, which is the ownership boundary
   * failing in the one direction a read-side check never catches.
   */
  if (parsed.data.patientId) {
    await assertOwnedPatient(parsed.data.patientId, actor)
  }

  const created = await prisma.consultation.create({
    data: {
      doctorId: actor,
      status: 'draft',
      transcript: parsed.data.transcript ?? undefined,
      patientId: parsed.data.patientId ?? null,
      /*
       * Written rather than left to the column default (#378), because the two
       * are applied by different hands at different times: migrations run from
       * a dev machine and the API deploys on a merge (docs/trd.md §17). Stating
       * it here means a backend that ships ahead of its migration still opens a
       * consultation where the doctor expects it, and it is what lets a test
       * see the default at all, since the suite's store has no column defaults.
       *
       * **Only where nothing contradicts it.** A transcript arriving with the
       * request was captured before this row existed, and the mode locks the
       * moment it lands, so an unconditional `'ambient'` would stamp a pasted,
       * uploaded or fixture-seeded consultation with a claim that audio
       * streamed to the provider, permanently and with no way to correct it.
       * That is the falsehood `docs/decisions.md` D-007 refuses to write onto
       * historical rows, arriving through the create route instead. Where the
       * transcript says `asr_live` it did stream, and the same request audits
       * it as `consultation.asr_live_used` below, so the two must agree.
       *
       * This covers the row as created and nothing after it. A consultation
       * opened empty and then pasted into keeps `ambient`, because the mode is
       * the path it was configured for rather than a record of what ran; the
       * transcript's own `source` is that record.
       */
      captureMode:
        parsed.data.transcript === undefined || parsed.data.transcript.source === 'asr_live'
          ? 'ambient'
          : 'manual',
    },
  })

  await recordAuditEvent({
    action: 'consultation.created',
    actorId: actor,
    consultationId: created.id,
  })

  // A client-asserted fact, recorded at the first point the transcript source
  // and a consultation id coexist (docs/trd.md §15).
  if (parsed.data.transcript?.source === 'asr_hosted') {
    await recordAuditEvent({
      action: 'consultation.asr_hosted_used',
      actorId: actor,
      consultationId: created.id,
    })
  }

  // Ambient capture streams past the API entirely (#268), so this row is the
  // only place a consultation is tied to that egress at all. The server-side
  // half is `asr.live_session_minted`, which belongs to an actor and knows no
  // consultation id, exactly as the relay's does.
  if (parsed.data.transcript?.source === 'asr_live') {
    await recordAuditEvent({
      action: 'consultation.asr_live_used',
      actorId: actor,
      consultationId: created.id,
      metadata: batchMetadata(parsed.data.transcript),
    })
  }

  res.status(201).json({ consultation: await toDetailWithApprover(created) })
})

consultationsRouter.get('/:id', async (req, res) => {
  const consultation = await assertOwnedConsultation(req.params.id, doctorId(req))
  res.json({ consultation: await toDetailWithApprover(consultation) })
})

/**
 * Full audit history for one consultation, oldest first.
 *
 * NOT in docs/trd.md §13's route table — added because issue #12's acceptance
 * criterion "the full event history for a consultation is retrievable in
 * chronological order" has no route behind it otherwise. Flagged for TRD
 * ratification rather than assumed; delete it if §13 is meant to stay closed.
 *
 * Returns only what the taxonomy permits: action, actor, timestamp, and
 * metadata that is structurally incapable of holding clinical content.
 */
consultationsRouter.get('/:id/history', async (req, res) => {
  await assertOwnedConsultation(req.params.id, doctorId(req))
  res.json({ events: await getAuditHistory(req.params.id) })
})

consultationsRouter.post('/:id/analyze', async (req, res) => {
  const actor = doctorId(req)
  const consultation = await assertOwnedConsultation(req.params.id, actor)

  if (consultation.status === 'approved') {
    throw new HttpError(
      409,
      'invalid_state',
      'Analysis cannot start while the consultation is approved.',
    )
  }

  const transcript = TranscriptSchema.safeParse(consultation.transcript)
  if (!transcript.success) {
    throw new HttpError(409, 'invalid_state', 'This consultation has no usable transcript.')
  }

  const profileBody = z
    .object({ profileId: ProfileIdSchema.optional() })
    .default({})
    .safeParse(req.body)
  if (!profileBody.success) {
    throw new HttpError(400, 'invalid_body', 'A valid clinical profile is required.')
  }
  const profile = getClinicalProfile(profileBody.data.profileId ?? DEFAULT_PROFILE_ID)

  /*
   * Where the record goes if this run fails, and never back to `analyzing`.
   *
   * A stale claim retaken below arrives here as `analyzing`, and restoring that
   * on failure would wedge the row for another whole lease.
   */
  const previousStatus =
    consultation.status === 'analyzing'
      ? consultation.analysis
        ? 'awaiting_review'
        : 'draft'
      : consultation.status

  /*
   * One conditional update is both the guard and the claim (#373).
   *
   * Reading the status and then writing it in a second statement let two
   * concurrent presses past the same check and spend two pipelines. The `OR`
   * also releases a claim older than the lease, which matters because the
   * rollback below only runs in this process: a restart mid-run leaves
   * `analyzing` written with nothing left to clear it, and the old guard then
   * answered 409 to every retry forever.
   *
   * `updatedAt` is the lease clock. Nothing writes this row between here and
   * the persistence write, so while the status is `analyzing` it is when
   * analysis started. Adding a mid-run write means adding a real
   * `analysisStartedAt` column instead of reading this one.
   */
  const claimed = await prisma.consultation.updateMany({
    where: {
      id: consultation.id,
      OR: [
        { status: { in: ['draft', 'awaiting_review'] } },
        { status: 'analyzing', updatedAt: { lt: new Date(Date.now() - STALE_ANALYSIS_MS) } },
      ],
    },
    data: { status: 'analyzing' },
  })
  if (claimed.count === 0) {
    throw new HttpError(409, 'invalid_state', 'Analysis is already running for this consultation.')
  }

  await recordAuditEvent({
    action: 'consultation.analysis_started',
    actorId: actor,
    consultationId: consultation.id,
  })

  try {
    const { analysis, detected, discardedFieldIds, suppressedSuggestionIds } = await runAnalysis(
      transcript.data,
      profile,
      consultation.id,
    )

    /*
     * The derived title is written once and never overwritten.
     *
     * A doctor who has renamed a record has said what they want it filed as,
     * and re-analysis must not take that back. Re-analysis also regenerates
     * `analysis` wholesale, so a title that tracked it would change under the
     * doctor for reasons they did not ask for. First run names it; after that
     * the name is theirs.
     *
     * **`updateMany` with `title: null` in the where clause, rather than the
     * `consultation.title` this handler read minutes ago.** A record is
     * renameable in every state it appears in, `analyzing` included, and
     * analysis can take a couple of minutes, so a doctor renaming a row while
     * it analyses is a reachable sequence rather than a theoretical one. Testing
     * the stale read would let the derived name overwrite the one they just
     * chose. Postgres evaluates this predicate at write time, so the doctor
     * wins whenever they got there first.
     */
    const derivedTitle =
      analysis.clinicalFacts === undefined ? null : deriveConsultationTitle(analysis.clinicalFacts)

    if (derivedTitle !== null) {
      await prisma.consultation.updateMany({
        where: { id: consultation.id, title: null },
        data: { title: derivedTitle },
      })
    }

    // Reads back whatever the statement above settled on, so the response
    // carries the winning title rather than the one this request proposed.
    const updated = await timeStage('persistence', () =>
      prisma.consultation.update({
        where: { id: consultation.id },
        data: { status: 'awaiting_review', analysis },
      }),
    )

    const llm = getLLMDescriptor()
    const completionMetadata = {
      detected,
      discardedFieldIds,
      suppressedSuggestionIds,
      profileId: profile.id,
      versions: {
        provider: llm.provider,
        model: llm.model,
        clinicalContent: getActiveClinicalVersions(profile),
      },
    }
    await recordAuditEvent({
      action: 'consultation.analysis_completed',
      actorId: actor,
      consultationId: consultation.id,
      metadata: completionMetadata,
    })

    res.json({ consultation: await toDetailWithApprover(updated) })
  } catch (error) {
    // The doctor's only retry path is triggering analysis again — nothing
    // retries autonomously (docs/prd.md CAP-5).
    await prisma.consultation.update({
      where: { id: consultation.id },
      data: { status: previousStatus },
    })
    await recordAuditEvent({
      action: 'consultation.analysis_failed',
      actorId: actor,
      consultationId: consultation.id,
      metadata: { reason: classifyFailure(error) },
    })

    throw new HttpError(500, 'analysis_failed', 'Analysis could not be completed.')
  }
})

/**
 * Bounds on a transcript that arrives in the request body (#80).
 *
 * Every other clinical route analyses a transcript the caller already stored,
 * so the create route bounded it. This one takes it directly, and
 * `TranscriptSchema` has `.min(1)` on turns and no upper bound at all, which
 * would leave `express.json({ limit: '1mb' })` as the only thing between a
 * guest session and an arbitrarily large prompt.
 *
 * Sized well above a real consultation rather than tightly: the longest
 * fixture is a few thousand characters, so these bound abuse without being
 * reachable by clinical use.
 */
const MAX_TURNS = 300
const MAX_TURN_CHARS = 4_000
const MAX_TRANSCRIPT_CHARS = 60_000

const EphemeralBodySchema = z.object({
  transcript: TranscriptSchema.superRefine((transcript, ctx) => {
    if (transcript.turns.length > MAX_TURNS) {
      ctx.addIssue({ code: 'custom', message: `A transcript may have at most ${MAX_TURNS} turns.` })
    }
    if (transcript.turns.some((turn) => turn.text.length > MAX_TURN_CHARS)) {
      ctx.addIssue({
        code: 'custom',
        message: `A turn may be at most ${MAX_TURN_CHARS} characters.`,
      })
    }
    const total = transcript.turns.reduce((sum, turn) => sum + turn.text.length, 0)
    if (total > MAX_TRANSCRIPT_CHARS) {
      ctx.addIssue({
        code: 'custom',
        message: `A transcript may be at most ${MAX_TRANSCRIPT_CHARS} characters.`,
      })
    }
  }),
  profileId: ProfileIdSchema.optional(),
})

/**
 * Demo Mode's ephemeral analysis (#80), authorised by the owner on 14/08/26.
 *
 * It runs the same pipeline as the stored route above and writes **no
 * `Consultation`**, which is the whole point: Demo Mode has to be
 * self-contained and wiped the moment it is exited, and if nothing is
 * persisted there is nothing to wipe. That sidesteps the retention decision in
 * docs/trd.md §19 rather than pre-empting it, and it avoids adding an erasure
 * endpoint to serve a demo, which would route around a control that exists for
 * audit integrity.
 *
 * **It is audited even though it persists nothing.** The endpoint cannot
 * distinguish demo content from real content, so "it is only synthetic" is a
 * property of intent rather than of the system, and an unaudited LLM egress
 * would be a hole in the property the whole PHI boundary rests on. The row
 * carries an actor and no consultation, which the hash chain already supports.
 *
 * No `:id`, so `assertOwnedConsultation` has nothing to scope. Authentication
 * still applies: `/api/consultations` is in `PROTECTED_PREFIXES`, so
 * `requireSession` runs before this. A tidier-looking `/api/analyze` would have
 * been unauthenticated by default.
 */
consultationsRouter.post('/analyze-ephemeral', async (req, res) => {
  const actor = doctorId(req)

  const body = EphemeralBodySchema.safeParse(req.body)
  if (!body.success) {
    throw new HttpError(400, 'invalid_body', 'A valid transcript is required.')
  }

  const profile = getClinicalProfile(body.data.profileId ?? DEFAULT_PROFILE_ID)

  try {
    const { analysis, detected, discardedFieldIds, suppressedSuggestionIds } = await runAnalysis(
      body.data.transcript,
      profile,
    )

    const llm = getLLMDescriptor()
    await recordAuditEvent({
      action: 'consultation.ephemeral_analyzed',
      actorId: actor,
      metadata: {
        detected,
        discardedFieldIds,
        suppressedSuggestionIds,
        profileId: profile.id,
        versions: {
          provider: llm.provider,
          model: llm.model,
          clinicalContent: getActiveClinicalVersions(profile),
        },
      },
    })

    res.json({ analysis: ConsultationAnalysisSchema.parse(analysis) })
  } catch (error) {
    await recordAuditEvent({
      action: 'consultation.ephemeral_analysis_failed',
      actorId: actor,
      metadata: { reason: classifyFailure(error) },
    })

    throw new HttpError(500, 'analysis_failed', 'Analysis could not be completed.')
  }
})

/**
 * One window of a running ambient consultation (#219).
 *
 * Bounded for a window rather than a whole consultation, which is only
 * affordable because a cycle never carries the running transcript: docs/trd.md
 * §20.8 adopts the fold over re-extraction, and `LiveAnalysisStateSchema` has
 * no field a growing transcript could travel in.
 */
const LiveDeltaSchema = TranscriptSchema.superRefine((delta, ctx) => {
  if (delta.turns.length > MAX_LIVE_DELTA_TURNS) {
    ctx.addIssue({
      code: 'custom',
      message: `A live window may have at most ${MAX_LIVE_DELTA_TURNS} turns.`,
    })
  }
  const total = delta.turns.reduce((sum, turn) => sum + turn.text.length, 0)
  if (total > MAX_LIVE_DELTA_CHARACTERS) {
    ctx.addIssue({
      code: 'custom',
      message: `A live window may be at most ${MAX_LIVE_DELTA_CHARACTERS} characters.`,
    })
  }
})

const PrescriptionParseBodySchema = z.object({
  dictated: z.string().min(1).max(2000),
  profileId: ProfileIdSchema.optional(),
})

/**
 * Turn one dictated medication phrase into draft fields plus spelling
 * candidates (#312, `docs/decisions.md` D-001).
 *
 * **Read-only, and it stores nothing.** The doctor confirms, and confirming is
 * an ordinary `PATCH /api/consultations/:id { prescriptions }` down the same
 * route their manual edits use. That is the same shape #308 took for transcript
 * corrections and the copilot took before it, and it is why no prescription
 * write path exists here.
 *
 * **No model, anywhere on this path.** `parseSigWithSpan` is regex over a
 * closed vocabulary and `matchMedication` is phonetic plus orthographic
 * distance against a static versioned lexicon. Nothing is de-identified because
 * nothing egresses, and nothing is proposed that the doctor did not say.
 *
 * **`lines` is the whole dictation cut into one line per drug** (D-001,
 * amended 06/10/26), so the SPA needs one call however many drugs were said.
 * `sig`, `sigReadTo` and `candidates` stay for an SPA deployed before it.
 *
 * **`sigReadTo` reports how far the sig parse got**, so a caller slicing one
 * drug's stretch out of a several-drug dictation can tell where its fields stop
 * being accounted for. It is an offset and nothing else: no claim about what
 * the remaining text means, and no drug name proposed for it (#369).
 *
 * **Candidates are returned in the matcher's order and must not be re-sorted.**
 * A clinical-safety review on #311 found a contained single agent outranking
 * the combination actually dictated, because it scored higher on a shorter
 * span; the ordering is score, then span length, then id, and it is a fix.
 *
 * No audit row. Nothing egresses and no state changes, so there is no act to
 * record: the precedent is `POST /:id/live-flags` in this same file. The
 * audited act is the doctor confirming, which lands as
 * `consultation.prescription_recorded` on the PATCH.
 */
consultationsRouter.post('/:id/prescriptions/parse', async (req, res) => {
  const actor = doctorId(req)
  await assertOwnedConsultation(req.params.id, actor)

  const body = PrescriptionParseBodySchema.safeParse(req.body)
  if (!body.success) {
    throw new HttpError(400, 'invalid_body', 'A dictated medication phrase is required.')
  }

  const profile = getClinicalProfile(body.data.profileId ?? DEFAULT_PROFILE_ID)
  const { sig, readTo } = parseSigWithSpan(body.data.dictated)
  const candidates = matchMedication(body.data.dictated, profile.id)

  res.json(
    PrescriptionParseResponseSchema.parse({
      sig,
      sigReadTo: readTo,
      // Cut rather than re-sorted: the matcher's order is the #311 fix, and a
      // whole dictation can raise more than the schema's bound.
      candidates: candidates.slice(0, 20),
      lines: parsePrescriptionLines(body.data.dictated, profile.id, candidates),
      generics: lexiconFor(profile.id).map(({ generic }) => generic),
    }),
  )
})

/**
 * Suspected mishears in the stored transcript, for the doctor to accept or
 * reject (#308).
 *
 * **Read-only, and that is the point.** It proposes; it never repairs. Accepting
 * is an ordinary `PATCH /api/consultations/:id { transcript }` issued by the
 * client, so this route needs no write path of its own and the correction lands
 * through the same validation, ownership check and audit the doctor's manual
 * edits already use. `shared/src/index.ts` sets that precedent for the copilot
 * and the reasoning transfers unchanged.
 *
 * **Draft only.** Past `draft` the transcript is what the note was built from,
 * so editing it would leave a note grounded in words the record no longer holds.
 * `PATCH` already refuses a transcript outside `awaiting_review`; refusing here
 * as well means the doctor never sees an Accept button that cannot work.
 *
 * The audit row is written before the response and unguarded, so proposals the
 * trail did not record are never observable by a client. It carries a count and
 * never the words: `original` is patient speech and `suggested` is the table's
 * reading of it, and both are content.
 *
 * **The constrained model pass runs second and may only add (#309).** The
 * measured table above is layer 2 and ships unconditionally; layer 3 reads only
 * spans the recogniser itself doubted, cannot touch a span a fired rule flag
 * matched, and is off unless `TRANSCRIPT_CLEANUP` says otherwise. Its failure is
 * reported in `cleanup` and never takes the deterministic proposals off the
 * screen, which is why this responds 200 with a possibly non-empty array even
 * when the provider is down.
 */
consultationsRouter.post('/:id/transcript-corrections', async (req, res) => {
  const actor = doctorId(req)
  const consultation = await assertOwnedConsultation(req.params.id, actor)

  if (consultation.status !== 'draft') {
    throw new HttpError(
      409,
      'invalid_state',
      `Corrections cannot be proposed while the consultation is ${consultation.status}.`,
    )
  }

  const transcript = TranscriptSchema.safeParse(consultation.transcript)
  if (!transcript.success) {
    await recordAuditEvent({
      action: 'consultation.corrections_failed',
      actorId: actor,
      consultationId: consultation.id,
      metadata: { reason: 'no_transcript' },
    })
    throw new HttpError(409, 'invalid_state', 'This consultation has no usable transcript.')
  }

  const proposals = proposeMishearCorrections(transcript.data)

  /*
   * The red-flag protection is deliberately **not** wired from here. It runs
   * inside `transcript-cleanup/policy.ts`, over every trigger there is, chosen
   * where a caller cannot reach it. This route briefly took a `profileId` from
   * the request body and passed `profile.redFlagTriggers` down; that was a hole,
   * because the profiles share one trigger out of twelve and nothing ties a
   * consultation to the profile it was analysed under, so the body could shrink
   * what the model was forbidden to touch.
   */
  let cleanup: TranscriptCleanupStatus = 'disabled'
  let cleanupReason: TranscriptCleanupFailureReason | undefined
  let modelProposalCount = 0
  let droppedCount = 0

  if (env.TRANSCRIPT_CLEANUP === 'on') {
    try {
      const outcome = await proposeModelCorrections(transcript.data)
      cleanup = outcome.status
      cleanupReason = outcome.reason
      modelProposalCount = outcome.proposals.length
      droppedCount = outcome.dropped
      proposals.push(...outcome.proposals)
    } catch (error) {
      /*
       * The egress guard firing is the one alarm the log taxonomy exists to
       * surface, so it is named in the audit row as well as classed in the log.
       * A row that read identically to a provider timeout would not surface it
       * at all. The deterministic proposals still ship: they never left the API,
       * and taking them away would punish the doctor for an incident on a
       * different layer.
       */
      const deid = error instanceof DeidentificationError
      cleanup = 'failed'
      cleanupReason = deid ? 'deid_failed' : 'llm_failed'
      logger.warn('transcript cleanup failed', {
        consultationId: consultation.id,
        operation: 'transcript_cleanup',
        errorClass: deid ? 'deidentification_error' : 'internal_error',
        errorName: error instanceof Error ? error.constructor.name : 'Error',
      })
    }
  }

  /*
   * Capped before the audit row rather than at `res.json`. The response schema
   * bounds `proposals`, and the model half can now push a long transcript's
   * count toward it, so parsing after the write could throw a 500 behind a row
   * that already claimed success.
   */
  const served = proposals.slice(0, MAX_TRANSCRIPT_TURNS)

  await recordAuditEvent({
    action: 'consultation.corrections_proposed',
    actorId: actor,
    consultationId: consultation.id,
    metadata: {
      proposalCount: served.length,
      modelProposalCount,
      droppedCount,
      cleanup,
      ...(cleanupReason === undefined ? {} : { cleanupReason }),
    },
  })

  res.json(TranscriptCorrectionsResponseSchema.parse({ proposals: served, cleanup }))
})

const LiveFlagsBodySchema = z.object({
  delta: LiveDeltaSchema,
  profileId: ProfileIdSchema.optional(),
})

/**
 * The deterministic live pane: rules over one window, in-process, no model.
 *
 * **It writes nothing and audits nothing**, and both are deliberate. Nothing
 * egresses and no state changes, so there is no act to record; the precedent is
 * `GET /api/asr/live-sessions/config`, which writes no row for the same reason.
 * The authoritative run is still `evaluateRedFlags` over the whole stored
 * transcript at Finish, which is persisted and audited. This pass is additive
 * and advisory: it can raise a flag earlier than Finish would, and it can never
 * remove one.
 *
 * `labelsReviewed` is forced to `false` rather than read from the body, and
 * that is a hardening rather than a formality. On a live path nobody has
 * reviewed a speaker label yet, and the field can only ever *weaken* the
 * engine: `asserts()` (`redflags/triggers.ts`) enables the question-denial
 * suppression only when it is `true`. A client asserting `true` here could
 * therefore suppress a real trigger, so the value is not the client's to send.
 */
consultationsRouter.post('/:id/live-flags', async (req, res) => {
  const actor = doctorId(req)
  await assertOwnedConsultation(req.params.id, actor)

  const body = LiveFlagsBodySchema.safeParse(req.body)
  if (!body.success) {
    throw new HttpError(400, 'invalid_body', 'A valid live transcript window is required.')
  }

  const profile = getClinicalProfile(body.data.profileId ?? DEFAULT_PROFILE_ID)

  const redFlags = evaluateRedFlags(
    /*
     * Both fields are the server's, not the caller's, and for the same reason:
     * each is a lever that can only ever *weaken* the engine on a window the
     * client composed entirely.
     *
     * `labelsReviewed` gates the question-denial suppression in `asserts()`.
     * `source` gates `isRecorded` in `redflags/mishears.ts`, so a client
     * sending anything else silently loses the measured Malay confusables
     * ("patuk berdarah", "sempuk") that exist for exactly this transcript
     * source. This route is only ever reached from ambient capture.
     */
    { ...body.data.delta, source: 'asr_live', labelsReviewed: false },
    profile.redFlagTriggers,
  )

  res.json(LiveFlagsResponseSchema.parse({ redFlags }))
})

const LiveAnalysisBodySchema = z.object({
  delta: LiveDeltaSchema,
  /** The previous cycle's result, handed straight back. `null` opens a session. */
  previous: LiveAnalysisStateSchema.nullable(),
  profileId: ProfileIdSchema.optional(),
})

/**
 * The model-backed live panes: the patient card and the missing-information
 * checklist, folded one window at a time (#219).
 *
 * **The ordering is `runAnalysis`'s, and for the same reason.** De-identify
 * first, then reach the model with de-identified content only. This route is an
 * ordinary LLM egress through `LLMClient` and gets no dispensation for being
 * live: a window of transcript is exactly as identifying as a whole one.
 *
 * **It persists nothing.** No `Consultation` column is written and `status` is
 * untouched, so a live cycle cannot move a record's lifecycle or leave a draft
 * behind. Precedent: `POST /analyze-ephemeral`, which runs the same pipeline
 * and writes no row.
 *
 * The authoritative analysis is still the one at Finish. This pass may only
 * fill the two panes ahead of it.
 */
consultationsRouter.post('/:id/live-analysis', async (req, res) => {
  const actor = doctorId(req)
  const consultation = await assertOwnedConsultation(req.params.id, actor)

  const body = LiveAnalysisBodySchema.safeParse(req.body)
  if (!body.success) {
    throw new HttpError(400, 'invalid_body', 'A valid live transcript window is required.')
  }

  const { delta, previous } = body.data
  const profile = getClinicalProfile(body.data.profileId ?? DEFAULT_PROFILE_ID)

  try {
    const { text, vault, detected } = deidentifyTranscript(delta)

    // Labels and a count, never the matched values (GitHub issue #15).
    logger.info('de-identification complete', {
      consultationId: consultation.id,
      detectorLabels: detected,
      detectorCount: detected.length,
    })

    /*
     * Written once per consultation, before the egress it records, and the
     * decision is the server's rather than the caller's.
     *
     * The first version gated this on `previous === null`, which meant a client
     * that fabricated a previous state on its opening request could spend the
     * whole model budget with no `live_analysis_started` row against the
     * consultation. That is not the shape of the precedent it cited:
     * `asr.live_session_minted` is written unconditionally at the only moment
     * issuance can happen, which is what makes "an egress the trail did not
     * record is never observable by a client" true there.
     *
     * Session-scoping is still right, for the chain-contention reason in
     * `audit/index.ts`. Reading the session boundary off the request body was
     * not. One indexed lookup on `[consultationId, createdAt]`, on the
     * model-backed route only, which its own limiter caps at 20/min.
     */
    const opened = await prisma.auditEvent.findFirst({
      where: {
        consultationId: consultation.id,
        action: 'consultation.live_analysis_started',
      },
      select: { id: true },
    })

    if (opened === null) {
      const llm = getLLMDescriptor()
      await recordAuditEvent({
        action: 'consultation.live_analysis_started',
        actorId: actor,
        consultationId: consultation.id,
        metadata: {
          profileId: profile.id,
          versions: {
            provider: llm.provider,
            model: llm.model,
            clinicalContent: getActiveClinicalVersions(profile),
          },
        },
      })
    }

    const checked = await analyseLiveWindow(text, text, profile)
    const rehydrate = (value: string) => vault.rehydrate(value)

    /*
     * Rehydrated before the fold, so the previous cycle's plain values and this
     * one's are the same kind of string. Folding tokenised text into rehydrated
     * text would leave `[PATIENT_1]` on screen the moment a field carried over.
     */
    const clinicalFacts = foldFacts(
      previous?.clinicalFacts ?? null,
      rehydrateAssertions(checked.clinicalFacts, rehydrate),
    )
    // Not `foldFacts`: this block holds the clinical conclusion, where holding
    // an established value is the unsafe direction. See `foldOperational`.
    const operational = foldOperational(
      previous?.operational ?? null,
      rehydrateAssertions(checked.operational, rehydrate),
    )

    // Deterministic, over the merged facts. The model is never asked what is
    // missing; see `deriveGaps` and docs/trd.md §20.8.1.
    const gaps = deriveGaps(clinicalFacts, operational, profile.gapChecklist).map((gap) => ({
      ...gap,
      question: rehydrate(gap.question),
      rationale: rehydrate(gap.rationale),
    }))

    res.json(
      LiveAnalysisResponseSchema.parse({
        state: { cycle: (previous?.cycle ?? 0) + 1, clinicalFacts, operational },
        gaps,
        discardedFieldIds: checked.discardedFieldIds,
      }),
    )
  } catch (error) {
    await recordAuditEvent({
      action: 'consultation.live_analysis_failed',
      actorId: actor,
      consultationId: consultation.id,
      metadata: { reason: classifyFailure(error) },
    })

    if (error instanceof DeidentificationError) {
      throw new HttpError(500, 'deid_failed', 'De-identification could not be completed.')
    }
    throw new HttpError(500, 'analysis_failed', 'Live analysis could not be completed.')
  }
})

consultationsRouter.patch('/:id', async (req, res) => {
  const actor = doctorId(req)
  const consultation = await assertOwnedConsultation(req.params.id, actor)

  const parsed = PatchBodySchema.safeParse(req.body)
  if (!parsed.success) {
    throw new HttpError(400, 'invalid_body', 'No valid changes supplied.')
  }

  const updated = await updateConsultation(consultation, parsed.data, actor)
  res.json({ consultation: await toDetailWithApprover(updated) })
})

consultationsRouter.post('/:id/approve', async (req, res) => {
  const actor = doctorId(req)
  const consultation = await assertOwnedConsultation(req.params.id, actor)

  if (consultation.status !== 'awaiting_review') {
    throw new HttpError(
      409,
      'invalid_state',
      consultation.status === 'approved'
        ? 'This consultation is already approved.'
        : 'Only a consultation awaiting review can be approved.',
    )
  }

  // CAP-5: approval is an explicit transition over reviewed AI output. There is
  // nothing to take responsibility for without an analysis attached.
  if (consultation.analysis === null) {
    throw new HttpError(409, 'invalid_state', 'This consultation has no analysis to approve.')
  }

  const updated = await prisma.consultation.update({
    where: { id: consultation.id },
    data: { status: 'approved', approvedAt: new Date() },
  })

  await recordAuditEvent({
    action: 'consultation.approved',
    actorId: actor,
    consultationId: consultation.id,
  })

  res.json({ consultation: await toDetailWithApprover(updated) })
})

/**
 * Erases a selection of consultations (issue #114).
 *
 * **This is a tombstone, not a delete, and the distinction is load-bearing.**
 * `eraseConsultation` nulls the three PHI columns and stamps `erasedAt`; the
 * row itself stays, because `AuditEvent.consultationId` is `onDelete: Restrict`
 * and is a hash-chain input. Removing the row would orphan every audit event
 * that references it and break tamper evidence, which is the one property the
 * chain exists to provide. `.claude/rules/security.md` states that as a
 * do-not-change; this route is the caller it was waiting for, not a relaxation
 * of it.
 *
 * Any status may be erased, approved included. The DPIA frames erasure as
 * serving a data-subject right, and that right does not stop applying because a
 * doctor signed the note, so the weight of erasing an approved record is
 * carried by the confirmation in the UI, which counts them, rather than by a
 * block here.
 *
 * A collection-level POST rather than `DELETE /:id`, because one gesture should
 * cost one rate-limit token rather than N, and because the ordering below has
 * to be decided server-side.
 */
/*
 * The consultation recording (#293).
 *
 * Audio in, nothing out but a receipt; audio out, nothing in. Both scope
 * through `assertOwnedConsultation`, so a caller can only ever reach a
 * recording filed against their own consultation, and a consultation that does
 * not exist or is erased answers 404 like every other route here rather than
 * confirming it once existed.
 *
 * **This is not a de-identification path and cannot be one.** A voice is an
 * identifier in its own right, so there is nothing to tokenise and no gate to
 * pass. What bounds it instead is the same trio the ASR egresses use: an
 * explicit size cap, a limiter, and an audit row per outcome. The recording
 * never leaves this API and never reaches a provider.
 */
/**
 * Every gate runs before a single byte of body is read, and the order is the
 * point.
 *
 * `routes/asr.ts` established it and states why: a deployment that will refuse
 * the request must not first buffer 25 MB it is going to discard. The same
 * applies to a caller who does not own the consultation. Getting this backwards
 * lets any authenticated caller, and self-service sign-up has no email
 * verification, force a 25 MB allocation against a record they cannot reach.
 */
function requireAudioRetention(refusal: HttpError): RequestHandler {
  return (_req, _res, next) => {
    if (!audioRetentionEnabled()) {
      next(refusal)
      return
    }
    next()
  }
}

/**
 * A writer is told storage is switched off, because that is actionable: the
 * operator can adopt a period. A reader is told there is no recording, because
 * from their side there is not one and the reason is not their business.
 */
const RETENTION_REFUSES_WRITE = new HttpError(
  503,
  'audio_retention_unset',
  'Recording storage is disabled until a retention period is configured.',
)
const RETENTION_REFUSES_READ = new HttpError(
  404,
  'not_found',
  'No recording is available for this consultation.',
)

/**
 * Ownership resolved ahead of the body, so an unowned `:id` costs a 404 and not
 * 25 MB of heap. The handler does not resolve it again: past this point
 * `req.params.id` is known to name a consultation this caller owns.
 */
const requireOwnedConsultation: RequestHandler<{ id: string }> = async (req, _res, next) => {
  await assertOwnedConsultation(req.params.id, doctorId(req))
  next()
}

/**
 * Both directions share one bound, because they share one heap. Two at a time
 * matches `MAX_CONCURRENT_RELAYS` and for the same reason: the worst case is
 * roughly twice the body per request, once for the buffer and once for the copy
 * on the way to or from Postgres.
 */
const audioSlot = inFlightGate({
  limit: 2,
  code: 'audio_busy',
  message: 'Recording storage is busy. Retry shortly.',
})

consultationsRouter.put(
  '/:id/audio',
  requireAudioRetention(RETENTION_REFUSES_WRITE),
  audioSlot,
  requireOwnedConsultation,
  parseAudioBody,
  async (req, res) => {
    const actor = doctorId(req)

    const contentType = req.get('content-type')
    if (!contentType || !req.is('audio/*')) {
      throw new HttpError(415, 'unsupported_media_type', 'An audio/* content type is required.')
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new HttpError(400, 'invalid_body', 'A non-empty audio body is required.')
    }

    // `req.params.id` rather than a second `assertOwnedConsultation`: the
    // middleware above already resolved it, and re-resolving would be a second
    // query answering a question that is settled.
    const consultationId = req.params.id

    // Copied into a plain view rather than passed as the Express Buffer: Prisma's
    // Bytes input is an ArrayBuffer-backed Uint8Array, and a Buffer may sit on a
    // pooled or shared one.
    const { expiresAt } = await storeAudio(
      consultationId,
      actor,
      new Uint8Array(req.body),
      contentType,
    )

    /*
     * The sweep rides here because this is the only route that makes the store
     * grow, and the project has no scheduler to hang one on. It runs after the
     * store so a failure to tidy can never lose the recording just accepted.
     *
     * **This is not a complete retention mechanism and the comment must not
     * claim otherwise.** A deployment that stops uploading never sweeps again,
     * and one that unsets the retention period is refused above before reaching
     * here, so its stored recordings are frozen rather than drained. Tracked
     * separately; `readAudio` refusing anything expired is what keeps the
     * promise true in the meantime.
     */
    void sweepExpiredAudio().catch(() => {})

    res.json({ expiresAt })
  },
)

consultationsRouter.get(
  '/:id/audio',
  // The same switch the write path checks. Withdrawing the retention decision
  // has to stop recordings being served, not merely stop new ones arriving, or
  // it is half a switch.
  requireAudioRetention(RETENTION_REFUSES_READ),
  audioSlot,
  requireOwnedConsultation,
  async (req, res) => {
    const actor = doctorId(req)
    const consultationId = req.params.id

    const recording = await readAudio(consultationId)
    // 404 covers both "never stored" and "window has closed". They are the same
    // answer to the caller, and distinguishing them would say when a consultation
    // was recorded to someone who is no longer allowed to hear it.
    if (recording === null) {
      throw new HttpError(404, 'not_found', 'No recording is available for this consultation.')
    }

    await recordAuditEvent({
      action: 'consultation.audio_served',
      actorId: actor,
      consultationId,
    })

    res.setHeader('Content-Type', recording.mimeType)
    // Never cached anywhere but the tab that asked. This is PHI, and a shared or
    // disk cache would put a voice recording somewhere nothing in this system
    // can reach to erase it.
    res.setHeader('Cache-Control', 'no-store')
    res.send(recording.data)
  },
)

consultationsRouter.post('/erase', async (req, res) => {
  const parsed = EraseConsultationsInputSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new HttpError(
      400,
      'invalid_body',
      `Supply between 1 and ${ERASE_BATCH_LIMIT} consultation ids to erase.`,
    )
  }

  const actor = doctorId(req)
  const erased: string[] = []
  const failed: string[] = []

  // Sequential, deliberately. Each erasure appends an audit row, and `prevHash`
  // is unique so that two concurrent appends cannot fork the chain;
  // `recordAuditEvent` retries a head race only three times, so a `Promise.all`
  // over a selection this size would exhaust that and fail rows for a reason
  // that has nothing to do with the request.
  for (const id of parsed.data.ids) {
    try {
      await eraseConsultation(id, actor)
      erased.push(id)
    } catch (error) {
      // The ownership gate's 404 is the expected miss: not this doctor's, or
      // already erased. Neither justifies abandoning the rest of the batch.
      // Anything else is a real fault and must not be flattened into a tidy
      // per-id failure that the client would render as a routine skip.
      if (!(error instanceof HttpError && error.status === 404)) throw error
      failed.push(id)
    }
  }

  res.json({ erased, failed })
})
