import { BillHistory } from "components/db"
import { courtCalendar, isoDate } from "./courtCalendar"
import { reportDeadline } from "./reportDeadline"
import { DocumentKind } from "./v2/documentKind"
import { WhereItStands } from "./whereItStands"

/**
 * What to say about a step that hasn't happened. Only said when the record
 * supports it: a referred bill or resolve gets "yet" while the step can
 * still happen; once the bill's reporting deadline has passed, formal
 * sessions have ended, or the session is over, the sentence only reports
 * what is recorded.
 */
export type AbsenceSentences = {
  /** Under "In committee", when no hearing is on record. */
  hearing?: "noHearingYet" | "noHearingRecorded"
  /** Under "Reported out", when the committee has not reported. */
  committee?: "noReportYet" | "noReportRecorded"
  /** Under the floor steps, when there has been no floor action. */
  floor?: "noFloorActionYet" | "noFloorActionRecorded"
}

export function absenceSentences({
  court,
  kind,
  stands,
  history,
  hasHearing,
  hearingDate,
  filedByHouseMember = false,
  now
}: {
  court: number
  kind: DocumentKind
  stands: WhereItStands
  /** The bill's history, for any reporting extension it records. */
  history: BillHistory
  /** A hearing is on record (a hearing document or a notice in the history). */
  hasHearing: boolean
  /** The hearing's date as "YYYY-MM-DD", when known. */
  hearingDate?: string
  /** Filed by a House member: House Rule 27 sets its reporting deadline. */
  filedByHouseMember?: boolean
  now: Date
}): AbsenceSentences {
  // Only a bill or resolve referred to a joint committee is expected to be
  // heard and reported. A terminal status makes "yet" untrue, and a dead
  // bill's missing steps are not news.
  if (kind !== "referredBill") return {}
  if (stands.status && stands.status.key !== "inConference") return {}

  const calendar = courtCalendar(court)
  const today = isoDate(now)
  const sessionOver = today > calendar.dissolution
  const reportingOver =
    today > reportDeadline({ court, history, hearingDate, filedByHouseMember })
  const formalOver = today > calendar.formalEndYear2

  const reached = new Set(
    stands.milestones.filter(m => m.reached).map(m => m.key)
  )
  const out: AbsenceSentences = {}
  if (!hasHearing && !reached.has("reportedOut"))
    out.hearing =
      sessionOver || reportingOver ? "noHearingRecorded" : "noHearingYet"
  if (!reached.has("reportedOut"))
    out.committee =
      sessionOver || reportingOver ? "noReportRecorded" : "noReportYet"
  if (
    reached.has("reportedOut") &&
    !reached.has("passedFirst") &&
    !reached.has("passedSecond")
  )
    out.floor =
      sessionOver || formalOver ? "noFloorActionRecorded" : "noFloorActionYet"
  return out
}
