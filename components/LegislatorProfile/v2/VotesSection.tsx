import { useTranslation } from "next-i18next"
import { useMemo, useState } from "react"
import { useAsync } from "react-async-hook"
import styled from "styled-components"
import { rollCallPdfUrl, voteRollCalls } from "components/bill/rollCalls"
import { formatHistoryDate } from "components/bill/v2/dates"
import { Bill, MemberContent } from "components/db"
import { formatBillId } from "components/formatting"
import { External, Internal, maple } from "components/links"
import { MemberCommittee } from "./committees"
import { loadBills } from "./loadBills"
import { memberCommitteeVotes } from "./memberCommitteeVotes"
import {
  loadRollCallDetails,
  MemberVote,
  rollCallInHistory,
  tallyVotes,
  voteKind
} from "./memberVotes"
import { Async } from "./useProfileData"
import {
  Card,
  Chip,
  Empty,
  Figure,
  Figures,
  MoreButton,
  Note,
  Pills,
  Rows,
  SectionTitle,
  Source,
  TALLY_COLORS,
  TallyBar,
  Toggle,
  Tone
} from "./ui"

const PAGE = 10

const Vote = styled.li`
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) minmax(0, 220px);
  gap: var(--maple-space-sm) var(--maple-space-xl);

  .label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--maple-text-muted);
  }

  .meta {
    font-size: 0.875rem;
    color: var(--maple-text-muted);
  }

  h3 {
    font-size: 1.0625rem;
    font-weight: 700;
    margin: 2px 0;
    color: var(--maple-text-strong);
  }

  .legend {
    font-size: 0.8125rem;
    color: var(--maple-text-body);
  }

  @media (max-width: 767.98px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const responseTone = (r: string): Tone =>
  r === "Yea" || r === "favorable"
    ? "blue"
    : r === "Nay" || r === "adverse"
    ? "orange"
    : "gray"

const How = styled.section`
  background: var(--maple-color-blue-subtle-bg);
  border: 1px solid var(--maple-color-blue-subtle-border);
  border-radius: var(--maple-radius-md);
  padding: var(--maple-space-sm) var(--maple-space-lg);
  margin-bottom: var(--maple-space-lg);

  button {
    display: flex;
    width: 100%;
    justify-content: space-between;
    background: none;
    border: 0;
    padding: 8px 0;
    font-weight: 700;
    color: var(--maple-color-blue-subtle-text);
    min-height: 44px;
  }

  ul {
    margin: 0 0 var(--maple-space-sm);
    padding-left: 1.25rem;
  }

  li + li {
    margin-top: 6px;
  }
