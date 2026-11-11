import { billStage } from "./billStage"
import { committeeRole, summarizeHearing } from "./committees"
import { bars, financePeriods } from "./financeFigures"
import { byNumberDesc } from "./loadBills"
import { memberCommitteeVotes } from "./memberCommitteeVotes"
import { tallyVotes, voteKind } from "./memberVotes"
import { queryForSection, sectionForQuery } from "./useProfileSection"

const line = (Date: string, Branch: string, Action: string) => ({
  Date,
  Branch,
  Action
})

describe("billStage", () => {
  it("reads the furthest of the six steps from the history", () => {
    const history = [
      line(
        "2025-02-27T00:00:00",
        "House",
        "Referred to the committee on Education"
      ),
      line(
        "2025-05-01T00:00:00",
        "Joint",
        "Hearing scheduled for 05/13/2025 from 10:00 AM-01:00 PM in A-1"
      ),
      line(
        "2025-06-03T00:00:00",
        "House",
        "Bill reported favorably by committee and referred to the committee on House Ways and Means"
      ),
      line(
        "2025-07-23T00:00:00",
        "House",
        "Passed to be engrossed - 129 YEAS to 28 NAYS (See YEA and NAY No. 131)"
      ),
      line(
        "2025-07-28T00:00:00",
        "Senate",
        "Read; and referred to the Senate committee on Ways and Means"
      )
    ]
    const s = billStage({ id: "H1204", history }, "2025-10-01")
    expect(s.step).toBe(3)
    expect(s.origin).toBe("House")
    expect(s.other).toBe("Senate")
    expect(s.latestAction).toEqual({
      date: "2025-07-28T00:00:00",
      text: "Read; and referred to the Senate committee on Ways and Means"
    })
  })

  it("doesn't count a hearing that hasn't happened yet", () => {
    const history = [
      line(
        "2025-02-27T00:00:00",
        "House",
        "Referred to the committee on Education"
      ),
      line(
        "2025-09-29T00:00:00",
        "Joint",
        "Hearing scheduled for 10/14/2025 from 10:00 AM-01:00 PM in A-1"
      )
    ]
    expect(billStage({ id: "H1965", history }, "2025-10-01").step).toBe(0)
    expect(billStage({ id: "H1965", history }, "2025-10-15").step).toBe(1)
  })

  it("says where a redrafted bill continues", () => {
    const history = [
      line(
        "2025-02-27T00:00:00",
        "House",
        "Referred to the committee on Housing"
      ),
      line("2025-06-01T00:00:00", "House", "Accompanied a new draft, see H4115")
    ]
    const s = billStage({ id: "H2214", history }, "2025-10-01")
    expect(s.status).toBe("supersededBy")
    expect(s.continuedAs).toBe("H4115")
  })

  it("is 'filed' with no history", () => {
    expect(billStage({ id: "H1", history: [] }).step).toBe(-1)
  })
})

describe("votes", () => {
  it("labels a motion by its wording only", () => {
    expect(voteKind("On adoption of amendment #2")).toBe("amendment")
    expect(
      voteKind("On passing item 7061-0012, notwithstanding the Governor’s veto")
    ).toBe("veto")
    expect(voteKind("On enactment")).toBe("enactment")
    expect(voteKind("On passing the bill to be engrossed")).toBe("passage")
    expect(voteKind("On the motion to lay on the table")).toBe("other")
    expect(voteKind(null)).toBe("other")
  })

  it("counts responses", () => {
    expect(
      tallyVotes([
        { response: "Yea" },
        { response: "Yea" },
        { response: "Nay" },
        { response: "Not Voting" }
      ])
    ).toEqual({ Yea: 2, Nay: 1, "Not Voting": 1, Present: 0 })
  })

  it("finds the member's committee votes on a bill's reports", () => {
    const bill = {
      id: "H1204",
      content: {
        Title: "An Act updating the school funding formula",
        CommitteeRecommendations: [
          {
            Action: "Favorable",
            Committee: { CommitteeCode: "J14" },
            Votes: [
              {
                Date: "2025-06-03T00:00:00",
                Question: "Ought to pass",
                Vote: [
                  {
                    Favorable: [
                      { GeneralCourtNumber: 194, MemberCode: "JD0" },
                      { GeneralCourtNumber: 194, MemberCode: "AB1" }
                    ],
                    Adverse: [{ GeneralCourtNumber: 194, MemberCode: "CD2" }]
                  }
                ]
              }
            ]
          }
        ]
      }
    } as any
    expect(memberCommitteeVotes([bill], "JD0")).toEqual([
      {
        billId: "H1204",
        billTitle: "An Act updating the school funding formula",
        committeeCode: "J14",
        action: "Favorable",
        date: "2025-06-03T00:00:00",
        response: "favorable",
        counts: { favorable: 2, adverse: 1, reserveRight: 0, noVoteRecorded: 0 }
      }
    ])
    expect(memberCommitteeVotes([bill], "ZZ9")).toEqual([])
  })
})

