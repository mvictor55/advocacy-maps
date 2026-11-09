import { courtCalendar, isoDate } from "./courtCalendar"
import { DocumentKind } from "./v2/documentKind"
import { WhereItStands } from "./whereItStands"

/**
 * What to say about a step that hasn't happened. Only said when the record
 * supports it: a referred bill or resolve in a session where the step can
 * still happen gets "yet"; once the deadline has passed, or for an earlier
 * session, the sentence only reports what is recorded.
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
  hasHearing,
  now
}: {
  court: number
  kind: DocumentKind
  stands: WhereItStands
  /** A hearing is on record (a hearing document or a notice in the history). */
  hasHearing: boolean
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
  const reportingOver = today > calendar.jr10Default
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
