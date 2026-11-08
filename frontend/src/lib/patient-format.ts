import type { PatientListItem } from '@shared/types'

export const formatGender = (gender: PatientListItem['gender']): string => {
  if (gender === null) return 'Not recorded'
  return gender.charAt(0).toUpperCase() + gender.slice(1)
}

export const formatLastSeen = (
  patient: Pick<PatientListItem, 'lastSeenAt'>,
  variant: 'list' | 'dialog',
): string => {
  if (patient.lastSeenAt === null) return 'Not seen yet'

  const options: Intl.DateTimeFormatOptions =
    variant === 'list'
      ? { day: 'numeric', month: 'short', year: 'numeric' }
      : { day: 'numeric', month: 'short' }
  const date = new Intl.DateTimeFormat('en-MY', options).format(new Date(patient.lastSeenAt))
  return variant === 'list' ? date : `Last seen ${date}`
}