describe("committees and hearings", () => {
  it("reads a chair from the committee document", () => {
    const doc = {
      content: {
        HouseChairperson: { MemberCode: "JD0" },
        SenateChairperson: { MemberCode: "SX1" }
      }
    }
    expect(committeeRole(doc, "JD0")).toBe("houseChair")
    expect(committeeRole(doc, "SX1")).toBe("senateChair")
    expect(committeeRole(doc, "AB1")).toBe("member")
  })

  it("summarizes a hearing's agenda and the member's bills on it", () => {
    const s = summarizeHearing(
      {
        videos: [{}],
        content: {
          EventId: 5001,
          EventDate: "2025-10-14T10:00:00",
          Name: "Hearing",
          HearingHost: { CommitteeCode: "J14" },
          Location: { LocationName: "A-1" },
          HearingAgendas: [
            {
              Topic: "Early education and care",
              DocumentsInAgenda: [
                { BillNumber: "H1965", PrimarySponsor: { Id: "JD0" } },
                { BillNumber: "H2001", PrimarySponsor: { Id: "AB1" } },
                { BillNumber: "H2001", PrimarySponsor: { Id: "AB1" } }
              ]
            }
          ]
        }
      },
      "JD0"
    )
    expect(s).toMatchObject({
      eventId: 5001,
      title: "Early education and care",
      billCount: 2,
      herBills: ["H1965"],
      hasVideo: true
    })
  })
})

describe("finance", () => {
  const entry = (amount: number) => ({ count: 1, amount })
  const breakdown = {
    individual: entry(35150),
    committee: entry(3000),
    union: entry(0),
    unitemized: { amount: 2900 },
    smallDonors: { itemized: entry(7250) },
    processingFees: entry(0)
  }
  const finance = {
    ocpfCpfId: 1,
    totalRaised: 180000,
    totalSpent: 118300,
    cashOnHand: 75450,
    contributionsCount: 10,
    uniqueContributorsCount: 8,
    breakdown,
    candidateFunds: { loans: entry(0), contributions: entry(500) },
    inKind: {
      individual: entry(0),
      committee: entry(0),
      union: entry(0),
      unitemized: { amount: 0 }
    },
    years: {
      "2024": {
        totalRaised: 142300,
        totalSpent: 96400,
        breakdown,
        finalized: true
      },
      "2025": {
        totalRaised: 38650,
        totalSpent: 21900,
        breakdown,
        finalized: false
      }
    }
  } as any

  it("lists years newest first, then the whole record with the balance", () => {
    const periods = financePeriods(finance)
    expect(periods.map(p => p.id)).toEqual(["2025", "2024", "all"])
    expect(periods[0].cashOnHand).toBeUndefined()
    expect(periods[2].cashOnHand).toBe(75450)
    expect(periods[2].bySource.map(r => r.key)).toContain("candidateFunds")
  })

  it("splits individual contributions by size", () => {
    expect(financePeriods(finance)[0].bySize).toEqual([
      { key: "upTo50", amount: 2900 },
      { key: "51to199", amount: 7250 },
      { key: "200up", amount: 27900 }
    ])
  })

  it("draws bars against the largest row", () => {
    expect(
      bars([
        { key: "a", amount: 75 },
        { key: "b", amount: 25 }
      ])
    ).toEqual([
      { key: "a", amount: 75, share: 75, width: 100 },
      { key: "b", amount: 25, share: 25, width: 33 }
    ])
  })
})

describe("sections in the URL", () => {
  it("reads ?tab= and falls back to the overview", () => {
    expect(sectionForQuery({ tab: "votes" })).toBe("votes")
    expect(sectionForQuery({ tab: "nonsense" })).toBe("overview")
    expect(sectionForQuery({})).toBe("overview")
  })

  it("keeps other parameters and drops tab for the overview", () => {
    expect(
      queryForSection(
        { tab: "votes", legislatorProfileV2: "enabled" },
        "overview"
      )
    ).toEqual({
      legislatorProfileV2: "enabled"
    })
    expect(queryForSection({}, "finance")).toEqual({ tab: "finance" })
  })

  it("orders bill numbers newest filing first", () => {
    expect(["H1204", "H4302", "H987"].sort(byNumberDesc)).toEqual([
      "H4302",
      "H1204",
      "H987"
    ])
  })
})
