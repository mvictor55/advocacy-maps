import { BillHistory } from "components/db"
import { courtCalendar } from "./courtCalendar"
import { oneLineActionText } from "./v2/actionText"

/**
 * The date by which a bill's joint committee had to report it, as far as
 * the record says: the session's Joint Rule 10 deadline, pushed back by any
 * extension the bill's own history records, and, for a bill filed by a
 * House member, no earlier than 90 days after its hearing (House Rule 27:
 * 60 days after the hearing plus an extension of up to 30). "Yet" wording
 * is used only before this date.
 */

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11
}

/** "Wednesday, March 18, 2026" or "Wednesday July 31, 2024" → "2026-03-18". */
export function parseLongDate(text: string): string | undefined {
  const m =
    /(?:[a-z]+day,?\s+)?([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i.exec(
      text
    )
  if (!m) return undefined
  const month = MONTHS[m[1].toLowerCase()]
  if (month === undefined) return undefined
  const d = new Date(Date.UTC(Number(m[3]), month, Number(m[2])))
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
}

const EXTENSION =
  /report(?:ing|ed) date extended (?:to|until)\s+(.+?)(?:,\s*pending concurrence)?$|changing reporting date to\s+(.+?)\)/i

/** The reporting dates the history extends to, in order. */
export function extensionDates(history: BillHistory): string[] {
  const out: string[] = []
  for (const h of history) {
    const m = EXTENSION.exec(oneLineActionText(h.Action))
    if (!m) continue
    const date = parseLongDate(m[1] ?? m[2] ?? "")
    if (date) out.push(date)
  }
  return out
}

function plusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function reportDeadline({
  court,
  history,
  hearingDate,
  filedByHouseMember
}: {
  court: number
  history: BillHistory
  /** The hearing's date as "YYYY-MM-DD", when one is on record. */
  hearingDate?: string
  /** A bill a House member filed follows House Rule 27 (194th on). */
  filedByHouseMember: boolean
}): string {
  const candidates = [
    courtCalendar(court).jr10Default,
    ...extensionDates(history)
  ]
  if (court >= 194 && filedByHouseMember && hearingDate)
    candidates.push(plusDays(hearingDate, 90))
  return candidates.reduce((latest, d) => (d > latest ? d : latest))
}
