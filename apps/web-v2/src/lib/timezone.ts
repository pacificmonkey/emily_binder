import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'

export function displayTime(utcDate: string | Date, tz: string): string {
  return formatInTimeZone(utcDate, tz, 'h:mm a')
}

export function displayDate(utcDate: string | Date, tz: string): string {
  return formatInTimeZone(utcDate, tz, 'EEEE, MMMM d')
}

export function displayShortDate(utcDate: string | Date, tz: string): string {
  return formatInTimeZone(utcDate, tz, 'MMM d')
}

export function toUTC(localDate: Date, tz: string): Date {
  return fromZonedTime(localDate, tz)
}

export function getWorkspaceToday(tz: string): Date {
  return toZonedTime(new Date(), tz)
}

export function getWorkspaceNow(tz: string): Date {
  return toZonedTime(new Date(), tz)
}
