import { Meta, StoryObj } from "@storybook/react"
import { WhereItStandsPanel } from "components/bill/v2/WhereItStands"
import { Bill, BillHistory } from "components/db"
import { Timestamp } from "firebase/firestore"

// Histories copied from the dev database (194th General Court).
const h = (Action: string, Branch = "House", Date: string | null = null) => ({
  Action,
  Branch,
  Date
})

const base = {
  court: 194,
  content: {
    BillNumber: "H2268",
    DocketNumber: "",
    Title: "An Act",
    LegislationTypeName: "Bill",
    Pinslip: "",
    Cosponsors: [],
    GeneralCourtNumber: 194
  },
  cosponsorCount: 0,
  testimonyCount: 0,
  endorseCount: 0,
  opposeCount: 0,
  neutralCount: 0,
  fetchedAt: new Timestamp(1763400000, 0)
}

const bill = (id: string, history: BillHistory): Bill =>
  ({ ...base, id, history } as Bill)

const law = bill("H2268", [
  h(
    "Referred to the committee on Municipalities and Regional Government",
    "House",
    "2025-02-27T00:00:00"
  ),
  h(
    "Hearing scheduled for 05/13/2025 from 01:00 PM-05:00 PM in B-1",
    "Joint",
    "2025-05-05T00:00:00"
  ),
  h(
    "Bill reported favorably by committee and referred to the committee on House Steering, Policy and Scheduling",
    "House",
    "2025-07-10T00:00:00"
  ),
  h(
    "Read third (title changed), amended and passed to be engrossed",
    "House",
    "2025-09-29T00:00:00"
  ),
  h(
    "Read third (title changed) and passed to be engrossed",
    "Senate",
    "2026-02-05T00:00:00"
  ),
  h("Enacted", "House", "2026-02-09T00:00:00"),
  h("Enacted and laid before the Governor", "Senate", "2026-02-09T00:00:00"),
  h(
    "Signed by the Governor, Chapter 20 of the Acts of 2026",
    "Executive",
    "2026-02-12T00:00:00"
  )
])

const inCommittee = bill("H1001", [
  h(
    "Referred to the committee on Environment and Natural Resources",
    "House",
    "2025-02-27T00:00:00"
  ),
  h("Senate concurred", "Senate", "2025-02-27T00:00:00")
])

const study = bill("H1001", [
  ...inCommittee.history,
  h(
    "Hearing scheduled for 07/01/2025 from 01:00 PM-05:00 PM in A-1",
    "Joint",
    "2025-06-23T00:00:00"
  ),
  h("Accompanied a study order, see H5149", "House", "2026-02-26T00:00:00")
])

const newDraft = bill("H78", [
  h(
    "Referred to the committee on Advanced Information Technology, the Internet and Cybersecurity",
    "House",
    "2025-02-27T00:00:00"
  ),
  h("Accompanied a new draft, see H4746", "House", "2025-11-17T00:00:00")
])

const meta: Meta = {
  title: "Organisms/Bill Detail/Bill Page v2/Where it stands",
  parameters: {
    nextjs: {
      router: {
        pathname: "/bills/[court]/[billId]",
        asPath: "/bills/194/H2268",
        query: { court: "194", billId: "H2268" }
      }
    }
  },
  decorators: [
    Story => (
      <div style={{ maxWidth: 640 }}>
        <Story />
      </div>
    )
  ]
}
export default meta

const now = new Date("2025-11-09T12:00:00Z")

export const SignedIntoLaw: StoryObj = {
  render: () => (
    <WhereItStandsPanel
      bill={law}
      hasHearing
      hearingDate="May 13, 2025"
      now={now}
    />
  )
}

export const InCommitteeNoHearingYet: StoryObj = {
  render: () => (
    <WhereItStandsPanel bill={inCommittee} hasHearing={false} now={now} />
  )
}

export const AfterTheReportingDeadline: StoryObj = {
  render: () => (
    <WhereItStandsPanel
      bill={inCommittee}
      hasHearing={false}
      now={new Date("2026-01-15T12:00:00Z")}
    />
  )
}

export const SentToStudy: StoryObj = {
  render: () => (
    <WhereItStandsPanel
      bill={study}
      hasHearing
      hearingDate="Jul 1, 2025"
      now={now}
    />
  )
}

export const ContinuesAsNewDraft: StoryObj = {
  render: () => <WhereItStandsPanel bill={newDraft} hasHearing now={now} />
}
