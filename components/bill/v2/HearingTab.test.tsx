import "@testing-library/jest-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import { Bill } from "components/db"
import { HearingDocumentList } from "./HearingTab"
import { ownSessionHearings } from "./useBillHearings"

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
  it("keeps only hearings from the bill's own session", () => {
    const hearing = (eventId: number, court: number | null) => ({
      eventId,
      court,
      date: null,
      committeeName: null,
      committeeCode: null,
      agenda: [],
      hasVideo: false
    })
    expect(
      ownSessionHearings(
        [hearing(4626, 193), hearing(5452, 194), hearing(1, null)],
        194
      ).map(h => h.eventId)
    ).toEqual([5452, 1])
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
