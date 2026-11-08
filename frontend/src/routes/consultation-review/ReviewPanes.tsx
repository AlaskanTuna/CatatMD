import type {
  CaptureMode,
  ConsultationDetail,
  GuidelineChunk,
  MedicalRecordNote,
  SoapNote,
  Transcript,
} from '@shared/types'
import { Maximize2 } from 'lucide-react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { useLivePanes } from '../../audio/live/use-live-panes.js'
import type { useTranscriptAudio } from '../../audio/use-transcript-audio.js'
import type { api } from '../../lib/api.js'
import { cn } from '../../lib/cn.js'
import { count } from '../../lib/plural.js'
import { ChecklistPanel } from '../../review/ChecklistPanel.js'
import { LivePrompter } from '../../review/LivePrompter.js'
import { GAP_PRIORITY_ORDER, SEVERITY_ORDER } from '../../review/live-prompt.js'
import {
  LegacyMedicalRecordView,
  MedicalRecordNoteEditor,
} from '../../review/MedicalRecordNoteEditor.js'
import { NoteEditor } from '../../review/NoteEditor.js'
import { PrescriptionBlock } from '../../review/PrescriptionBlock.js'
import { GapCard, RedFlagCard, SuggestionCard } from '../../review/SafetyCards.js'
import { ScoreCard } from '../../review/ScoreCard.js'
import { TranscriptCorrections } from '../../review/TranscriptCorrections.js'
import { Button } from '../../ui/Button.js'
import { Card } from '../../ui/Card.js'
import { CapturePanel } from '../CapturePanel.js'
import { byId, type Overflow } from './helpers.js'
import { FindingsPanel, LivePanel, NotePlaceholder, Panel } from './review-panels.js'
import { SettledConversation } from './settled-conversation.js'

type PatchBody = Parameters<typeof api.patch>[1]
type LiveCaptureState = ReturnType<typeof useLivePanes>
type SessionAudio = ReturnType<typeof useTranscriptAudio>

type ReviewPanesProps = {
  id: string
  detail: ConsultationDetail
  isEphemeral: boolean
  note: SoapNote | null
  medicalRecordNote: MedicalRecordNote | null
  approved: boolean
  live: LiveCaptureState
  liveCapture: boolean
  captureBusy: boolean
  transcriptShown: boolean
  gridRef: RefObject<HTMLDivElement | null>
  transcriptRef: RefObject<HTMLElement | null>
  showConversation: boolean
  setShowConversation: Dispatch<SetStateAction<boolean>>
  conversationDialog: RefObject<HTMLDialogElement | null>
  overflow: Overflow | null
  setOverflow: Dispatch<SetStateAction<Overflow | null>>
  overflowDialog: RefObject<HTMLDialogElement | null>
  citableGuidelines: GuidelineChunk[]
  audio: SessionAudio
  captureSaving: boolean
  captureError: string | null
  onCapture: (transcript: Transcript) => void
  onRecording: (recording: Blob) => void
  onCaptureModeChange: (captureMode: CaptureMode) => void
  onCaptureBusyChange: (busy: boolean) => void
  conversationExpanded: boolean
  setConversationExpanded: Dispatch<SetStateAction<boolean>>
  onTranscriptSaved: (next: unknown) => void
  patchSaving: boolean
  onPatch: (body: PatchBody) => void
  onPatchAsync: (body: PatchBody) => Promise<ConsultationDetail>
}

