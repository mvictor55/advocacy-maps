import { BillHistory } from "components/db"
import { oneLineActionText, plainActionText } from "./actionText"
import { formatHistoryDate } from "./dates"
import { documentKind, isChamberCommittee } from "./documentKind"
import { draftOrigin } from "./newDraft"
import { countRollCallMentions } from "./rollCallMentions"
import { hrefFor, parseTab, queryForTab, routeParams } from "./useBillUrlState"

// History strings below are copied from the dev database.
const h = (Action: string, Branch = "House", Date: string | null = null) => ({
  Action,
  Branch,
  Date
})

describe("plainActionText", () => {
  it("strips the Legislature's markup and entities", () => {
    expect(
      plainActionText(
        'Hearing rescheduled to 11/25/2025 from 10:00 AM-04:00 PM in A-2 and Virtual<br> <span style="color: blue; font-style: italic;">Hearing updated to New End Time</span>'
      )
    ).toBe(
      "Hearing rescheduled to 11/25/2025 from 10:00 AM-04:00 PM in A-2 and Virtual\nHearing updated to New End Time"
    )
    expect(plainActionText("Referred to Ways &amp; Means")).toBe(
      "Referred to Ways & Means"
    )
  })

  it("joins wrapped lines for one-line display", () => {
    expect(
      oneLineActionText(
        "Committee of conference report accepted - 142 YEAS to 6\r\nNAYS (See YEA and NAY No. 223)"
      )
    ).toBe(
      "Committee of conference report accepted - 142 YEAS to 6 NAYS (See YEA and NAY No. 223)"
    )
  })
})

describe("formatHistoryDate", () => {
  it("reads the calendar date without a time zone shift", () => {
    expect(formatHistoryDate("2025-11-17T00:00:00")).toBe("Nov 17, 2025")
    expect(formatHistoryDate(null)).toBe("")
  })
})

describe("draftOrigin", () => {
  it("reads a committee new draft (H4746, 194th)", () => {
    const history: BillHistory = [
      h(
        "Reported from the committee on Advanced Information Technology, the Internet and Cybersecurity"
      ),
      h("New draft of H78, H80, H86, H96, H103 and H104"),
      h(
        "Bill reported favorably by committee and referred to the committee on House Ways and Means"
      )
    ]
    expect(draftOrigin(history)).toEqual({
      kind: "newDraft",
      billIds: ["H78", "H80", "H86", "H96", "H103", "H104"],
      action: "New draft of H78, H80, H86, H96, H103 and H104"
    })
  })

  it("reads a single-bill new draft and a substitute", () => {
    expect(draftOrigin([h("New draft of S1320", "Senate")])?.billIds).toEqual([
      "S1320"
    ])
    expect(draftOrigin([h("Substituted for H4291")])).toMatchObject({
      kind: "substitute",
      billIds: ["H4291"]
    })
  })

  it("is undefined for a bill that is not a draft", () => {
    expect(
      draftOrigin([
        h(
          "Referred to the committee on Consumer Protection and Professional Licensure",
          "House"
        ),
        h("Accompanied a new draft, see H4746")
      ])
    ).toBeUndefined()
  })
})

describe("countRollCallMentions", () => {
  it("counts House and Senate roll calls but not quorum calls", () => {
    expect(
      countRollCallMentions([
        h("Enacted - 151 YEAS to 0 NAYS (See YEA and NAY No. 270)"),
        h("Enacted -see Roll Call #207 (Yeas 39 to Nays 0)", "Senate"),
        h("Quorum Roll Call - 149 YEAS to 0 NAYS (See YEA and NAY No. 249)"),
        h("Quorum doubted"),
        h("Amendment #24 (Tarr) rejected (standing vote 5-10)", "Senate"),
        h("Passed to be engrossed")
      ])
    ).toBe(2)
  })
})

describe("documentKind", () => {
  const bill = (type: string, history: BillHistory) =>
    ({ content: { LegislationTypeName: type }, history } as any)

  it("tells chamber committees from joint ones", () => {
    expect(isChamberCommittee("House Ways and Means")).toBe(true)
    expect(isChamberCommittee("Senate Rules")).toBe(true)
    expect(isChamberCommittee("Bills in the Third Reading")).toBe(true)
    expect(
      isChamberCommittee("Consumer Protection and Professional Licensure")
    ).toBe(false)
  })

  it("classifies documents", () => {
    expect(
      documentKind(
        bill("Bill", [h("Referred to the committee on Public Health", "House")])
      )
    ).toBe("referredBill")
    expect(documentKind(bill("Resolve", []))).toBe("referredBill")
    expect(
      documentKind(
        bill("Bill", [
          h("Reported from the committee on House Ways and Means"),
          h("New draft of H4600")
        ])
      )
    ).toBe("committeeDocument")
    expect(
      documentKind(
        bill("Bill", [h("Referred to the committee on House Ways and Means")])
      )
    ).toBe("committeeDocument")
    expect(documentKind(bill("Order", [h("Adopted")]))).toBe("order")
    expect(documentKind(bill("Extension Order", []))).toBe("order")
    expect(documentKind(bill("Amendment", []))).toBe("other")
    expect(documentKind(bill("Governor's Message (Veto)", []))).toBe("other")
  })
})

describe("tab URL state", () => {
  it("defaults to Overview for a missing or unknown tab", () => {
    expect(parseTab(undefined)).toBe("overview")
    expect(parseTab("votes")).toBe("overview")
    expect(parseTab("history")).toBe("history")
    expect(parseTab(["text", "history"])).toBe("text")
  })

  it("builds the page's URL without its route parameters", () => {
    expect(routeParams("/bills/[court]/[billId]")).toEqual(["court", "billId"])
    const query = { court: "194", billId: "H4746", page: "2", tab: "history" }
    expect(
      hrefFor(
        "/bills/194/H4746?page=2&tab=history",
        "/bills/[court]/[billId]",
        query,
        "text"
      )
    ).toBe("/bills/194/H4746?page=2&tab=text")
    expect(
      hrefFor(
        "/bills/194/H4746?tab=history",
        "/bills/[court]/[billId]",
        query,
        "overview"
      )
    ).toBe("/bills/194/H4746?page=2")
  })

  it("keeps other parameters and drops tab for Overview", () => {
    const query = {
      court: "194",
      billId: "H4746",
      page: "2",
      billPageV2: "enabled"
    }
    expect(queryForTab(query, "history")).toEqual({ ...query, tab: "history" })
    expect(queryForTab({ ...query, tab: "history" }, "overview")).toEqual(query)
  })
})
