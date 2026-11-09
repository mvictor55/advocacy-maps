import {
  hearingDatesFromHistory,
  hearingsFromHistory,
  parseHearingLine
} from "./hearingHistory"
import { formatHearingDate, formatHearingTime } from "./dates"

// Lines copied from the dev database's bill histories.
describe("parseHearingLine", () => {
  it("reads the common notice", () => {
    expect(
      parseHearingLine(
        "Hearing scheduled for 11/04/2025 from 01:00 PM-05:00 PM in A-1",
        0
      )
    ).toMatchObject({
      kind: "scheduled",
      date: "2025-11-04",
      start: "01:00 PM",
      end: "05:00 PM",
      location: "A-1",
      committee: undefined
    })
  })

  it("reads reschedules, including the appended update note and markup", () => {
    expect(
      parseHearingLine(
        'Hearing rescheduled to 11/25/2025 from 10:00 AM-04:00 PM in A-2 and Virtual<br> <span style="color: blue; font-style: italic;">Hearing updated to New End Time</span>',
        3
      )
    ).toMatchObject({
      kind: "rescheduled",
      date: "2025-11-25",
      start: "10:00 AM",
      end: "04:00 PM",
      location: "A-2 and Virtual",
      historyIndex: 3
    })
  })

  it("reads the rarer forms", () => {
    expect(
      parseHearingLine(
        "Location Changed - Hearing scheduled for 10/17/2023 from 10:00 AM-01:00 PM in A-2 and virtual",
        0
      )
    ).toMatchObject({
      kind: "scheduled",
      date: "2023-10-17",
      location: "A-2 and virtual"
    })
    expect(
      parseHearingLine(
        "Hearing scheduled (Joint Committee on Public Service) for 09/22/2025 from 01:00 PM-05:00 PM in A-2",
        0
      )
    ).toMatchObject({
      kind: "scheduled",
      date: "2025-09-22",
      committee: "Joint Committee on Public Service"
    })
    expect(
      parseHearingLine(
        "Hearing before Municipalities and Regional Government scheduled for 02/27/2024 from 11:00 AM-02:00 PM in A-1",
        0
      )
    ).toMatchObject({
      kind: "scheduled",
      date: "2024-02-27",
      committee: "Municipalities and Regional Government"
    })
    expect(
      parseHearingLine(
        "Hearing scheduled for 03/03/2026 from 11:00 AM- 1:30 PM in A-1",
        0
      )
    ).toMatchObject({ date: "2026-03-03", start: "11:00 AM", end: "1:30 PM" })
    expect(
      parseHearingLine(
        "Hearing scheduled for 12/11/2025 from 04:00 PM until 12/29/25 at 5:00 PM in Written Testimony Only",
        0
      )
    ).toMatchObject({ kind: "scheduled", date: "2025-12-11" })
    expect(
      parseHearingLine("Hearing canceled – new hearing TBD", 0)
    ).toMatchObject({
      kind: "canceled"
    })
  })

  it("leaves other lines alone", () => {
    expect(
      parseHearingLine("Referred to the committee on Public Health", 0)
    ).toBeUndefined()
    expect(
      parseHearingLine("Bill reported favorably by committee", 0)
    ).toBeUndefined()
  })
})

describe("hearingDatesFromHistory", () => {
  const h = (Action: string) => ({ Action, Branch: "Joint", Date: null })

  it("keeps the dates still standing after reschedules and cancellations", () => {
    expect(
      hearingDatesFromHistory([
        h("Referred to the committee on Education"),
        h("Hearing scheduled for 05/21/2025 from 10:00 AM-02:00 PM in A-2"),
        h("Hearing rescheduled to 06/03/2025 from 10:00 AM-02:00 PM in A-2"),
        h("Hearing scheduled for 09/09/2025 from 01:00 PM-05:00 PM in B-1"),
        h("Hearing canceled – new hearing TBD")
      ])
    ).toEqual(["2025-06-03"])
    expect(
      hearingsFromHistory([
        h("Hearing scheduled for 05/21/2025 from 10:00 AM-02:00 PM in A-2")
      ])
    ).toHaveLength(1)
  })
})

describe("hearing dates in Massachusetts time", () => {
  it("does not shift a UTC midnight date to the day before", () => {
    // Stored as the next day's 00:00 UTC, which is 8 PM the evening before
    // in New York; the record means the New York date it was given with.
    expect(formatHearingDate("2023-07-13T13:00:00-04:00")).toBe("Jul 13, 2023")
    expect(formatHearingTime("2023-07-13T13:00:00-04:00")).toBe("1:00 PM")
    expect(formatHearingDate("2025-11-04T18:00:00Z")).toBe("Nov 4, 2025")
    expect(formatHearingTime("2025-11-04T05:00:00Z")).toBe("")
    expect(formatHearingDate(null)).toBe("")
  })
})
