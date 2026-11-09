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

// Committee names come from the committee documents; none in tests.
jest.mock("components/db/common", () => ({
  ...jest.requireActual("components/db/common"),
  loadDoc: async () => undefined
}))

const mockTestimony: Testimony[] = []
jest.mock("./useBillHearings", () => {
  const actual = jest.requireActual("./useBillHearings")
  return {
    ...actual,
    useBillHearings: (ids: string[] | undefined, _court: number) => ({
      hearings: ids?.length
        ? [
            {
              eventId: 5452,
              court: 194,
              date: "2025-05-21T10:00:00.000-04:00",
              committeeName:
                "Joint Committee on Advanced Information Technology, the Internet and Cybersecurity",
              committeeCode: "J33",
              agenda: [
                { BillNumber: "H78", GeneralCourtNumber: 194 },
                { BillNumber: "H80", GeneralCourtNumber: 194 },
                { BillNumber: "H86", GeneralCourtNumber: 194 }
              ],
              hasVideo: true
            }
          ]
        : [],
      loading: false,
      error: undefined
    })
  }
})
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
    // The header leads with the plain-language status and keeps the
    // Legislature's latest action beside it.
    expect(
      screen.getByText("stands.status.supersededBy H.4746")
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Accompanied a new draft, see H4746/)
    ).toBeInTheDocument()
    // Where it stands: the frozen bill continues as H.4746.
    expect(screen.getByText("stands.title")).toBeInTheDocument()
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent(
      "stands.steps.inCommittee"
    )
    // The steps not reached fold into one line at phone width.
    expect(screen.getByText(/stands.remaining/)).toBeInTheDocument()

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

  it("lists the hearing with its date, committee and the bills heard with it", () => {
    renderPage(heard, "hearing")
    expect(screen.getByText("hearing.dateTime")).toBeInTheDocument()
    // The committee is linked in the header (current committee) and in the
    // hearing row.
    const committeeLinks = screen.getAllByRole("link", {
      name: /Joint Committee on Advanced/
    })
    expect(committeeLinks).toHaveLength(2)
    committeeLinks.forEach(a =>
      expect(a).toHaveAttribute(
        "href",
        "https://malegislature.gov/Committees/Detail/J33"
      )
    )
    expect(
      screen.getByRole("link", { name: "hearing.videoAndTranscript" })
    ).toHaveAttribute("href", "/hearing/5452")
    // Heard with: the other bills on the agenda, not this one.
    expect(screen.getByText(/hearing.heardWith:2/)).toBeInTheDocument()
    const hearingPanel = screen
      .getByRole("heading", { name: "billPage:hearing.title" })
      .closest("section")!
    expect(
      within(hearingPanel).getByRole("link", { name: "H.80" })
    ).toHaveAttribute("href", "/bills/194/H80")
    expect(
      within(hearingPanel).queryByRole("link", { name: "H.78" })
    ).toBeNull()
    // The header also says so, and links to the tab.
    expect(
      screen.getByRole("link", { name: "billPage:header.heardWith:2" })
    ).toHaveAttribute("href", "/bills/194/H78?tab=hearing")
  })

  it("falls back to the bill history for a session without hearing documents", () => {
    const older: Bill = {
      ...heard,
      id: "H10",
      court: 193,
      hearingIds: undefined,
      history: [
        {
          Date: "2023-02-16T00:00:00",
          Branch: "House",
          Action: "Referred to the committee on Education"
        },
        {
          Date: "2023-05-01T00:00:00",
          Branch: "Joint",
          Action:
            "Hearing scheduled for 05/08/2023 from 10:00 AM-01:00 PM in A-2"
        }
      ]
    }
    renderPage(older, "hearing")
    expect(screen.getByText("billPage:hearing.fromHistory")).toBeInTheDocument()
    expect(screen.getByText("hearing.scheduledFor")).toBeInTheDocument()
    expect(
      screen.queryByRole("link", { name: /videoAndTranscript/ })
    ).toBeNull()
    expect(screen.getByText("tiles.hearings:1")).toBeInTheDocument()
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

  it("lists the roll calls the history cites and opens the one in the URL", () => {
    const enacted: Bill = {
      ...heard,
      id: "H4240",
      content: {
        ...heard.content,
        BillNumber: "H4240",
        CommitteeRecommendations: [
          {
            Action: "Favorable",
            Committee: { CommitteeCode: "H34", GeneralCourtNumber: 194 },
            Votes: [
              {
                Question: "Committee Poll",
                Date: "2025-06-01T10:00:00",
                Vote: [
                  {
                    Favorable: [
                      { GeneralCourtNumber: 194, MemberCode: "AAA1" }
                    ],
                    ReserveRight: [
                      { GeneralCourtNumber: 194, MemberCode: "BBB1" }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      } as Bill["content"],
      hearingIds: undefined,
      history: [
        {
          Date: "2025-06-30T00:00:00",
          Branch: "House",
          Action: "Enacted - 139 YEAS to 6 NAYS (See YEA and NAY No. 62)"
        },
        {
          Date: "2025-06-30T00:00:00",
          Branch: "Senate",
          Action: "Enacted and laid before the Governor"
        },
        {
          Date: "2025-10-23T00:00:00",
          Branch: "Senate",
          Action:
            "Item 0330-0300 passed over veto -see Roll Call #75 (Yeas 35 to Nays 3)"
        },
        {
          Date: "2025-10-08T00:00:00",
          Branch: "House",
          Action:
            "Quorum Roll Call - 149 YEAS to 0 NAYS (See YEA and NAY No. 249)"
        }
      ]
    }
    routerState.asPath = "/bills/194/H4240?rc=senate-75"
    routerState.query = { court: "194", billId: "H4240", rc: "senate-75" }
    const store = mockStore({
      auth: { authenticated: false, user: null, claims: null },
      publish: { service: {}, showThankYou: false, bill: enacted }
    })
    render(
      <Provider store={store}>
        <BillPageV2 bill={enacted} />
      </Provider>
    )
    // A roll-call link opens History & votes.
    expect(screen.getByRole("link", { name: /tabs.history/ })).toHaveAttribute(
      "aria-current",
      "page"
    )
    // Two votes counted; the quorum call is listed but not counted.
    expect(screen.getByText("tiles.rollCalls:2")).toBeInTheDocument()
    expect(screen.getByText("votes.quorumCall")).toBeInTheDocument()
    const open = document.querySelector("details[open]")!
    expect(open).toHaveAttribute("id", "rc-senate-75")
    expect(open).toHaveTextContent("Item 0330-0300 passed over veto")
    expect(
      within(open as HTMLElement).getByRole("link", { name: /votes.pdf/ })
    ).toHaveAttribute(
      "href",
      "https://malegislature.gov/RollCall/194/SenateRollCall75.pdf"
    )
    // The committee's report, with members by their vote on the report.
    expect(screen.getByText(/votes.actions.favorable/)).toBeInTheDocument()
    expect(screen.getByText("votes.forReport:1")).toBeInTheDocument()
    expect(screen.getByText(/votes.reserved:1/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "AAA1" })).toHaveAttribute(
      "href",
      "https://malegislature.gov/Legislators/Profile/AAA1"
    )
  })

  it("says when a committee reported without a recorded vote", () => {
    const reported: Bill = {
      ...heard,
      content: {
        ...heard.content,
        CommitteeRecommendations: [
          {
            Action: "Accompanied",
            Committee: { CommitteeCode: "J29", GeneralCourtNumber: 194 },
            Votes: []
          }
        ]
      } as Bill["content"]
    }
    renderPage(reported, "history")
    expect(screen.getByText("votes.reportedNoVote")).toBeInTheDocument()
    expect(screen.getByText("votes.noRollCalls")).toBeInTheDocument()
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
