import { committeeReports } from "components/bill/committeeVotes"
import { Bill } from "components/db"
import type { CommitteeRecommendation } from "components/hearing/hearing"

export type CommitteeResponse =
  | "favorable"
  | "adverse"
  | "reserveRight"
  | "noVoteRecorded"

export type MemberCommitteeVote = {
  billId: string
  billTitle: string
  committeeCode: string | null
  /** The committee's recommendation, as the Legislature labels it. */
  action: string
  date: string | null
  response: CommitteeResponse
  counts: Record<CommitteeResponse, number>
}

/**
 * The member's recorded committee votes on the given bills, read from the
 * committee reports on each bill document. A vote is on the committee's
 * recommendation (report favorably, send to study), not on the bill.
 */
export function memberCommitteeVotes(
  bills: Bill[],
  memberCode: string
): MemberCommitteeVote[] {
  const out: MemberCommitteeVote[] = []
  for (const bill of bills) {
    const recs = (bill.content as { CommitteeRecommendations?: unknown })
      .CommitteeRecommendations as CommitteeRecommendation[] | undefined
    for (const report of committeeReports(recs)) {
      for (const vote of report.votes) {
        const counts = {
          favorable: vote.favorable.length,
          adverse: vote.adverse.length,
          reserveRight: vote.reserveRight.length,
          noVoteRecorded: vote.noVoteRecorded.length
        }
        const response: CommitteeResponse | undefined = vote.favorable.includes(
          memberCode
        )
          ? "favorable"
          : vote.adverse.includes(memberCode)
          ? "adverse"
          : vote.reserveRight.includes(memberCode)
          ? "reserveRight"
          : vote.noVoteRecorded.includes(memberCode)
          ? "noVoteRecorded"
          : undefined
        if (!response) continue
        out.push({
          billId: bill.id,
          billTitle: bill.content.Title,
          committeeCode: report.committeeCode,
          action: report.action,
          date: vote.date,
          response,
          counts
        })
      }
    }
  }
  return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
}
