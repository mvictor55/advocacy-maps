import { DateTime } from "luxon"

/** The Legislature's clock. Hearing documents store an ISO date-time; it
 * is always shown in Massachusetts time so a date can't shift by a day. */
export const LEGISLATURE_ZONE = "America/New_York"

/**
 * The Legislature writes history dates as "2025-11-17T00:00:00" with no time
 * zone. Read the calendar date from the text, so the server and the browser
 * show the same day whatever their time zones.
 */
export function formatHistoryDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return iso
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  )
}

/** "Oct 17, 2023" for a hearing document's date-time, in Massachusetts. */
export function formatHearingDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const dt = DateTime.fromISO(iso, { setZone: true }).setZone(LEGISLATURE_ZONE)
  return dt.isValid ? dt.setLocale("en-US").toFormat("LLL d, yyyy") : iso
}

/** "1:00 PM" for a hearing document's date-time, in Massachusetts; "" when
 * the time is midnight (a date without a time). */
export function formatHearingTime(iso: string | null | undefined): string {
  if (!iso) return ""
  const dt = DateTime.fromISO(iso, { setZone: true }).setZone(LEGISLATURE_ZONE)
  if (!dt.isValid || (dt.hour === 0 && dt.minute === 0)) return ""
  return dt.setLocale("en-US").toFormat("h:mm a")
}
