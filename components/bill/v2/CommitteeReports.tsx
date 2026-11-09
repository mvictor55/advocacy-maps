import { absenceSentences } from "components/bill/absence"
import {
  COMMITTEE_ACTION_KEYS,
  CommitteeReport,
  CommitteeRollCall,
  committeeStage,
  spellOut
} from "components/bill/committeeVotes"
import { whereItStands } from "components/bill/whereItStands"
import { OverlayTrigger, Tooltip } from "components/bootstrap"
import { Bill } from "components/db"
import { loadDoc } from "components/db/common"
import { committeeURL, External } from "components/links"
import type { CommitteeRecommendation } from "components/hearing/hearing"
import { useTranslation } from "next-i18next"
import { Fragment, useMemo } from "react"
import { useAsync } from "react-async-hook"
import styled from "styled-components"
import { formatHistoryDate } from "./dates"
import { documentKind } from "./documentKind"
import { Muted } from "./SourceNote"
import { Term } from "./Term"

const Report = styled.div`
  padding: var(--maple-space-sm) 0;
  border-top: 1px solid var(--maple-surface-border);

  &:first-child {
    border-top: 0;
  }

  .committee {
    font-size: 0.9rem;
    color: var(--maple-text-body);
  }

  .action {
    font-weight: 600;
    color: var(--maple-text-strong);
  }

  .raw {
    font-size: 0.85rem;
    color: var(--maple-text-muted);
  }

  dl {
    margin: var(--maple-space-sm) 0 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--maple-space-xs);
    font-size: 0.9rem;
  }

  dt {
    font-weight: 600;
    color: var(--maple-text-body);
  }

  dd {
    margin: 0 0 var(--maple-space-xs);
  }
`

type CommitteeDoc = {
  content?: { FullName?: string; Name?: string }
  members?: { id: string; name: string }[]
}

/** The committees named in the reports: their names and members, from
 * generalCourts/{court}/committees/{code}, one read per committee. */
function useCommittees(court: number, codes: string[]) {
  return useAsync(fetchCommittees, [court, codes.join(",")])
}

async function fetchCommittees(
  court: number,
  key: string
): Promise<Record<string, CommitteeDoc>> {
  const out: Record<string, CommitteeDoc> = {}
  await Promise.all(
    (key ? key.split(",") : []).map(async code => {
      try {
        const doc = await loadDoc(`generalCourts/${court}/committees/${code}`)
        if (doc) out[code] = doc as CommitteeDoc
      } catch {
        // Names fall back to the codes.
      }
    })
  )
  return out
}

function Members({
  codes,
  committee
}: {
  codes: string[]
  committee: CommitteeDoc | undefined
}) {
  const names = new Map((committee?.members ?? []).map(m => [m.id, m.name]))
  return (
    <>
      {codes.map((code, i) => (
        <Fragment key={code}>
          {i > 0 && ", "}
          <External
            href={`https://malegislature.gov/Legislators/Profile/${code}`}
          >
            {names.get(code) ?? code}
          </External>
        </Fragment>
      ))}
    </>
  )
}

function Vote({
  vote,
  committee
}: {
  vote: CommitteeRollCall
  committee: CommitteeDoc | undefined
}) {
  const { t } = useTranslation("billPage")
  const groups: [string, string[], React.ReactNode][] = [
    ["forReport", vote.favorable, null],
    ["againstReport", vote.adverse, null],
    [
      "reserved",
      vote.reserveRight,
      <Term key="r" id="reservedRight">
        {t("terms.reservedRight.term")}
      </Term>
    ],
    ["noVote", vote.noVoteRecorded, null]
  ]
  return (
    <>
      {(vote.question || vote.date) && (
        <div className="raw">
          {vote.question && t("votes.question", { question: vote.question })}
          {vote.date && ` · ${formatHistoryDate(vote.date)}`}
        </div>
      )}
      <dl>
        {groups
          .filter(([, codes]) => codes.length > 0)
          .map(([key, codes, term]) => (
            <Fragment key={key}>
              <dt>
                {t(`votes.${key}`, { count: codes.length })}
                {term && <> ({term})</>}
              </dt>
              <dd>
                <Members codes={codes} committee={committee} />
              </dd>
            </Fragment>
          ))}
      </dl>
    </>
  )
}

