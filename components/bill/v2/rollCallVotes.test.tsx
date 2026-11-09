import "@testing-library/jest-dom"
import { render, screen } from "@testing-library/react"
import { RollCall } from "components/bill/rollCalls"
import { RollCallMembers, RollCallMembersView } from "./RollCallMembers"
import {
  MemberVote,
  rollCallDocId,
  RollCallVotesState,
  summarizeVotes
} from "./useRollCallVotes"

jest.mock("next-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key
  })
}))

let mockState: RollCallVotesState = { status: "unavailable" }
jest.mock("./useRollCallVotes", () => ({
  ...jest.requireActual("./useRollCallVotes"),
  useRollCallVotes: () => mockState
}))

// Invented members.
const member = (
  memberCode: string,
  response: MemberVote["response"],
  name?: string
): MemberVote => ({
  memberCode,
  response,
  name,
  party: name ? "Example Party" : undefined,
  district: name ? "1st Example" : undefined
})

const rollCall: RollCall = {
  id: "house-270",
  branch: "House",
  number: 270,
  yeas: 3,
  nays: 1,
  question: "Enacted",
  quorum: false,
  supplement: false,
  date: "2025-12-18T00:00:00",
  action: "Enacted - 3 YEAS to 1 NAYS (See YEA and NAY No. 270)",
  historyIndex: 0
}

describe("summarizeVotes", () => {
  it("groups by response, sorts by name and checks the tally", () => {
    const votes = summarizeVotes(
      [
        member("B1", "Yea", "Blake Example"),
        member("A1", "Yea", "Alex Example"),
        member("C1", "Nay", "Casey Example"),
        member("D1", "Yea"),
        member("E1", "Not Voting", "Drew Example")
      ],
      rollCall
    )
    expect(votes.byResponse.Yea.map(m => m.name ?? m.memberCode)).toEqual([
      "Alex Example",
      "Blake Example",
      "D1"
    ])
    expect(votes.byResponse.Nay).toHaveLength(1)
    expect(votes.byResponse["Not Voting"]).toHaveLength(1)
    expect(votes.byResponse.Present).toHaveLength(0)
    expect(votes.complete).toBe(true)
  })

  it("marks a truncated list as incomplete (house-194-270 has 144 of 151 yeas in dev)", () => {
    const members = Array.from({ length: 144 }, (_, i) =>
      member(`M${i}`, "Yea")
    )
    const votes = summarizeVotes(members, { yeas: 151, nays: 0 })
    expect(votes.complete).toBe(false)
    expect(votes.counted).toEqual({ yeas: 144, nays: 0 })
  })

  it("names the document the scrapers write", () => {
    expect(rollCallDocId(194, rollCall)).toBe("house-194-270")
    expect(
      rollCallDocId(194, { ...rollCall, branch: "Senate", number: 75 })
    ).toBe("senate-194-75")
  })
})

describe("RollCallMembers", () => {
  it("shows nothing when the votes can't be read", () => {
    mockState = { status: "unavailable" }
    const { container } = render(
      <RollCallMembers court={194} billId="H100" rollCall={rollCall} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("lists members by response, and says when the list is short", () => {
    const votes = summarizeVotes(
      [
        member("A1", "Yea", "Alex Example"),
        member("C1", "Nay", "Casey Example")
      ],
      rollCall
    )
    mockState = { status: "ready", votes }
    render(<RollCallMembers court={194} billId="H100" rollCall={rollCall} />)
    expect(
      screen.getByText('votes.members.Yea {"count":1}')
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Alex Example" })).toHaveAttribute(
      "href",
      "https://malegislature.gov/Legislators/Profile/A1"
    )
    expect(screen.getAllByText("(Example Party, 1st Example)")).toHaveLength(2)
    expect(
      screen.getByText(
        'votes.members.incomplete {"yeas":1,"tallyYeas":3,"nays":1,"tallyNays":1}'
      )
    ).toBeInTheDocument()
  })

  it("explains Yea on a quorum call", () => {
    const quorum = { ...rollCall, quorum: true, yeas: 1, nays: 0 }
    render(
      <RollCallMembersView
        rollCall={quorum}
        votes={summarizeVotes([member("A1", "Yea", "Alex Example")], quorum)}
      />
    )
    expect(screen.getByText("votes.members.quorum")).toBeInTheDocument()
    expect(screen.queryByText(/incomplete/)).toBeNull()
  })
})
