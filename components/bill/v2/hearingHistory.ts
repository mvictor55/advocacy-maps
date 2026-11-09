import { BillHistory } from "components/db"
import { oneLineActionText } from "./actionText"

/**
 * A hearing notice in the bill history. Sessions before the 194th have no
 * hearing documents in MAPLE, so their hearings are read from lines like
 * "Hearing scheduled for 10/17/2023 from 10:00 AM-01:00 PM in A-2".
 */
export type HistoryHearing = {
  kind: "scheduled" | "rescheduled" | "canceled"
  /** "2023-10-17", from the text of the notice (not the line's Date). */
  date?: string
  /** "10:00 AM" / "01:00 PM", as written. */
  start?: string
  end?: string
  /** "A-2 and Virtual", as written. */
  location?: string
  /** The committee named in the notice, when it names one. */
  committee?: string
  /** The line as recorded, for the tooltip. */
  action: string
  /** Index of the line in the bill's history. */
  historyIndex: number
}

const DATE = /(\d{2})\/(\d{2})\/(\d{4})/
const TIME = /\d{1,2}:\d{2}\s?[AP]M/gi
// "Hearing scheduled for", "Hearing rescheduled to", "Location Changed -
// Hearing scheduled for", "Hearing scheduled (Committee) for", "Hearing
// before Committee scheduled for". What follows the date is read separately.
const NOTICE = new RegExp(
  `hearing(?: before (?<before>.+?))?\\s+(?<kind>re)?scheduled(?:\\s*\\((?<named>[^)]+)\\))?\\s*(?:for|to)?\\s*${DATE.source}(?<rest>.*)$`,
  "i"
)
const CANCELED = /^hearing cancel+ed/i

export function parseHearingLine(
  action: string,
  historyIndex: number
): HistoryHearing | undefined {
  const text = oneLineActionText(action)
    // "Hearing updated to New End Time" is appended to some reschedules.
    .replace(/\s*Hearing updated to .*$/i, "")
    .trim()
  if (CANCELED.test(text))
    return { kind: "canceled", action: text, historyIndex }
  const m = NOTICE.exec(text)
  if (!m || !m.groups) return undefined
  const [, mm, dd, yyyy] = DATE.exec(text) ?? []
  const rest = m.groups.rest ?? ""
  // "from 10:00 AM-01:00 PM in A-2 and Virtual": the times, then the room.
  const times = (rest.match(TIME) ?? []).map(t =>
    t.toUpperCase().replace(/\s+/, " ")
  )
  const location = /\bin\s+(.+?)$/i.exec(rest)?.[1]?.trim()
  return {
    kind: m.groups.kind ? "rescheduled" : "scheduled",
    date: `${yyyy}-${mm}-${dd}`,
    start: times[0],
    end: times[1],
    location,
    committee: (m.groups.named ?? m.groups.before)?.trim(),
    action: text,
    historyIndex
  }
}

/** Every hearing notice in the history, in the Clerk's order. */
export function hearingsFromHistory(history: BillHistory): HistoryHearing[] {
  return history
    .map((h, i) => parseHearingLine(h.Action, i))
    .filter((h): h is HistoryHearing => h !== undefined)
}

/** The distinct hearing dates still standing after reschedules and
 * cancellations: what the stat tile counts when a bill has no hearing
 * documents. A cancellation removes the most recent date. */
export function hearingDatesFromHistory(history: BillHistory): string[] {
  const dates: string[] = []
  for (const h of hearingsFromHistory(history)) {
    if (h.kind === "canceled") dates.pop()
    else if (h.kind === "rescheduled") {
      dates.pop()
      if (h.date) dates.push(h.date)
    } else if (h.date) dates.push(h.date)
  }
  return [...new Set(dates)]
}