function ReportRow({
  report,
  committee
}: {
  report: CommitteeReport
  committee: CommitteeDoc | undefined
}) {
  const { t } = useTranslation("billPage")
  const key = COMMITTEE_ACTION_KEYS[report.action]
  const label = key ? t(`votes.actions.${key}`) : report.action
  const abbreviations = spellOut(report.action)
  const name =
    committee?.content?.FullName ??
    committee?.content?.Name ??
    report.committeeCode
  const plain =
    key === "study" || key === "studyTimeExpired" ? (
      <Term id="studyOrder">{label}</Term>
    ) : key === "favorable" ? (
      <Term id="reportedFavorably">{label}</Term>
    ) : key === "redraft" ? (
      <Term id="newDraft">{label}</Term>
    ) : key === "placeInOrdersOfTheDay" ? (
      <Term id="ordersOfTheDay">{label}</Term>
    ) : key === "correctlyDrawn" ? (
      <Term id="correctlyDrawn">{label}</Term>
    ) : key === "placeOnFile" ? (
      <Term id="placedOnFile">{label}</Term>
    ) : (
      label
    )
  return (
    <Report>
      {name && (
        <div className="committee">
          {report.committeeCode ? (
            <External href={committeeURL(report.committeeCode)}>
              {name}
            </External>
          ) : (
            name
          )}
        </div>
      )}
      <div className="action">
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id={`rec-${report.committeeCode}-${report.action}`}>
              {t("votes.recordedAs", { action: report.action })}
              {abbreviations && <> · {abbreviations}</>}
            </Tooltip>
          }
        >
          <span tabIndex={0}>{plain}</span>
        </OverlayTrigger>
      </div>
      {report.votes.map((v, i) => (
        <Vote key={i} vote={v} committee={committee} />
      ))}
    </Report>
  )
}

/**
 * The committee stage, in one of three states: not reported, reported
 * without a recorded vote, or reported with the members' votes on the
 * recommendation.
 */
export function CommitteeReports({
  bill,
  now = new Date()
}: {
  bill: Bill
  now?: Date
}) {
  const { t } = useTranslation("billPage")
  const recommendations = (
    bill.content as { CommitteeRecommendations?: CommitteeRecommendation[] }
  ).CommitteeRecommendations
  const stage = useMemo(
    () => committeeStage(recommendations),
    [recommendations]
  )
  const codes = useMemo(
    () =>
      stage.kind === "notReported"
        ? []
        : [
            ...new Set(
              stage.reports
                .map(r => r.committeeCode)
                .filter((c): c is string => !!c)
            )
          ].sort(),
    [stage]
  )
  const committees = useCommittees(bill.court, codes)

  if (stage.kind === "notReported") {
    const absence = absenceSentences({
      court: bill.court,
      kind: documentKind(bill),
      stands: whereItStands(bill.history, bill.id),
      hasHearing: true,
      now
    })
    if (!absence.committee) return null
    return (
      <Muted>
        {t(
          absence.committee === "noReportYet"
            ? "votes.notReportedYet"
            : "votes.notReportedRecorded"
        )}
      </Muted>
    )
  }

  return (
    <>
      {stage.kind === "reportedNoVote" && (
        <Muted>{t("votes.reportedNoVote")}</Muted>
      )}
      {stage.kind === "reportedWithVotes" && (
        <Muted className="small mb-2">{t("votes.committeeIntro")}</Muted>
      )}
      {stage.reports.map((r, i) => (
        <ReportRow
          key={i}
          report={r}
          committee={
            r.committeeCode ? committees.result?.[r.committeeCode] : undefined
          }
        />
      ))}
    </>
  )
}
