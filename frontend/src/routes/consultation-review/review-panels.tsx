import type { GuidelineChunk, NoteTemplate } from '@shared/types'
import type { ReactNode } from 'react'
import type { LivePanes } from '../../audio/live/use-live-panes.js'
import { cn } from '../../lib/cn.js'
import { GAP_PRIORITY_ORDER, SEVERITY_ORDER } from '../../review/live-prompt.js'
import { GapCard, RedFlagCard } from '../../review/SafetyCards.js'
import { Card } from '../../ui/Card.js'
import type { Finding, Overflow } from './helpers.js'

/**
 * Enough findings to show the shape of a list without it swallowing the rail.
 *
 * Three, down from six for gaps alone, because the number now governs all three
 * panels and the rail holds all three at once. Six apiece is eighteen cards in a
 * 340px column, which is the height the shared column height exists to prevent.
 */
const PANEL_PREVIEW = 3

/**
 * A rail panel that shows the first few findings and puts the rest behind a
 * dialog.
 *
 * The preview is a CSS hide rather than a slice, so `print:block` brings the
 * whole list back on paper: slicing would put a truncated list in front of a
 * doctor with nothing to say it had been truncated, and on this rail that could
 * be a missing red flag.
 */
export function FindingsPanel({
  title,
  findings,
  noun,
  empty,
  onShowAll,
}: {
  title: string
  findings: Finding[]
  /**
   * What the CTA counts. Given rather than derived from `title`, because
   * "Show All 7 Missing Information" is not a sentence.
   */
  noun: string
  /** Shown instead of the list when there is nothing to show. */
  empty?: ReactNode
  onShowAll: (overflow: Overflow) => void
}) {
  return (
    <Panel title={title} count={findings.length}>
      {findings.length === 0 ? (
        <p className="text-sm text-ink-muted">{empty}</p>
      ) : (
        <>
          {findings.map((finding, position) => (
            <div key={finding.id} className={cn(position >= PANEL_PREVIEW && 'hidden print:block')}>
              {finding.node}
            </div>
          ))}
          {findings.length > PANEL_PREVIEW && (
            <button
              type="button"
              data-print="hide"
              onClick={() => onShowAll({ title, findings })}
              className="mt-1 self-start rounded-control px-2 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-sunken"
            >
              Show All {findings.length} {noun}
            </button>
          )}
        </>
      )}
    </Panel>
  )
}

/**
 * A translated turn's other half, under the English it pairs with (#393).
 *
 * Labelled with the direction the translation ran, because the two halves
 * swap roles by speaker: on a patient's turn the English is the machine's and
 * the words beneath are what was said, and on the doctor's the English was
 * said and the words beneath are what the patient was shown.
 *
 * Beneath the bubble rather than inside it. A playable bubble is a button
 * whose label names the playback, and a button's contents are not read out, so
 * inside it these words would never reach a screen reader.
 */
/**
 * What the note will become, shown while it is still empty.
 *
 * The headings are the selected format's sections in the order they will
 * fill, so the shape of the output is legible before there is any and the
 * empty note follows the same format switch the filled one does. Ruled lines
 * rather than pulsing skeletons: nothing is loading here, and a shimmer would
 * promise work in progress when the doctor has not started any.
 */
const PLACEHOLDER_SECTIONS: Record<NoteTemplate, readonly string[]> = {
  soap: ['Subjective', 'Objective', 'Assessment', 'Plan'],
  malaysian: [
    'Presenting Complaint',
    'History of Presenting Complaint',
    'Past Medical History',
    'Social History',
    'Family History',
    'Objective',
    'Assessment',
    'Plan',
  ],
}

