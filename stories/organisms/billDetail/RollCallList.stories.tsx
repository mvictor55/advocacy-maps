import { Meta, StoryObj } from "@storybook/react"
import { rollCallsFromHistory } from "components/bill/rollCalls"
import { RollCallList } from "components/bill/v2/RollCallList"

// Lines copied from the dev database (H.4240, 194th).
const history = [
  {
    Date: "2025-06-30T00:00:00",
    Branch: "House",
    Action:
      "Committee of conference report accepted - 139 YEAS to 6 NAYS (See YEA and NAY No. 61)"
  },
  {
    Date: "2025-06-30T00:00:00",
    Branch: "Senate",
    Action:
      "Committee of conference report accepted, in concurrence -see Roll Call #58 (Yeas 38 to Nays 2)"
  },
  {
    Date: "2025-06-30T00:00:00",
    Branch: "House",
    Action: "Enacted - 139 YEAS to 6 NAYS (See YEA and NAY No. 62)"
  },
  {
    Date: "2025-10-08T00:00:00",
    Branch: "House",
    Action:
      "Item 0330-0300 passed over veto - 132 YEAS to 23 NAYS (See YEA and NAY No. 74)"
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
    Action: "Quorum Roll Call - 149 YEAS to 0 NAYS (See YEA and NAY No. 249)"
  },
  {
    Date: "2025-07-24T00:00:00",
    Branch: "Senate",
    Action: "Passed to be engrossed -- see Roll Call #65 (Yeas 39 to Yeas 0)"
  }
]

const { rollCalls, unreadable } = rollCallsFromHistory(history)

const meta: Meta<typeof RollCallList> = {
  title: "Organisms/Bill Detail/Bill Page v2/Roll calls",
  component: RollCallList,
  decorators: [
    Story => (
      <div style={{ maxWidth: 720, background: "white", padding: 16 }}>
        <Story />
      </div>
    )
  ]
}
export default meta

type Story = StoryObj<typeof RollCallList>

export const Collapsed: Story = {
  args: { court: 194, rollCalls, unreadable }
}

export const OneOpenFromTheUrl: Story = {
  args: { court: 194, rollCalls, unreadable, openId: "senate-75" }
}
