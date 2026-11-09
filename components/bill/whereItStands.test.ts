import { absenceSentences } from "./absence"
import { extensionDates, parseLongDate, reportDeadline } from "./reportDeadline"
import { courtCalendar } from "./courtCalendar"
import { whereAnOrderStands, whereItStands } from "./whereItStands"

// Histories copied from the dev database (194th unless noted).
const h = (Action: string, Branch = "House", Date: string | null = null) => ({
  Action,
  Branch,
  Date
})

const LAW_H2268 = [
  h(
    "Referred to the committee on Municipalities and Regional Government",
    "House",
    "2025-02-27T00:00:00"
  ),
  h("Senate concurred", "Senate", "2025-02-27T00:00:00"),
  h(
    "Hearing scheduled for 05/13/2025 from 01:00 PM-05:00 PM in B-1",
    "Joint",
    "2025-05-05T00:00:00"
  ),
  h(
    "Bill reported favorably by committee and referred to the committee on House Steering, Policy and Scheduling",
    "House",
    "2025-07-10T00:00:00"
  ),
  h(
    "Committee reported that the matter be placed in the Orders of the Day for the next sitting",
    "House",
    "2025-07-23T00:00:00"
  ),
  h("Rules suspended", "House", "2025-07-23T00:00:00"),
  h(
    "Read second and ordered to a third reading",
    "House",
    "2025-07-23T00:00:00"
  ),
  h(
    "Read third (title changed), amended and passed to be engrossed",
    "House",
    "2025-09-29T00:00:00"
  ),
  h(
    "Read, rules suspended, read second and ordered to a third reading",
    "Senate",
    "2025-10-02T00:00:00"
  ),
  h("Taken out of the Orders of the Day", "Senate", "2026-02-05T00:00:00"),
  h(
    "Read third (title changed) and passed to be engrossed",
    "Senate",
    "2026-02-05T00:00:00"
  ),
  h("Enacted", "House", "2026-02-09T00:00:00"),
  h("Enacted and laid before the Governor", "Senate", "2026-02-09T00:00:00"),
  h(
    "Signed by the Governor, Chapter 20 of the Acts of 2026",
    "Executive",
    "2026-02-12T00:00:00"
  )
]

const STUDY_H1001 = [
  h(
    "Referred to the committee on Environment and Natural Resources",
    "House",
    "2025-02-27T00:00:00"
  ),
  h("Senate concurred", "Senate"),
  h("Hearing scheduled for 07/01/2025 from 01:00 PM-05:00 PM in A-1", "Joint"),
  h("Accompanied a study order, see H5149", "House", "2026-02-26T00:00:00")
]

const NEW_DRAFT_H78 = [
  h(
    "Referred to the committee on Advanced Information Technology, the Internet and Cybersecurity",
    "House"
  ),
  h("Hearing scheduled for 05/21/2025 from 10:00 AM-02:00 PM in A-2", "Joint"),
  h("Accompanied a new draft, see H4746", "House", "2025-11-17T00:00:00")
]

const NFA_193_H1 = [
  h(
    "Referred to the committee on House Ways and Means",
    "House",
    "2023-03-02T00:00:00"
  ),
  h("Reported, in part, by H3900", "House"),
  h("No further action taken", "House", "2024-12-31T00:00:00")
]

const ADVERSE_H1722 = [
  h("Referred to the committee on The Judiciary", "House"),
  h("Senate concurred", "Senate"),
  h("Hearing scheduled for 04/22/2025 from 01:00 PM-05:00 PM in A-2", "Joint"),
  h(
    "Committee recommended ought NOT to pass and referred to the committee on House Steering, Policy and Scheduling",
    "House",
    "2025-07-30T00:00:00"
  ),
  h(
    "Placed in the Orders of the Day for the next sitting (under the last sentence of Rule 7A), the question being on acceptance",
    "House"
  )
]

