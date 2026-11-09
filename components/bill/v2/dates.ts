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
