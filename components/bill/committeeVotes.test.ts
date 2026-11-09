import type { CommitteeRecommendation } from "components/hearing/hearing"
import {
  committeeReports,
  committeeStage,
  COMMITTEE_ACTION_KEYS,
  spellOut
} from "./committeeVotes"

// The shape of content.CommitteeRecommendations on a bill document, with
// invented member codes.
const member = (code: string) => ({
  GeneralCourtNumber: 194,
  MemberCode: code,
  Details: `https://malegislature.gov/api/GeneralCourts/194/LegislativeMembers/${code}`
})

const withVotes: CommitteeRecommendation = {
  Action: "Redraft",
  FiscalAmounts: [],
  Committee: { CommitteeCode: "J33", GeneralCourtNumber: 194 },
  Votes: [
    {
      Question: "Committee Poll",
      Date: "2025-11-12T19:00:00",
      Vote: [
        {
          Favorable: [member("AAA1"), member("BBB1")],
          ReserveRight: [member("CCC1")]
        },
        { Favorable: [member("DDD1")], NoVoteRecorded: [member("EEE1")] }
      ]
    },
    // An entry with no members, as the API sometimes includes.
    { Question: "Empty", Date: "2025-11-12T19:00:00", Vote: [{}] }
  ]
}

const withoutVotes: CommitteeRecommendation = {
  Action: "Accompanied",
  Committee: { CommitteeCode: "J29", GeneralCourtNumber: 194 },
  Votes: []
}

describe("committeeReports", () => {
  it("merges the vote records and drops empty entries", () => {
    const [report] = committeeReports([withVotes])
    expect(report.committeeCode).toBe("J33")
    expect(report.action).toBe("Redraft")
    expect(report.votes).toHaveLength(1)
    expect(report.votes[0]).toEqual({
      question: "Committee Poll",
      date: "2025-11-12T19:00:00",
      favorable: ["AAA1", "BBB1", "DDD1"],
      adverse: [],
      reserveRight: ["CCC1"],
      noVoteRecorded: ["EEE1"]
    })
  })

  it("tells the three committee stages apart", () => {
    expect(committeeStage(undefined)).toEqual({ kind: "notReported" })
    expect(committeeStage([])).toEqual({ kind: "notReported" })
    expect(committeeStage([withoutVotes]).kind).toBe("reportedNoVote")
    expect(committeeStage([withoutVotes, withVotes]).kind).toBe(
      "reportedWithVotes"
    )
  })

  it("has a plain-language key for the common actions and spells out abbreviations", () => {
    expect(COMMITTEE_ACTION_KEYS["Study"]).toBe("study")
    expect(COMMITTEE_ACTION_KEYS["BTR Report"]).toBeUndefined()
    expect(spellOut("BTR Report")).toBe(
      "BTR = Committee on Bills in the Third Reading"
    )
    expect(spellOut("Place in the OD with Recommended Amendment")).toBe(
      "OD = Orders of the Day"
    )
    expect(spellOut("Favorable")).toBeNull()
  })
})
