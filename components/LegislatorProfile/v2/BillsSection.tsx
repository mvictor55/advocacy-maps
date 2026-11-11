import { useTranslation } from "next-i18next"
import { useMemo, useState } from "react"
import styled from "styled-components"
import { formatHistoryDate } from "components/bill/v2/dates"
import { Bill, MemberContent } from "components/db"
import { formatBillId } from "components/formatting"
import { courtOrdinal } from "components/lobbying/sessions"
import { Internal, maple } from "components/links"
import { billsDefaultIndex } from "components/search/bills/useBillSort"
import { billStage, BillStage, STEPS } from "./billStage"
import { MemberBillSummary, useBillsPage } from "./useProfileData"
import {
  Bar,
  Card,
  CardTitle,
  Chip,
  Empty,
  Footer,
  MoreButton,
  Note,
  Rows,
  SectionTitle,
  Source,
  Toggle
} from "./ui"

const PAGE = 10

/** What the history says about a bill now, shown under its tracker. */
const STATUS_LINES = [
  "sentToStudy",
  "adverseReport",
  "placedOnFile",
  "vetoed",
  "deadAtDissolution",
  "inConference"
]

export type Scope = "lead" | "cosponsored"

/** Bill search filtered to the legislator's bills. */
export function billSearchForMember(
  court: number,
  name: string,
  scope: Scope
): string {
  const field = scope === "lead" ? "primarySponsor" : "cosponsors"
  const params = {
    [`${billsDefaultIndex}[refinementList][${field}][0]`]: name,
    [`${billsDefaultIndex}[refinementList][court][0]`]: `${court}`
  }
  return `${maple.billSearch()}?${new URLSearchParams(params).toString()}`
}

/** Her bills as lead sponsor, and the ones she cosponsored but didn't file. */
export function memberBillIds(member: MemberContent) {
  const lead = member.SponsoredBills ?? []
  const leadSet = new Set(lead)
  const cosponsored = (member.CoSponsoredBills ?? []).filter(
    id => !leadSet.has(id)
  )
  return { lead, cosponsored }
}

const Tracker = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 3px;
  margin: 6px 0 4px;
  max-width: 260px;

  span {
    height: 6px;
    border-radius: var(--maple-radius-pill);
    background: #d1d6e7;
  }

  span.on {
    background: var(--bs-secondary);
  }
