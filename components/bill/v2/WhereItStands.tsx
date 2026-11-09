import { absenceSentences } from "components/bill/absence"
import {
  floorBranch,
  Milestone,
  Status,
  WhereItStands as Stands,
  whereAnOrderStands,
  whereItStands
} from "components/bill/whereItStands"
import { OverlayTrigger, Tooltip } from "components/bootstrap"
import { Bill } from "components/db"
import { formatBillId } from "components/formatting"
import { Internal, maple } from "components/links"
import { useTranslation } from "next-i18next"
import { ReactNode, useMemo } from "react"
import styled from "styled-components"
import { formatHistoryDate } from "./dates"
import { documentKind } from "./documentKind"
import { PanelSection, SourceNote } from "./SourceNote"
import { Term, TermKey } from "./Term"

const Steps = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;

  li {
    display: grid;
    grid-template-columns: 1.25rem minmax(0, 1fr);
    column-gap: 0.75rem;
    padding: 0.35rem 0;
    position: relative;
  }

  li::before {
    content: "";
    grid-column: 1;
    justify-self: center;
    width: 0.75rem;
    height: 0.75rem;
    margin-top: 0.3rem;
    border-radius: 50%;
    border: 2px solid var(--maple-border-default);
    background: var(--maple-surface-base);
    z-index: 1;
  }

  li.done::before {
    background: var(--maple-brand-primary);
    border-color: var(--maple-brand-primary);
  }

  li.current::before {
    box-shadow: 0 0 0 3px var(--maple-surface-accent-strong);
  }

  li.dead.current::before {
    background: var(--maple-text-muted);
    border-color: var(--maple-text-muted);
  }

  li + li::after {
    content: "";
    position: absolute;
    left: calc(0.625rem - 1px);
    top: -0.6rem;
    height: 1rem;
    border-left: 2px solid var(--maple-border-default);
  }

  li.done + li.done::after {
    border-left-color: var(--maple-brand-primary);
  }

  .name {
    color: var(--maple-text-body);
  }

  li.done .name,
  li.current .name {
    color: var(--maple-text-strong);
  }

  li.current .name {
    font-weight: 600;
  }

  .date {
    color: var(--maple-text-muted);
    font-size: 0.875rem;
    margin-left: 0.5rem;
    white-space: nowrap;
  }

  .note {
    grid-column: 2;
    font-size: 0.875rem;
    color: var(--maple-text-muted);
  }

  @media (max-width: 575.98px) {
    li {
      padding: 0.2rem 0;
    }

    .date {
      display: block;
      margin-left: 0;
    }
  }
`

/** At phone width the steps not yet reached fold into one line that opens
 * on a tap; on wider screens every step is shown. */
const Remaining = styled.details`
  summary {
    list-style: none;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--maple-text-body);
    padding: 0.35rem 0 0.35rem 2rem;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary::before {
    content: "▸ ";
    color: var(--maple-text-muted);
  }

  &[open] summary {
    display: none;
  }

  @media (min-width: 576px) {
    summary {
      display: none;
    }
  }
`

const StatusLine = styled.p`
  margin: var(--maple-space-md) 0 0;
  padding-top: var(--maple-space-sm);
  border-top: 1px solid var(--maple-surface-border);
  color: var(--maple-text-strong);
  font-weight: 600;

  small {
    display: block;
    font-weight: 400;
    color: var(--maple-text-muted);
  }
