import { useTranslation } from "next-i18next"
import { useMemo } from "react"
import { useAsync } from "react-async-hook"
import styled from "styled-components"
import { formatHistoryDate } from "components/bill/v2/dates"
import { formatBillId } from "components/formatting"
import { Internal, maple } from "components/links"
import { billStage, latestActionDate } from "./billStage"
import { TopicBars } from "./BillsSection"
import { HearingList } from "./CommitteesSection"
import { HearingSummary, MemberCommittee } from "./committees"
import { byNumberDesc, loadBills } from "./loadBills"
import { loadRollCallDetails, MemberVote } from "./memberVotes"
import { Async, Claim, MemberBillSummary } from "./useProfileData"
import { Section } from "./useProfileSection"
import { Card, CardTitle, Chip, Empty, Note } from "./ui"

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 320px);
  gap: 0 var(--maple-space-lg);
  align-items: start;

  @media (max-width: 991.98px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Words = styled(Card)`
  blockquote {
    font-size: 1.125rem;
    margin: var(--maple-space-sm) 0;
    color: var(--maple-text-strong);
  }
`

const Activity = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    gap: var(--maple-space-md);
    padding: var(--maple-space-md) 0;
    border-top: 1px solid var(--maple-border-default);
  }

  li:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .date {
    font-size: 0.875rem;
    color: var(--maple-text-muted);
  }

  p {
    margin: 4px 0 0;
  }