const CONFERENCE_H4001 = [
  h("Read; and referred to the committee on House Ways and Means", "House"),
  h("Reported from the committee on House Ways and Means", "House"),
  h("Read third and passed to be engrossed", "House", "2025-04-30T00:00:00"),
  h(
    "Read third and passed to be engrossed -see Roll Call #48 (Yeas 38 to Nays 2)",
    "Senate",
    "2025-05-22T00:00:00"
  ),
  h("House NON-concurred in the Senate amendment", "House"),
  h(
    "Committee of conference appointed - (Michlewitz-Ferrante-Smola)",
    "House",
    "2025-05-29T00:00:00"
  ),
  h("Senate insisted on its amendment", "Senate"),
  h(
    "Committee of conference appointed (Rodrigues-Comerford-O'Connor), in concurrence",
    "Senate",
    "2025-05-29T00:00:00"
  )
]

const SIGNED_IN_PART_H4240 = [
  h("Reported from the committee of conference", "House"),
  h(
    "Committee of conference report accepted - 139 YEAS to 6 NAYS (See YEA and NAY No. 61)",
    "House"
  ),
  h(
    "Committee of conference report accepted, in concurrence -see Roll Call #58 (Yeas 38 to Nays 2)",
    "Senate"
  ),
  h(
    "Enacted - 139 YEAS to 6 NAYS (See YEA and NAY No. 62)",
    "House",
    "2025-06-30T00:00:00"
  ),
  h("Enacted and laid before the Governor", "Senate", "2025-06-30T00:00:00"),
  h(
    "Signed (in part) by the Governor, Chapter 9 of the Acts of 2025",
    "Executive",
    "2025-07-04T00:00:00"
  ),
  h(
    "Governor returned to the House with vetoes and amendments to certain sections",
    "House",
    "2025-07-04T00:00:00"
  ),
  h(
    "Item 0330-0300 passed over veto - 132 YEAS to 23 NAYS (See YEA and NAY No. 74)",
    "House"
  )
]

