import type { SigFoodTiming, SigFrequency, SigRoute } from '@shared/types'
import { CircleHelp } from 'lucide-react'
import { cn } from '../../lib/cn.js'
import { Checkbox } from '../../ui/Checkbox.js'
import { Select } from '../../ui/Select.js'
import { DrugField } from '../DrugField.js'
import {
  FOOD_OPTIONS,
  FREQUENCY_OPTIONS,
  type LineEdit,
  type LineRow,
  ROUTE_OPTIONS,
} from '../prescription-draft.js'

export const FIELD_LABEL = 'text-2xs font-semibold text-ink-muted'
export const TEXT_INPUT =
  'h-11 rounded-control border border-line bg-surface px-3.5 text-sm transition-colors hover:border-accent focus:border-accent'
/** Dose, duration, frequency, food and route: one row wide; the lists take a full row on a phone. */
export const SIG_GRID =
  'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.2fr)]'

const SHARED_NAMES = {
  route: 'Route',
  frequency: 'Frequency',
  duration: 'Duration',
  food: 'With Food',
} as const

/**
 * A field's name, shown above it while the table wraps. On a wide screen the
 * header row names the columns instead, and every control carries its own
 * label for a screen reader either way.
 */
function FieldName({ children }: { children: string }) {
  return (
    <span aria-hidden className={cn(FIELD_LABEL, 'lg:hidden')}>
      {children}
    </span>
  )
}

/** A line's own words, with the drug name heard in them marked. */
function Quote({
  text,
  span,
  name,
}: {
  text: string
  span: { start: number; end: number }
  name: { start: number; end: number } | undefined
}) {
  if (name === undefined || name.start < span.start || name.end > span.end) {
    return <>“{text.slice(span.start, span.end)}”</>
  }
  return (
    <>
      “{text.slice(span.start, name.start)}
      <mark className="bg-transparent font-semibold text-ink underline decoration-accent decoration-2 underline-offset-2">
        {text.slice(name.start, name.end)}
      </mark>
      {text.slice(name.end, span.end)}”
    </>
  )
}

type PrescriptionLineRowProps = {
  row: LineRow
  line: number
  linesId: string
  generics: readonly string[]
  parsedFrom: string | null
  drugFields: { current: Map<string, HTMLInputElement> }
  edit: (key: string, change: LineEdit) => void
}