`

type ActivityItem = {
  key: string
  /** "2025-09-24", for sorting. */
  iso: string
  kind: "floorVote" | "billAction" | "hearing"
  text: string
  href?: string
  linkText?: string
}

/**
 * The latest public-record events: her recent floor votes, the latest
 * action on bills she filed, and hearings of her committees. Each line says
 * only what the record says.
 */
function useActivity(
  court: number,
  leadIds: string[],
  votes: MemberVote[] | undefined,
  past: HearingSummary[] | undefined,
  names: Map<string, string>
): ActivityItem[] | undefined {
  const { t } = useTranslation("legislators")
  const top = (votes ?? []).slice(0, 3)
  const voteKey = top.map(v => v.id).join(",")
  const voteDetails = useAsync(
    () => loadRollCallDetails(top).catch(() => []),
    [voteKey]
  )
  const leadKey = leadIds.join(",")
  const bills = useAsync(
    (c: number, k: string) =>
      k ? loadBills(c, k.split(",")).catch(() => []) : Promise.resolve([]),
    [court, leadKey]
  )

  return useMemo(() => {
    if (voteDetails.loading || bills.loading) return undefined
    const items: ActivityItem[] = []
    for (const v of voteDetails.result ?? []) {
      if (!v.date) continue
      items.push({
        key: v.id,
        iso: v.date.slice(0, 10),
        kind: "floorVote",
        text: t("v2.activity.voted", {
          response: t(`v2.votes.response.${v.response}`),
          motion:
            v.motion ?? t("v2.votes.rollCall", { number: v.rollCallNumber }),
          bill: v.billId ? formatBillId(v.billId) : ""
        }),
        href: v.billId ? maple.bill({ court, id: v.billId }) : undefined,
        linkText: v.billId ? formatBillId(v.billId) : undefined
      })
    }
    const recent = [...(bills.result ?? [])]
      .sort((a, b) => latestActionDate(b).localeCompare(latestActionDate(a)))
      .slice(0, 3)
    for (const b of recent) {
      const s = billStage(b)
      if (!s.latestAction?.date) continue
      items.push({
        key: `bill-${b.id}`,
        iso: s.latestAction.date.slice(0, 10),
        kind: "billAction",
        text: `${formatBillId(b.id)}: ${s.latestAction.text}`,
        href: maple.bill({ court, id: b.id }),
        linkText: t("v2.activity.billLink")
      })
    }
    for (const h of (past ?? []).slice(0, 2)) {
      items.push({
        key: `hearing-${h.eventId}`,
        iso: h.date.slice(0, 10),
        kind: "hearing",
        text: t("v2.activity.hearing", {
          committee: names.get(h.committeeCode) ?? h.committeeCode,
          count: h.billCount
        }),
        href: maple.hearing({ eventId: h.eventId }),
        linkText: h.hasVideo
          ? t("v2.hearings.videoLink")
          : t("v2.hearings.agendaLink")
      })
    }
    return items.sort((a, b) => b.iso.localeCompare(a.iso)).slice(0, 6)
  }, [
    voteDetails.loading,
    voteDetails.result,
    bills.loading,
    bills.result,
    past,
    names,
    court,
    t
  ])
}

export function OverviewSection({
  court,
  title,
  claim,
  summary,
  leadIds,
  votes,
  committees,
  hearings,
  hrefFor
}: {
  court: number
  title: string
  claim: Claim | undefined
  summary: MemberBillSummary | null | undefined
  leadIds: string[]
  votes: Async<MemberVote[]>
  committees: MemberCommittee[] | undefined
  hearings: Async<{ upcoming: HearingSummary[]; past: HearingSummary[] }>
  hrefFor: (s: Section) => string
}) {
  const { t } = useTranslation("legislators")
  const names = useMemo(
    () => new Map((committees ?? []).map(c => [c.code, c.name])),
    [committees]
  )
  const h = hearings.status === "ready" ? hearings.value : undefined
  const activity = useActivity(
    court,
    [...leadIds].sort(byNumberDesc).slice(0, 30),
    votes.status === "ready"
      ? votes.value
      : votes.status === "error"
      ? []
      : undefined,
    h?.past,
    names
  )
  const words = claim?.profile.inTheirOwnWords?.trim()
  const possessive = t("v2.common.possessive", { title })

  return (
    <Layout>
      <div>
        {claim && words && (
          <Words aria-labelledby="ov-words">
            <Chip $tone="green">
              {t("v2.overview.fromLegislator", { title })}
            </Chip>
            <CardTitle id="ov-words" className="mt-2">
              {t("inTheirOwnWords")}
            </CardTitle>
            <blockquote>“{words}”</blockquote>
            <Note>{t("v2.overview.wordsNote")}</Note>
          </Words>
        )}
        <Card aria-labelledby="ov-topics">
          <CardTitle id="ov-topics">
            {t("v2.overview.topics", { title })}
          </CardTitle>
          <p>
            {t("v2.overview.topicsSub", {
              count: summary?.sponsored.count ?? leadIds.length
            })}
          </p>
          <TopicBars topics={summary?.sponsored.topics ?? []} />
          <Note>{t("v2.bills.topicsNote")}</Note>
          <p className="mt-3 mb-0">
            <Internal href={hrefFor("bills")} scroll={false}>
              {t("v2.overview.seeBills", { possessive })}
            </Internal>
          </p>
        </Card>
        <Card aria-labelledby="ov-activity">
          <CardTitle id="ov-activity">{t("v2.overview.activity")}</CardTitle>
          {!activity ? (
            <Empty>{t("v2.common.loading")}</Empty>
          ) : !activity.length ? (
            <Empty>{t("v2.overview.noActivity")}</Empty>
          ) : (
            <Activity>
              {activity.map(a => (
                <li key={a.key}>
                  <div className="date">{formatHistoryDate(a.iso)}</div>
                  <div>
                    <Chip>{t(`v2.activity.kind.${a.kind}`)}</Chip>
                    <p>{a.text}</p>
                    {a.href && a.linkText && (
                      <Internal href={a.href}>{a.linkText}</Internal>
                    )}
                  </div>
                </li>
              ))}
            </Activity>
          )}
        </Card>
      </div>
      <aside aria-label={t("v2.hearings.upcomingAside", { possessive })}>
        <Card aria-labelledby="ov-hearings">
          <CardTitle id="ov-hearings">
            {t("v2.hearings.upcomingAside", { possessive })}
          </CardTitle>
          {!h ? (
            <Empty>{t("v2.common.loading")}</Empty>
          ) : h.upcoming.length ? (
            <HearingList
              hearings={h.upcoming.slice(0, 3)}
              names={names}
              possessive={possessive}
            />
          ) : (
            <Empty>{t("v2.hearings.noneUpcoming")}</Empty>
          )}
        </Card>
      </aside>
    </Layout>
  )
}
