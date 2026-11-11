import { whereItStands, Branch, StatusKey } from "components/bill/whereItStands"
import { hearingDatesFromHistory } from "components/bill/v2/hearingHistory"
import { oneLineActionText } from "components/bill/v2/actionText"
import { Bill } from "components/db"

/**
 * The six steps of a bill's tracker on a legislator's profile, read by rule
 * from the Legislature's history lines (components/bill/whereItStands.ts).
 * It is a reading of the record: a bill redrafted under a new number can
 * look stalled here while its new version moves ahead, so the status says
 * so where the history points to the new number.
 */
export const STEPS = [
  "referred",
  "heard",
  "reported",
  "passedFirst",
  "passedSecond",
  "law"
] as const
export type StepKey = (typeof STEPS)[number]

export type BillStage = {
  /** Index into STEPS of the furthest step reached, or -1 for "filed". */
  step: number
  /** The branch the bill started in: names the two floor steps. */
  origin: Branch
  other: Branch
  /** What is true about the bill now, when the history says. */
  status?: StatusKey
  /** For `supersededBy`: the new number. */
  continuedAs?: string
  /** For `sentToStudy`: the study order's number, when the line names it. */
  studyOrder?: string
  latestAction?: { date: string | null; text: string }
}

/** "2025-09-16" for today in Massachusetts, for comparing history dates. */
export function todayIso(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/New_York" })
}

export function billStage(
  bill: Pick<Bill, "id" | "history">,
  today: string = todayIso()
): BillStage {
  const history = bill.history ?? []
  const stands = whereItStands(history, bill.id)
  const has = (k: string) =>
    stands.milestones.some(m => m.key === k && m.reached)
  const heard = hearingDatesFromHistory(history).some(d => d <= today)

  const reached: boolean[] = [
    has("inCommittee"),
    heard,
    has("reportedOut"),
    has("passedFirst"),
    has("passedSecond"),
    has("law")
  ]
  let step = -1
  reached.forEach((r, i) => {
    if (r) step = i
  })

  const last = history[history.length - 1]
  const other: Branch = stands.origin === "House" ? "Senate" : "House"
  return {
    step,
    origin: stands.origin,
    other,
    status: stands.status?.key,
    continuedAs:
      stands.status?.key === "supersededBy" ? stands.status.billId : undefined,
    studyOrder:
      stands.status?.key === "sentToStudy" ? stands.status.billId : undefined,
    latestAction: last
      ? { date: last.Date, text: oneLineActionText(last.Action) }
      : undefined
  }
}

/** The latest action's date, for sorting bills by recent activity. */
export function latestActionDate(bill: Pick<Bill, "history">): string {
  const history = bill.history ?? []
  return history[history.length - 1]?.Date ?? ""
}