export function PrescriptionLineRow({
  row,
  line,
  linesId,
  generics,
  parsedFrom,
  drugFields,
  edit,
}: PrescriptionLineRowProps) {
  const needsName = row.ticked && row.draft.drug.trim() === ''
  const prompt = needsName || row.undecided
  const noteId = `${linesId}-needs-${line}`
  const pick = row.candidates.find(({ lexiconId }) => lexiconId === row.draft.lexiconId)
  const others = row.exact
    ? []
    : row.candidates.filter(
        (candidate, at, all) =>
          candidate.lexiconId !== row.draft.lexiconId &&
          all.findIndex(({ lexiconId }) => lexiconId === candidate.lexiconId) === at,
      )

  return (
    <li
      className={cn(
        'rounded-control p-3',
        // The prompt grammar information gaps use, not a severity colour: this asks for a name, it warns
        // of nothing (docs/DESIGN.md, Severity).
        prompt ? 'border border-dashed border-ink-muted bg-surface' : 'bg-sunken-soft',
      )}
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2 lg:w-64 lg:shrink-0">
          <Checkbox
            aria-label={`Include line ${line}`}
            checked={row.ticked}
            onChange={(event) => edit(row.key, { ticked: event.target.checked })}
          />
          <DrugField
            inputRef={(node) => {
              if (node === null) drugFields.current.delete(row.key)
              else drugFields.current.set(row.key, node)
            }}
            label={`Drug, line ${line}`}
            invalid={needsName}
            describedBy={prompt ? noteId : undefined}
            suggestions={generics}
            className={cn(TEXT_INPUT, 'min-w-0 flex-1')}
            value={row.draft.drug}
            onChange={(drug) => edit(row.key, { drug })}
          />
        </div>

        <div className={cn(SIG_GRID, 'lg:flex-1')}>
          <div className="flex min-w-0 flex-col gap-1">
            <FieldName>Dose</FieldName>
            <input
              aria-label={`Dose, line ${line}`}
              className={cn(TEXT_INPUT, 'min-w-0')}
              value={row.draft.dose}
              onChange={(event) => edit(row.key, { fields: { dose: event.target.value } })}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <FieldName>Duration</FieldName>
            <input
              aria-label={`Duration, line ${line}`}
              className={cn(TEXT_INPUT, 'min-w-0')}
              value={row.draft.duration}
              onChange={(event) => edit(row.key, { fields: { duration: event.target.value } })}
            />
          </div>
          <div className="col-span-2 flex min-w-0 flex-col gap-1 sm:col-span-1">
            <FieldName>Frequency</FieldName>
            <Select
              label={`Frequency, line ${line}`}
              value={row.draft.frequency}
              options={FREQUENCY_OPTIONS}
              onChange={(frequency) =>
                edit(row.key, { fields: { frequency: frequency as SigFrequency | '' } })
              }
            />
          </div>
          <div className="col-span-2 flex min-w-0 flex-col gap-1 sm:col-span-1">
            <FieldName>With Food</FieldName>
            <Select
              label={`With food, line ${line}`}
              value={row.draft.food}
              options={FOOD_OPTIONS}
              onChange={(food) => edit(row.key, { fields: { food: food as SigFoodTiming | '' } })}
            />
          </div>
          <div className="col-span-2 flex min-w-0 flex-col gap-1 sm:col-span-1">
            <FieldName>Route</FieldName>
            <Select
              label={`Route, line ${line}`}
              value={row.draft.route}
              options={ROUTE_OPTIONS}
              onChange={(route) => edit(row.key, { fields: { route: route as SigRoute | '' } })}
            />
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-1 text-2xs text-ink-muted lg:pl-6.5">
        {/* The words this line was read from, so a wrong
          split is visible rather than silent. */}
        {row.span !== undefined && parsedFrom !== null && (
          <p className="line-clamp-2 font-mono">
            <Quote text={parsedFrom} span={row.span} name={pick} />
          </p>
        )}
        {row.kind === 'manual' && <p>Added by hand.</p>}
        {needsName && (
          <p id={noteId} className="flex items-center gap-1.5 text-ink">
            <CircleHelp aria-hidden className="size-3.5 shrink-0" />
            <span>
              <strong className="font-semibold">Needs a drug name.</strong> None was recognised.
              Name it, or untick it to leave it out.
            </span>
          </p>
        )}
        {row.kind === 'heard' && !row.exact && pick !== undefined && (
          <div
            id={row.undecided ? noteId : undefined}
            className={cn(
              'flex flex-wrap items-center gap-x-2 gap-y-1',
              row.undecided && 'text-ink',
            )}
          >
            {row.undecided && <CircleHelp aria-hidden className="size-3.5 shrink-0" />}
            <span>
              {row.undecided && <strong className="font-semibold">Needs a decision. </strong>}
              {pick.heard.toLowerCase() === pick.generic
                ? 'Another drug or reading was heard in the same phrase.'
                : `Heard “${pick.heard}”, which is not an exact match.`}
              {row.undecided ? ` Tick to accept ${pick.generic}, or` : ''}
            </span>
            {row.undecided && (
              <button
                type="button"
                aria-label={`Leave line ${line} out`}
                className="font-semibold text-ink underline decoration-ink-muted underline-offset-2 hover:text-accent"
                onClick={() => edit(row.key, { ticked: false })}
              >
                leave it out
              </button>
            )}
          </div>
        )}
        {others.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Or read as</span>
            {others.map((candidate) => (
              <button
                key={candidate.lexiconId}
                type="button"
                aria-label={`Read line ${line} as ${candidate.generic}`}
                className="font-semibold text-ink underline decoration-accent underline-offset-2 hover:text-accent"
                onClick={() => {
                  // The button leaves with the choice, so focus goes to the name it just set.
                  drugFields.current.get(row.key)?.focus()
                  edit(row.key, {
                    chosen: candidate.lexiconId,
                    drug: undefined,
                    ticked: true,
                  })
                }}
              >
                {candidate.generic}
              </button>
            ))}
          </p>
        )}
        {parsedFrom !== null &&
          [...new Set(row.shared.map(({ start }) => start))].map((start) => {
            const from = row.shared.filter((each) => each.start === start)
            return (
              <p key={start}>
                {from.map(({ field }) => SHARED_NAMES[field]).join(', ')} from “
                {parsedFrom.slice(start, from[0]?.end ?? start)}”
              </p>
            )
          })}
      </div>
    </li>
  )
}
