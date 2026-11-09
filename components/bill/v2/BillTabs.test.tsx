import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
import { BillTabs } from "./BillTabs"
import { StanceBar } from "./StanceBar"

const routerState = {
  pathname: "/bills/[court]/[billId]",
  asPath: "/bills/194/H4746",
  query: { court: "194", billId: "H4746" } as Record<string, string>,
  push: jest.fn()
}

jest.mock("next/router", () => ({
  useRouter: () => routerState
}))

jest.mock("next-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key
  })
}))

describe("BillTabs", () => {
  it("marks the open tab and links the others with the tab in the URL", () => {
    routerState.query = {
      court: "194",
      billId: "H4746",
      tab: "history",
      page: "2"
    }
    render(
      <BillTabs
        tabs={[
          { key: "overview" },
          { key: "testimony", count: 3 },
          { key: "history", count: 2 }
        ]}
      />
    )
    const nav = screen.getByRole("navigation", { name: "tabs.ariaLabel" })
    expect(nav).toBeInTheDocument()
    const history = screen.getByRole("link", { name: /tabs.history/ })
    expect(history).toHaveAttribute("aria-current", "page")
    const overview = screen.getByRole("link", { name: "tabs.overview" })
    expect(overview).not.toHaveAttribute("aria-current")
    // Overview is the page without a tab parameter; other parameters stay.
    expect(overview).toHaveAttribute("href", "/bills/194/H4746?page=2")
    expect(
      screen.getByRole("link", { name: /tabs.testimony/ })
    ).toHaveAttribute("href", "/bills/194/H4746?page=2&tab=testimony")
    expect(screen.getByText("3")).toBeInTheDocument()
  })
})

describe("StanceBar", () => {
  it("is an image with every count in its label", () => {
    render(<StanceBar counts={{ endorse: 5, neutral: 1, oppose: 2 }} />)
    const bar = screen.getByRole("img")
    expect(bar).toHaveAttribute(
      "aria-label",
      'stance.label {"endorse":5,"neutral":1,"oppose":2}'
    )
    expect(bar.querySelectorAll("span")).toHaveLength(3)
  })

  it("draws no segments when there is no testimony", () => {
    render(<StanceBar counts={{ endorse: 0, neutral: 0, oppose: 0 }} />)
    expect(screen.getByRole("img").querySelectorAll("span")).toHaveLength(0)
  })
})
