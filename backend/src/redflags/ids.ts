import type { Transcript } from '@shared/types'
import { evaluateRedFlags } from './evaluate.js'
import { ALL_REDFLAG_TRIGGERS } from './triggers.js'

/** The rule ids a transcript raises, evaluated over every trigger there is. */
export function firedRuleIds(transcript: Transcript): Set<string> {
  return new Set(
    evaluateRedFlags(transcript, ALL_REDFLAG_TRIGGERS).map((flag) => flag.ruleId ?? flag.id),
  )
}
