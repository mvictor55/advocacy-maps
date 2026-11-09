import "@testing-library/jest-dom"
import { render, screen, within } from "@testing-library/react"
import { Bill, Testimony } from "components/db"
import { Timestamp } from "firebase/firestore"
import { Provider } from "react-redux"
import configureStore from "redux-mock-store"
import { thunk } from "redux-thunk"
import { BillPageV2 } from "./BillPageV2"

const routerState = {
  pathname: "/bills/[court]/[billId]",
  asPath: "/bills/194/H4746",
  query: { court: "194", billId: "H4746" } as Record<string, string>,
  push: jest.fn()
}

jest.mock("next/router", () => ({
  useRouter: () => routerState
}))

jest.mock("components/featureFlags", () => ({
  useFlags: () => ({
    notifications: true,
    billTracker: false,
    lobbyingTable: false,
    hearingsAndTranscriptions: true,
    billPageV2: true,
    billVotes: false
  })
}))

const mockTestimony: Testimony[] = []
jest.mock("./useAllBillTestimony", () => ({
  MAX_TESTIMONY: 1000,
  useAllBillTestimony: (court: number, billId: string, enabled: boolean) => ({
    testimony: enabled ? mockTestimony : undefined,
    loading: false,
    error: undefined
  })
}))

jest.mock("./BillTestimonyCard", () => ({
  BillTestimonyCard: ({
    testimony,
    shared
  }: {
    testimony: Testimony
    shared?: number
  }) => (
    <article data-testid="card">
      {testimony.fullName}
      {shared && shared > 1 ? ` shared:${shared}` : ""}
    </article>
  )
}))

jest.mock("next-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && "count" in opts ? `${key}:${opts.count}` : key
  })
}))

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
})

// H4746 of the 194th as stored in the dev database: a committee new draft
// with no hearing or testimony of its own.
const newDraft: Bill = {
  id: "H4746",
  court: 194,
  content: {
    BillNumber: "H4746",
    DocketNumber: "",
    Title: "An Act establishing the Massachusetts consumer data privacy act",
    LegislationTypeName: "Bill",
    Pinslip: "",
    PrimarySponsor: {
      Id: "J33",
      Name: "Joint Committee on Advanced Information Technology, the Internet and Cybersecurity",
      Type: 2
    },
    Cosponsors: [],
    GeneralCourtNumber: 194,
    DocumentText: "SECTION 1. Chapter 93 of the General Laws is hereby amended"
  },
  cosponsorCount: 0,
  testimonyCount: 0,
  endorseCount: 0,
  opposeCount: 0,
  neutralCount: 0,
  fetchedAt: new Timestamp(1763400000, 0),
  history: [
    {
      Date: "2025-11-17T00:00:00",
      Branch: "House",
      Action:
        "Reported from the committee on Advanced Information Technology, the Internet and Cybersecurity"
    },
    {
      Date: "2025-11-17T00:00:00",
      Branch: "House",
      Action: "New draft of H78, H80, H86, H96, H103 and H104"
    },
    {
      Date: "2025-11-17T00:00:00",
      Branch: "House",
      Action:
        "Bill reported favorably by committee and referred to the committee on House Ways and Means"
    }
  ],
  currentCommittee: { id: "H33", name: "House Committee on Ways and Means" }
}

const heard: Bill = {
  ...newDraft,
  id: "H78",
  content: {
    ...newDraft.content,
    BillNumber: "H78",
    Title: "An Act relative to consumer data privacy",
    PrimarySponsor: { Id: "TFB1", Name: "Tricia Farley-Bouvier", Type: 1 },
    Cosponsors: [
      { Id: "TFB1", Name: "Tricia Farley-Bouvier", Type: 1 },
      { Id: "HLB1", Name: "Hannah Bowen", Type: 1 },
      { Id: "JCD1", Name: "James C. Arena-DeRosa", Type: 1 }
    ]
  },
  cosponsorCount: 3,
  testimonyCount: 4,
  endorseCount: 3,
  opposeCount: 1,
  hearingIds: ["hearing-5452"],
  history: [
    {
      Date: "2025-02-27T00:00:00",
      Branch: "House",
      Action:
        "Referred to the committee on Advanced Information Technology, the Internet and Cybersecurity"
    },
    {
      Date: "2025-05-14T00:00:00",
      Branch: "Joint",
      Action: "Hearing scheduled for 05/21/2025 from 10:00 AM-02:00 PM in A-2"
    },
    {
      Date: "2025-11-17T00:00:00",
      Branch: "House",
      Action: "Accompanied a new draft, see H4746"
    }
  ],
  currentCommittee: {
    id: "J33",
    name: "Joint Committee on Advanced Information Technology, the Internet and Cybersecurity"
  }
}

const mockStore = configureStore([thunk])

function renderPage(bill: Bill, tab?: string) {
  routerState.asPath = `/bills/194/${bill.id}${tab ? `?tab=${tab}` : ""}`
  routerState.query = tab
    ? { court: "194", billId: bill.id, tab }
    : { court: "194", billId: bill.id }
  const store = mockStore({
    auth: { authenticated: false, user: null, claims: null },
    publish: { service: {}, showThankYou: false, bill }
  })
  return render(
    <Provider store={store}>
      <BillPageV2 bill={bill} />
    </Provider>
  )
}

