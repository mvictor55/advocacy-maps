import { Bill } from "components/db"
import { oneLineActionText } from "./actionText"
import { draftOrigin } from "./newDraft"

/**
 * What kind of document a bill page is showing, for deciding which absence
 * sentences ("No hearing scheduled yet") the record can support.
 *
 * - `referredBill`: a Bill or Resolve the Legislature referred to a joint
 *   policy committee. Hearings and committee reports are expected, so their
 *   absence can be stated.
 * - `committeeDocument`: a Bill or Resolve a committee created (a new draft,
 *   a substitute, a Ways and Means bill, a report). Its hearing, if any, was
 *   on the documents it came from, so no hearing sentence applies.
 * - `order`: an Order or Extension Order. Adopted or not; no hearing step.
 * - `other`: amendments, resolutions, communications, Governor's messages,
 *   proposals for constitutional amendment and anything else. No sentence.
 */
export type DocumentKind =
  | "referredBill"
  | "committeeDocument"
  | "order"
  | "other"

const REFERRED = /^referred to the committee on\s+(.+?)(?:,|$)/i
const REPORTED_FROM = /^reported from the committee on/i

/** Committees of one branch, and the joint housekeeping committees. A
 * referral to one of these isn't a policy committee referral. */
const CHAMBER_COMMITTEE =
  /^(house|senate)\b|^rules of the two branches|^bills in the third reading|^joint rules$|^rules$/i

export function isChamberCommittee(name: string): boolean {
  return CHAMBER_COMMITTEE.test(name.trim())
}

export function documentKind(bill: Bill): DocumentKind {
  const type = bill.content?.LegislationTypeName ?? ""
  if (/^(extension )?order$/i.test(type)) return "order"
  if (!/^(bill|resolve)$/i.test(type)) return "other"
  if (draftOrigin(bill.history)) return "committeeDocument"

  for (const item of bill.history) {
    const text = oneLineActionText(item.Action)
    if (REPORTED_FROM.test(text)) return "committeeDocument"
    const referred = REFERRED.exec(text)
    if (referred) {
      return isChamberCommittee(referred[1])
        ? "committeeDocument"
        : "referredBill"
    }
  }
  // Referred nowhere yet: a freshly filed bill. Hearings are still expected.
  return "referredBill"
}
