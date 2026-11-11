import "@testing-library/jest-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import { FinanceSection } from "./FinanceSection"
import { ProfileHeader } from "./ProfileHeader"
import { SectionNav } from "./SectionNav"

jest.mock("next/router", () => ({
  useRouter: () => ({ query: {}, asPath: "/", pathname: "/" })
}))

jest.mock("next-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key
  })
}))

jest.mock("components/auth", () => ({ useAuth: () => ({ user: undefined }) }))
jest.mock("components/shared/FollowButton", () => ({
  FollowUserButton: () => <button>follow</button>
}))
jest.mock("components/links", () => ({
  Internal: ({ href, children }: any) => <a href={href}>{children}</a>,
  External: ({ href, children }: any) => <a href={href}>{children}</a>,
  maple: { bill: () => "/bill", hearing: () => "/hearing", home: () => "/" }
}))

const member = {
  Name: "Jane Doe",
  GeneralCourtNumber: 194,
  LeadershipPosition: null,
  Branch: "House",
  MemberCode: "J_D1",
  District: "9th Hampden",
  Party: "Democrat",
  EmailAddress: "jane.doe@mahouse.gov",
  RoomNumber: "473",
  PhoneNumber: "6175550142",
  FaxNumber: null,
  Committees: [],
  SponsoredBills: [],
  CoSponsoredBills: []
} as any

const counts = { lead: 23, cosponsored: 87, committees: 4 }

describe("ProfileHeader", () => {
  it("marks an unclaimed page and explains how to claim it", () => {
    render(
      <ProfileHeader
        member={member}
        court={194}
        claim={null}
        committees={[
          {
            code: "J14",
            name: "Joint Committee on Education",
            role: "houseChair"
          }
        ]}
        counts={counts}
      />
    )
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Jane Doe"
    )
    expect(screen.getByText("v2.header.unclaimed")).toBeInTheDocument()
    expect(
      screen.getByText(/v2.committees.role.houseChair/)
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "v2.claim.open" }))
    const send = screen.getByRole("link", { name: "v2.claim.send" })
    expect(send.getAttribute("href")).toMatch(/^mailto:info@mapletestimony.org/)
    expect(screen.getByText("23")).toBeInTheDocument()
  })

  it("marks a claimed page and offers no claim link", () => {
    render(
      <ProfileHeader
        member={member}
        court={194}
        claim={{ uid: "u1", profile: {} as any }}
        committees={[]}
        counts={counts}
      />
    )
    expect(screen.getByText(/v2.header.claimed/)).toBeInTheDocument()
    expect(screen.queryByText("v2.claim.open")).not.toBeInTheDocument()
  })
})

describe("SectionNav", () => {
  it("links each section and grays out a locked one", () => {
    render(
      <SectionNav
        active="bills"
        hrefFor={s => `/legislators/194/J_D1?tab=${s}`}
        items={[
          { key: "overview" },
          { key: "bills", count: 110 },
          { key: "testimony", locked: true }
        ]}
      />
    )
    expect(screen.getByRole("link", { name: /v2.nav.bills/ })).toHaveAttribute(
      "aria-current",
      "page"
    )
    expect(screen.queryByRole("link", { name: /v2.nav.testimony/ })).toBeNull()
    expect(screen.getByText("v2.nav.testimony").parentElement).toHaveAttribute(
      "aria-disabled",
      "true"
    )
  })
})

describe("FinanceSection", () => {
  const entry = (amount: number) => ({ count: 1, amount })
  const breakdown = {
    individual: entry(1000),
    committee: entry(500),
    union: entry(0),
    unitemized: { amount: 100 },
    smallDonors: { itemized: entry(200) },
    processingFees: entry(0)
  }

  it("switches between reporting periods", () => {
    render(
      <FinanceSection
        loading={false}
        finance={
          {
            ocpfCpfId: 7,
            totalRaised: 5000,
            totalSpent: 2000,
            cashOnHand: 3000,
            uniqueContributorsCount: 12,
            breakdown,
            candidateFunds: { loans: entry(0), contributions: entry(0) },
            inKind: {
              individual: entry(0),
              committee: entry(0),
              union: entry(0),
              unitemized: { amount: 0 }
            },
            years: {
              "2025": {
                totalRaised: 1600,
                totalSpent: 400,
                breakdown,
                finalized: false
              }
            }
          } as any
        }
      />
    )
    expect(screen.getByText("$1,600")).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole("button", { name: "v2.finance.allPeriods" })
    )
    expect(screen.getByText("$5,000")).toBeInTheDocument()
    expect(screen.getByText("$3,000")).toBeInTheDocument()
  })

  it("says when there is no data", () => {
    render(<FinanceSection loading={false} finance={undefined} />)
    expect(screen.getByText("finance.noData")).toBeInTheDocument()
  })
})
