import { Meta, StoryObj } from "@storybook/react"
import { BillHeader } from "components/bill/v2/BillHeader"
import { BillTabs } from "components/bill/v2/BillTabs"
import { StanceBar } from "components/bill/v2/StanceBar"
import { StatTiles } from "components/bill/v2/StatTiles"
import { Provider } from "react-redux"
import configureStore from "redux-mock-store"
import { Bill } from "components/db"
import { Timestamp } from "firebase/firestore"

// A heard bill and the committee new draft that replaced it, as recorded in
// the 194th General Court. Names are the Legislature's public record.
const heardBill: Bill = {
  id: "H78",
  court: 194,
  content: {
    BillNumber: "H78",
    DocketNumber: "HD1234",
    Title: "An Act relative to consumer data privacy",
    LegislationTypeName: "Bill",
    Pinslip: "",
    PrimarySponsor: { Id: "TFB1", Name: "Tricia Farley-Bouvier", Type: 1 },
    Cosponsors: [
      { Id: "TFB1", Name: "Tricia Farley-Bouvier", Type: 1 },
      { Id: "HLB1", Name: "Hannah Bowen", Type: 1 },
      { Id: "JCD1", Name: "James C. Arena-DeRosa", Type: 1 }
    ],
    GeneralCourtNumber: 194
  },
  cosponsorCount: 3,
  testimonyCount: 12,
  endorseCount: 8,
  opposeCount: 3,
  neutralCount: 1,
  fetchedAt: new Timestamp(1763400000, 0),
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

const newDraft: Bill = {
  ...heardBill,
  id: "H4746",
  content: {
    ...heardBill.content,
    BillNumber: "H4746",
    Title: "An Act establishing the Massachusetts consumer data privacy act",
    PrimarySponsor: {
      Id: "J33",
      Name: "Joint Committee on Advanced Information Technology, the Internet and Cybersecurity",
      Type: 2
    },
    Cosponsors: []
  },
  cosponsorCount: 0,
  testimonyCount: 0,
  endorseCount: 0,
  opposeCount: 0,
  neutralCount: 0,
  hearingIds: undefined,
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

const store = configureStore([])({
  auth: { authenticated: false, user: null, claims: null }
})

const meta: Meta = {
  title: "Organisms/Bill Detail/Bill Page v2",
  decorators: [
    Story => (
      <Provider store={store}>
        <div style={{ maxWidth: 960 }}>
          <Story />
        </div>
      </Provider>
    )
  ],
  parameters: {
    nextjs: {
      router: {
        pathname: "/bills/[court]/[billId]",
        asPath: "/bills/194/H78",
        query: { court: "194", billId: "H78" }
      }
    }
  }
}
export default meta

export const Header: StoryObj<typeof BillHeader> = {
  render: () => <BillHeader bill={heardBill} isBallotMeasure={false} />
}

export const HeaderOfNewDraft: StoryObj<typeof BillHeader> = {
  render: () => (
    <BillHeader
      bill={newDraft}
      isBallotMeasure={false}
      draft={{
        kind: "newDraft",
        billIds: ["H78", "H80", "H86", "H96", "H103", "H104"],
        action: "New draft of H78, H80, H86, H96, H103 and H104"
      }}
    />
  )
}

export const Tiles: StoryObj<typeof StatTiles> = {
  render: () => (
    <StatTiles
      testimony={{ total: 12, endorse: 8, neutral: 1, oppose: 3 }}
      hearings={1}
      rollCalls={2}
      organizations={7}
    />
  )
}

export const TilesWithoutLobbying: StoryObj<typeof StatTiles> = {
  render: () => (
    <StatTiles
      testimony={{ total: 0, endorse: 0, neutral: 0, oppose: 0 }}
      hearings={0}
      rollCalls={0}
    />
  )
}

export const Tabs: StoryObj<typeof BillTabs> = {
  render: () => (
    <BillTabs
      tabs={[
        { key: "overview" },
        { key: "testimony", count: 12 },
        { key: "hearing", count: 1 },
        { key: "history", count: 2 },
        { key: "lobbying", count: 7 },
        { key: "text" }
      ]}
    />
  )
}

export const Stance: StoryObj<typeof StanceBar> = {
  render: () => <StanceBar counts={{ endorse: 8, neutral: 1, oppose: 3 }} />
}
