import type {
  CommitteeRecommendation,
  CommitteeVoteRecord,
  LegislativeMemberSummary
} from "components/hearing/hearing"

/**
 * A committee's reports on a bill, from `content.CommitteeRecommendations`
 * on the bill document, read the way components/hearing/HearingSidebar.tsx
 * reads them for the hearing page (without changing its input).
 *
 * A report is the committee's recommendation on the bill: "ought to pass",
 * a new draft, a study order, "ought not to pass". The members' votes are
 * votes on that recommendation, not on the bill: a favorable vote on a
 * study order sends the bill to study.
 */
export type CommitteeReport = {
  /** The committee's code, e.g. "J33". */
  committeeCode: string | null
  /** The Legislature's action label, e.g. "Favorable", "Study", "Redraft". */
  action: string
  /** Recorded votes on the recommendation, when the Legislature has them. */
  votes: CommitteeRollCall[]
}

export type CommitteeRollCall = {
  /** The committee's wording of what was voted on. */
  question: string | null
  date: string | null
  /** Members by their vote on the report. */
  favorable: string[]
  adverse: string[]
  reserveRight: string[]
  noVoteRecorded: string[]
}

/** What the page says about the committee stage. */
export type CommitteeStage =
  | { kind: "notReported" }
  | { kind: "reportedNoVote"; reports: CommitteeReport[] }
  | { kind: "reportedWithVotes"; reports: CommitteeReport[] }

const codes = (members: LegislativeMemberSummary[] | undefined): string[] =>
  (members ?? []).map(m => m.MemberCode).filter((c): c is string => !!c)

function hasAnyone(record: CommitteeVoteRecord): boolean {
  return (
    !!record.Favorable?.length ||
    !!record.Adverse?.length ||
    !!record.ReserveRight?.length ||
    !!record.NoVoteRecorded?.length
  )
}

/** The API splits one vote's record across several entries; merge them. */
function mergeRecords(records: CommitteeVoteRecord[]): CommitteeRollCall {
  const out: CommitteeRollCall = {
    question: null,
    date: null,
    favorable: [],
    adverse: [],
    reserveRight: [],
    noVoteRecorded: []
  }
  for (const r of records) {
    out.favorable.push(...codes(r.Favorable))
    out.adverse.push(...codes(r.Adverse))
    out.reserveRight.push(...codes(r.ReserveRight))
    out.noVoteRecorded.push(...codes(r.NoVoteRecorded))
  }
  return out
}

export function committeeReports(
  recommendations: CommitteeRecommendation[] | undefined
): CommitteeReport[] {
  return (recommendations ?? []).map(rec => ({
    committeeCode: rec.Committee?.CommitteeCode ?? null,
    action: rec.Action ?? "",
    votes: (rec.Votes ?? [])
      .filter(v => v.Vote?.some(hasAnyone))
      .map(v => ({
        ...mergeRecords(v.Vote ?? []),
        question: v.Question ?? null,
        date: v.Date ?? null
      }))
  }))
}

export function committeeStage(
  recommendations: CommitteeRecommendation[] | undefined
): CommitteeStage {
  const reports = committeeReports(recommendations)
  if (reports.length === 0) return { kind: "notReported" }
  return reports.some(r => r.votes.length > 0)
    ? { kind: "reportedWithVotes", reports }
    : { kind: "reportedNoVote", reports }
}

/**
 * Committee action labels the Legislature uses, and how the page phrases
 * them: as the committee's recommendation. Labels not listed are shown as
 * recorded.
 */
export const COMMITTEE_ACTION_KEYS: Record<string, string> = {
  Favorable: "favorable",
  "Favorable with Amendment": "favorableWithAmendment",
  "Favorable with Changes": "favorableWithChanges",
  Redraft: "redraft",
  Accompanied: "accompanied",
  Study: "study",
  "Study - Reporting Time Expired": "studyTimeExpired",
  Adverse: "adverse",
  "Place in OD": "placeInOrdersOfTheDay",
  "Correctly Drawn": "correctlyDrawn",
  "Discharge to Another Committee": "discharge",
  "Suspend Rules": "suspendRules",
  "Ought to be Adopted": "oughtToBeAdopted",
  "Ought not to be Approved": "oughtNotToBeApproved",
  "In Part": "inPart",
  "Place on File": "placeOnFile",
  "Compromised Version": "compromisedVersion"
}

/** Abbreviations in the Legislature's labels, spelled out for a tooltip. */
export const COMMITTEE_ABBREVIATIONS: Record<string, string> = {
  BTR: "Committee on Bills in the Third Reading",
  OD: "Orders of the Day"
}

export function spellOut(label: string): string | null {
  const found = Object.entries(COMMITTEE_ABBREVIATIONS).filter(([abbr]) =>
    new RegExp(`\\b${abbr}\\b`).test(label)
  )
  if (!found.length) return null
  return found.map(([abbr, full]) => `${abbr} = ${full}`).join("; ")
}
