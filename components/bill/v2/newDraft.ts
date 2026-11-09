import { BillHistory } from "components/db"
import { oneLineActionText } from "./actionText"

export type DraftOrigin = {
  /** "newDraft": the committee reported this document as a new draft of
   * the listed bills. "substitute": a branch substituted this text for the
   * listed bill. */
  kind: "newDraft" | "substitute"
  /** Bill numbers as the Legislature writes them, e.g. "H78". */
  billIds: string[]
  /** The history line this came from, as recorded. */
  action: string
}

const BILL_LIST = /((?:[HS]\d+(?:\s*,\s*|\s+and\s+|\s*,\s*and\s+)?)+)/i
const NEW_DRAFT = new RegExp(`^new draft of\\s+${BILL_LIST.source}`, "i")
const PENDING_NEW_DRAFT = new RegExp(
  `^pending new draft of\\s+${BILL_LIST.source}`,
  "i"
)
const SUBSTITUTED = new RegExp(`substituted for\\s+${BILL_LIST.source}`, "i")

function billIds(list: string): string[] {
  return (list.match(/[HS]\d+/gi) ?? []).map(id => id.toUpperCase())
}

/**
 * Whether this document's history marks it as a new draft or a substitute
 * for other bills. Such a bill has no hearing or testimony of its own: the
 * hearing was held on the bills it replaces.
 */
export function draftOrigin(history: BillHistory): DraftOrigin | undefined {
  for (const item of history) {
    const text = oneLineActionText(item.Action)
    const draft = NEW_DRAFT.exec(text) ?? PENDING_NEW_DRAFT.exec(text)
    if (draft) {
      const ids = billIds(draft[1])
      if (ids.length) return { kind: "newDraft", billIds: ids, action: text }
    }
    const substitute = SUBSTITUTED.exec(text)
    if (substitute) {
      const ids = billIds(substitute[1])
      if (ids.length) return { kind: "substitute", billIds: ids, action: text }
    }
  }
  return undefined
}