`

export function StageTracker({ stage }: { stage: BillStage }) {
  const { t } = useTranslation("legislators")
  const label =
    stage.step < 0
      ? t("v2.stage.filed")
      : t(`v2.stage.${STEPS[stage.step]}`, {
          first: stage.origin,
          second: stage.other
        })
  return (
    <>
      <Tracker
        role="img"
        aria-label={t("v2.stage.aria", {
          step: stage.step + 1,
          total: STEPS.length,
          label
        })}
      >
        {STEPS.map((s, i) => (
          <span key={s} className={i <= stage.step ? "on" : undefined} />
        ))}
      </Tracker>
      <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>{label}</div>
    </>
  )
}

const BillItem = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: var(--maple-space-sm) var(--maple-space-xl);

  .num {
    font-weight: 800;
  }

  .title {
    margin: 2px 0 6px;
  }

  .label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--maple-text-muted);
  }

  .action {
    font-size: 0.875rem;
    color: var(--maple-text-body);
    margin-top: 4px;
  }

  @media (max-width: 767.98px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

export function BillRow({
  bill,
  court,
  showLead
}: {
  bill: Bill
  court: number
  showLead?: boolean
}) {
  const { t } = useTranslation("legislators")
  const stage = useMemo(() => billStage(bill), [bill])
  const topic = bill.topics?.[0]
  return (
    <BillItem>
      <div>
        <Internal className="num" href={maple.bill({ court, id: bill.id })}>
          {formatBillId(bill.id)}
        </Internal>
        <div className="title">{bill.content.Title}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {topic && <Chip>{topic.category}</Chip>}
          {showLead && bill.content.PrimarySponsor?.Name && (
            <span style={{ fontSize: "0.875rem" }}>
              {t("v2.bills.leadSponsor", {
                name: bill.content.PrimarySponsor.Name
              })}
            </span>
          )}
        </div>
      </div>
      <div>
        <div className="label">{t("v2.bills.whereItStands")}</div>
        <StageTracker stage={stage} />
        {stage.continuedAs ? (
          <div className="action">
            {t("v2.bills.continuedAs", {
              bill: formatBillId(stage.continuedAs)
            })}
          </div>
        ) : (
          stage.status &&
          STATUS_LINES.includes(stage.status) && (
            <div className="action" style={{ fontWeight: 700 }}>
              {t(`v2.bills.status.${stage.status}`, {
                bill: stage.studyOrder ? formatBillId(stage.studyOrder) : ""
              })}
            </div>
          )
        )}
        {stage.latestAction && (
          <div className="action">
            {t("v2.bills.latestAction", {
              date: formatHistoryDate(stage.latestAction.date),
              action: stage.latestAction.text
            })}
          </div>
        )}
      </div>
    </BillItem>
  )
}

export function TopicBars({
  topics,
  limit = 5
}: {
  topics: MemberBillSummary["sponsored"]["topics"]
  limit?: number
}) {
  const { t } = useTranslation("legislators")
  const shown = topics.slice(0, limit)
  const max = Math.max(1, ...shown.map(x => x.count))
  if (!shown.length) return <Empty>{t("v2.bills.noTopics")}</Empty>
  return (
    <div>
      {shown.map(x => (
        <Bar
          key={x.topic}
          label={x.topic}
          value={t("v2.bills.billCount", { count: x.count })}
          width={Math.round((x.count / max) * 100)}
        />
      ))}
    </div>
  )
}

export function BillsSection({
  member,
  court,
  summary
}: {
  member: MemberContent
  court: number
  summary: MemberBillSummary | null | undefined
}) {
  const { t } = useTranslation("legislators")
  const [scope, setScope] = useState<Scope>("lead")
  const [shown, setShown] = useState(PAGE)
  const ids = memberBillIds(member)
  const scopeIds = ids[scope]
  const page = useBillsPage(court, scopeIds, shown)
  const topics =
    (scope === "lead" ? summary?.sponsored : summary?.cosponsored)?.topics ?? []

  const change = (next: Scope) => {
    setScope(next)
    setShown(PAGE)
  }

  return (
    <div>
      <SectionTitle>{t("v2.nav.bills")}</SectionTitle>
      <Source>{t("v2.bills.source", { court: courtOrdinal(court) })}</Source>
      <Toggle
        label={t("v2.bills.scopeLabel")}
        value={scope}
        onChange={change}
        options={[
          {
            key: "lead",
            label: t("v2.bills.leadTab", { count: ids.lead.length })
          },
          {
            key: "cosponsored",
            label: t("v2.bills.coTab", { count: ids.cosponsored.length })
          }
        ]}
      />
      <Card aria-labelledby="bills-topics">
        <CardTitle id="bills-topics">{t("v2.bills.byTopic")}</CardTitle>
        <TopicBars topics={topics} />
        <Note>{t("v2.bills.topicsNote")}</Note>
      </Card>
      <Card aria-labelledby="bills-list">
        <CardTitle id="bills-list">
          {scope === "lead"
            ? t("v2.bills.leadHeading")
            : t("v2.bills.coHeading")}
        </CardTitle>
        {scopeIds.length === 0 ? (
          <Empty>{t("v2.bills.none")}</Empty>
        ) : page.status === "error" ? (
          <Empty>{t("v2.common.error")}</Empty>
        ) : page.status === "loading" && shown === PAGE ? (
          <Empty>{t("v2.common.loading")}</Empty>
        ) : (
          <>
            <Rows>
              {(page.status === "ready" ? page.value : page.previous ?? []).map(
                b => (
                  <BillRow
                    key={b.id}
                    bill={b}
                    court={court}
                    showLead={scope === "cosponsored"}
                  />
                )
              )}
            </Rows>
            {shown < scopeIds.length && (
              <MoreButton
                onClick={() => setShown(shown + PAGE)}
                disabled={page.status === "loading"}
              >
                {page.status === "loading"
                  ? t("v2.common.loading")
                  : t("v2.common.showMore")}
              </MoreButton>
            )}
          </>
        )}
        <Footer>
          <span>
            {t("v2.bills.showing", {
              shown: Math.min(shown, scopeIds.length),
              total: scopeIds.length
            })}
          </span>
          <Internal href={billSearchForMember(court, member.Name, scope)}>
            {t("v2.bills.browse")}
          </Internal>
        </Footer>
      </Card>
      <Note>{t("v2.bills.stageNote")}</Note>
    </div>
  )
}
