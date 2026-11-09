import "@testing-library/jest-dom"
import { fireEvent, render, screen } from "@testing-library/react"
import { Testimony } from "components/db"
import { Timestamp } from "firebase/firestore"
import { QueryClient, QueryClientProvider } from "react-query"
import { BillTestimonyCard, CLAMP_CHARS } from "./BillTestimonyCard"

jest.mock("next-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key
  })
}))

jest.mock("components/TestimonyCard/UserInfoHeader", () => ({
  UserInfoHeader: ({ testimony }: { testimony: Testimony }) => (
    <div>{testimony.fullName}</div>
  )
}))

jest.mock("components/testimony/TestimonyContent", () => ({
  TestimonyContent: ({ testimony }: { testimony: string }) => (
    <div>{testimony}</div>
  )
}))

const testimony = {
  id: "pub1",
  billId: "H78",
  court: 194,
  authorUid: "u1",
  authorDisplayName: "Pat Example",
  fullName: "Pat Example",
  authorRole: "user",
  position: "endorse",
  content: "x".repeat(CLAMP_CHARS + 1),
  publishedAt: Timestamp.fromMillis(1700000000000),
  version: 1
} as unknown as Testimony

function renderCard(
  props: Partial<Parameters<typeof BillTestimonyCard>[0]> = {}
) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <BillTestimonyCard testimony={testimony} isOwn={false} {...props} />
    </QueryClientProvider>
  )
}

describe("BillTestimonyCard", () => {
  it("names the author in the Read more button and toggles it", () => {
    renderCard()
    const more = screen.getByRole("button", {
      name: 'billPage:card.readMoreOf {"name":"Pat Example"}'
    })
    expect(more).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(more)
    expect(
      screen.getByRole("button", {
        name: 'billPage:card.showLessOf {"name":"Pat Example"}'
      })
    ).toHaveAttribute("aria-expanded", "true")
  })

  it("links to the testimony's page and copies that link", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    renderCard()
    expect(
      screen.getByRole("link", { name: "billPage:card.moreDetails" })
    ).toHaveAttribute("href", "/testimony/pub1")
    fireEvent.click(
      screen.getByRole("button", { name: 'card.linkTo {"name":"Pat Example"}' })
    )
    expect(writeText).toHaveBeenCalledWith(
      expect.stringMatching(/\/testimony\/pub1$/)
    )
    expect(await screen.findByText("card.copied")).toBeInTheDocument()
  })

  it("shows how many testimonies share the text, and an edit link for the reader's own", () => {
    renderCard({ shared: 312, isOwn: true })
    expect(
      screen.getByText('billPage:card.shared {"count":312}')
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "billPage:card.edit" })
    ).toHaveAttribute(
      "href",
      "/submit-testimony?billId=H78&court=194&step=position"
    )
  })
})
