import { BillHistory } from "components/db"
import { oneLineActionText } from "./actionText"

/** A history line in which the Legislature cites a roll call. */
export const ROLL_CALL_MENTION = /roll\s*call|yea\s+and\s+nay/i

/** A quorum roll call records attendance, not a vote on a question. */
export const QUORUM_CALL = /^quorum roll call/i

/**
 * How many history lines cite a roll call on a question. Quorum calls are
 * left out: they record attendance. The tally itself is read by the
 * roll-call parser; this only counts mentions, so the stat tile never claims
 * more than the history says.
 */
export function countRollCallMentions(history: BillHistory): number {
  return history.filter(h => {
    const text = oneLineActionText(h.Action)
    return ROLL_CALL_MENTION.test(text) && !QUORUM_CALL.test(text)
  }).length
}
