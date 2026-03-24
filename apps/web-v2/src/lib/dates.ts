const DEFAULT_LOCALE = 'en-US'

/** Format a date as "Monday, February 13" */
export function formatFullDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(DEFAULT_LOCALE, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/** Format a date as "Feb 13" */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(DEFAULT_LOCALE, {
    month: 'short',
    day: 'numeric',
  })
}

/** Format a date as "Mon, Feb 13" */
export function formatCompactDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(DEFAULT_LOCALE, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Format a date with time as "Feb 13, 2:30 PM" */
export function formatDateWithTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(DEFAULT_LOCALE, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Format time only as "2:30 PM" */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString(DEFAULT_LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Format a full datetime as "Monday, February 13, 2026, 2:30 PM" */
export function formatFullDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString(DEFAULT_LOCALE, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** Format a duration in minutes as "30 min" or "1h 30m" */
export function formatDuration(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}
