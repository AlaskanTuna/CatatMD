import { Plus, RotateCcw, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn.js'
import { Button } from '../../ui/Button.js'
import type { LineEdit, LineRow } from '../prescription-draft.js'
import { FIELD_LABEL, PrescriptionLineRow, SIG_GRID } from './PrescriptionLineRow.js'

/** The Completeness Checklist's section card: bordered on the sunken body, no shadow. */
export const PANEL = 'rounded-card border border-line bg-surface p-4'
const ADD_LINE_LABEL = 'Add Line'
const REMOVE_LABEL = 'Remove ticked lines'

type PrescriptionLinesTableProps = {
  linesId: string
  rows: readonly LineRow[]
  everyRowCount: number
  fresh: boolean
  parseFailed: boolean
  dictation: string
  parsedFrom: string | null
  generics: readonly string[]
  drugFields: { current: Map<string, HTMLInputElement> }
  edit: (key: string, change: LineEdit) => void
  onRetry: () => void
  onAddByHand: () => void
  onRemoveTicked: () => void
  removedCount: number
  onRestoreRemoved: () => void
}

export function PrescriptionLinesTable({
  linesId,
  rows,
  everyRowCount,
  fresh,
  parseFailed,
  dictation,
  parsedFrom,
  generics,
  drugFields,
  edit,
  onRetry,
  onAddByHand,
  onRemoveTicked,
  removedCount,
  onRestoreRemoved,
}: PrescriptionLinesTableProps) {
  const ticked = rows.filter(({ ticked }) => ticked)

  return (
    <section className={PANEL} aria-labelledby={linesId}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={linesId} className="text-xs font-semibold text-ink">
          Prescription Lines
        </h3>
        <span className="tabular-nums text-2xs text-ink-muted">
          {ticked.length} of {rows.length} ticked
        </span>
      </div>

      {parseFailed && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span>The text could not be read. The lines may be out of date.</span>
          <Button size="sm" variant="neutral" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}

      {/* A parse that found nothing must say so. Brand names are
        outside the lexicon by D-001, so this is a common case. */}
      {everyRowCount === 0 && fresh && (
        <p className="mt-2 text-xs text-ink-muted">
          No drug name or dose was read from the text. Add a line and fill it in.
        </p>
      )}

      {rows.length > 0 && (
        <>
          <div aria-hidden className={cn('mt-3 hidden gap-2 px-3 lg:flex', FIELD_LABEL)}>
            <span className="w-64 shrink-0 pl-6.5">Drug</span>
            <span className={cn(SIG_GRID, 'flex-1')}>
              <span>Dose</span>
              <span>Duration</span>
              <span>Frequency</span>
              <span>With Food</span>
              <span>Route</span>
            </span>
          </div>

          <ul aria-label="Prescription lines" className="mt-2 space-y-2">
            {rows.map((row, index) => (
              <PrescriptionLineRow
                key={row.key}
                row={row}
                line={index + 1}
                linesId={linesId}
                generics={generics}
                parsedFrom={parsedFrom}
                drugFields={drugFields}
                edit={edit}
              />
            ))}
          </ul>
        </>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button
          size="sm"
          variant="neutral"
          aria-label={ADD_LINE_LABEL}
          icon={<Plus aria-hidden className="size-3.5" />}
          disabled={dictation.trim().length === 0}
          onClick={onAddByHand}
        >
          Add Line
        </Button>
        <Button
          size="sm"
          variant="neutral"
          aria-label={REMOVE_LABEL}
          title={REMOVE_LABEL}
          icon={<Trash2 aria-hidden className="size-3.5" />}
          disabled={ticked.length === 0}
          onClick={onRemoveTicked}
        >
          {ticked.length > 0 && (
            <span aria-hidden className="tabular-nums">
              {ticked.length}
            </span>
          )}
        </Button>
        {removedCount > 0 && (
          <Button
            size="sm"
            variant="neutral"
            icon={<RotateCcw aria-hidden className="size-3.5" />}
            onClick={onRestoreRemoved}
          >
            Restore {removedCount}
          </Button>
        )}
      </div>
    </section>
  )
}
