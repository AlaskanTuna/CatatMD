import type {
  ClinicalAssertion,
  ConsultationDetail,
  CopilotProposal,
  GuidelineChunk,
  Transcript,
} from '@shared/types'
import {
  ANALYSIS_POLL_MS,
  MedicalRecordNoteSchema,
  STALE_ANALYSIS_MS,
  toSoapNote,
} from '@shared/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate, useParams } from 'react-router-dom'
import { useLivePanes } from '../audio/live/use-live-panes.js'
import { useTranscriptAudio } from '../audio/use-transcript-audio.js'
import { CatatAI } from '../copilot/CatatAI.js'
import { DEMO_CONSULTATION_ID, useDemoTour } from '../demo/DemoTour.js'
import { ApiError, api } from '../lib/api.js'
import { formatNoteForClipboard } from '../lib/note-templates.js'
import { count } from '../lib/plural.js'
import { useViewportFit } from '../lib/use-viewport-fit.js'
import { ApproveBar } from '../review/ApproveBar.js'
import {
  ConsultationSettingsDialog,
  type ConsultationSettingsPatch,
} from '../review/ConsultationSettingsDialog.js'
import { Skeleton } from '../ui/Card.js'
import { byId, mergeDispositions, type Overflow } from './consultation-review/helpers.js'
import { ReviewHeader } from './consultation-review/ReviewHeader.js'
import { ReviewPanes } from './consultation-review/ReviewPanes.js'

