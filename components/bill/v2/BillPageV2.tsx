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
import Head from "next/head"
import { useMemo } from "react"
import styled from "styled-components"
import { BillHeader } from "./BillHeader"
import { BillLobbyingProvider, useBillLobbying } from "./billLobbying"
import { BillTabs, TabSpec } from "./BillTabs"
import { hearingDatesFromHistory } from "./hearingHistory"
import { HearingTab } from "./HearingTab"
import { useBillHearings } from "./useBillHearings"
import { HistoryTab } from "./HistoryTab"
import { LobbyingTab } from "./LobbyingTab"
import { draftOrigin } from "./newDraft"
import { OverviewTab } from "./OverviewTab"
import { voteRollCalls } from "components/bill/rollCalls"
import { StatTiles } from "./StatTiles"
import { TestimonyTab } from "./TestimonyTab"
import { TextTab } from "./TextTab"
import { TabKey, useBillUrlState } from "./useBillUrlState"
import { useStandsSummary } from "./WhereItStands"
import { formatBillId } from "components/formatting"
import { courtOrdinal } from "components/lobbying/sessions"

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

/** Cuts a long title at a word, for the browser tab and description. */
function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max).replace(/\s+\S*$/, "")
  return `${cut}…`
}

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
  const { t } = useTranslation(["common", "billPage"])
  const flags = useFlags()
  const isPendingUpgrade = useAuth().claims?.role === "pendingUpgrade"
  const summary = useStandsSummary(bill)
  // The shared layout sets a generic title first; this one, rendered later,
  // replaces it in the browser. Link-preview tags would need the layout to
  // render on the server, so they are not set here.
  const pageTitle = t("billPage:head.title", {
    bill: formatBillId(bill.id),
    title: truncate(bill.content.Title, 80),
    maple: t("common:maple_abbr")
  })
  const description = t("billPage:head.description", {
    bill: formatBillId(bill.id),
    court: courtOrdinal(bill.court),
    status: summary.text,
    title: truncate(bill.content.Title, 160)
  })
  const isBallotMeasure =
    bill.currentCommittee?.id === currentBallotInitiativeCommittee
  const draft = useMemo(() => draftOrigin(bill.history), [bill.history])
  const rollCalls = useMemo(
    () => voteRollCalls(bill.history).length,
    [bill.history]
  )
  const lobbying = useBillLobbying()
  const { hearings, loading: hearingsLoading } = useBillHearings(
    bill.hearingIds,
    bill.court
  )
  // Hearing documents when the bill has them (those from the bill's own
  // session, once loaded); otherwise the dates still standing in the
  // history's hearing notices (earlier sessions).
  const hearingCount = useMemo(() => {
    if (!bill.hearingIds?.length)
      return hearingDatesFromHistory(bill.history).length
    return hearings ? hearings.length : bill.hearingIds.length
  }, [bill.hearingIds, bill.history, hearings])
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
    { key: "hearing", count: hearingCount },
    { key: "history", count: rollCalls },
    ...(flags.lobbyingTable
      ? [{ key: "lobbying" as const, count: organizations ?? 0 }]
      : []),
    { key: "text" }
  ]

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
      </Head>
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
          hearings={hearings}
        />
        <StatTiles
          testimony={{
            total: bill.testimonyCount ?? 0,
            endorse: bill.endorseCount ?? 0,
            neutral: bill.neutralCount ?? 0,
            oppose: bill.opposeCount ?? 0
          }}
          hearings={hearingCount}
          rollCalls={rollCalls}
          organizations={organizations}
        />
        <Layout>
          <div style={{ gridArea: "form" }}>
            <TestimonyFormPanel bill={bill} />
          </div>
          <div style={{ gridArea: "main" }}>
            <BillTabs tabs={tabs} />
            {tab === "overview" && (
              <OverviewTab bill={bill} draft={draft} hearings={hearings} />
            )}
            {tab === "testimony" && <TestimonyTab bill={bill} draft={draft} />}
            {tab === "hearing" && (
              <HearingTab
                bill={bill}
                draft={draft}
                hearings={hearings}
                loading={hearingsLoading}
              />
            )}
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
