/**
 * The Legislature's history actions can carry HTML (`<br>`, styled spans
 * for hearing updates) and entities. The header and tooltips need plain text
 * on the server as well as in the browser, so this strips markup without
 * touching the DOM. The HistoryTable keeps its own DOM-based version.
 */
export function plainActionText(action: string): string {
  return action
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\r\n|\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
}

/** Everything on one line, for the header and tile text. */
export function oneLineActionText(action: string): string {
  return plainActionText(action).replace(/\n+/g, " ").trim()
}
