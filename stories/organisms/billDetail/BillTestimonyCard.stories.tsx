import { Meta, StoryObj } from "@storybook/react"
import { BillTestimonyCard } from "components/bill/v2/BillTestimonyCard"
import { Testimony } from "components/db"
import { Providers } from "components/providers"
import { Timestamp } from "firebase/firestore"

// Invented authors and text.
const base = {
  billId: "H78",
  court: 194,
  authorRole: "user",
  version: 1,
  public: true,
  billTitle: "An Act relative to consumer data privacy",
  updatedAt: Timestamp.fromMillis(1760000000000)
} as const

const long = `Dear Chairs and members of the committee,

I write in support of this bill. Residents should be able to see what data companies hold about them, correct it, and ask for it to be deleted. The bill's limits on selling precise location data and on targeting advertising at children are reasonable and overdue.

I ask the committee to report the bill favorably so that the full House can consider it this session. Thank you for your time and for your work on this issue.

Sincerely,
A constituent`

const supporter = {
  ...base,
  id: "pub-1",
  authorUid: "author-1",
  authorDisplayName: "Jordan Sample",
  fullName: "Jordan Sample",
  position: "endorse",
  content: long,
  publishedAt: Timestamp.fromMillis(1761000000000)
} as Testimony

const organization = {
  ...base,
  id: "pub-2",
  authorUid: "author-2",
  authorDisplayName: "Example Advocacy Group",
  fullName: "Example Advocacy Group",
  authorRole: "organization",
  position: "oppose",
  content:
    "We oppose this bill as drafted. The compliance burden on small organizations is not matched by the benefit, and the definitions in section 2 are broader than comparable laws in other states.",
  publishedAt: Timestamp.fromMillis(1760500000000),
  version: 2
} as Testimony

const meta: Meta<typeof BillTestimonyCard> = {
  title: "Organisms/Bill Detail/Bill Page v2/Testimony card",
  component: BillTestimonyCard,
  decorators: [
    Story => (
      <Providers>
        <div style={{ maxWidth: 720, background: "white", padding: 16 }}>
          <Story />
        </div>
      </Providers>
    )
  ]
}
export default meta

type Story = StoryObj<typeof BillTestimonyCard>

export const LongLetter: Story = {
  args: { testimony: supporter, isOwn: false }
}

export const SharedText: Story = {
  args: { testimony: supporter, isOwn: false, shared: 312 }
}

export const OrganizationOpposed: Story = {
  args: { testimony: organization, isOwn: false }
}

export const YourOwn: Story = {
  args: { testimony: organization, isOwn: true }
}
