import { Meta, StoryObj } from "@storybook/react"
import { RollCall } from "components/bill/rollCalls"
import { RollCallMembersView } from "components/bill/v2/RollCallMembers"
import { MemberVote, summarizeVotes } from "components/bill/v2/useRollCallVotes"

// Invented members and districts.
const names = [
  "Alex Example",
  "Blake Sample",
  "Casey Placeholder",
  "Drew Specimen",
  "Emerson Mock",
  "Finley Dummy",
  "Gray Fictional",
  "Harper Invented"
]
const member = (i: number, response: MemberVote["response"]): MemberVote => ({
  memberCode: `EX${i}`,
  response,
  name: names[i % names.length],
  party: i % 3 === 0 ? "Republican" : "Democrat",
  district: `${i + 1}th Example`
})

const rollCall: RollCall = {
  id: "house-270",
  branch: "House",
  number: 270,
  yeas: 6,
  nays: 2,
  question: "Enacted",
  quorum: false,
  supplement: false,
  date: "2025-12-18T00:00:00",
  action: "Enacted - 6 YEAS to 2 NAYS (See YEA and NAY No. 270)",
  historyIndex: 0
}

const complete = [
  ...[0, 1, 2, 3, 4, 5].map(i => member(i, "Yea")),
  member(6, "Nay"),
  member(7, "Nay")
]

const meta: Meta<typeof RollCallMembersView> = {
  title: "Organisms/Bill Detail/Bill Page v2/Roll call members",
  component: RollCallMembersView,
  decorators: [
    Story => (
      <div style={{ maxWidth: 720, background: "white", padding: 16 }}>
        <Story />
      </div>
    )
  ]
}
export default meta

type Story = StoryObj<typeof RollCallMembersView>

export const Complete: Story = {
  args: { rollCall, votes: summarizeVotes(complete, rollCall) }
}

export const IncompleteBackfill: Story = {
  args: { rollCall, votes: summarizeVotes(complete.slice(0, 5), rollCall) }
}

export const QuorumCall: Story = {
  args: {
    rollCall: { ...rollCall, quorum: true, yeas: 6, nays: 0, question: "Quorum Roll Call" },
    votes: summarizeVotes(
      [...complete.slice(0, 6), member(6, "Not Voting"), member(7, "Not Voting")],
      { yeas: 6, nays: 0 }
    )
  }
}
