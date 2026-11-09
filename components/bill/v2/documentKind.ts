import { Bill } from "components/db"
import { oneLineActionText } from "./actionText"
import { draftOrigin } from "./newDraft"

/**
 * What kind of document a bill page is showing, for deciding which absence
 * sentences ("No hearing scheduled yet") the record can support.
 *
 * - `referredBill`: a Bill or Resolve that was at some point referred (or
 *   discharged) to a joint policy committee. A hearing and a committee
 *   report are expected, so their absence can be stated. Late-filed bills
 *   that start in House or Senate Rules and the Rules of the two branches
 *   count once they reach a joint committee.
 * - `unreferredBill`: a Bill or Resolve that has not reached a joint policy
 *   committee: still in Rules, or referred only to a chamber committee (the
 *   Governor's budget goes straight to House Ways and Means). Nothing is
 *   known about a hearing either way.
 * - `committeeDocument`: a Bill or Resolve a committee created: a new draft,
 *   a substitute, or a document whose history begins "Reported from the
 *   committee on". Its hearing, if any, was on the documents it came from.
 * - `order`: an Order or Extension Order. Adopted or not; no hearing step.
 * - `other`: amendments, resolutions, communications, Governor's messages,
 *   proposals for constitutional amendment and anything else.
 */
export type DocumentKind =
  | "referredBill"
  | "unreferredBill"
  | "committeeDocument"
  | "order"
  | "other"

/** "Referred to the committee on X", "Read; and referred to the committee
 * on X", "Discharged to the committee on X", "Referred to the Special Joint
 * Committee on Initiative Petitions". */
const REFERRAL =
  /(?:referred|discharged) to the (?:special joint )?committee on\s+(.+?)(?:,|$)/i
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

  const first = bill.history[0]
  if (first && REPORTED_FROM.test(oneLineActionText(first.Action)))
    return "committeeDocument"

  for (const item of bill.history) {
    const referred = REFERRAL.exec(oneLineActionText(item.Action))
    if (referred && !isChamberCommittee(referred[1])) return "referredBill"
  }
  return "unreferredBill"
}
