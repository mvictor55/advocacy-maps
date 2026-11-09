import "@testing-library/jest-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import { Bill } from "components/db"
import { HearingDocumentList } from "./HearingTab"

jest.mock("components/featureFlags", () => ({
  useFlags: () => ({ hearingsAndTranscriptions: true })
}))

jest.mock("next-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key
  })
}))

const bill = {
  id: "H78",
  court: 194,
  content: { LegislationTypeName: "Bill", Title: "An Act" },
  history: []
} as unknown as Bill

describe("HearingDocumentList", () => {
  it("says when a hearing belongs to another session, and lists no heard-with bills for it", () => {
    render(
      <HearingDocumentList
        bill={bill}
        hearings={[
          {
            eventId: 4626,
            court: 193,
            date: "2023-07-13T13:00:00.000-04:00",
            committeeName: "Joint Committee on Advanced Information Technology",
            committeeCode: "J33",
            agenda: [
              { BillNumber: "H78", GeneralCourtNumber: 193 },
              { BillNumber: "H59", GeneralCourtNumber: 193 }
            ],
            hasVideo: true
          }
        ]}
      />
    )
    expect(
      screen.getByText(
        'hearing.otherSession {"courtOrdinal":"193rd","bill":"H.78"}'
      )
    ).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "H.59" })).toBeNull()
    expect(
      screen.getByText(
        'hearing.dateTime {"date":"Jul 13, 2023","time":"1:00 PM"}'
      )
    ).toBeInTheDocument()
  })

  it("shows ten heard-with bills, then the rest on request", () => {
    const agenda = Array.from({ length: 14 }, (_, i) => ({
      BillNumber: `H${100 + i}`,
      GeneralCourtNumber: 194
    }))
    render(
      <HearingDocumentList
        bill={bill}
        hearings={[
          {
            eventId: 5452,
            court: 194,
            date: "2025-05-21T10:00:00.000-04:00",
            committeeName: null,
            committeeCode: null,
            agenda: [{ BillNumber: "H78", GeneralCourtNumber: 194 }, ...agenda],
            hasVideo: false
          }
        ]}
      />
    )
    expect(screen.getAllByRole("link", { name: /^H\.1\d\d$/ })).toHaveLength(10)
    fireEvent.click(
      screen.getByRole("button", { name: 'hearing.andMore {"count":4}' })
    )
    expect(screen.getAllByRole("link", { name: /^H\.1\d\d$/ })).toHaveLength(14)
    expect(
      screen.getByRole("link", { name: "hearing.hearingPage" })
    ).toHaveAttribute("href", "/hearing/5452")
  })
})
