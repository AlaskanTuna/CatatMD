import { MAX_PRESCRIPTIONS, type Prescription } from '@shared/types'
import { useMutation } from '@tanstack/react-query'
import { Check, Mic } from 'lucide-react'
import { type SyntheticEvent, useCallback, useEffect, useId, useRef, useState } from 'react'
import { cn } from '../lib/cn.js'
import { Button } from '../ui/Button.js'
import {
  PrescriptionDictationHeader,
  STOP_LABEL,
} from './prescription/PrescriptionDictationHeader.js'
import { PANEL, PrescriptionLinesTable } from './prescription/PrescriptionLinesTable.js'
import { usePrescriptionDictation } from './prescription/use-prescription-dictation.js'
import { usePrescriptionDraft } from './prescription/use-prescription-draft.js'
import { MAX_DICTATED_CHARACTERS } from './prescription-draft.js'
import { START_FAILED_ERROR } from './use-dictation-stream.js'

/**
 * Where a prescription is dictated and assembled (#365).
 *
 * **A theatre, for the reason the capture theatre is one** (`docs/DESIGN.md`,
 * "While Capture Is Running"). The compose form lived in the review page's
 * middle column, which is about 620px wide and is itself an internal scroller,
 * with a three-line dictation box. Everything a doctor needed to check a
 * prescription was stacked in that column and most of it was below the fold,
 * which is what made a wired Accept button read as dead.
 *
 * **One table of lines, read from the whole box** (`docs/DECISIONS.md` D-001,
 * amended 06/10/26). One parse returns every drug said, each with its own sig,
 * and the box is read again shortly after the doctor stops editing it. An exact
 * name starts ticked, a near-match waits for a tick, and a line with a sig but
 * no recognised name holds Confirm until it is named or unticked.
 *
 * **A native `<dialog>` rather than a fixed panel.** `showModal()` promotes it
 * to the top layer, outside every backdrop root, which is what keeps the glass
 * from frosting against a flat fill; it also hands over focus trapping, Escape
 * and inertness of the page behind at no cost. The panel is glass because it is
 * chrome, and everything inside carrying clinical text sits on an opaque
 * surface.
 *
 * **Nothing is stored until Confirm.** Parsing writes nothing server-side, the
 * table is local state, and confirming is one ordinary
 * `PATCH /api/consultations/:id { prescriptions }` carrying the whole list.
 */

const SAVE_FAILED = 'That could not be saved. Nothing was lost, try Confirm again.'

const DISCARD_PROMPT = 'Discard the prescriptions you have not confirmed?'