describe("whereItStands", () => {
  it("follows a bill all the way to law (H2268)", () => {
    const s = whereItStands(LAW_H2268, "H2268")
    expect(s.origin).toBe("House")
    expect(s.milestones.filter(m => m.reached).map(m => m.key)).toEqual([
      "filed",
      "inCommittee",
      "reportedOut",
      "passedFirst",
      "passedSecond",
      "toGovernor",
      "law"
    ])
    expect(s.milestones.find(m => m.key === "inCommittee")?.committee).toBe(
      "Municipalities and Regional Government"
    )
    expect(s.milestones.find(m => m.key === "passedFirst")).toMatchObject({
      passedBranch: "House",
      date: "2025-09-29T00:00:00"
    })
    expect(s.milestones.find(m => m.key === "passedSecond")?.passedBranch).toBe(
      "Senate"
    )
    expect(s.furthest).toBe("law")
    expect(s.status).toMatchObject({
      key: "law",
      chapter: "Chapter 20 of the Acts of 2026",
      inPart: false
    })
  })

  it("reads a study order only when it is the last action (H1001)", () => {
    const s = whereItStands(STUDY_H1001, "H1001")
    expect(s.furthest).toBe("inCommittee")
    expect(s.status).toMatchObject({ key: "sentToStudy", billId: "H5149" })
    // The bill came back: a later action means it is not in study.
    const revived = whereItStands(
      [
        ...STUDY_H1001,
        h(
          "Discharged from committee and recommitted to the committee on Environment and Natural Resources",
          "House"
        )
      ],
      "H1001"
    )
    expect(revived.status).toBeUndefined()
  })

  it("follows the new-draft pointer on the frozen bill (H78)", () => {
    const s = whereItStands(NEW_DRAFT_H78, "H78")
    expect(s.status).toMatchObject({ key: "supersededBy", billId: "H4746" })
    expect(s.furthest).toBe("inCommittee")
  })

  it("reads the dissolution stamp and an adverse report", () => {
    expect(whereItStands(NFA_193_H1, "H1").status).toMatchObject({
      key: "deadAtDissolution",
      date: "2024-12-31T00:00:00"
    })
    const adverse = whereItStands(ADVERSE_H1722, "H1722")
    expect(adverse.status?.key).toBe("adverseReport")
    // "ought NOT to pass" is not a favorable report.
    expect(adverse.furthest).toBe("inCommittee")
    expect(
      whereItStands(
        [h("Placed on file", "House", "2025-03-12T00:00:00")],
        "H11"
      ).status?.key
    ).toBe("placedOnFile")
  })

  it("reads a conference committee, cleared when its report is accepted (H4001)", () => {
    const s = whereItStands(CONFERENCE_H4001, "H4001")
    // The budget starts in House Ways and Means and is never referred to a
    // joint committee: its first action is the House's.
    expect(s.origin).toBe("House")
    expect(s.milestones.find(m => m.key === "passedFirst")?.passedBranch).toBe(
      "House"
    )
    expect(s.status).toMatchObject({
      key: "inConference",
      date: "2025-05-29T00:00:00"
    })
    expect(s.furthest).toBe("passedSecond")
    const done = whereItStands(
      [
        ...CONFERENCE_H4001,
        h("Committee of conference report accepted", "House")
      ],
      "H4001"
    )
    expect(done.status).toBeUndefined()
  })

  it("attaches the roll call cited on a milestone's line", () => {
    const s = whereItStands(
      [
        h("Referred to the committee on Education", "House"),
        h("Bill reported favorably by committee", "House"),
        h(
          "Read third and passed to be engrossed - 151 YEAS to 0 NAYS (See YEA and NAY No. 270)",
          "House",
          "2025-12-18T00:00:00"
        )
      ],
      "H100"
    )
    expect(
      s.milestones.find(m => m.key === "passedFirst")?.rollCall
    ).toMatchObject({
      id: "house-270",
      yeas: 151,
      nays: 0
    })
    expect(
      s.milestones.find(m => m.key === "reportedOut")?.rollCall
    ).toBeUndefined()
  })

  it("keeps a bill signed in part as law, not vetoed (H4240)", () => {
    const s = whereItStands(SIGNED_IN_PART_H4240, "H4240")
    expect(s.status).toMatchObject({
      key: "law",
      chapter: "Chapter 9 of the Acts of 2025",
      inPart: true
    })
  })

  it("does not treat a Governor's amendment as a veto (H3912)", () => {
    const s = whereItStands(
      [
        ...LAW_H2268.slice(0, 13),
        h(
          "Governor returned to the House with amendment",
          "House",
          "2026-02-20T00:00:00"
        )
      ],
      "H3912"
    )
    expect(s.status?.key).toBe("returnedWithAmendment")
    expect(s.furthest).toBe("toGovernor")
    const vetoed = whereItStands(
      [
        ...LAW_H2268.slice(0, 13),
        h(
          "Governor returned to the House with veto",
          "House",
          "2026-02-20T00:00:00"
        )
      ],
      "H3912"
    )
    expect(vetoed.status?.key).toBe("vetoed")
  })

  it("names the Senate as the first branch for a Senate bill", () => {
    const s = whereItStands(
      [
        h("Referred to the committee on Education", "Senate"),
        h(
          "Bill reported favorably by committee and referred to the committee on Senate Ways and Means",
          "Senate"
        ),
        h(
          "Read third and passed to be engrossed",
          "Senate",
          "2025-06-01T00:00:00"
        )
      ],
      "S100"
    )
    expect(s.origin).toBe("Senate")
    expect(s.milestones.find(m => m.key === "passedFirst")?.passedBranch).toBe(
      "Senate"
    )
  })
})

