import { Meta, StoryObj } from "@storybook/react"
import {
  HearingDocumentList,
  HistoryHearingList
} from "components/bill/v2/HearingTab"
import { hearingsFromHistory } from "components/bill/v2/hearingHistory"
import { Bill } from "components/db"
import { Timestamp } from "firebase/firestore"

const bill = {
  id: "H78",
  court: 194,
  content: {
    BillNumber: "H78",
    DocketNumber: "",
    Title: "An Act relative to consumer data privacy",
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
  fetchedAt: new Timestamp(1763400000, 0),
  history: [],
  hearingIds: ["hearing-5452"]
} as Bill

// Invented agenda: bill numbers only.
const agenda = Array.from({ length: 14 }, (_, i) => ({
  BillNumber: `H${80 + i}`,
  Title: `An Act number ${80 + i}`,
  GeneralCourtNumber: 194
}))

const meta: Meta = {
  title: "Organisms/Bill Detail/Bill Page v2/Hearing tab",
  parameters: {
    nextjs: {
      router: {
        pathname: "/bills/[court]/[billId]",
        asPath: "/bills/194/H78",
        query: { court: "194", billId: "H78" }
      }
    }
  },
  decorators: [
    Story => (
      <div style={{ maxWidth: 720, background: "white", padding: 16 }}>
        <Story />
      </div>
    )
  ]
}
export default meta

export const FromHearingDocuments: StoryObj = {
  render: () => (
    <HearingDocumentList
      bill={bill}
      hearings={[
        {
          eventId: 5452,
          court: 194,
          date: "2025-05-21T10:00:00.000-04:00",
          committeeName:
            "Joint Committee on Advanced Information Technology, the Internet and Cybersecurity",
          committeeCode: "J33",
          agenda: [{ BillNumber: "H78", GeneralCourtNumber: 194 }, ...agenda],
          hasVideo: true
        }
      ]}
    />
  )
}

export const FromTheBillHistory: StoryObj = {
  render: () => (
    <HistoryHearingList
      notices={hearingsFromHistory([
        {
          Date: "2023-10-10T00:00:00",
          Branch: "Joint",
          Action:
            "Hearing scheduled for 10/17/2023 from 10:00 AM-01:00 PM in A-2"
        },
        {
          Date: "2023-10-12T00:00:00",
          Branch: "Joint",
          Action:
            "Hearing rescheduled to 10/24/2023 from 10:00 AM-01:00 PM in A-2 and Virtual"
        }
      ])}
    />
  )
}
