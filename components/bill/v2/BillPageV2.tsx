import BillTrackerConnectedView from "components/bill/BillTracker"
import { useAuth } from "components/auth"
import { Container } from "components/bootstrap"
import { ConferenceBanner } from "components/conference/ConferenceBanner"
import { ConferenceSummary } from "components/conference/types"
import { Bill } from "components/db"
import { useFlags } from "components/featureFlags"
import { PendingUpgradeBanner } from "components/PendingUpgradeBanner"
import { TestimonyFormPanel } from "components/publish"
import { Banner } from "components/shared/StyledSharedComponents"
import {
  currentBallotInitiativeCommittee,
  isCurrentCourt
} from "functions/src/shared"
import { useTranslation } from "next-i18next"
import { useMemo } from "react"
import styled from "styled-components"
import { BillHeader } from "./BillHeader"
import { BillLobbyingProvider, useBillLobbying } from "./billLobbying"
import { BillTabs, TabSpec } from "./BillTabs"
import { HearingTab } from "./HearingTab"
import { HistoryTab } from "./HistoryTab"
import { LobbyingTab } from "./LobbyingTab"
import { draftOrigin } from "./newDraft"
import { OverviewTab } from "./OverviewTab"
import { countRollCallMentions } from "./rollCallMentions"
import { StatTiles } from "./StatTiles"
import { TestimonyTab } from "./TestimonyTab"
import { TextTab } from "./TextTab"
import { TabKey, useBillUrlState } from "./useBillUrlState"

const Page = styled(Container)`
  padding-top: var(--maple-space-lg);
  padding-bottom: var(--maple-space-3xl);
`

/**
 * On phones the testimony panel comes right after the stat tiles, then the
 * tabs, then the tracker. On wider screens the panel and the tracker form
 * the sidebar beside the tabs.
 */
const Layout = styled.div`
  display: grid;
  gap: 0 var(--maple-space-xl);
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "form" "main" "tracker";
  margin-top: var(--maple-space-sm);

  > * {
    min-width: 0;
  }

  @media (min-width: 768px) {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    grid-template-areas: "main form" "main tracker";
    align-items: start;
  }
`

/**
 * The bill detail page behind the `billPageV2` flag: header, stat tiles,
 * tabs with the section in the URL, and the testimony panel beside the bill.
 */
export function BillPageV2({
  bill,
  conference
}: {
  bill: Bill
  conference?: ConferenceSummary | null
}) {
  const flags = useFlags()
  return (
    <BillLobbyingProvider
      enabled={flags.lobbyingTable}
      court={bill.court}
      billId={bill.id}
    >
      <BillPageBody bill={bill} conference={conference} />
    </BillLobbyingProvider>
  )
}

function BillPageBody({
  bill,
  conference
}: {
  bill: Bill
  conference?: ConferenceSummary | null
}) {
  const { t } = useTranslation("common")
  const flags = useFlags()
  const isPendingUpgrade = useAuth().claims?.role === "pendingUpgrade"
  const isBallotMeasure =
    bill.currentCommittee?.id === currentBallotInitiativeCommittee
  const draft = useMemo(() => draftOrigin(bill.history), [bill.history])
  const rollCalls = useMemo(
    () => countRollCallMentions(bill.history),
    [bill.history]
  )
  const lobbying = useBillLobbying()
  const organizations =
    lobbying.status === "ready"
      ? lobbying.organizations
      : lobbying.status === "off"
      ? undefined
      : 0

  const { tab: requested } = useBillUrlState()
  const tab: TabKey =
    requested === "lobbying" && !flags.lobbyingTable ? "overview" : requested

  const tabs: TabSpec[] = [
    { key: "overview" },
    { key: "testimony", count: bill.testimonyCount ?? 0 },
    { key: "hearing", count: bill.hearingIds?.length ?? 0 },
    { key: "history", count: rollCalls },
    ...(flags.lobbyingTable
      ? [{ key: "lobbying" as const, count: organizations ?? 0 }]
      : []),
    { key: "text" }
  ]

  return (
    <>
      {isPendingUpgrade && <PendingUpgradeBanner />}
      {!isCurrentCourt(bill.court) && (
        <Banner>{t("bill.old_session", { billCourt: bill.court })}</Banner>
      )}
      {isBallotMeasure && <Banner>{t("bill.ballot_initiative")}</Banner>}
      <ConferenceBanner conference={conference} />

      <Page>
        <BillHeader
          bill={bill}
          isBallotMeasure={isBallotMeasure}
          draft={draft}
        />
        <StatTiles
          testimony={{
            total: bill.testimonyCount ?? 0,
            endorse: bill.endorseCount ?? 0,
            neutral: bill.neutralCount ?? 0,
            oppose: bill.opposeCount ?? 0
          }}
          hearings={bill.hearingIds?.length ?? 0}
          rollCalls={rollCalls}
          organizations={organizations}
        />
        <Layout>
          <div style={{ gridArea: "form" }}>
            <TestimonyFormPanel bill={bill} />
          </div>
          <div style={{ gridArea: "main" }}>
            <BillTabs tabs={tabs} />
            {tab === "overview" && <OverviewTab bill={bill} draft={draft} />}
            {tab === "testimony" && <TestimonyTab bill={bill} draft={draft} />}
            {tab === "hearing" && <HearingTab bill={bill} draft={draft} />}
            {tab === "history" && <HistoryTab bill={bill} />}
            {tab === "lobbying" && <LobbyingTab bill={bill} />}
            {tab === "text" && <TextTab bill={bill} />}
          </div>
          {flags.billTracker && (
            <div style={{ gridArea: "tracker" }}>
              <BillTrackerConnectedView bill={bill} />
            </div>
          )}
        </Layout>
      </Page>
    </>
  )
}