export function PrescriptionTheatre({
  consultationId,
  stored,
  open,
  autoStart,
  patientName,
  onSave,
  onClose,
}: {
  consultationId: string
  stored: Prescription[]
  open: boolean
  /** Opened by Dictate rather than by Add, so the microphone starts itself. */
  autoStart: boolean
  patientName?: string
  onSave: (next: Prescription[]) => Promise<unknown>
  onClose: () => void
}) {
  const self = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const boxId = useId()
  const linesId = useId()
  const box = useRef<HTMLTextAreaElement>(null)
  const [error, setError] = useState<string | null>(null)

  const draft = usePrescriptionDraft({ consultationId, dialog: self, setError })
  const {
    addByHand,
    dictation,
    drugFields,
    edit,
    everyRow,
    fresh,
    generics,
    manual,
    onDictated,
    parseFailed,
    parsePending,
    parsedFrom,
    read,
    ready,
    removeTicked,
    removedCount,
    restoreRemoved,
    rows,
    scheduleRead,
    setDictation,
    stale,
    undecided,
    unnamed,
    reset: resetDraft,
  } = draft
  const dictationState = usePrescriptionDictation({
    open,
    dictation,
    setDictation,
    onDictated,
    setError,
  })
  const {
    capturing,
    configFailure,
    elapsed,
    engineResolved,
    liveStream,
    listening,
    phase,
    progress,
    reset: resetDictation,
    startDictation,
    startRecording,
    stopDictation,
    stream,
    thin,
  } = dictationState

  useEffect(() => scheduleRead(open, listening), [listening, open, scheduleRead])

  const save = useMutation({
    mutationFn: (next: Prescription[]) => onSave(next),
    onError: () => setError(SAVE_FAILED),
  })

  const reset = useCallback(() => {
    resetDraft()
    resetDictation()
  }, [resetDictation, resetDraft])

  useEffect(() => {
    /*
     * `showModal` and `close` are guarded because jsdom implements neither. The
     * `open` attribute fallback is not a no-op: it is what the UA stylesheet keys
     * on, so the contents leave `display: none` and enter the accessibility tree,
     * which is the part a test can see. Real browsers take the first branch and
     * get the top layer, the focus trap and Escape with it.
     */
    const node = self.current
    if (!node) return
    if (!open) {
      if (typeof node.close === 'function') node.close()
      else node.removeAttribute('open')
      return
    }
    if (typeof node.showModal === 'function') node.showModal()
    else node.setAttribute('open', '')
  }, [open])

  /*
   * Focus is set here rather than left to the dialog, because `showModal()`
   * runs its autofocus pass before conditionally rendered children have
   * mounted: focus lands on the dialog itself and the first Tab goes nowhere
   * useful. Same fix, and same reason, as `AmbientCapture`'s.
   *
   * Where it lands says what the surface is for. Opened by Dictate the
   * microphone is already running, so Stop is the only thing worth pressing;
   * opened by Add there is nothing running and the box is the whole point.
   */
  const started = useRef(false)
  useEffect(() => {
    if (!open) {
      started.current = false
      return
    }
    if (started.current) return
    // Waits rather than falling through: the engine is not known yet, and
    // guessing it is what shipped the wrong one.
    if (autoStart && !engineResolved) return
    started.current = true
    if (autoStart) {
      startDictation()
      return
    }
    box.current?.focus()
  }, [open, autoStart, engineResolved, startDictation])

  /*
   * Focus follows the microphone rather than being set beside the call that
   * starts it. `startDictation` sets state from an effect body, which React
   * batches rather than flushing, so on that tick the header still renders its
   * idle branch and there is no Stop button to focus: the query found nothing
   * and focus fell to the body a tick later when the idle branch unmounted.
   */
  useEffect(() => {
    if (!open || !autoStart || !capturing) return
    self.current?.querySelector<HTMLButtonElement>(`[aria-label="${STOP_LABEL}"]`)?.focus()
  }, [open, autoStart, capturing])

  /** The microphone or the on-device model has the box. */
  const busy = listening || parsePending

  /** The table is from the text as it stands, not from words since changed. */
  const room = MAX_PRESCRIPTIONS - stored.length
  /*
   * After the first read rather than on the first keystroke, so a doctor typing
   * from Add does not watch the surface widen under the words.
   */
  const reviewing = !capturing && (parsedFrom !== null || parseFailed || manual.length > 0)
  const confirmable =
    ready.length > 0 &&
    unnamed === 0 &&
    undecided === 0 &&
    ready.length <= room &&
    !busy &&
    !stale &&
    !save.isPending

  const confirm = () => {
    if (!confirmable) return
    save.mutate([...stored, ...ready], {
      onSuccess: () => {
        reset()
        onClose()
      },
    })
  }

  const statusLine = () => {
    // The gap between opening on Dictate and knowing which engine to open.
    if (autoStart && !engineResolved && !capturing) return 'Getting ready.'
    if (stream.phase === 'connecting') return 'Connecting.'
    if (capturing && stream.phase !== 'finishing') {
      return 'Listening. Press Stop when you have finished.'
    }
    if (stream.phase === 'finishing') return 'Finishing, waiting for the last words.'
    if (phase === 'loading-model') {
      return progress === null || progress >= 100
        ? 'Opening the speech model.'
        : `Downloading the speech model, ${progress}%.`
    }
    if (phase === 'transcribing') return 'Transcribing on this device.'
    if (parsePending || (stale && !parseFailed)) return 'Reading the prescription.'
    return ''
  }

  const status =
    statusLine() !== ''
      ? statusLine()
      : undecided > 0
        ? `${undecided} ${undecided === 1 ? 'line was' : 'lines were'} not an exact match. Tick to accept, or leave it out.`
        : unnamed > 0
          ? `${unnamed} ticked ${unnamed === 1 ? 'line has' : 'lines have'} no drug name. Name it, or untick it to leave it out.`
          : ready.length > room
            ? `Ten is the most this record holds, and ${stored.length} already recorded. Untick a line.`
            : reviewing
              ? `${ready.length} to confirm, ${stored.length} already recorded`
              : ''
  const failure = error ?? stream.error

  /**
   * The one question, asked by every path that would drop staged rows.
   *
   * It lived on `onCancel` alone, which fires for Escape and never for
   * `close()`, so the header's X and the Discard button each wiped the list
   * without asking. A guard reachable by one of three doors is not a guard.
   */
  const mayDiscard = () => ready.length === 0 || window.confirm(DISCARD_PROMPT)

  const requestClose = () => {
    if (mayDiscard()) self.current?.close()
  }

  /**
   * Escape stops the dictation and keeps the theatre open, rather than docking
   * and streaming on the way the ambient theatre does. A consultation must keep
   * recording while the doctor uses the page behind it; a dictated phrase has
   * nothing to keep running for, and stopping loses nothing because the settled
   * words are kept and the parse runs on them. A second Escape closes.
   *
   * With rows staged it asks first, because closing would drop prescriptions
   * that were never saved.
   */
  const cancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (capturing) {
      event.preventDefault()
      stopDictation()
      return
    }
    if (!mayDiscard()) event.preventDefault()
  }

  return (
    /*
     * Sized by what it holds rather than by the viewport. One column while
     * there is only the box to show, at a width that keeps the dictated text
     * near the measure the note uses; two once there are decisions to make,
     * wide enough to keep the 440px decision column beside an evidence column
     * of about the same width the box had. Height follows the content up to
     * the ceiling `ChecklistPanel` and `CatatAI` use, and past it the body
     * scrolls while the header and the Confirm footer stay put. `open:flex`
     * rather than `flex`, for the reason `ChecklistPanel` gives: author display
     * outranks the UA rule hiding a closed dialog.
     *
     * A fifth larger on every bound than it first shipped (08/10/26): six
     * columns of sig controls left the drug field too narrow to read a long
     * generic name.
     *
     * The background is the Completeness Checklist's, so the two floating
     * panels on the review page read as one family: `glass-panel` chrome for
     * the header and footer, an opaque `bg-sunken` body, and bordered surface
     * cards on it. The lighter `.glass` tried in #427 frosted the chrome but
     * left white cards floating on a translucent ground, which read as two
     * materials fighting rather than as glass.
     */
    <dialog
      ref={self}
      onClose={() => {
        reset()
        onClose()
      }}
      onCancel={cancel}
      aria-labelledby={titleId}
      data-print="hide"
      className={cn(
        'glass-panel m-auto max-h-[min(92vh,57.5rem)] max-w-none overflow-hidden rounded-float p-0 text-ink open:flex open:flex-col backdrop:bg-scrim backdrop:backdrop-blur-sm',
        reviewing ? 'w-[min(77rem,calc(100vw-2rem))]' : 'w-[min(48rem,calc(100vw-2rem))]',
      )}
    >
      {open && (
        <>
          <PrescriptionDictationHeader
            titleId={titleId}
            patientName={patientName}
            capturing={capturing}
            stream={stream}
            liveStream={liveStream}
            elapsed={elapsed}
            stopDictation={stopDictation}
            thin={thin}
            listening={listening}
            startDictation={startDictation}
            parsedFrom={parsedFrom}
            requestClose={requestClose}
          />

          <div className="flex min-h-0 flex-auto flex-col gap-4 overflow-y-auto bg-sunken p-4 sm:p-5">
            <section className={PANEL}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-semibold text-ink" id={boxId}>
                  What You Prescribed
                </span>
                <span aria-hidden className="tabular-nums text-2xs text-ink-muted">
                  {dictation.length} / {MAX_DICTATED_CHARACTERS}
                </span>
              </div>

              {/* Grows with the words as they arrive, where the browser can
                size a field to its content, and scrolls past the ceiling. It
                stays editable while a read is in flight, so typing never loses
                focus to a parse. */}
              <textarea
                ref={box}
                aria-labelledby={boxId}
                className={cn(
                  'mt-2 block w-full resize-y rounded-control border border-line bg-surface p-3 text-sm leading-relaxed transition-colors field-sizing-content hover:border-accent focus:border-accent',
                  reviewing ? 'max-h-32 min-h-12' : 'max-h-72 min-h-36',
                )}
                placeholder="amoxicillin 500 mg, three times a day, after food, for five days"
                maxLength={MAX_DICTATED_CHARACTERS}
                value={dictation}
                onChange={(event) => setDictation(event.target.value)}
                disabled={listening}
              />

              {/* Provisional tokens, outside the field on purpose: they are
                rewritten as the doctor speaks, and one truncated at
                `maxLength` would stay truncated once it settled. No
                `aria-live` either, since a region firing per token floods a
                screen reader; the status line already narrates the phase. */}
              {stream.interim !== '' && (
                <p className="mt-2 text-xs italic text-ink-muted">{stream.interim}</p>
              )}

              {reviewing && (
                <p className="mt-2 text-2xs text-ink-muted">
                  The lines below follow this text as you edit it.
                </p>
              )}

              {configFailure !== null && (
                <p className="mt-2 text-xs text-ink-muted">
                  {configFailure === 'unavailable'
                    ? 'Streaming recognition is not available on this deployment, so Dictate transcribes on this device.'
                    : 'Streaming recognition could not be reached, so Dictate transcribes on this device.'}
                </p>
              )}

              {thin && (
                <p className="mt-2 text-xs text-ink-muted">
                  This device does not have the memory to run the speech model, so type the
                  medication above instead.
                </p>
              )}
            </section>

            {reviewing && (
              <PrescriptionLinesTable
                linesId={linesId}
                rows={rows}
                everyRowCount={everyRow.length}
                fresh={fresh}
                parseFailed={parseFailed}
                dictation={dictation}
                parsedFrom={parsedFrom}
                generics={generics}
                drugFields={drugFields}
                edit={edit}
                onRetry={() => read(dictation.trim())}
                onAddByHand={addByHand}
                onRemoveTicked={removeTicked}
                removedCount={removedCount}
                onRestoreRemoved={restoreRemoved}
              />
            )}
          </div>

          {/* Below `sm` the status takes a row of its own above the buttons
            rather than truncating beside them, because it is what says why
            Confirm is still disabled. */}
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-line px-5 py-3.5">
            <div
              className={cn(
                'min-w-0 sm:flex-1 sm:basis-0',
                (status !== '' || failure !== null) && 'basis-full',
              )}
            >
              {/* Always mounted, because a live region added to the DOM
                alongside its first content is the shape screen readers miss. */}
              <p role="status" className="text-xs text-ink-muted sm:truncate">
                {status}
              </p>
              {failure !== null && (
                <p role="alert" className="mt-1 text-xs text-emergency">
                  {failure}
                </p>
              )}
            </div>

            {/* A second deliberate press rather than an automatic switch.
              Nothing was sent on this path, so the local worker is a real
              alternative; running it unasked hands the doctor a different
              engine's result with no word that it happened. */}
            {stream.error === START_FAILED_ERROR && !capturing && (
              <Button
                size="sm"
                variant="neutral"
                icon={<Mic aria-hidden className="size-3.5" />}
                disabled={busy}
                onClick={() => {
                  stream.clearError()
                  void startRecording()
                }}
              >
                Use On-Device Instead
              </Button>
            )}

            {rows.length > 0 && (
              <Button
                size="sm"
                variant="neutral"
                disabled={save.isPending}
                onClick={() => {
                  if (mayDiscard()) reset()
                }}
              >
                Discard
              </Button>
            )}

            <Button
              variant="primary"
              disabled={!confirmable}
              loading={save.isPending}
              icon={<Check aria-hidden className="size-4" />}
              onClick={confirm}
            >
              {ready.length > 1 ? `Confirm ${ready.length} Prescriptions` : 'Confirm Prescription'}
            </Button>
          </footer>
        </>
      )}
    </dialog>
  )
}