describe("BillPageV2", () => {
  it("shows the header, tiles and tabs for a heard bill", () => {
    renderPage(heard)
    expect(
      screen.getByRole("heading", { level: 1, name: heard.content.Title })
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "H.78" })).toHaveAttribute(
      "href",
      "https://malegislature.gov/Bills/194/H78"
    )
    expect(screen.getByText("Tricia Farley-Bouvier")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "billPage:header.cosponsors:2" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Accompanied a new draft, see H4746")
    ).toBeInTheDocument()

    const nav = screen.getByRole("navigation", { name: "tabs.ariaLabel" })
    const tabs = within(nav).getAllByRole("link")
    expect(tabs.map(a => a.textContent)).toEqual([
      "tabs.overview",
      "tabs.testimony4",
      "tabs.hearing1",
      "tabs.history0",
      "tabs.text"
    ])
    expect(tabs[0]).toHaveAttribute("aria-current", "page")

    // Overview: the stance bar with the bill document's counts.
    expect(screen.getAllByRole("img", { name: "stance.label" })).toHaveLength(2)
    expect(screen.getByText("tiles.testimony:4")).toBeInTheDocument()
  })

  it("explains a new draft instead of claiming no hearing", () => {
    renderPage(newDraft, "hearing")
    expect(screen.getByText(/billPage:header.newDraftOf/)).toBeInTheDocument()
    expect(screen.getByText(/hearing.newDraft.before/)).toBeInTheDocument()
    expect(screen.queryByText("billPage:hearing.noneRecorded")).toBeNull()
    // The header links every bill; the hearing note links the first two and
    // counts the rest.
    const hearingPanel = screen
      .getByRole("heading", { name: "billPage:hearing.title" })
      .closest("section")!
    expect(screen.getAllByRole("link", { name: "H.103" })).toHaveLength(1)
    expect(
      within(hearingPanel).getByRole("link", { name: "H.78" })
    ).toHaveAttribute("href", "/bills/194/H78")
    expect(
      within(hearingPanel).queryByRole("link", { name: "H.103" })
    ).toBeNull()
    expect(
      within(hearingPanel).getByText(/common:bill.and_others:4/)
    ).toBeInTheDocument()
  })

  it("names the document type instead of claiming an order had no hearing", () => {
    const order: Bill = {
      ...newDraft,
      id: "H2025",
      content: {
        ...newDraft.content,
        BillNumber: "H2025",
        LegislationTypeName: "Order",
        Title:
          "Order relative to the adoption of permanent Rules of the House of Representatives"
      },
      history: [
        {
          Date: "2025-02-25T00:00:00",
          Branch: "House",
          Action: "Order adopted - 128 YEAS to 23 NAYS (See YEA and NAY No. 24)"
        }
      ]
    }
    renderPage(order, "hearing")
    expect(screen.getByText("hearing.otherType")).toBeInTheDocument()
    expect(screen.queryByText("billPage:hearing.noneRecorded")).toBeNull()
    expect(screen.getByText("tiles.rollCalls:1")).toBeInTheDocument()
  })

  const letter = (
    id: string,
    authorUid: string,
    position: Testimony["position"],
    content: string,
    millis: number
  ) =>
    ({
      id,
      billId: "H78",
      court: 194,
      authorUid,
      authorDisplayName: authorUid,
      fullName: authorUid,
      authorRole: "user",
      position,
      content,
      publishedAt: Timestamp.fromMillis(millis),
      version: 1
    } as unknown as Testimony)

  const form =
    "Dear committee, I support this bill because consumer data privacy is overdue and residents deserve to know what is collected, to correct it and to delete it. Please report it favorably so the House can vote this session. Thank you for your service."

  it("filters the Testimony tab from the URL and says what is showing", () => {
    mockTestimony.splice(
      0,
      mockTestimony.length,
      letter("a", "Alex", "endorse", form, 3000),
      letter("b", "Blake", "oppose", "No.", 2000),
      letter("c", "Casey", "oppose", "Also no.", 1000)
    )
    routerState.asPath = "/bills/194/H78?position=oppose"
    routerState.query = { court: "194", billId: "H78", position: "oppose" }
    const store = mockStore({
      auth: { authenticated: false, user: null, claims: null },
      publish: { service: {}, showThankYou: false, bill: heard }
    })
    render(
      <Provider store={store}>
        <BillPageV2 bill={heard} />
      </Provider>
    )
    // A filter link opens the Testimony tab.
    expect(
      screen.getByRole("link", { name: /tabs.testimony/ })
    ).toHaveAttribute("aria-current", "page")
    const banner = screen.getByRole("status")
    expect(banner).toHaveTextContent("billPage:stance.oppose")
    expect(banner).toHaveTextContent("billPage:testimony.showingCount:2")
    expect(screen.getAllByTestId("card").map(c => c.textContent)).toEqual([
      "Blake",
      "Casey"
    ])
  })

  it("shows a few letters on the Overview, form letters once", () => {
    mockTestimony.splice(
      0,
      mockTestimony.length,
      letter("a", "Alex", "endorse", form, 5000),
      letter(
        "b",
        "Blake",
        "endorse",
        form.replace("Thank you", "Thanks"),
        4000
      ),
      letter("c", "Casey", "oppose", "No.", 3000),
      letter("d", "Alex", "endorse", "An earlier letter.", 2000),
      letter("e", "Drew", "neutral", "Questions remain.", 1000)
    )
    renderPage(heard)
    expect(screen.getAllByTestId("card").map(c => c.textContent)).toEqual([
      "Alex shared:2",
      "Casey",
      "Drew"
    ])
    expect(screen.getAllByText("billPage:overview.seeAll:4")).toHaveLength(1)
  })

  it("opens the tab named in the URL", () => {
    renderPage(heard, "text")
    expect(screen.getByRole("link", { name: "tabs.text" })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(screen.getByText(heard.content.DocumentText!)).toBeInTheDocument()
    expect(screen.getByText("text.noSummary")).toBeInTheDocument()
  })
})