`

/** Wraps `children` in a tooltip holding the Legislature's own wording. */
function RawLine({
  action,
  children
}: {
  action: string | undefined
  children: ReactNode
}) {
  const { t } = useTranslation("billPage")
  if (!action) return <>{children}</>
  return (
    <OverlayTrigger
      placement="top"
      overlay={
        <Tooltip id={`raw-${action.slice(0, 24)}`}>
          {t("stands.recordedAs")} {action}
        </Tooltip>
      }
    >
      <span tabIndex={0}>{children}</span>
    </OverlayTrigger>
  )
}

/** The status label with its term, where it has one. */
function StatusLabel({ status, court }: { status: Status; court: number }) {
  const { t } = useTranslation("billPage")
  const bill = status.billId ? (
    <Internal href={maple.bill({ court, id: status.billId })}>
      {formatBillId(status.billId)}
    </Internal>
  ) : null
  switch (status.key) {
    case "law":
      return (
        <>
          {t("stands.status.law")}
          {status.chapter && `, ${status.chapter}`}
          {status.inPart && ` (${t("stands.status.inPart")})`}
        </>
      )
    case "supersededBy":
      return (
        <>
          {t("stands.status.supersededBy")} {bill}{" "}
          <small>
            (<Term id="newDraft">{t("terms.newDraft.term")}</Term>)
          </small>
        </>
      )
    case "sentToStudy":
      return (
        <>
          <Term id="studyOrder">{t("stands.status.sentToStudy")}</Term>
          {bill && <> · {bill}</>}
        </>
      )
    case "deadAtDissolution":
      return <>{t("stands.status.deadAtDissolution", { court })}</>
    case "placedOnFile":
      return <Term id="placedOnFile">{t("stands.status.placedOnFile")}</Term>
    case "adverseReport":
      return <>{t("stands.status.adverseReport")}</>
    case "vetoed":
      return <>{t("stands.status.vetoed")}</>
    case "returnedWithAmendment":
      return <>{t("stands.status.returnedWithAmendment")}</>
    case "inConference":
      return (
        <Term id="conferenceCommittee">
          {t("stands.status.inConference", {
            date: formatHistoryDate(status.date)
          })}
        </Term>
      )
  }
}

/** A House bill filed by a legislator (not a committee or a petition):
 * House Rule 27 sets its reporting deadline from the 194th on. */
export function filedByHouseMember(bill: Bill): boolean {
  return bill.id.startsWith("H") && bill.content?.PrimarySponsor?.Type === 1
}

const DEAD: ReadonlySet<Status["key"]> = new Set([
  "supersededBy",
  "deadAtDissolution",
  "sentToStudy",
  "placedOnFile",
  "adverseReport"
])

function stepTerm(m: Milestone): TermKey | undefined {
  switch (m.key) {
    case "reportedOut":
      return "reportedFavorably"
    case "passedFirst":
    case "passedSecond":
      return "engrossed"
    case "toGovernor":
      return "enacted"
    default:
      return undefined
  }
}

/**
 * The milestone strip and the status line, built from the bill's history.
 * Each step keeps the Legislature's own line in a tooltip. Steps that have
 * not happened say so only when the record supports it (see absence.ts).
 */
export function WhereItStandsPanel({
  bill,
  hasHearing,
  hearingDate,
  hearingIso,
  now = new Date()
}: {
  bill: Bill
  /** A hearing is on record (a hearing document or a notice in the history). */
  hasHearing: boolean
  /** The hearing's date, formatted, when known. */
  hearingDate?: string
  /** The hearing's date as "YYYY-MM-DD", for the reporting deadline. */
  hearingIso?: string
  /** For tests: today's date. */
  now?: Date
}) {
  const { t } = useTranslation("billPage")
  const stands: Stands = useMemo(
    () => whereItStands(bill.history, bill.id),
    [bill.history, bill.id]
  )
  const kind = documentKind(bill)
  if (kind === "other") return null
  if (kind === "order") return <OrderPanel bill={bill} />
  const absence = absenceSentences({
    court: bill.court,
    kind,
    stands,
    history: bill.history,
    hasHearing,
    hearingDate: hearingIso,
    filedByHouseMember: filedByHouseMember(bill),
    now
  })
  const dead = stands.status ? DEAD.has(stands.status.key) : false

  const stepName = (m: Milestone) => {
    switch (m.key) {
      case "passedFirst":
      case "passedSecond":
        return t("stands.steps.passed", {
          branch: floorBranch(m.key, stands.origin)
        })
      default:
        return t(`stands.steps.${m.key}`)
    }
  }

  const noteFor = (m: Milestone): ReactNode => {
    if (m.key === "inCommittee" && m.reached) {
      if (hearingDate) return t("stands.notes.hearing", { date: hearingDate })
      if (absence.hearing) return t(`stands.notes.${absence.hearing}`)
    }
    if (m.key === "reportedOut" && !m.reached && absence.committee)
      return t(`stands.notes.${absence.committee}`)
    if (m.key === "passedFirst" && !m.reached && absence.floor)
      return t(`stands.notes.${absence.floor}`)
    return null
  }

  const renderStep = (m: Milestone) => {
    const term = m.reached ? stepTerm(m) : undefined
    const name = term ? <Term id={term}>{stepName(m)}</Term> : stepName(m)
    const note = noteFor(m)
    return (
      <li
        key={m.key}
        className={[
          m.reached ? "done" : "",
          m.key === stands.furthest ? "current" : "",
          dead ? "dead" : ""
        ].join(" ")}
        aria-current={m.key === stands.furthest ? "step" : undefined}
      >
        <span className="name">
          <RawLine action={m.action}>
            {name}
            {m.reached && m.date && (
              <span className="date">{formatHistoryDate(m.date)}</span>
            )}
          </RawLine>
        </span>
        {note && <span className="note">{note}</span>}
      </li>
    )
  }

  // Everything up to the first unreached step with a note stays in view;
  // the steps after it fold at phone width.
  const firstHidden = stands.milestones.findIndex(
    (m, i) =>
      !m.reached && !noteFor(m) && i > 0 && !stands.milestones[i - 1].reached
  )
  const shown =
    firstHidden > 0
      ? stands.milestones.slice(0, firstHidden)
      : stands.milestones
  const folded = firstHidden > 0 ? stands.milestones.slice(firstHidden) : []

  return (
    <PanelSection title={t("stands.title")} id="where-it-stands">
      <Steps>{shown.map(renderStep)}</Steps>
      {folded.length > 0 && (
        <Remaining>
          <summary>
            {t("stands.remaining", {
              steps: folded.map(stepName).join(", ")
            })}
          </summary>
          <Steps>{folded.map(renderStep)}</Steps>
        </Remaining>
      )}
      {stands.status && (
        <StatusLine>
          <RawLine action={stands.status.action}>
            <StatusLabel status={stands.status} court={bill.court} />
          </RawLine>
          {stands.status.date && (
            <small>{formatHistoryDate(stands.status.date)}</small>
          )}
        </StatusLine>
      )}
      <SourceNote>
        {t("stands.source")}{" "}
        <Internal href="/learn/legislative-process">
          {t("terms.learnMore")}
        </Internal>
      </SourceNote>
    </PanelSection>
  )
}

/** An Order's ladder: filed, then adopted. Orders never go to the Governor. */
function OrderPanel({ bill }: { bill: Bill }) {
  const { t } = useTranslation("billPage")
  const { adopted } = whereAnOrderStands(bill.history)
  return (
    <PanelSection title={t("stands.title")} id="where-it-stands">
      <Steps>
        <li
          className={adopted ? "done" : "done current"}
          aria-current={adopted ? undefined : "step"}
        >
          <span className="name">{t("stands.steps.filed")}</span>
        </li>
        <li
          className={adopted ? "done current" : ""}
          aria-current={adopted ? "step" : undefined}
        >
          <span className="name">
            <RawLine action={adopted?.action}>
              {t("stands.steps.adopted")}
              {adopted?.date && (
                <span className="date">{formatHistoryDate(adopted.date)}</span>
              )}
            </RawLine>
          </span>
          {!adopted && (
            <span className="note">{t("stands.notes.orderNotAdopted")}</span>
          )}
        </li>
      </Steps>
      <SourceNote>{t("stands.orderSource")}</SourceNote>
    </PanelSection>
  )
}

/** For the header: the one-line status or furthest step. */
export function useStandsSummary(bill: Bill): {
  text: string
  action?: string
} {
  const { t } = useTranslation("billPage")
  const stands = useMemo(
    () => whereItStands(bill.history, bill.id),
    [bill.history, bill.id]
  )
  const kind = documentKind(bill)
  if (kind === "order") {
    const { adopted } = whereAnOrderStands(bill.history)
    return adopted
      ? { text: t("stands.steps.adopted"), action: adopted.action }
      : { text: t("stands.steps.filed") }
  }
  if (kind === "other") {
    return {
      text: t("stands.otherDocument", {
        type: bill.content.LegislationTypeName
      })
    }
  }
  if (stands.status) {
    const s = stands.status
    const bill_ = s.billId ? formatBillId(s.billId) : ""
    const text =
      s.key === "law"
        ? [t("stands.status.law"), s.chapter].filter(Boolean).join(", ")
        : s.key === "supersededBy"
        ? `${t("stands.status.supersededBy")} ${bill_}`
        : s.key === "deadAtDissolution"
        ? t("stands.status.deadAtDissolution", { court: bill.court })
        : s.key === "inConference"
        ? t("stands.status.inConference", { date: formatHistoryDate(s.date) })
        : t(`stands.status.${s.key}`)
    return { text, action: s.action }
  }
  const furthest = stands.milestones.find(m => m.key === stands.furthest)
  const text =
    furthest?.key === "passedFirst" || furthest?.key === "passedSecond"
      ? t("stands.steps.passed", {
          branch: floorBranch(furthest.key, stands.origin)
        })
      : furthest?.key === "inCommittee" && furthest.committee
      ? t("stands.inCommitteeNamed", { committee: furthest.committee })
      : t(`stands.steps.${stands.furthest}`)
  return { text, action: furthest?.action }
}
