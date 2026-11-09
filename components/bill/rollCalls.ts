import { BillHistory } from "components/db"
import { oneLineActionText } from "./v2/actionText"

/**
 * Floor roll calls, read from the bill history. The Legislature names them
 * in the action text:
 *
 *   House:  "Enacted - 151 YEAS to 0 NAYS (See YEA and NAY No. 270)"
 *           "… (See YEA and NAY in Supplement, No. 86)"  (193rd)
 *   Senate: "Enacted -see Roll Call #207 (Yeas 39 to Nays 0)"
 *           "… -- see Roll Call #116 (Yeas 30 to Nays 7)", "Roll Call # 97",
 *           "(Yeas 38 to Nay 1)", "(39 Yeas to 0 Nays)"
 *
 * Only what the text says is kept: the tally, the chamber, the number and
 * the action text as the question. Nothing is computed from the numbers.
 */
export type RollCall = {
  /** "house-270": the chamber and number, for `?rc=` links. */
  id: string
  branch: "House" | "Senate"
  number: number
  yeas: number
  nays: number
  /** The action text before the roll-call citation. */
  question: string
  /** A quorum roll call records attendance, not a vote on a question. */
  quorum: boolean
  /** The 193rd House's "in Supplement" roll calls use a separate series
   * whose PDFs aren't confirmed, so no PDF is linked. */
  supplement: boolean
  date: string | null
  /** The line as recorded. */
  action: string
  historyIndex: number
}

/** A line that cites a roll call the parser couldn't read. Shown raw. */
export type UnreadableRollCall = {
  action: string
  date: string | null
  branch: string
  historyIndex: number
}

export type RollCalls = {
  rollCalls: RollCall[]
  unreadable: UnreadableRollCall[]
}

/** A history line in which the Legislature cites a roll call. */
export const ROLL_CALL_MENTION = /roll\s*call|yea\s+and\s+nay/i
const QUORUM = /^quorum roll call/i

const HOUSE =
  /(?<yeas>\d+)\s+YEAS\s+to\s+(?<nays>\d+)\s+NAYS\s*\(\s*See\s+YEA\s+and\s+NAY(?<supplement>\s+in\s+Supplement)?,?\s+No\.\s*(?<number>\d+)\s*\)/i
const SENATE =
  /see\s+Roll\s+Call\s*#\s*(?<number>\d+)\s*\(?\s*(?:Yeas\s+(?<yeas>\d+)\s+to\s+(?:to\s+)?Nays?\s+(?<nays>\d+)|(?<yeas2>\d+)\s+Yeas\s+to\s+(?<nays2>\d+)\s+Nays?)\s*\)/i

export function parseRollCallLine(
  action: string,
  historyIndex: number,
  date: string | null = null,
  branch = ""
): RollCall | UnreadableRollCall | undefined {
  const text = oneLineActionText(action)
  if (!ROLL_CALL_MENTION.test(text)) return undefined
  const house = HOUSE.exec(text)
  if (house?.groups) {
    const number = Number(house.groups.number)
    return {
      id: `house-${number}`,
      branch: "House",
      number,
      yeas: Number(house.groups.yeas),
      nays: Number(house.groups.nays),
      question: cleanQuestion(text.slice(0, house.index)),
      quorum: QUORUM.test(text),
      supplement: Boolean(house.groups?.supplement),
      date,
      action: text,
      historyIndex
    }
  }
  const senate = SENATE.exec(text)
  if (senate?.groups) {
    const g = senate.groups
    const number = Number(g.number)
    return {
      id: `senate-${number}`,
      branch: "Senate",
      number,
      yeas: Number(g.yeas ?? g.yeas2),
      nays: Number(g.nays ?? g.nays2),
      question: cleanQuestion(text.slice(0, senate.index)),
      quorum: QUORUM.test(text),
      supplement: false,
      date,
      action: text,
      historyIndex
    }
  }
  return { action: text, date, branch, historyIndex }
}

/** "Enacted - " → "Enacted"; "Passed to be engrossed -- " → "Passed to be engrossed". */
function cleanQuestion(before: string): string {
  return before.replace(/[\s\-–—]+$/g, "").trim()
}

export function isRollCall(r: RollCall | UnreadableRollCall): r is RollCall {
  return "number" in r
}

/** Every roll call the history cites, in the Clerk's order. */
export function rollCallsFromHistory(history: BillHistory): RollCalls {
  const rollCalls: RollCall[] = []
  const unreadable: UnreadableRollCall[] = []
  history.forEach((h, i) => {
    const parsed = parseRollCallLine(h.Action, i, h.Date, h.Branch)
    if (!parsed) return
    if (isRollCall(parsed)) rollCalls.push(parsed)
    else unreadable.push(parsed)
  })
  return { rollCalls, unreadable }
}

/** Roll calls on a question: quorum calls left out. */
export function voteRollCalls(history: BillHistory): RollCall[] {
  return rollCallsFromHistory(history).rollCalls.filter(r => !r.quorum)
}

/** The Legislature's PDF of the roll call, or null when the series isn't
 * known (the 193rd House's "in Supplement" roll calls). */
export function rollCallPdfUrl(court: number, r: RollCall): string | null {
  if (r.supplement) return null
  return `https://malegislature.gov/RollCall/${court}/${r.branch}RollCall${r.number}.pdf`
}