describe("whereAnOrderStands", () => {
  it("reads adoption from the Legislature's wording", () => {
    expect(
      whereAnOrderStands([
        h(
          "Order adopted - 128 YEAS to 23 NAYS (See YEA and NAY No. 24)",
          "House",
          "2025-02-25T00:00:00"
        )
      ]).adopted
    ).toMatchObject({ date: "2025-02-25T00:00:00" })
    expect(
      whereAnOrderStands([h("Referred to the committee on Rules", "Senate")])
        .adopted
    ).toBeUndefined()
  })
})

describe("courtCalendar", () => {
  it("has the spec's dates for known sessions and computes others", () => {
    expect(courtCalendar(194)).toMatchObject({
      jr10Default: "2025-12-03",
      formalEndYear2: "2026-07-31",
      dissolution: "2027-01-05"
    })
    expect(courtCalendar(193).jr10Default).toBe("2024-02-07")
    // The 191st: convened January 2, 2019; dissolved the day before the
    // 192nd convened on January 6, 2021.
    expect(courtCalendar(191)).toMatchObject({
      convene: "2019-01-02",
      formalEndYear2: "2020-07-31",
      dissolution: "2021-01-05",
      jr10Rule: "adverse"
    })
  })
})

describe("absenceSentences", () => {
  const inCommittee = whereItStands(STUDY_H1001.slice(0, 2), "H1001")
  const reported = whereItStands(LAW_H2268.slice(0, 4), "H2268")
  const base = { court: 194, kind: "referredBill" as const, history: [] }

  it('says "yet" only while the step can still happen in the 194th', () => {
    const before = new Date("2025-11-09T12:00:00Z")
    expect(
      absenceSentences({
        ...base,
        stands: inCommittee,
        hasHearing: false,
        now: before
      })
    ).toEqual({ hearing: "noHearingYet", committee: "noReportYet" })
    expect(
      absenceSentences({
        ...base,
        stands: reported,
        hasHearing: true,
        now: before
      })
    ).toEqual({ floor: "noFloorActionYet" })

    // After the Joint Rule 10 deadline (2025-12-03).
    const afterDeadline = new Date("2026-01-15T12:00:00Z")
    expect(
      absenceSentences({
        ...base,
        stands: inCommittee,
        hasHearing: false,
        now: afterDeadline
      })
    ).toEqual({ hearing: "noHearingRecorded", committee: "noReportRecorded" })
    // Floor action can still happen until formal sessions end (2026-07-31).
    expect(
      absenceSentences({
        ...base,
        stands: reported,
        hasHearing: true,
        now: afterDeadline
      })
    ).toEqual({ floor: "noFloorActionYet" })
    const afterFormal = new Date("2026-08-15T12:00:00Z")
    expect(
      absenceSentences({
        ...base,
        stands: reported,
        hasHearing: true,
        now: afterFormal
      })
    ).toEqual({ floor: "noFloorActionRecorded" })
  })

  it("uses recorded wording for an earlier session and nothing for other documents or dead bills", () => {
    const now = new Date("2026-03-01T12:00:00Z")
    expect(
      absenceSentences({
        court: 193,
        kind: "referredBill",
        history: [],
        stands: inCommittee,
        hasHearing: false,
        now
      })
    ).toEqual({ hearing: "noHearingRecorded", committee: "noReportRecorded" })
    expect(
      absenceSentences({
        ...base,
        kind: "order",
        stands: inCommittee,
        hasHearing: false,
        now
      })
    ).toEqual({})
    expect(
      absenceSentences({
        ...base,
        kind: "committeeDocument",
        stands: inCommittee,
        hasHearing: false,
        now
      })
    ).toEqual({})
    expect(
      absenceSentences({
        ...base,
        stands: whereItStands(STUDY_H1001, "H1001"),
        hasHearing: true,
        now
      })
    ).toEqual({})
  })
})