export function ReviewPanes({
  id,
  detail,
  isEphemeral,
  note,
  medicalRecordNote,
  approved,
  live,
  liveCapture,
  captureBusy,
  transcriptShown,
  gridRef,
  transcriptRef,
  showConversation,
  setShowConversation,
  conversationDialog,
  overflow,
  setOverflow,
  overflowDialog,
  citableGuidelines,
  audio,
  captureSaving,
  captureError,
  onCapture,
  onRecording,
  onCaptureModeChange,
  onCaptureBusyChange,
  conversationExpanded,
  setConversationExpanded,
  onTranscriptSaved,
  patchSaving,
  onPatch,
  onPatchAsync,
}: ReviewPanesProps) {
  const analysis = detail.analysis
  const flags = [...(analysis?.redFlags ?? [])].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  )
  // Stable, so the checklist's own order survives inside each band and a
  // model-proposed gap stays beside the deterministic entries it arrived with.
  const gaps = [...(analysis?.gaps ?? [])].sort(
    (a, b) => GAP_PRIORITY_ORDER[a.priority] - GAP_PRIORITY_ORDER[b.priority],
  )
  // Transcript turns carry no id in the shared contract, and position *is*
  // their identity: the list is immutable for a given consultation and is
  // never sorted or filtered. Naming that explicitly beats an index in JSX.
  const keyedTurns = (detail.transcript?.turns ?? []).map((turn, position) => ({
    ...turn,
    key: `${position}-${turn.speaker}`,
  }))

  /*
   * Built once and rendered in exactly one of two places: the companion column
   * while the conversation is docked, or inside the theatre while it is open.
   *
   * One element, one mount. A panel carrying red flags must never exist twice
   * in the accessibility tree, and rendering the same element in both places
   * would create two live instances rather than move one.
   */
  const livePrompter = (
    <LivePrompter
      live={live.panes}
      onShowAll={() =>
        setOverflow({
          title: 'Missing Information',
          findings: [...live.panes.gaps]
            .sort((a, b) => GAP_PRIORITY_ORDER[a.priority] - GAP_PRIORITY_ORDER[b.priority])
            .map((gap) => ({
              id: gap.id,
              node: (
                <GapCard
                  gap={gap}
                  disposition={byId(detail.gapDispositions, gap.id)}
                  onDecide={(decision) => onPatch({ gapDispositions: [decision] })}
                  guidelines={citableGuidelines}
                />
              ),
            })),
        })
      }
    />
  )

  return (
    <>
      {/* Three panels on wide screens, in every state rather than only the
          analysed one. Below lg the safety rail moves ABOVE the note rather
          than below it: docs/DESIGN.md requires severity to be visible without
          scrolling, and on a narrow screen that can only mean first in source
          order. The panels never become tabs, because tabs hide safety content.

          Capture used to replace this whole arrangement with a single card,
          which meant the doctor captured a consultation with no sight of where
          any of it would land. The columns are the explanation: the note fills
          the middle, the checks fill the rail, and both reveal their shape
          while they are still empty. */}
      {/*
        The tracks swap on the one phase change that matters, and during
        capture the screen drops to two columns (#278).

        While the doctor is talking the note is deliberately a placeholder, so
        it is not merely narrow, it is four rows of grey bars occupying a
        column. The rail beside it held twenty-eight gap cards with 264px of
        them below the fold, which nobody reads mid-sentence. Both are hidden
        rather than removed, and both return at Stop; `LivePrompter` carries
        what is actually readable in a glance and takes the 380px.

        Severity stays visible without scrolling, which is the docs/DESIGN.md
        requirement the rail's fixed 340px used to serve. It is better served
        here: the prompter's red-flag section is permanent and above the fold,
        where a rail hit could sit at position one of thirty-two with the
        panel scrolled away.
      */}
      <div
        ref={gridRef}
        className={cn(
          'mt-6 grid gap-5',
          // `captureBusy` rather than a second signal of my own: #272 already
          // lifts exactly this from `AmbientCapture`'s `onLiveChange`, and two
          // props tracking one session is one of them going stale.
          liveCapture
            ? 'lg:grid-cols-[minmax(0,1fr)_380px]'
            : captureBusy
              ? 'lg:grid-cols-1'
              : 'lg:grid-cols-[380px_minmax(0,1fr)_340px]',
        )}
      >
        <section
          ref={transcriptRef}
          className={cn(
            // `scroll-mt-20` clears the fixed chrome cluster, which is out of
            // flow and would otherwise cover the heading this scrolls to.
            'order-3 scroll-mt-20 lg:sticky lg:top-6 lg:order-1',
            // One ceiling for all three columns, not one height. The grid
            // already stretches them to a common row height, so their tops and
            // bottoms line up without any column being padded out to the
            // viewport: a draft with three short cards stays short, while a
            // long transcript stops at the ceiling and scrolls inside itself
            // rather than running the page. This column was the worst of it
            // before: a one-line transcript left a 380px stub beside two
            // full-length neighbours.
            //
            // The last child stretches so the card bottoms line up too, and it
            // is `grow shrink-0` rather than `flex-1` for a measured reason:
            // `flex-1` is `1 1 0%`, so a transcript taller than the column is
            // shrunk to fit it, the column stops generating a scrollbar, and
            // everything past the fold becomes unreachable. Growing from an
            // `auto` basis that may never shrink fills the gap when content is
            // short without capping it when content is long.
            /*
             * The ceiling is measured from the DOM, not guessed, because the
             * header band and bottom bar change height with the consultation
             * state. A fixed `13rem` assumed the same band for every state and
             * overflowed the page by 234px at 1440x900.
             */
            // A fixed height, where the other two columns cap theirs: a
            // transcript is usually shorter than the note beside it, and a
            // capped column ends where its content ends, so the three
            // columns only bottom-align if this one is held to the floor and
            // its card is let grow into it.
            // The floor is conditional on an analysis being present.
            // Without one, the note and rail are short empty cards, and a fixed
            // height would stand this column a full viewport tall beside them.
            analysis
              ? 'lg:h-[var(--review-columns-height)]'
              : 'lg:max-h-[var(--review-columns-height)]',
            'lg:overflow-y-auto lg:pr-1 lg:flex lg:flex-col lg:[&>*:last-child]:grow lg:[&>*:last-child]:shrink-0',
            // The mobile show/hide belongs to a transcript that already
            // exists. Capture is the one thing on this screen a doctor has
            // come here to do, so it is never behind a toggle.
            detail.transcript && !transcriptShown ? 'hidden lg:block' : 'block',
          )}
          aria-labelledby="transcript-heading"
          data-tour="transcript"
          data-print="hide"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="transcript-heading" className="text-sm font-semibold">
              Transcript
            </h2>
            {/*
              The way back into the conversation once it is settled. The column
              is 380px and the transcript is the one thing on this page that is
              read rather than scanned, so it gets a surface of its own on
              demand instead of a taller column nobody asked for.
            */}
            {detail.transcript && (
              <Button
                size="sm"
                variant="neutral"
                icon={<Maximize2 aria-hidden className="size-3.5" />}
                onClick={() => setShowConversation(true)}
              >
                View Conversation
              </Button>
            )}
          </div>
          {/* The column itself scrolls from `lg` up, so the inner cap is
              released there rather than nesting one scrollbar inside another.
              Below `lg` the column is uncapped and this is what stops a long
              transcript running the page. */}
          {/*
            The settled transcript takes the same turn-per-row shape the live
            pane uses, so the transcript does not change its reading rules the
            moment capture stops. Two differences, both earned: the roles are
            real here, because `draftHostedTurns` has run, and the type is 14px
            rather than 12px, which is the documented body floor and is most of
            what made this read as a wall.
          */}
          {detail.transcript && (
            <div className="@container max-h-[70vh] overflow-y-auto rounded-card bg-sunken p-4 lg:max-h-none lg:overflow-visible">
              {/*
                Sides, not a single left edge, matching the live pane (#278).
                The doctor keeps the left because that is where they sat while
                the words were arriving; a transcript that reflowed at Stop
                would make the reader re-find the thread.

                One rule holds across both panes: the right speaker takes
                `accent-soft`, and the left takes whichever neutral contrasts
                with the ground. That is `surface` here and `sunken` in the
                live pane, because the two grounds are the other way round.
              */}
              <SettledConversation
                turns={keyedTurns}
                translatedFrom={detail.transcript.machineTranslation?.languages}
                onPlay={audio.available ? audio.play : undefined}
                playing={audio.playing}
              />
            </div>
          )}
          {/*
            Corrections sit under the conversation and only while the note has
            not been built yet (#308). Past `draft` the note was generated from
            these words, so changing them would leave it grounded in text the
            record no longer holds, and the API refuses for the same reason.
          */}
          {detail.transcript && detail.status === 'draft' && (
            <div className="mt-3">
              <TranscriptCorrections
                consultationId={id}
                transcript={detail.transcript}
                onSaved={(next) => onTranscriptSaved(next)}
              />
            </div>
          )}
          {!detail.transcript && (
            <Card className="flex flex-col p-4">
              <CapturePanel
                captureMode={detail.captureMode}
                saving={captureSaving}
                error={captureError}
                onCapture={(transcript) => onCapture(transcript)}
                onRecording={onRecording}
                onLiveSegments={live.absorb}
                onCaptureModeChange={onCaptureModeChange}
                /*
                 * Deliberately does not open the theatre. This fires for
                 * press-to-record as well, which has no live conversation and
                 * so no dialog to put the safety panel in: opening from here
                 * withheld the companion column during a manual recording and
                 * left the prompter nowhere at all. `AmbientCapture` asks for
                 * the theatre itself, when its own session starts.
                 */
                onCaptureBusyChange={onCaptureBusyChange}
                conversationExpanded={conversationExpanded}
                onConversationExpandedChange={setConversationExpanded}
                prompter={livePrompter}
                patientName={detail.patient?.name ?? undefined}
              />
            </Card>
          )}
        </section>

        {/*
          The one thing on screen during capture that is neither the
          conversation nor a placeholder for something that has not happened
          yet (#278).

          `order-1` below `lg`, so on a narrow screen the safety section is
          first in source order, which is the only way "visible without
          scrolling" can mean anything there. That is the rule the rail
          followed and the reason it never became a tab.
        */}
        {liveCapture && !conversationExpanded && (
          <section className="order-1 min-w-0 lg:sticky lg:top-6 lg:order-2 lg:max-h-[var(--review-columns-height)] lg:overflow-y-auto lg:pr-1">
            {livePrompter}
          </section>
        )}

        <section
          className={cn(
            'order-2 min-w-0',
            // Hidden, never unmounted: the note placeholder and its live
            // checklist keep their state across the capture, and Stop brings
            // them straight back rather than rebuilding them.
            //
            // The layout is withheld rather than overridden, because `hidden`
            // appended to it does nothing above `lg` (#282). Tailwind emits
            // `lg:flex` into a `min-width: 64rem` block later in the same
            // `@layer utilities` as the base `hidden` rule, so above `lg` it
            // wins on order, and `cn()` cannot collapse the pair because a
            // variant makes them different utilities rather than a conflict.
            // Measured on production at 1440x900: the column carried `hidden`
            // and computed `display: flex`, which put a third item in the
            // two-column capture grid, wrapped it onto a second row, and
            // overflowed the page by 738px mid-consultation. The rail below
            // never had this, because its `flex` carries no variant.
            captureBusy
              ? 'hidden'
              : 'lg:sticky lg:top-6 lg:max-h-[var(--review-columns-height)] lg:overflow-y-auto lg:pr-1 lg:flex lg:flex-col lg:[&>*:last-child]:grow lg:[&>*:last-child]:shrink-0',
          )}
          aria-labelledby="note-heading"
          data-print="expand"
        >
          <h2 id="note-heading" className="mb-2 text-sm font-semibold" data-print="hide">
            Clinical Note
          </h2>
          {analysis && note ? (
            <>
              {medicalRecordNote && analysis.medicalRecordNote ? (
                <MedicalRecordNoteEditor
                  note={medicalRecordNote}
                  aiNote={analysis.medicalRecordNote}
                  template={detail.noteTemplate}
                  readOnly={approved}
                  saving={patchSaving}
                  onSave={(editedMedicalRecordNote: Partial<MedicalRecordNote>) =>
                    onPatch({ editedMedicalRecordNote })
                  }
                />
              ) : detail.noteTemplate === 'malaysian' ? (
                <LegacyMedicalRecordView note={note} aiNote={analysis.note} />
              ) : (
                <NoteEditor
                  note={note}
                  aiNote={analysis.note}
                  readOnly={approved}
                  saving={patchSaving}
                  onSave={(editedNote: Partial<SoapNote>) => onPatch({ editedNote })}
                />
              )}
              {/*
                Above the checklist, because a prescription belongs beside the
                plan it came out of while the checklist is a review of what the
                note is missing. It is also what keeps the column's
                `[&>*:last-child]:grow` on the panel that has always carried it.

                Not in the tour: the ephemeral consultation has no row, so the
                parse route would 404 on an id no database holds.
              */}
              {!isEphemeral && (
                <PrescriptionBlock
                  consultationId={id}
                  prescriptions={detail.prescriptions}
                  status={detail.status}
                  patientName={detail.patient?.name ?? undefined}
                  onSave={(prescriptions) => onPatchAsync({ prescriptions })}
                />
              )}
              <ChecklistPanel
                clinicalFacts={analysis.clinicalFacts}
                operational={analysis.operational}
                evidenceLinks={analysis.evidenceLinks}
              />
            </>
          ) : (
            <>
              <NotePlaceholder template={detail.noteTemplate} />
              {/*
                The patient card fills while the doctor talks; the note does
                not. That split is the design rather than an omission: §20.8.1
                measures writing the note from extracted facts as *less*
                grounded than writing it from the transcript, and a note folded
                from a previous note is that shape by another route. So
                extraction drives this card, and the note is written once, at
                Finish, from the transcript.
              */}
              {live.panes.clinicalFacts && live.panes.operational && (
                <ChecklistPanel
                  clinicalFacts={live.panes.clinicalFacts}
                  operational={live.panes.operational}
                />
              )}
            </>
          )}
        </section>

        {/* The rail scrolls itself instead of stretching the page.
              Previously it was the tallest column by a wide margin (one guest
              consultation produced four flags and twenty-seven gaps), so it set
              the height of the whole screen and left the other two columns
              sitting beside a long empty gutter. Sticky keeps the flags next to
              the note while it is edited, which is the actual workflow, and the
              page can never be taller than the note itself.

              The bottom stop clears the approve bar, which is `sticky bottom-4`
              in flow and would otherwise sit on top of the last card. */}
        <aside
          className={cn(
            'order-1 flex flex-col gap-5 lg:sticky lg:top-6 lg:order-3 lg:max-h-[var(--review-columns-height)] lg:overflow-y-auto lg:pr-1 lg:[&>section]:grow lg:[&>section]:shrink-0',
            captureBusy && 'hidden',
          )}
          aria-label="Clinical safety"
          data-print="expand"
        >
          {!analysis && (
            <>
              {/*
                Ruled bars, not pulsing skeletons, for the same reason
                `NotePlaceholder` gives: nothing is loading here. Analysis has
                not been asked for yet, and a shimmer would promise work in
                progress that the doctor has not started. The bars show where
                each panel's findings will land, which is the empty-state claim
                the prose these replaced was making at three times the length.
              */}
              {/* One fixed height for all three, rather than three cards each
                  sized by the two bars inside it. Content-sized placeholders
                  make the rail's rhythm an accident of how many bars a panel
                  happens to draw, and the three panels are peers: nothing about
                  an unanalysed consultation makes one of them shorter than
                  another. Fixed also means the rail does not resize when the
                  real findings replace them. */}
              {(['Red Flags', 'Missing Information', 'Suggestions'] as const).map((title) =>
                /*
                  Once ambient capture has said something, the first two stop
                  being placeholders and start being the live panes (#219).
                  Suggestions keeps its bars: it is the one panel with no live
                  half, because `generateSuggestions` is the most expensive call
                  in the pipeline and nobody asked for it mid-consultation.
                */
                title !== 'Suggestions' && live.panes.hasContent ? (
                  <LivePanel key={title} title={title} live={live.panes} />
                ) : (
                  <Panel key={title} title={title}>
                    <Card className="flex-1 p-4 min-h-24">
                      <div className="h-2 w-full rounded-pill bg-sunken" />
                      <div className="mt-1.5 h-2 w-3/5 rounded-pill bg-sunken" />
                    </Card>
                  </Panel>
                ),
              )}
            </>
          )}

          {analysis && (
            <>
              <FindingsPanel
                title="Red Flags"
                noun="Red Flags"
                empty="No escalation triggers fired for this consultation."
                findings={flags.map((flag) => ({
                  id: flag.id,
                  node: (
                    <RedFlagCard
                      flag={flag}
                      disposition={byId(detail.redFlagDispositions, flag.id)}
                      onDecide={(decision) => onPatch({ redFlagDispositions: [decision] })}
                      guidelines={citableGuidelines}
                      onPlay={audio.available ? audio.play : undefined}
                      playing={audio.playing}
                    />
                  ),
                }))}
                onShowAll={setOverflow}
              />

              <FindingsPanel
                title="Missing Information"
                noun="Missing Items"
                findings={gaps.map((gap) => ({
                  id: gap.id,
                  node: (
                    <GapCard
                      gap={gap}
                      disposition={byId(detail.gapDispositions, gap.id)}
                      onDecide={(decision) => onPatch({ gapDispositions: [decision] })}
                      guidelines={citableGuidelines}
                    />
                  ),
                }))}
                onShowAll={setOverflow}
              />

              <FindingsPanel
                title="Suggestions"
                noun="Suggestions"
                empty={
                  /* Three readings, not two, because the system distinguishes
                     them and the reader deserves the same distinction. Absence
                     is its own case: consultations analysed before `outOfScope`
                     shipped have no value, and reading that as `false` would
                     assert the corpus was consulted when nobody knows.
                     A retrieval that returned no passages is also distinct from
                     an out-of-scope consultation, so it is not read as the corpus
                     having nothing to say. */
                  analysis.outOfScope === true
                    ? 'Outside the guideline corpus\u2019s scope, so no suggestions were offered.'
                    : analysis.outOfScope === false
                      ? (analysis.retrievedGuidelines == null ||
                          analysis.retrievedGuidelines.length === 0) &&
                        analysis.suggestions.length === 0
                        ? 'No guideline passages were retrieved for this consultation, so no suggestions were offered.'
                        : 'Within the guideline corpus\u2019s scope, with nothing to suggest for this consultation.'
                      : 'No cited suggestions. This consultation was analysed before scope was recorded, so whether the corpus applied is not known.'
                }
                findings={analysis.suggestions.map((suggestion) => ({
                  id: suggestion.id,
                  node: <SuggestionCard suggestion={suggestion} guidelines={citableGuidelines} />,
                }))}
                onShowAll={setOverflow}
              />

              {/* Offered only where the presentation has one (#221). Absent on
                  a consultation analysed before scores shipped, which is not
                  the same as none applying, so nothing is said then. Kept off
                  paper: the answers are not saved, and a printed total would
                  read as part of the record. Keyed on the scores, suggestions
                  included, so a fresh analysis starts empty again. */}
              {analysis.scores !== undefined && analysis.scores.length > 0 && (
                <Panel title="Scores" count={analysis.scores.length} printHidden>
                  <ScoreCard
                    key={JSON.stringify(analysis.scores)}
                    scores={analysis.scores}
                    guidelines={citableGuidelines}
                  />
                </Panel>
              )}
            </>
          )}
        </aside>
      </div>
      {/* Every finding in the panel, at a width that fits the card's own
          explanation, instead of thirty of them threaded through a 340px rail.
          The rail keeps the first three as the preview and still renders the
          rest for print, so paper is unaffected by anything here. */}
      <dialog
        ref={overflowDialog}
        data-print="hide"
        onClose={() => setOverflow(null)}
        aria-labelledby="overflow-title"
        className="glass-panel m-auto w-[44rem] max-w-[calc(100vw-2rem)] rounded-float p-0 text-ink backdrop:bg-scrim backdrop:backdrop-blur-sm"
      >
        {overflow && (
          <div className="flex max-h-[80vh] flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
              <h2 id="overflow-title" className="font-display text-lg font-semibold">
                {overflow.title}
                <span className="ml-2 text-sm font-normal text-ink-muted">
                  {count(overflow.findings.length, 'item')}
                </span>
              </h2>
              {/* First in the DOM, and so the one the open effect focuses. */}
              <Button size="sm" variant="neutral" onClick={() => overflowDialog.current?.close()}>
                Close
              </Button>
            </div>
            <div className="flex flex-col gap-3 overflow-y-auto p-6">
              {overflow.findings.map((finding) => (
                <div key={finding.id}>{finding.node}</div>
              ))}
            </div>
          </div>
        )}
      </dialog>

      {/*
        The settled conversation on a surface worth reading it on (#287), the
        same size as the live one ambient capture opens, so the conversation
        does not change shape between recording it and reading it back.

        Read only, deliberately. The transcript is the record the note was
        written from, and this is a way to go back to it, not a second place to
        edit it.
      */}
      <dialog
        ref={conversationDialog}
        data-print="hide"
        onClose={() => setShowConversation(false)}
        aria-labelledby="conversation-title"
        className="glass-panel m-auto h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none rounded-float p-0 text-ink backdrop:bg-scrim backdrop:backdrop-blur-sm"
      >
        {showConversation && (
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-6 py-4">
              <h2 id="conversation-title" className="font-display text-lg font-semibold">
                Conversation
                <span className="ml-2 text-sm font-normal text-ink-muted">
                  {count(keyedTurns.length, 'turn')}
                </span>
              </h2>
              {/* First in the DOM, and so the one the open effect focuses. */}
              <Button size="sm" variant="neutral" onClick={() => setShowConversation(false)}>
                Close
              </Button>
            </div>
            <div className="@container min-h-0 flex-1 overflow-y-auto bg-sunken p-6">
              <SettledConversation
                turns={keyedTurns}
                translatedFrom={detail.transcript?.machineTranslation?.languages}
                onPlay={audio.available ? audio.play : undefined}
                playing={audio.playing}
              />
            </div>
          </div>
        )}
      </dialog>
    </>
  )
}
