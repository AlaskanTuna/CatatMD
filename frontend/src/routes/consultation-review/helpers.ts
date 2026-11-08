import type { Disposition, DispositionInput } from '@shared/types'
import type { ReactNode } from 'react'

/** The current decision about a finding, or `undefined` if none was made. */
export function byId(dispositions: Disposition[], id: string): Disposition | undefined {
  return dispositions.find((entry) => entry.id === id)
}

/**
 * Applies a decision in memory, matching what the API does on a stored row.
 *
 * The tour's consultation has no id to PATCH, so every control on this screen
 * would 404 mid-demo without this. Last decision per id wins, exactly as
 * `applyDispositions` does on the server, so the demo cannot drift from the
 * behaviour it is demonstrating.
 */
export function mergeDispositions(
  current: Disposition[],
  incoming: DispositionInput[],
): Disposition[] {
  const next = new Map(current.map((entry) => [entry.id, entry] as const))
  for (const decision of incoming) next.set(decision.id, { ...decision, decidedAt: new Date() })
  return [...next.values()]
}

/** Matches the consultation list's format, so one record reads the same in both. */
export const formatCreated = (value: Date) =>
  new Intl.DateTimeFormat('en-MY', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)

/** One panel's full list, as handed to the shared overflow dialog. */
export type Finding = { id: string; node: ReactNode }
export type Overflow = { title: string; findings: Finding[] }
