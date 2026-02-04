import { format, parseISO, startOfWeek, endOfWeek, isSameDay, isSameWeek as dateFnsIsSameWeek } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

/**
 * Canonical timezone for all date/time logic
 * Per spec: All "today/week" logic is canonical to America/Los_Angeles (Pacific)
 */
export const CANONICAL_TIMEZONE = 'America/Los_Angeles'

/**
 * Get current time in canonical timezone
 */
export function getCanonicalNow(): Date {
  return toZonedTime(new Date(), CANONICAL_TIMEZONE)
}

/**
 * Get today's date as YYYY-MM-DD string in canonical timezone
 */
export function getCanonicalToday(): string {
  return format(getCanonicalNow(), 'yyyy-MM-dd')
}

/**
 * Get the week bounds (Monday-Sunday) for a given date
 * Per spec: Week definition is Monday–Sunday
 */
export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const zoned = toZonedTime(date, CANONICAL_TIMEZONE)
  return {
    start: startOfWeek(zoned, { weekStartsOn: 1 }), // Monday = 1
    end: endOfWeek(zoned, { weekStartsOn: 1 }),
  }
}

/**
 * Get the start of the current week (Monday) as YYYY-MM-DD
 */
export function getCurrentWeekStart(): string {
  const { start } = getWeekBounds(new Date())
  return format(start, 'yyyy-MM-dd')
}

/**
 * Check if a date string (YYYY-MM-DD) is today in canonical timezone
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getCanonicalToday()
}

/**
 * Check if a date is in the current week
 */
export function isCurrentWeek(dateStr: string): boolean {
  const date = parseISO(dateStr)
  const now = getCanonicalNow()
  return dateFnsIsSameWeek(date, now, { weekStartsOn: 1 })
}

/**
 * Check if two dates are the same day
 */
export function isSameDayCanonical(date1: Date | string, date2: Date | string): boolean {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2
  return isSameDay(d1, d2)
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr)
}

/**
 * Get day of week (0 = Monday, 6 = Sunday) for recurring mission matching
 */
export function getDayOfWeek(date: Date = getCanonicalNow()): number {
  const day = date.getDay()
  // Convert from Sunday = 0 to Monday = 0
  return day === 0 ? 6 : day - 1
}

/**
 * Check if a recurring mission should appear today based on its pattern
 */
export function shouldRecurringMissionAppearToday(
  recurrencePattern: 'daily' | 'weekly' | 'specific_weekdays',
  weekdays?: number[] // 0 = Monday, 6 = Sunday
): boolean {
  const today = getDayOfWeek()

  switch (recurrencePattern) {
    case 'daily':
      return true
    case 'weekly':
      // Weekly missions appear on their designated day (default Monday)
      return today === (weekdays?.[0] ?? 0)
    case 'specific_weekdays':
      return weekdays?.includes(today) ?? false
    default:
      return false
  }
}

/**
 * Convert a UTC timestamp to canonical timezone for display
 */
export function toCanonicalTime(utcDate: Date | string): Date {
  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate
  return toZonedTime(d, CANONICAL_TIMEZONE)
}

/**
 * Convert from canonical timezone to UTC for storage
 */
export function fromCanonicalTime(canonicalDate: Date): Date {
  return fromZonedTime(canonicalDate, CANONICAL_TIMEZONE)
}
