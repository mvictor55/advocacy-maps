import { useTranslation } from "next-i18next"
import styled from "styled-components"
import {
  formatHearingDate,
  formatHearingTime,
  LEGISLATURE_ZONE
} from "components/bill/v2/dates"
import { formatBillId } from "components/formatting"
import { Internal, maple } from "components/links"
import { DateTime } from "luxon"
import { HearingSummary, MemberCommittee } from "./committees"
import { Async } from "./useProfileData"
import {
  Card,
  CardTitle,
  Chip,
  Empty,
  Note,
  Rows,
  SectionTitle,
  Source
} from "./ui"

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--maple-space-md);
  margin-bottom: var(--maple-space-lg);

  section {
    background: var(--maple-surface-base);
    border: 1px solid var(--maple-surface-border);
    border-radius: var(--maple-radius-md);
    padding: var(--maple-space-lg);
  }

  h3 {
    font-size: 1rem;
    font-weight: 700;
    margin: var(--maple-space-sm) 0 4px;
  }

  .next {
    font-size: 0.875rem;
    color: var(--maple-text-muted);
  }
`

const DateBox = styled.div`
  width: 56px;
  flex: none;
  text-align: center;
  border: 1px solid var(--maple-border-default);
  border-radius: var(--maple-radius-md);
  padding: 4px 0;

  .mon {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--bs-primary);
  }

  .day {
    font-size: 1.375rem;
    font-weight: 800;
    color: var(--maple-text-strong);
    line-height: 1.1;
  }
`

const HearingItem = styled.li`
  display: flex;
  gap: var(--maple-space-lg);

  .committee {
    font-weight: 700;
  }

  .meta,
  .agenda {
    font-size: 0.875rem;
    color: var(--maple-text-body);
  }
`

export function HearingDate({ iso }: { iso: string }) {
  const dt = DateTime.fromISO(iso, { setZone: true }).setZone(LEGISLATURE_ZONE)
  return (
    <DateBox aria-hidden="true">
      <div className="mon">{dt.isValid ? dt.toFormat("LLL") : ""}</div>
      <div className="day">{dt.isValid ? dt.toFormat("d") : ""}</div>
    </DateBox>
  )
}

/** "12 bills on the agenda, including her H.1965". */
export function useAgendaLine() {
  const { t } = useTranslation("legislators")
  return (h: HearingSummary, possessive: string) => {
    const bills = t("v2.hearings.agenda", { count: h.billCount })
    const line = h.herBills.length
      ? t("v2.hearings.including", {
          bills,
          possessive,
          list: h.herBills.map(formatBillId).join(", ")
        })
      : bills
    return h.title ? `${h.title} · ${line}` : line
  }
}

export function HearingList({
  hearings,
  names,
  possessive,
  past
}: {
  hearings: HearingSummary[]
  names: Map<string, string>
  possessive: string
  past?: boolean
}) {
  const { t } = useTranslation("legislators")
  const agenda = useAgendaLine()
  return (
    <Rows>
      {hearings.map(h => (
        <HearingItem key={h.eventId}>
          <HearingDate iso={h.date} />
          <div style={{ minWidth: 0 }}>
            <div className="committee">
              {names.get(h.committeeCode) ?? h.committeeCode}
            </div>
            <div className="meta">
              {[
                formatHearingDate(h.date),
                formatHearingTime(h.date),
                h.location
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
            <div className="agenda">{agenda(h, possessive)}</div>
            <Internal href={maple.hearing({ eventId: h.eventId })}>
              {past && h.hasVideo
                ? t("v2.hearings.videoLink")
                : t("v2.hearings.agendaLink")}
            </Internal>
          </div>
        </HearingItem>
      ))}
    </Rows>
  )
}

export function CommitteesSection({
  committees,
  hearings,
  possessive
}: {
  committees: Async<MemberCommittee[]>
  hearings: Async<{ upcoming: HearingSummary[]; past: HearingSummary[] }>
  possessive: string
}) {
  const { t } = useTranslation("legislators")
  const list = committees.status === "ready" ? committees.value : []
  const names = new Map(list.map(c => [c.code, c.name]))
  const h = hearings.status === "ready" ? hearings.value : undefined
  const nextFor = (code: string) =>
    h?.upcoming.find(x => x.committeeCode === code)

  return (
    <div>
      <SectionTitle>{t("v2.nav.committees")}</SectionTitle>
      <Source>{t("v2.committees.source")}</Source>
      {committees.status === "loading" ? (
        <Empty>{t("v2.common.loading")}</Empty>
      ) : list.length === 0 ? (
        <Card>
          <Empty>{t("v2.committees.none")}</Empty>
        </Card>
      ) : (
        <Grid>
          {list.map(c => {
            const next = nextFor(c.code)
            return (
              <section key={c.code}>
                <Chip $tone={c.role === "member" ? "gray" : "blue"}>
                  {t(`v2.committees.role.${c.role}`)}
                </Chip>
                <h3>{c.name}</h3>
                <div className="next">
                  {next
                    ? t("v2.committees.next", {
                        date: formatHearingDate(next.date)
                      })
                    : t("v2.committees.noNext")}
                </div>
              </section>
            )
          })}
        </Grid>
      )}
      <Card aria-labelledby="cm-upcoming">
        <CardTitle id="cm-upcoming">{t("v2.hearings.upcoming")}</CardTitle>
        {!h ? (
          <Empty>{t("v2.common.loading")}</Empty>
        ) : h.upcoming.length ? (
          <HearingList
            hearings={h.upcoming}
            names={names}
            possessive={possessive}
          />
        ) : (
          <Empty>{t("v2.hearings.noneUpcoming")}</Empty>
        )}
      </Card>
      <Card aria-labelledby="cm-past">
        <CardTitle id="cm-past">{t("v2.hearings.recent")}</CardTitle>
        {!h ? (
          <Empty>{t("v2.common.loading")}</Empty>
        ) : h.past.length ? (
          <HearingList
            hearings={h.past.slice(0, 8)}
            names={names}
            possessive={possessive}
            past
          />
        ) : (
          <Empty>{t("v2.hearings.noneRecent")}</Empty>
        )}
        <Note>{t("v2.hearings.attendanceNote")}</Note>
      </Card>
    </div>
  )
}