`

function HowToRead() {
  const { t } = useTranslation("legislators")
  const [open, setOpen] = useState(true)
  return (
    <How aria-label={t("v2.votes.how.title")}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{t("v2.votes.how.title")}</span>
        <span>{open ? t("v2.common.hide") : t("v2.common.show")}</span>
      </button>
      {open && (
        <ul>
          {(["few", "lopsided", "committees"] as const).map(k => (
            <li key={k}>
              <strong>{t(`v2.votes.how.${k}.lead`)}</strong>{" "}
              {t(`v2.votes.how.${k}.body`)}
            </li>
          ))}
        </ul>
      )}
    </How>
  )
}

/** Her lead bills, read once for "on her bills" and committee votes. */
function useLeadBills(court: number, ids: string[], enabled: boolean) {
  const key = enabled ? ids.join(",") : ""
  return useAsync(
    (c: number, k: string) =>
      k ? loadBills(c, k.split(",")) : Promise.resolve(undefined),
    [court, key]
  )
}

function FloorVotes({
  court,
  votes,
  leadIds
}: {
  court: number
  votes: MemberVote[]
  leadIds: string[]
}) {
  const { t } = useTranslation("legislators")
  const [filter, setFilter] = useState<"all" | "hers">("all")
  const [shown, setShown] = useState(PAGE)
  const lead = useLeadBills(court, leadIds, filter === "hers")

  // Her bills' roll calls, matched to her votes by chamber and number.
  const hers = useMemo(() => {
    if (!lead.result) return undefined
    const keys = new Set(
      lead.result.flatMap(b =>
        voteRollCalls(b.history ?? []).map(r => `${r.branch}-${r.number}`)
      )
    )
    return votes.filter(v => keys.has(`${v.branch}-${v.rollCallNumber}`))
  }, [lead.result, votes])

  const list = filter === "hers" ? hers ?? [] : votes
  const pageVotes = list.slice(0, shown)
  const pageKey = pageVotes.map(v => v.id).join(",")
  const details = useAsync(async () => {
    const rows = await loadRollCallDetails(pageVotes)
    const billIds = rows.map(r => r.billId).filter((b): b is string => !!b)
    const bills = await loadBills(court, billIds).catch(() => [] as Bill[])
    const byId = new Map(bills.map(b => [b.id, b]))
    return rows.map(r => ({
      ...r,
      bill: r.billId ? byId.get(r.billId) : undefined
    }))
  }, [pageKey, court])

  const counts = tallyVotes(votes)
  const leadSet = new Set(leadIds)

  return (
    <>
      <Figures>
        <Figure label={t("v2.votes.floor.total")} value={votes.length} />
        <Figure
          label={t("v2.votes.floor.recorded")}
          value={counts.Yea + counts.Nay}
        />
        <Figure
          label={t("v2.votes.floor.notVoting")}
          value={counts["Not Voting"] + counts.Present}
        />
      </Figures>
      <Pills role="group" aria-label={t("v2.votes.filterLabel")}>
        <button
          type="button"
          aria-pressed={filter === "all"}
          onClick={() => {
            setFilter("all")
            setShown(PAGE)
          }}
        >
          {t("v2.votes.filterAll", { count: votes.length })}
        </button>
        <button
          type="button"
          aria-pressed={filter === "hers"}
          onClick={() => {
            setFilter("hers")
            setShown(PAGE)
          }}
        >
          {hers
            ? t("v2.votes.filterHersCount", { count: hers.length })
            : t("v2.votes.filterHers")}
        </button>
      </Pills>
      <Card>
        {filter === "hers" && lead.loading ? (
          <Empty>{t("v2.common.loading")}</Empty>
        ) : list.length === 0 ? (
          <Empty>{t("v2.votes.floor.none")}</Empty>
        ) : (
          <Rows>
            {(
              details.result ??
              pageVotes.map(v => ({
                ...v,
                motion: null,
                billId: null,
                date: null,
                pdfUrl: null,
                bill: undefined as Bill | undefined
              }))
            ).map(v => {
              const cited = rollCallInHistory(
                v.bill,
                v.branch,
                v.rollCallNumber
              )
              const motion = v.motion ?? cited?.question ?? null
              const pdf =
                v.pdfUrl ?? (cited ? rollCallPdfUrl(court, cited) : null)
              const date = v.date
                ? formatHistoryDate(v.date)
                : formatHistoryDate(cited?.date)
              return (
                <Vote key={v.id}>
                  <div>
                    <div className="label">{t("v2.votes.herVote")}</div>
                    <Chip $tone={responseTone(v.response)}>
                      {t(`v2.votes.response.${v.response}`)}
                    </Chip>
                  </div>
                  <div>
                    <div className="meta">
                      {[
                        date,
                        t("v2.votes.rollCall", { number: v.rollCallNumber }),
                        motion ? t(`v2.votes.kind.${voteKind(motion)}`) : null
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    <h3>{motion ?? t("v2.votes.motionUnknown")}</h3>
                    {v.billId && (
                      <div>
                        <Internal href={maple.bill({ court, id: v.billId })}>
                          {formatBillId(v.billId)}
                        </Internal>
                        {v.bill && <> · {v.bill.content.Title}</>}
                      </div>
                    )}
                    {v.billId && leadSet.has(v.billId) && (
                      <Chip $tone="blue" style={{ marginTop: 6 }}>
                        {t("v2.votes.herBill")}
                      </Chip>
                    )}
                  </div>
                  <div>
                    {cited && (
                      <>
                        <TallyBar
                          label={t("v2.votes.tallyAria", {
                            yeas: cited.yeas,
                            nays: cited.nays
                          })}
                          segments={[
                            { value: cited.yeas, color: TALLY_COLORS.yes },
                            { value: cited.nays, color: TALLY_COLORS.no }
                          ]}
                        />
                        <div className="legend">
                          {t("v2.votes.tally", {
                            yeas: cited.yeas,
                            nays: cited.nays
                          })}
                        </div>
                      </>
                    )}
                    {pdf && (
                      <External href={pdf} style={{ fontSize: "0.875rem" }}>
                        {t("v2.votes.pdf")}
                      </External>
                    )}
                  </div>
                </Vote>
              )
            })}
          </Rows>
        )}
        {shown < list.length && (
          <MoreButton onClick={() => setShown(shown + PAGE)}>
            {t("v2.common.showMore")}
          </MoreButton>
        )}
        <Note>
          {t("v2.votes.showing", {
            shown: Math.min(shown, list.length),
            total: list.length
          })}
        </Note>
      </Card>
    </>
  )
}

function CommitteeVotes({
  court,
  member,
  leadIds,
  committees
}: {
  court: number
  member: MemberContent
  leadIds: string[]
  committees: MemberCommittee[] | undefined
}) {
  const { t } = useTranslation("legislators")
  const lead = useLeadBills(court, leadIds, true)
  const votes = useMemo(
    () =>
      lead.result ? memberCommitteeVotes(lead.result, member.MemberCode) : [],
    [lead.result, member.MemberCode]
  )
  const names = new Map((committees ?? []).map(c => [c.code, c.name]))
  const count = (k: string) => votes.filter(v => v.response === k).length

  if (lead.loading) return <Empty>{t("v2.common.loading")}</Empty>
  return (
    <>
      <Figures>
        <Figure label={t("v2.votes.committee.total")} value={votes.length} />
        <Figure
          label={t("v2.votes.response.favorable")}
          value={count("favorable")}
        />
        <Figure
          label={t("v2.votes.response.adverse")}
          value={count("adverse")}
        />
        <Figure
          label={t("v2.votes.response.reserveRight")}
          value={count("reserveRight")}
        />
      </Figures>
      <Card>
        {votes.length === 0 ? (
          <Empty>{t("v2.votes.committee.none")}</Empty>
        ) : (
          <Rows>
            {votes.map((v, i) => (
              <Vote key={`${v.billId}-${i}`}>
                <div>
                  <div className="label">{t("v2.votes.herVote")}</div>
                  <Chip $tone={responseTone(v.response)}>
                    {t(`v2.votes.response.${v.response}`)}
                  </Chip>
                </div>
                <div>
                  <div className="meta">
                    {[
                      formatHistoryDate(v.date),
                      v.committeeCode
                        ? names.get(v.committeeCode) ?? v.committeeCode
                        : null
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <h3>{v.action}</h3>
                  <div>
                    <Internal href={maple.bill({ court, id: v.billId })}>
                      {formatBillId(v.billId)}
                    </Internal>{" "}
                    · {v.billTitle}
                  </div>
                </div>
                <div>
                  <TallyBar
                    label={t("v2.votes.committee.tally", v.counts)}
                    segments={[
                      { value: v.counts.favorable, color: TALLY_COLORS.yes },
                      { value: v.counts.adverse, color: TALLY_COLORS.no },
                      {
                        value: v.counts.reserveRight,
                        color: TALLY_COLORS.reserved
                      },
                      {
                        value: v.counts.noVoteRecorded,
                        color: TALLY_COLORS.other
                      }
                    ]}
                  />
                  <div className="legend">
                    {t("v2.votes.committee.tally", v.counts)}
                  </div>
                </div>
              </Vote>
            ))}
          </Rows>
        )}
        <Note>{t("v2.votes.committee.note")}</Note>
      </Card>
    </>
  )
}

export function VotesSection({
  court,
  member,
  votes,
  leadIds,
  committees
}: {
  court: number
  member: MemberContent
  votes: Async<MemberVote[]>
  leadIds: string[]
  committees: MemberCommittee[] | undefined
}) {
  const { t } = useTranslation("legislators")
  const [view, setView] = useState<"floor" | "committee">("floor")
  const floorCount =
    votes.status === "ready" && votes.value.length
      ? votes.value.length
      : undefined
  return (
    <div>
      <SectionTitle>{t("v2.nav.votes")}</SectionTitle>
      <Source>{t("v2.votes.source")}</Source>
      <HowToRead />
      <Toggle
        label={t("v2.votes.viewLabel")}
        value={view}
        onChange={setView}
        options={[
          {
            key: "floor",
            label:
              floorCount === undefined
                ? t("v2.votes.floorTab")
                : t("v2.votes.floorTabCount", { count: floorCount })
          },
          { key: "committee", label: t("v2.votes.committeeTab") }
        ]}
      />
      {view === "floor" ? (
        votes.status === "loading" ? (
          <Empty>{t("v2.common.loading")}</Empty>
        ) : votes.status === "error" || votes.value.length === 0 ? (
          <Card>
            <Empty>{t("v2.votes.floor.unavailable")}</Empty>
          </Card>
        ) : (
          <FloorVotes court={court} votes={votes.value} leadIds={leadIds} />
        )
      ) : (
        <CommitteeVotes
          court={court}
          member={member}
          leadIds={leadIds}
          committees={committees}
        />
      )}
    </div>
  )
}
