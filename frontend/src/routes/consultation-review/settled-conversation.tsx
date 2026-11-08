import type { InterpretedLanguage, TextRange, TranscriptTurn } from '@shared/types'
import { Pause, Play } from 'lucide-react'
import { INTERPRETED_LANGUAGE_NAMES, untranslatedTurnText } from '../../audio/live/bilingual.js'
import { spokenTimestamp } from '../../lib/clock.js'
import { cn } from '../../lib/cn.js'
import { count } from '../../lib/plural.js'
import { UncertainLegend, UncertainText } from '../../ui/UncertainText.js'

function OtherLanguageLine({ other }: { other: NonNullable<TranscriptTurn['otherLanguage']> }) {
  const name = INTERPRETED_LANGUAGE_NAMES[other.language]
  return (
    <div className="mt-1 max-w-full px-3 text-sm leading-relaxed text-ink">
      <p className="text-2xs text-ink-muted">
        {other.spoken ? `Said in ${name}` : `Shown in ${name}`}
      </p>
      <p lang={other.language} dir={other.language === 'ur' ? 'rtl' : undefined}>
        {other.text}
      </p>
    </div>
  )
}

/**
 * Says the conversation was interpreted by a machine, and how much of it the
 * safety checks could not read (#393).
 *
 * Counted from the stored turns rather than carried from capture, so it stays
 * true after the doctor edits the transcript and after a reload.
 */
function TranslationNotice({
  languages,
  turns,
}: {
  languages: readonly InterpretedLanguage[]
  turns: readonly { text: string }[]
}) {
  const placeholders = new Set(languages.map(untranslatedTurnText))
  const untranslated = turns.filter((turn) => placeholders.has(turn.text)).length
  const names = new Intl.ListFormat('en', { type: 'conjunction' }).format(
    languages.map((language) => INTERPRETED_LANGUAGE_NAMES[language]),
  )
  return (
    <div role="note" className="mb-3 rounded-card bg-surface px-3 py-2 text-xs text-ink-muted">
      <p>
        Machine-translated between English and {names}. The safety checks and the note read the
        English only.
      </p>
      {untranslated > 0 && (
        <p className="mt-1 font-medium text-ink">
          {count(untranslated, 'line')} had no translation, so the safety checks could not read{' '}
          {untranslated === 1 ? 'it' : 'them'}. Check with the patient.
        </p>
      )}
    </div>
  )
}

/**
 * The settled transcript, wherever it is asked for.
 *
 * One implementation rather than two. It renders in the transcript column and
 * again in the dialog the doctor reopens after Stop, and this file already
 * carried a second copy of the live pane's two-sided grammar; a third is how
 * they start disagreeing about what a turn looks like.
 */
export function SettledConversation({
  turns,
  translatedFrom,
  onPlay,
  playing,
}: {
  turns: readonly {
    key: string
    speaker: string
    text: string
    /** Character ranges the recogniser was unsure of, shown underlined (#309). */
    uncertain?: readonly TextRange[]
    offsetSeconds?: number
    endSeconds?: number
    /** The words said or shown in the paired language, on a translated turn (#393). */
    otherLanguage?: TranscriptTurn['otherLanguage']
  }[]
  /** The transcript's `machineTranslation` languages, when it has them. */
  translatedFrom?: readonly InterpretedLanguage[]
  /**
   * Plays this turn back from the recording (#293). Absent when the session is
   * holding no audio, which is every reload and every transcript that was
   * pasted, uploaded or typed.
   */
  onPlay?: (key: string, offsetSeconds: number, endSeconds?: number) => void
  /** The turn currently playing, if any. */
  playing?: string
}) {
  return (
    <>
      {translatedFrom !== undefined && translatedFrom.length > 0 && (
        <TranslationNotice languages={translatedFrom} turns={turns} />
      )}
      <ol className="flex flex-col gap-3">
        {turns.map((turn, index) => {
          const opensTurn = turns[index - 1]?.speaker !== turn.speaker
          const doctor = turn.speaker === 'doctor'
          /*
           * Playable only where this turn's own timing is known. A turn without
           * an offset is inert rather than a control that plays the wrong words:
           * the transcript carries no timing at all on the pasted and uploaded
           * paths, and even a recorded one leaves lines split out of the middle
           * of a segment untimed on purpose, because the offset would be a guess.
           *
           * Inert is also the whole state after a reload, since the recording
           * lives in memory only. The affordance is what says which turns can be
           * checked, exactly as the checklist's rows do.
           */
          const at = turn.offsetSeconds
          const playable = at !== undefined && onPlay !== undefined
          const sounding = playing === turn.key
          return (
            <li
              key={turn.key}
              className={cn(
                // Same two-sided rule as the live pane, and the same reason for
                // the two caps: this is 380px in the column, fluid during
                // capture and wide in the dialog, so 62% would break a line
                // every three words in the narrow case.
                'flex flex-col max-w-[88%] @lg:max-w-[62%]',
                doctor ? 'items-start self-start' : 'items-end self-end',
                !opensTurn && '-mt-2',
              )}
            >
              {opensTurn && (
                <span className="mb-1 block">
                  <span
                    className={cn(
                      'rounded-pill px-2 py-0.5 text-2xs font-medium',
                      doctor ? 'bg-surface text-ink-muted' : 'bg-accent-soft text-accent',
                    )}
                  >
                    {doctor ? 'Doctor' : 'Patient'}
                  </span>
                </span>
              )}
              {playable ? (
                /*
                 * The bubble itself is the control, so the target is the thing
                 * the doctor is already reading rather than a separate hit area
                 * beside it.
                 *
                 * The background does not change on hover, and must not: on this
                 * pane the bubble's colour is what says who spoke, and a hover
                 * tint would have a turn briefly claim to be the other speaker.
                 * The icon's opacity carries the affordance instead, which is the
                 * same move `ChecklistPanel` makes for the same reason. Playing
                 * is a ring, a change of shape rather than of colour.
                 */
                <button
                  type="button"
                  onClick={() => onPlay(turn.key, at, turn.endSeconds)}
                  aria-label={`${sounding ? 'Stop' : 'Play'} this turn, ${spokenTimestamp(at)} in`}
                  className={cn(
                    'group flex items-start gap-2 rounded-card px-3 py-2 text-left text-ink text-sm leading-relaxed transition-shadow',
                    doctor ? 'bg-surface' : 'bg-accent-soft',
                    sounding && 'ring-2 ring-accent',
                  )}
                >
                  <span className="min-w-0">
                    <UncertainText text={turn.text} uncertain={turn.uncertain} />
                  </span>
                  {sounding ? (
                    <Pause aria-hidden className="mt-1 size-3 shrink-0 text-accent" />
                  ) : (
                    <Play
                      aria-hidden
                      className="mt-1 size-3 shrink-0 text-accent opacity-45 transition-opacity group-hover:opacity-100"
                    />
                  )}
                </button>
              ) : (
                <p
                  className={cn(
                    'rounded-card px-3 py-2 text-ink text-sm leading-relaxed',
                    doctor ? 'bg-surface' : 'bg-accent-soft',
                  )}
                >
                  <UncertainText text={turn.text} uncertain={turn.uncertain} />
                </p>
              )}
              {turn.otherLanguage && <OtherLanguageLine other={turn.otherLanguage} />}
            </li>
          )
        })}
      </ol>
      {/* Said once, and only when something is underlined. Outside the list,
          because a caption is not one of the turns. */}
      {turns.some((turn) => turn.uncertain !== undefined) && (
        <UncertainLegend className="mt-3 text-2xs text-ink-muted" />
      )}
    </>
  )
}
