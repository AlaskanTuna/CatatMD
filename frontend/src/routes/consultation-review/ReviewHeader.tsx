import type { ConsultationDetail, SoapNote } from '@shared/types'
import { Copy, Printer, Settings2, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { timestamp } from '../../lib/clock.js'
import { cn } from '../../lib/cn.js'
import { ApproveBar } from '../../review/ApproveBar.js'
import { Button } from '../../ui/Button.js'
import { InfoTip } from '../../ui/InfoTip.js'
import { PageHeader } from '../../ui/PageHeader.js'
import { RenameField } from '../../ui/RenameField.js'
import { formatCreated } from './helpers.js'

type ReviewHeaderProps = {
  id: string
  detail: ConsultationDetail
  isEphemeral: boolean
  ephemeral: ConsultationDetail | null
  onEphemeralApproved: (next: ConsultationDetail) => void
  onApproved: (next: ConsultationDetail) => void
  analysisFailed: boolean
  analysisStalled: boolean
  analysing: boolean
  analysingSince: number | null
  unacknowledgedCount: number
  note: SoapNote | null
  captureBusy: boolean
  capturePending: boolean
  settingsPending: boolean
  transcriptShown: boolean
  onAnalyze: () => void
  onRename: (title: string | null) => void
  onOpenSettings: () => void
  onToggleTranscript: () => void
  onCopyNote: () => void
}

export function ReviewHeader({
  id,
  detail,
  isEphemeral,
  ephemeral,
  onEphemeralApproved,
  onApproved,
  analysisFailed,
  analysisStalled,
  analysing,
  analysingSince,
  unacknowledgedCount,
  note,
  captureBusy,
  capturePending,
  settingsPending,
  transcriptShown,
  onAnalyze,
  onRename,
  onOpenSettings,
  onToggleTranscript,
  onCopyNote,
}: ReviewHeaderProps) {
  const analysis = detail.analysis
  const approved = detail.status === 'approved'
  const navigate = useNavigate()

  return (
    <PageHeader
      data-print="hide"
      title="Consultation Review"
      breadcrumb={
        <ol className="flex items-center gap-1.5">
          <li>
            <Link to="/consultations" className="transition-colors hover:text-ink">
              Consultations
            </Link>
          </li>
          <li aria-hidden>/</li>
          {/* The patient, not the word "Review". The breadcrumb's last
                segment was restating the page title one line below it, and the
                one thing a doctor has to be able to see without leaving this
                screen is whose note this is: a consultation filed to the wrong
                patient was undetectable from here until #213. "Review" is the
                fallback for a consultation captured without a patient, which is
                the normal case for paste, upload and ad-hoc recording. */}
          <li aria-current="page" className="min-w-0 truncate text-ink">
            {detail.patient ? (
              <Link
                to={`/patients/${detail.patient.id}`}
                className="text-ink transition-colors hover:text-accent"
              >
                {detail.patient.name ?? 'Unnamed patient'}
              </Link>
            ) : (
              'Review'
            )}
          </li>
        </ol>
      }
      /*
       * The record's name sits here rather than replacing the page heading.
       * `PageHeader.title` names the screen, and every other page uses it that
       * way; swapping in a per-record value on this one page would make the
       * heading mean something different here than everywhere else.
       *
       * Renaming is offered on an approved consultation too. The API allows
       * it deliberately, because a filing name is not part of the record that
       * sign-off freezes, and the archive has to stay searchable.
       */
      /*
       * The record's name, and nothing else. The patient moved up into the
       * breadcrumb, and the cuid went entirely: it identified the row for a
       * developer and told a doctor nothing, while sitting in the most
       * prominent surface on the screen.
       *
       * Renaming is offered on an approved consultation too. The API allows
       * it deliberately, because a filing name is not part of the record that
       * sign-off freezes, and the archive has to stay searchable.
       */
      subtitle={
        isEphemeral ? (
          <span className="text-sm font-medium text-ink">{formatCreated(detail.createdAt)}</span>
        ) : (
          <RenameField
            value={detail.title}
            fallback={formatCreated(detail.createdAt)}
            label="Rename this consultation"
            textClassName="text-sm font-medium text-ink"
            onSave={onRename}
          />
        )
      }
      art="/art/review.webp"
      /*
       * The page's one primary action lives here, under the record it acts
       * on, rather than in a floating island at the foot of the screen. The
       * island covered the bottom of all three columns and needed its own
       * inset variable so the floating chrome could dodge it; a first-time
       * doctor also had to scroll to discover it at all.
       *
       * Analyse becomes Approve at the same place, which is the sequence the
       * screen actually has: capture, analyse, review, sign off.
       */
      actions={
        <>
          {!analysis && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex items-center gap-2',
                  (analysisFailed || !detail.transcript) && 'relative inline-flex',
                )}
              >
                <Button
                  variant="primary"
                  size="lg"
                  className={cn((analysisFailed || !detail.transcript) && 'pr-12')}
                  icon={<Sparkles className="size-4" />}
                  disabled={!detail.transcript}
                  loading={analysing}
                  onClick={onAnalyze}
                  data-tour="analyse"
                >
                  {analysing
                    ? `Analysing${analysingSince === null ? '' : ` ${timestamp((Date.now() - analysingSince) / 1000)}`}`
                    : 'Analyse Consultation'}
                </Button>
                {analysisFailed ? (
                  <InfoTip
                    className="absolute top-1/2 right-2 -translate-y-1/2"
                    label="Analysis could not be completed"
                    tone="warning"
                  >
                    {analysisStalled
                      ? 'Analysis stopped without finishing. Try again.'
                      : 'Analysis failed. Try again.'}
                  </InfoTip>
                ) : !detail.transcript ? (
                  <InfoTip
                    className="absolute top-1/2 right-2 -translate-y-1/2"
                    label="Why this is not available yet"
                    tone="warning"
                  >
                    Add a transcript first.
                  </InfoTip>
                ) : null}
              </div>
            </div>
          )}
          {analysis && !approved && (
            <ApproveBar
              approve={async () =>
                isEphemeral
                  ? ({
                      ...(ephemeral as ConsultationDetail),
                      status: 'approved',
                      approvedAt: new Date(),
                      // The demo has no signed-in identity distinct from the
                      // viewer, and inventing a clinician name on a screen
                      // that teaches what approval means would be wrong.
                      approvedBy: null,
                    } as ConsultationDetail)
                  : api.approve(id)
              }
              approved={approved}
              approvedAt={detail.approvedAt}
              approvedBy={detail.approvedBy}
              unacknowledgedCount={unacknowledgedCount}
              onApproved={isEphemeral ? onEphemeralApproved : onApproved}
            />
          )}
          <Button
            data-tour="capture-settings"
            variant="neutral"
            size="lg"
            aria-label="Consultation Settings"
            title="Consultation Settings"
            disabled={captureBusy || capturePending || settingsPending}
            icon={<Settings2 aria-hidden className="size-4" />}
            onClick={() => {
              onOpenSettings()
            }}
          />
          <Button
            className="lg:hidden"
            onClick={onToggleTranscript}
            aria-expanded={transcriptShown}
          >
            {transcriptShown ? 'Hide Transcript' : 'Transcript'}
          </Button>
          {approved && note && (
            <Button size="lg" icon={<Copy aria-hidden className="size-4" />} onClick={onCopyNote}>
              Copy Note
            </Button>
          )}
          {approved && (
            <Button
              size="lg"
              icon={<Printer aria-hidden className="size-4" />}
              /*
               * Opens the report rather than printing this page (#376).
               * `window.print()` here printed the review layout with chrome
               * subtracted, which is why the export read as a screenshot of
               * an app instead of a clinical document.
               *
               * The ephemeral demo record is handed over in history state
               * because it has no row to fetch (issue #80), and the report
               * route sits outside the provider holding it.
               */
              onClick={() =>
                navigate(
                  `/consultations/${id}/report`,
                  isEphemeral ? { state: { detail } } : undefined,
                )
              }
            >
              Export
            </Button>
          )}
        </>
      }
    />
  )
}
