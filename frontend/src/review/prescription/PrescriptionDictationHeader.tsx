import { Mic, Square, X } from 'lucide-react'
import { InputMeter } from '../../audio/InputMeter.js'
import { cn } from '../../lib/cn.js'
import { Button } from '../../ui/Button.js'
import type { useDictationStream } from '../use-dictation-stream.js'

/** Queried rather than reffed, because `Button` does not declare a `ref` prop. */
export const STOP_LABEL = 'Stop dictation'

type DictationStream = ReturnType<typeof useDictationStream>

type PrescriptionDictationHeaderProps = {
  titleId: string
  patientName?: string
  capturing: boolean
  stream: DictationStream
  liveStream: MediaStream | null
  elapsed: number
  stopDictation: () => void
  thin: boolean
  listening: boolean
  startDictation: () => void
  parsedFrom: string | null
  requestClose: () => void
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function PrescriptionDictationHeader({
  titleId,
  patientName,
  capturing,
  stream,
  liveStream,
  elapsed,
  stopDictation,
  thin,
  listening,
  startDictation,
  parsedFrom,
  requestClose,
}: PrescriptionDictationHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-3.5">
      <div className="min-w-0">
        <p id={titleId} className="truncate font-display text-base font-semibold leading-tight">
          {patientName ?? 'Consultation'}
        </p>
        <p className="text-2xs text-ink-muted">Prescription Dictation</p>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
        {capturing ? (
          <>
            <span className="flex items-center gap-2 text-sm font-medium">
              {/* The badge and the status line are one element apart, so
                      a pulsing red "Listening" while the socket is still
                      opening contradicts the sentence beside it. */}
              <span
                aria-hidden
                className={cn(
                  'size-2 rounded-pill',
                  stream.phase === 'connecting' ? 'bg-ink-muted' : 'animate-pulse bg-emergency',
                )}
              />
              <span>{stream.phase === 'connecting' ? 'Connecting' : 'Listening'}</span>
            </span>
            <InputMeter variant="wave" stream={liveStream ?? stream.micStream ?? undefined} />
            <span className="hidden tabular-nums text-sm text-ink-muted sm:inline">
              {clock(elapsed)}
            </span>
            <Button
              variant="primary"
              size="sm"
              aria-label={STOP_LABEL}
              icon={<Square aria-hidden className="size-3.5" />}
              disabled={stream.phase === 'finishing'}
              onClick={stopDictation}
            >
              Stop
            </Button>
          </>
        ) : (
          <>
            {!thin && (
              <Button
                size="sm"
                variant="neutral"
                icon={<Mic aria-hidden className="size-3.5" />}
                disabled={listening}
                onClick={startDictation}
              >
                {parsedFrom === null ? 'Dictate' : 'Dictate Again'}
              </Button>
            )}
            <button
              type="button"
              aria-label="Close prescription dictation"
              onClick={requestClose}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-control border border-line bg-sunken-soft text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <X aria-hidden className="size-4" />
            </button>
          </>
        )}
      </div>
    </header>
  )
}