export function NotePlaceholder({ template }: { template: NoteTemplate }) {
  return (
    <Card className="overflow-hidden p-0" data-print="hide">
      {PLACEHOLDER_SECTIONS[template].map((section) => (
        <div key={section} className="border-b border-line/60 px-5 py-4">
          <h3 className="text-2xs font-semibold tracking-wider text-ink-muted uppercase">
            {section}
          </h3>
          <div className="mt-2 h-2 w-full rounded-pill bg-sunken" />
          <div className="mt-1.5 h-2 w-3/5 rounded-pill bg-sunken" />
        </div>
      ))}
    </Card>
  )
}

/**
 * A rail panel fed by ambient capture rather than by a finished analysis (#219).
 *
 * Deliberately the same cards the analysed rail uses, with `onDecide` omitted:
 * during capture the record is still `draft` and `PATCH` gates clinical fields
 * on `awaiting_review`, so a disposition control would offer an action the API
 * refuses. A second set of cards would also be a second place for the severity
 * scale and the citation rendering to drift.
 *
 * No overflow dialog here. The analysed rail hides past three behind one,
 * because a finished consultation can produce twenty-seven gaps; a live pane is
 * read in glances while the doctor is talking, so it shows what it has and
 * grows, and the full list is one press of Analyse away.
 */
export function LivePanel({ title, live }: { title: string; live: LivePanes }) {
  const guidelines: GuidelineChunk[] = []

  if (title === 'Red Flags') {
    const flags = [...live.redFlags].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    )
    /*
       "None so far" is a clinical claim, and the pane may only make it when a
       check actually ran and returned. A stalled or not-yet-succeeded live
       check renders as exactly that, because a panel asserting an absence it
       did not establish is the false negative this engine exists to prevent.
    */
    const unearnedAbsence = live.flagsStalled || !live.flagsChecked

    return (
      <Panel title={title} count={flags.length}>
        {flags.length === 0 && unearnedAbsence ? (
          <p className="text-sm text-emergency">
            {live.flagsStalled
              ? 'Live safety checks have stopped. Press Analyse to run the full check.'
              : 'Waiting for the first safety check.'}
          </p>
        ) : flags.length === 0 ? (
          <p className="text-sm text-ink-muted">No escalation triggers so far.</p>
        ) : (
          flags.map((flag) => (
            <RedFlagCard
              key={flag.id}
              flag={flag}
              disposition={undefined}
              guidelines={guidelines}
            />
          ))
        )}
      </Panel>
    )
  }

  const gaps = [...live.gaps].sort(
    (a, b) => GAP_PRIORITY_ORDER[a.priority] - GAP_PRIORITY_ORDER[b.priority],
  )
  return (
    <Panel title={title} count={gaps.length}>
      {gaps.length === 0 ? (
        <p className="text-sm text-ink-muted">Nothing outstanding so far.</p>
      ) : (
        gaps.map((gap) => (
          <GapCard key={gap.id} gap={gap} disposition={undefined} guidelines={guidelines} />
        ))
      )}
      {live.answered.length > 0 && (
        /* Answered prompts are moved, never deleted. A gap the doctor has just
           covered disappearing from under their eye reads as the list losing
           track of the conversation, which is the churn the live design exists
           to avoid (docs/TRD.md §20.8.1). */
        <p className="mt-1 text-2xs text-ink-muted">
          {live.answered.length} covered so far:{' '}
          {live.answered.map((gap) => gap.question).join(' · ')}
        </p>
      )}
    </Panel>
  )
}

export function Panel({
  title,
  count,
  printHidden = false,
  children,
}: {
  title: string
  /** Absent while there is nothing counted yet, which is not the same as none. */
  count?: number
  printHidden?: boolean
  children: ReactNode
}) {
  return (
    <section className="flex flex-col" data-print={printHidden ? 'hide' : undefined}>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {title}
        {count !== undefined && (
          <span className="rounded-full bg-sunken px-1.5 py-0.5 text-2xs text-ink-muted">
            {count}
          </span>
        )}
      </h2>
      <div className="flex flex-1 flex-col gap-2">{children}</div>
    </section>
  )
}