describe("reportDeadline", () => {
  // H1351 (194th): three extension orders while in Health Care Financing.
  const EXTENDED = [
    h(
      "Referred to the committee on Health Care Financing",
      "House",
      "2025-02-27T00:00:00"
    ),
    h(
      "Hearing scheduled for 07/01/2025 from 10:00 AM-12:30 PM in Gardner Auditorium",
      "Joint"
    ),
    h(
      "Reporting date extended to Wednesday, March 18, 2026",
      "House",
      "2025-09-15T00:00:00"
    ),
    h("Reporting date extended until Wednesday, March 18, 2026", "House"),
    h(
      "Reporting date extended to Monday, June 15, 2026",
      "House",
      "2026-03-19T00:00:00"
    ),
    h(
      "Reporting date extended to Friday, July 31, 2026",
      "House",
      "2026-06-17T00:00:00"
    )
  ]

  it("reads the Legislature's long dates", () => {
    expect(parseLongDate("Wednesday, March 18, 2026")).toBe("2026-03-18")
    expect(parseLongDate("Wednesday July 31, 2024")).toBe("2024-07-31")
    expect(parseLongDate("Sunday June 30, 2024")).toBe("2024-06-30")
    expect(parseLongDate("next week")).toBeUndefined()
  })

  it("reads extension orders, including the 193rd's forms", () => {
    expect(extensionDates(EXTENDED)).toEqual([
      "2026-03-18",
      "2026-03-18",
      "2026-06-15",
      "2026-07-31"
    ])
    expect(
      extensionDates([
        h(
          "Reporting date extended to Wednesday July 31, 2024, pending concurrence",
          "House"
        ),
        h(
          "Amendment (changing reporting date to Wednesday July 31, 2024) adopted, pending concurrence",
          "Senate"
        )
      ])
    ).toEqual(["2024-07-31", "2024-07-31"])
  })

  it("is the latest of the session deadline, the extensions and the House Rule 27 window", () => {
    expect(
      reportDeadline({ court: 194, history: [], filedByHouseMember: false })
    ).toBe("2025-12-03")
    expect(
      reportDeadline({
        court: 194,
        history: EXTENDED,
        filedByHouseMember: true,
        hearingDate: "2025-07-01"
      })
    ).toBe("2026-07-31")
    // A House member's bill heard late in the year: 90 days after the hearing.
    expect(
      reportDeadline({
        court: 194,
        history: [],
        filedByHouseMember: true,
        hearingDate: "2025-11-04"
      })
    ).toBe("2026-02-02")
    // Senate-filed: the hearing window doesn't apply.
    expect(
      reportDeadline({
        court: 194,
        history: [],
        filedByHouseMember: false,
        hearingDate: "2025-11-04"
      })
    ).toBe("2025-12-03")
    // Earlier sessions: House Rule 27 didn't exist.
    expect(
      reportDeadline({
        court: 193,
        history: [],
        filedByHouseMember: true,
        hearingDate: "2023-12-01"
      })
    ).toBe("2024-02-07")
  })

  it('keeps "yet" until a bill\'s own extended deadline', () => {
    const stands = whereItStands(EXTENDED, "H1351")
    const common = {
      court: 194,
      kind: "referredBill" as const,
      stands,
      history: EXTENDED,
      hasHearing: true,
      hearingDate: "2025-07-01",
      filedByHouseMember: true
    }
    // After the session deadline (2025-12-03) but before the extension.
    expect(
      absenceSentences({ ...common, now: new Date("2026-05-01T12:00:00Z") })
    ).toEqual({ committee: "noReportYet" })
    expect(
      absenceSentences({ ...common, now: new Date("2026-08-15T12:00:00Z") })
    ).toEqual({ committee: "noReportRecorded" })
    // The same bill without the extension orders, past its hearing + 90 days.
    const plain = whereItStands(EXTENDED.slice(0, 2), "H1351")
    expect(
      absenceSentences({
        ...common,
        stands: plain,
        history: EXTENDED.slice(0, 2),
        now: new Date("2026-05-01T12:00:00Z")
      })
    ).toEqual({ committee: "noReportRecorded" })
  })
})