export function ConsultationReview() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [showTranscript, setShowTranscript] = useState(false)
  const [captureBusy, setCaptureBusy] = useState(false)
  /*
   * The consultation's own audio, so a doctor who doubts a transcribed sentence
   * can hear it rather than take it on trust (#293).
   *
   * Owned here because this is the component that knows the consultation id and
   * that outlives `CapturePanel`, which unmounts the instant a transcript
   * exists. The recording is held in memory and never uploaded or stored;
   * `session-audio.ts` says why at length.
   */
  const audio = useTranscriptAudio(id)
  /*
   * The conversation shows in its own full-viewport dialog while capture runs
   * (#287). Held here rather than inside `AmbientCapture` because this
   * component decides where the safety panel goes: the companion column while
   * the theatre is docked, inside the theatre while it is open, never both.
   *
   * Deliberately not persisted. `.claude/rules/security.md` keeps
   * `localStorage` to the theme key, and a remembered "docked" would quietly
   * reintroduce the clipped pane this exists to replace.
   */
  const [conversationExpanded, setConversationExpanded] = useState(false)
  /*
   * The settled conversation, reopened after Stop (#287). The live theatre
   * belongs to `AmbientCapture` because that is where the tokens are; once the
   * transcript is saved the record is here, so this one belongs here.
   */
  const [showConversation, setShowConversation] = useState(false)
  const conversationDialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const node = conversationDialog.current
    if (!node) return
    /*
     * Guarded because jsdom implements neither `showModal` nor `close`. The
     * `open` attribute is what the UA stylesheet keys on, so the fallback still
     * lifts the contents out of `display: none` and into the accessibility
     * tree, which is the part of the difference a test can see.
     */
    if (!showConversation) {
      if (typeof node.close === 'function') node.close()
      else node.removeAttribute('open')
      return
    }
    if (typeof node.showModal === 'function') node.showModal()
    else node.setAttribute('open', '')
    // Same reason as the overflow dialog below: `showModal()` autofocuses
    // before conditionally rendered children exist.
    node.querySelector('button')?.focus()
  }, [showConversation])
  const transcriptRef = useRef<HTMLElement>(null)
  const settingsDialog = useRef<HTMLDialogElement>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)
  const bottomBarRef = useRef<HTMLDivElement | null>(null)

  /**
   * Revealing the transcript is not the same as showing it.
   *
   * The panel is `order-3`, so in the single-column layout below `lg` it sits
   * after the safety rail and the note. Measured on the deployed build at
   * 390x844: toggling it on put its top edge 3318px down a 3729px page, which
   * is 2474px below the fold. The button label changed and nothing the doctor
   * could see did, so the control read as dead.
   *
   * Scrolled to rather than reordered. The rail is first below `lg` on purpose:
   * `docs/DESIGN.md` requires severity to be visible without scrolling, so
   * moving the transcript above it to shorten this trip would trade a control
   * that looks broken for a red flag that is genuinely out of sight.
   *
   * Placed with the other hooks rather than beside the markup it drives,
   * because this component returns early when the consultation fails to load
   * and a hook below that return is not always reached.
   */
  useEffect(() => {
    if (!showTranscript) return
    transcriptRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [showTranscript])
  /*
   * A panel's full list opens in a dialog rather than expanding the rail.
   * Thirty-two gaps inline made the rail scroll for a page and a half while the
   * two columns beside it had already ended, which is the height mismatch the
   * shared column height exists to remove. One dialog serves all three panels,
   * because three dialogs differing only in their title is three places for the
   * next change to miss.
   *
   * The rail still renders every finding, with the ones past the preview hidden
   * in CSS rather than sliced out, so `print:block` brings them all back. The
   * dialog's copy is gated on state so the cards are not in the DOM twice while
   * it is closed.
   */
  const [overflow, setOverflow] = useState<Overflow | null>(null)
  const overflowDialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!overflow) return
    overflowDialog.current?.showModal()
    /*
     * Focus the first control once the content mounts. It is gated on state, so
     * it is not in the DOM yet when `showModal()` runs its native autofocus
     * pass, and without this the dialog itself takes focus and the first Tab
     * starts from nowhere in particular. Queried off the dialog rather than held
     * on a ref because `ui/Button.tsx` does not forward one.
     */
    overflowDialog.current?.querySelector('button')?.focus()
  }, [overflow])

  /*
   * Demo Mode's consultation is not stored, so there is nothing to fetch for it
   * (issue #80). It renders through this component rather than through a
   * demo-only screen deliberately: a second renderer would drift, and the claim
   * the tour makes is that an evaluator is looking at the real review surface.
   */
  const tour = useDemoTour()
  const isEphemeral = id === DEMO_CONSULTATION_ID
  /*
   * The tour's Transcript step shows what it points at (#338). Below `lg` the
   * column sits behind the toggle, a hidden column measures zero, and the step
   * spotlit nothing. Held for that step only, so the doctor's own toggle state
   * is what they find once the tour moves on.
   */
  const tourOnTranscript =
    tour.active && tour.steps[tour.currentStep]?.target === '[data-tour="transcript"]'
  const transcriptShown = showTranscript || tourOnTranscript

  const consultation = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => api.getConsultation(id),
    enabled: !isEphemeral,
    /*
     * The server's status is what says whether analysis is still running, so
     * keep asking it until it settles (#373).
     *
     * `/analyze` emits one JSON at the end and the `/api` rewrite gives an
     * external origin 120s to first byte, so on a long transcript the browser
     * gives up while the API is still working. Nothing cancels it, and it
     * persists before it answers, so the record reaches `awaiting_review` with
     * no one left listening. The mutation's response is now the fast path
     * rather than the only path.
     *
     * What arms this is the re-read in the mutation's `onError` below, which is
     * the first thing to put `analyzing` in the cache. An optimistic write on
     * `onMutate` would look tidier and be wrong: it would carry the old
     * `updatedAt` and read as instantly stale.
     */
    refetchInterval: (query) => {
      const current = query.state.data
      if (current?.status !== 'analyzing') return false
      const elapsed = Date.now() - current.updatedAt.getTime()
      return elapsed > STALE_ANALYSIS_MS ? false : ANALYSIS_POLL_MS
    },
  })
  const documents = useQuery({
    queryKey: ['guideline-documents'],
    queryFn: api.guidelineDocuments,
  })
  useViewportFit(gridRef, bottomBarRef, [
    consultation.data?.id,
    consultation.data?.analysis === null,
    consultation.data?.status,
    captureBusy,
  ])

  /*
   * What a citation id may resolve to: the CPG chunks retrieved for this
   * analysis plus the ingested source documents. `retrievedGuidelines` is
   * persisted on the analysis so a chunk resolves without re-running retrieval.
   * Document ids are fetched separately and map to the `doc:` references the
   * model may emit.
   *
   * Retrieved chunks are listed first so an id collision keeps the chunk rather
   * than the document summary.
   */
  const citableGuidelines = useMemo(() => {
    const record = isEphemeral ? tour.ephemeral : consultation.data
    const retrieved = record?.analysis?.retrievedGuidelines ?? []
    const docChunks: GuidelineChunk[] = (documents.data ?? []).map((document) => ({
      id: document.id,
      title: document.title,
      publisher: document.publisher,
      year: document.year,
      url: document.sourceUrl,
      summary: '',
      sourceLicence: document.sourceLicence,
      verbatimAllowed: document.verbatimAllowed,
    }))
    const byId = new Map<string, GuidelineChunk>()
    for (const chunk of retrieved) byId.set(chunk.id, chunk)
    for (const chunk of docChunks) {
      if (!byId.has(chunk.id)) byId.set(chunk.id, chunk)
    }
    return [...byId.values()]
  }, [documents.data, isEphemeral, tour.ephemeral, consultation.data])

  const invalidate = (next: ConsultationDetail) => {
    queryClient.setQueryData(['consultation', id], next)
    void queryClient.invalidateQueries({ queryKey: ['consultations'] })
    // Approval and a completed analysis both write notifiable audit rows, so
    // the bell has to be told the feed it is holding is stale (#116).
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  /**
   * Only on the stored path. Demo Mode approves in memory and persists nothing
   * (#80), so a toast reading "approved" there would claim a record exists that
   * does not.
   */
  const onApproved = (next: ConsultationDetail) => {
    invalidate(next)
    /*
     * Approval deliberately does not touch the recording (#293).
     *
     * It was released here while the audio lived only in memory. Now that it is
     * stored, the retention window is what bounds it, matching what Abridge and
     * Nuance DAX both do: a doctor who has signed a note is exactly the person
     * a colleague or a patient comes back to with a question about it, and
     * having signed is not a reason to lose the ability to check.
     */
    toast.success('Note approved. This record is now final.')
  }

  const rename = useMutation({
    mutationFn: (title: string | null) => api.patch(id, { title }),
    onSuccess: (next) => {
      invalidate(next)
      void queryClient.invalidateQueries({ queryKey: ['consultations'] })
    },
    onError: () => toast.error('That name could not be saved.'),
  })

  /*
   * Analysis is the one action in this product that takes real time and then
   * changes the whole screen underneath the doctor, and it was the only write
   * path with no transient feedback at all: no success, and no error either, so
   * a failed analyse left the button springing back with the screen unchanged
   * and nothing said. That reads as a dead button rather than as a failure.
   *
   * The success line names what arrived rather than saying "done", because the
   * three panels populate at once and the useful thing to know is which of them
   * to look at first. Nothing clinical goes in it: counts only, never a finding
   * or its text (`ui/Toaster.tsx`).
   */
  const capture = useMutation({
    mutationFn: (transcript: Transcript) => api.setTranscript(id, transcript),
    onSuccess: (consultation) => queryClient.setQueryData(['consultation', id], consultation),
  })

  /**
   * The three live panes, fed by ambient capture while the doctor is still
   * talking (#219). Inert on every other capture path, because nothing calls
   * `absorb` until settled recognition tokens arrive.
   *
   * Ephemeral demo consultations have no id to scope a route to, so they get
   * `null` and the panes simply stay in their placeholder state.
   */
  const live = useLivePanes(isEphemeral ? null : id)

  const analyze = useMutation({
    mutationFn: () => api.analyze(id),
    onSuccess: (next) => {
      invalidate(next)
      const flags = next.analysis?.redFlags.length ?? 0
      const gaps = next.analysis?.gaps.length ?? 0
      toast.success(
        flags === 0
          ? `Analysis complete. ${count(gaps, 'documentation gap')} to review.`
          : `Analysis complete. ${count(flags, 'red flag')} raised, ${count(gaps, 'documentation gap')} to review.`,
      )
    },
    /*
     * A rejection here does not establish that the analysis failed (#340).
     * The `/api` rewrite gives an external origin at most 120s to first byte,
     * nothing cancels the request behind it, and the route persists the
     * analysis before it answers, so the API can finish and save after the
     * browser has already given up. Claiming "nothing was saved" without
     * looking is how a completed analysis gets thrown away, and the doctor's
     * retry then meets a 409 because the record is still `analyzing`.
     *
     * So re-read the record before saying anything. That read is also what puts
     * `analyzing` in the cache and starts the poll above, which is what finishes
     * the job when this lands mid-run (#373).
     */
    onError: async () => {
      const settled = await queryClient
        .fetchQuery({ queryKey: ['consultation', id], queryFn: () => api.getConsultation(id) })
        .catch(() => null)

      if (settled?.analysis) {
        invalidate(settled)
        toast.success('Analysis finished after the request timed out. Your note is ready.')
        return
      }

      // Still running is the common case at this point, not failure: the API
      // outlived the browser's patience and is still working on it.
      if (settled?.status === 'analyzing') {
        toast(
          'Still analysing. This is taking longer than usual, and the note will appear here when it is ready.',
        )
        return
      }

      // A failed read establishes nothing. Saying "nothing was saved" here is a
      // guess, and it is the guess that throws a finished analysis away.
      if (!settled) {
        toast.error(
          'Could not confirm whether the analysis finished. Reopen this consultation to check.',
        )
        return
      }

      toast.error('Analysis failed. Nothing was saved, and you can run it again.')
    },
  })

  /**
   * Applies a CatatAI proposal the doctor approved (#169).
   *
   * It goes down `api.patch`, the same call their own keyboard
   * makes, rather than a copilot-specific write route. That is what makes "the
   * proposal grants no capability the doctor did not already have" a fact
   * rather than a claim: it is byte-for-byte the request the note editor and
   * the disposition controls already send, with the same validation and the
   * same audit events behind it.
   *
   * Note edits merge onto the note currently on screen, never onto `{}`: a
   * partial `editedNote` replacing the whole note would silently blank the
   * three sections the proposal did not mention.
   */
  const applyProposal = async (proposal: CopilotProposal, reason?: string) => {
    // Read from the query cache rather than a render-time binding: the doctor
    // may have edited the note between the proposal arriving and approving it,
    // and merging onto stale text would quietly revert that edit.
    const current = queryClient.getQueryData<ConsultationDetail>(['consultation', id])
    if (!current) throw new Error('No consultation loaded.')

    if (proposal.tool === 'edit_note_section') {
      const canonical = current.editedMedicalRecordNote ?? current.analysis?.medicalRecordNote
      if (canonical) {
        if (proposal.section === 'subjective') {
          throw new Error('A categorized note cannot accept an opaque Subjective replacement.')
        }
        const next = await api.patch(id, {
          editedMedicalRecordNote: { [proposal.section]: proposal.text },
        })
        invalidate(next)
        toast.success(`Applied to ${proposal.section}.`)
        return
      }

      const base = current.editedNote ?? current.analysis?.note
      const next = await api.patch(id, {
        editedNote: { ...base, [proposal.section]: proposal.text },
      })
      invalidate(next)
      toast.success(`Applied to ${proposal.section}.`)
      return
    }

    const decision = { id: '', state: proposal.state, ...(reason ? { reason } : {}) }
    const next = await api.patch(
      id,
      proposal.tool === 'set_red_flag_disposition'
        ? { redFlagDispositions: [{ ...decision, id: proposal.redFlagId }] }
        : { gapDispositions: [{ ...decision, id: proposal.gapId }] },
    )
    invalidate(next)
    toast.success('Decision recorded.')
  }

  /*
   * The ephemeral consultation has no row to PATCH, so review actions are
   * applied in memory instead of over the wire. The state transition is
   * identical to the stored path; only where it lands differs.
   */
  const patchConsultation = async (body: Parameters<typeof api.patch>[1]) => {
    if (!isEphemeral) return api.patch(id, body)
    const current = tour.ephemeral as ConsultationDetail
    const nextMedicalRecordNote =
      body.editedMedicalRecordNote === undefined
        ? undefined
        : MedicalRecordNoteSchema.parse({
            ...(current.editedMedicalRecordNote ?? current.analysis?.medicalRecordNote),
            ...body.editedMedicalRecordNote,
          })
    return {
      ...current,
      ...(body.noteTemplate === undefined ? {} : { noteTemplate: body.noteTemplate }),
      ...(body.captureMode === undefined ? {} : { captureMode: body.captureMode }),
      ...(body.editedNote ? { editedNote: { ...current.analysis?.note, ...body.editedNote } } : {}),
      ...(nextMedicalRecordNote === undefined
        ? {}
        : {
            editedMedicalRecordNote: nextMedicalRecordNote,
            editedNote: toSoapNote(nextMedicalRecordNote),
          }),
      ...(body.acknowledgedRedFlagIds
        ? { acknowledgedRedFlagIds: body.acknowledgedRedFlagIds }
        : {}),
      ...(body.reviewedGapIds ? { reviewedGapIds: body.reviewedGapIds } : {}),
      ...(body.redFlagDispositions
        ? {
            redFlagDispositions: mergeDispositions(
              current.redFlagDispositions,
              body.redFlagDispositions,
            ),
          }
        : {}),
      ...(body.gapDispositions
        ? { gapDispositions: mergeDispositions(current.gapDispositions, body.gapDispositions) }
        : {}),
      updatedAt: new Date(),
    } as ConsultationDetail
  }

  const patch = useMutation({
    mutationFn: patchConsultation,
    onSuccess: (next) => (isEphemeral ? tour.updateEphemeral(next) : invalidate(next)),
    onError: () => toast.error('That change could not be saved. Nothing was changed.'),
  })

  const settings = useMutation({
    mutationFn: (changes: ConsultationSettingsPatch) => patchConsultation(changes),
    onSuccess: (next) => {
      if (isEphemeral) tour.updateEphemeral(next)
      else invalidate(next)
      settingsDialog.current?.close()
    },
  })

  if (isEphemeral && !tour.ephemeral) {
    // The tour ended, which wiped it. Nothing to show and nothing to fetch.
    return <Navigate to="/consultations" replace />
  }

  if (!isEphemeral && consultation.isPending) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full rounded-card" />
      </div>
    )
  }

  const detail = isEphemeral ? tour.ephemeral : consultation.data
  if (!detail) {
    return <p className="text-sm text-emergency">This consultation could not be loaded.</p>
  }
  // Only ambient capture streams a transcript while it runs; press-to-record
  // engines deliver text when the doctor stops, so during that recording the
  // live safety panel could only ever show its placeholders.
  const liveCapture = captureBusy && detail.captureMode === 'ambient'
  const analysis = detail.analysis
  const approved = detail.status === 'approved'
  /*
   * One derived state behind the Analyse button, rather than the mutation and
   * the record answering separately and contradicting each other (#373).
   *
   * The old pair spun on `detail.status === 'analyzing'` while showing "failed"
   * from `analyze.error`, and the spinner disabled the retry the tip was asking
   * for. `analysingSince` comes off the server rather than a local timer, so it
   * survives a reload, and it is the same lease the API enforces: the moment the
   * client stops waiting is the moment the API starts accepting a retry.
   */
  const analysingSince = detail.status === 'analyzing' ? detail.updatedAt.getTime() : null
  const analysisStalled = analysingSince !== null && Date.now() - analysingSince > STALE_ANALYSIS_MS
  const analysing = (analyze.isPending || detail.status === 'analyzing') && !analysisStalled
  // A rejected mutation only means failure once the record agrees. While the
  // API is still working, that rejection is a browser that stopped waiting.
  const analysisFailed = (analyze.error !== null && !analysing) || analysisStalled
  const note = detail.editedNote ?? analysis?.note ?? null
  const hasSoapOnlyEdit = detail.editedNote !== null && detail.editedMedicalRecordNote === null
  const medicalRecordNote = hasSoapOnlyEdit
    ? null
    : (detail.editedMedicalRecordNote ?? analysis?.medicalRecordNote ?? null)

  const copyNote = async () => {
    if (!note) return
    try {
      await navigator.clipboard.writeText(
        formatNoteForClipboard(detail.noteTemplate, note, medicalRecordNote),
      )
      toast.success('Note copied.')
    } catch {
      toast.error('Note could not be copied.')
    }
  }

  // A flag counts as handled once any decision has been recorded about it,
  // whichever of the three it was. The approve bar surfaces the count of
  // undecided flags, not of un-acknowledged ones.
  const unacknowledged = (analysis?.redFlags ?? []).filter(
    (flag) => byId(detail.redFlagDispositions, flag.id) === undefined,
  )

  return (
    // 80px clears the sticky bar below lg; at lg the hook reserves the bar's
    // height and margin, so 16px is enough to stop the wrapper touching the edge.
    <div className="mx-auto max-w-7xl pb-20 lg:pb-4">
      {/*
        One element for the page, not one per turn. The transcript renders in
        both the column and the dialog, and two media elements would let two
        turns play over each other. No `controls`: the transcript rows are the
        transport, and a scrub bar would invite listening to the consultation
        rather than checking a sentence of it.
      */}
      <audio {...audio.audioProps} className="hidden" />
      <ReviewHeader
        id={id}
        detail={detail}
        isEphemeral={isEphemeral}
        ephemeral={tour.ephemeral}
        onEphemeralApproved={tour.updateEphemeral}
        onApproved={onApproved}
        analysisFailed={analysisFailed}
        analysisStalled={analysisStalled}
        analysing={analysing}
        analysingSince={analysingSince}
        unacknowledgedCount={unacknowledged.length}
        note={note}
        captureBusy={captureBusy}
        capturePending={capture.isPending}
        settingsPending={settings.isPending}
        transcriptShown={transcriptShown}
        onAnalyze={() => analyze.mutate()}
        onRename={(title) => rename.mutate(title)}
        onOpenSettings={() => {
          settings.reset()
          settingsDialog.current?.showModal()
        }}
        onToggleTranscript={() => setShowTranscript((value) => !value)}
        onCopyNote={copyNote}
      />

      <ConsultationSettingsDialog
        key={`${detail.noteTemplate}-${detail.captureMode}`}
        ref={settingsDialog}
        noteTemplate={detail.noteTemplate}
        captureMode={detail.captureMode}
        captureModeLocked={detail.transcript !== null}
        saving={settings.isPending}
        error={
          settings.error instanceof ApiError
            ? settings.error.message
            : settings.error
              ? 'That change could not be saved. Nothing was changed.'
              : null
        }
        onSave={(changes) => settings.mutate(changes)}
      />

      <ReviewPanes
        id={id}
        detail={detail}
        isEphemeral={isEphemeral}
        note={note}
        medicalRecordNote={medicalRecordNote}
        approved={approved}
        live={live}
        liveCapture={liveCapture}
        captureBusy={captureBusy}
        transcriptShown={transcriptShown}
        gridRef={gridRef}
        transcriptRef={transcriptRef}
        showConversation={showConversation}
        setShowConversation={setShowConversation}
        conversationDialog={conversationDialog}
        overflow={overflow}
        setOverflow={setOverflow}
        overflowDialog={overflowDialog}
        citableGuidelines={citableGuidelines}
        audio={audio}
        captureSaving={capture.isPending}
        captureError={
          capture.error instanceof ApiError
            ? capture.error.message
            : capture.error
              ? 'Could not save the transcript.'
              : null
        }
        onCapture={(transcript) => capture.mutate(transcript)}
        onRecording={audio.keep}
        onCaptureModeChange={(captureMode) => patch.mutate({ captureMode })}
        onCaptureBusyChange={setCaptureBusy}
        conversationExpanded={conversationExpanded}
        setConversationExpanded={setConversationExpanded}
        onTranscriptSaved={(next) => queryClient.setQueryData(['consultation', id], next)}
        patchSaving={patch.isPending}
        onPatch={(body) => patch.mutate(body)}
        onPatchAsync={(body) => patch.mutateAsync(body)}
      />

      {/* Only the approved state renders here now: the attribution is a
          record, not an action, and it prints (issue #26). The gate itself
          moved under the consultation title, where it is seen without covering
          the columns it sits over. */}
      {analysis && approved && (
        <ApproveBar
          ref={bottomBarRef}
          approve={async () =>
            isEphemeral
              ? ({
                  ...(tour.ephemeral as ConsultationDetail),
                  status: 'approved',
                  approvedAt: new Date(),
                  // The demo has no signed-in identity distinct from the viewer,
                  // and inventing a clinician name on a screen that teaches what
                  // approval means would be the wrong thing to fake.
                  approvedBy: null,
                } as ConsultationDetail)
              : api.approve(id)
          }
          approved={approved}
          approvedAt={detail.approvedAt}
          approvedBy={detail.approvedBy}
          unacknowledgedCount={unacknowledged.length}
          onApproved={isEphemeral ? tour.updateEphemeral : onApproved}
        />
      )}
      {/*
       * Rendered inactive on the tour's consultation, which is not stored, so
       * the copilot route would 404 on every message (#80). It renders at all
       * because the tour needs the `data-tour="catatai"` anchor to exist, and
       * a coachmark pointing at an element that is not there is the failure
       * `DemoTour`'s subject scoring exists to prevent (#179).
       *
       * **Keyed on the tour step, which is what closes the panel.** Advancing
       * or ending the tour remounts this and resets `open` to false, so the
       * step bar's End control never competes with an open panel. The key is
       * constant off the tour, so a real review never remounts.
       *
       * Offered on an approved record, where it answers but cannot propose:
       * the backend withholds the tools once `status` is `approved` rather
       * than the panel hiding, because the questions a doctor asks about a
       * note they have signed are the same questions, and a copilot that
       * disappears at sign-off looks like a bug from the outside.
       */}
      <CatatAI
        key={isEphemeral ? `tour-${tour.currentStep}` : 'record'}
        consultation={detail}
        onApply={applyProposal}
        demo={isEphemeral}
      />
    </div>
  )
}

export type { ClinicalAssertion }
