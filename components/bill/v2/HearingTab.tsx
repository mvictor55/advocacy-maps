import { Button } from "components/bootstrap"
import { Bill } from "components/db"
import { dateInFuture } from "components/db/events"
import { useFlags } from "components/featureFlags"
import { formatBillId } from "components/formatting"
import { committeeURL, External, Internal, maple } from "components/links"
import { OverlayTrigger, Tooltip } from "components/bootstrap"
import { fromUnixTime } from "date-fns"
import { useTranslation } from "next-i18next"
import { Fragment, useState } from "react"
import styled from "styled-components"
import {
  formatHearingDate,
  formatHearingTime,
  formatHistoryDate
} from "./dates"
import { documentKind } from "./documentKind"
import { DraftNote } from "./DraftNote"
import { hearingsFromHistory, HistoryHearing } from "./hearingHistory"
import { DraftOrigin } from "./newDraft"
import { Muted, PanelSection, SourceNote } from "./SourceNote"
import { AgendaBill, BillHearing, heardWith } from "./useBillHearings"

/** How many "heard with" bills are listed before "and N more". */
export const HEARD_WITH_SHOWN = 10

const HearingList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  > li {
    padding: var(--maple-space-md) 0;
    border-top: 1px solid var(--maple-surface-border);
  }

  > li:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .when {
    font-weight: 600;
    color: var(--maple-text-strong);
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--maple-space-sm) var(--maple-space-lg);
    font-size: 0.9rem;
    margin-top: var(--maple-space-xs);
  }

  .heard-with {
    font-size: 0.9rem;
    margin-top: var(--maple-space-sm);
    color: var(--maple-text-body);
  }

  .heard-with .btn {
    padding: 0;
    font-size: inherit;
    vertical-align: baseline;
  }
`

/** "H.78, H.80, … and 30 more", each linking to its bill page. */
export function HeardWith({
  bills,
  shown = HEARD_WITH_SHOWN
}: {
  bills: AgendaBill[]
  shown?: number
}) {
  const { t } = useTranslation("billPage")
  const [open, setOpen] = useState(false)
  if (bills.length === 0) return null
  const visible = open ? bills : bills.slice(0, shown)
  const rest = bills.length - visible.length
  return (
    <p className="heard-with mb-0">
      {t("hearing.heardWith", { count: bills.length })}{" "}
      {visible.map((b, i) => (
        <Fragment key={`${b.GeneralCourtNumber}-${b.BillNumber}`}>
          {i > 0 && ", "}
          <Internal
            href={maple.bill({ court: b.GeneralCourtNumber, id: b.BillNumber })}
            title={b.Title}
          >
            {formatBillId(b.BillNumber)}
          </Internal>
        </Fragment>
      ))}
      {rest > 0 && (
        <>
          {" "}
          <Button
            variant="link"
            aria-expanded={false}
            onClick={() => setOpen(true)}
          >
            {t("hearing.andMore", { count: rest })}
          </Button>
        </>
      )}
      {open && bills.length > shown && (
        <>
          {" "}
          <Button
            variant="link"
            aria-expanded={true}
            onClick={() => setOpen(false)}
          >
            {t("hearing.showFewer")}
          </Button>
        </>
      )}
    </p>
  )
}

/** The hearings from the Legislature's hearing documents. */
export function HearingDocumentList({
  bill,
  hearings
}: {
  bill: Bill
  hearings: BillHearing[]
}) {
  const { t } = useTranslation("billPage")
  const flags = useFlags()
  return (
    <HearingList>
      {hearings.map(h => {
        const time = formatHearingTime(h.date)
        return (
          <li key={h.eventId}>
            <div className="when">
              {h.date
                ? time
                  ? t("hearing.dateTime", {
                      date: formatHearingDate(h.date),
                      time
                    })
                  : formatHearingDate(h.date)
                : t("hearing.hearingNumber", { id: h.eventId })}
            </div>
            {h.committeeName && (
              <div>
                {h.committeeCode ? (
                  <External href={committeeURL(h.committeeCode)}>
                    {h.committeeName}
                  </External>
                ) : (
                  h.committeeName
                )}
              </div>
            )}
            <div className="links">
              {flags.hearingsAndTranscriptions && (
                <Internal href={maple.hearing({ eventId: h.eventId })}>
                  {t(
                    h.hasVideo
                      ? "hearing.videoAndTranscript"
                      : "hearing.hearingPage"
                  )}
                </Internal>
              )}
              <External
                href={`https://malegislature.gov/Events/Hearings/Detail/${h.eventId}`}
              >
                {t("hearing.onLegislatureSite")}
              </External>
            </div>
            <HeardWith bills={heardWith(h, bill.id)} />
          </li>
        )
      })}
    </HearingList>
  )
}

/** Hearing notices read from the bill history, for sessions MAPLE has no
 * hearing documents for. No video or transcript is linked. */
export function HistoryHearingList({ notices }: { notices: HistoryHearing[] }) {
  const { t } = useTranslation("billPage")
  return (
    <HearingList>
      {notices.map(n => (
        <li key={n.historyIndex}>
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip id={`hearing-line-${n.historyIndex}`}>
                {n.action}
              </Tooltip>
            }
          >
            <div className="when" tabIndex={0}>
              {n.kind === "canceled"
                ? t("hearing.canceled")
                : t(
                    n.kind === "rescheduled"
                      ? "hearing.rescheduledTo"
                      : "hearing.scheduledFor",
                    {
                      date: formatHistoryDate(n.date),
                      time:
                        n.start && n.end ? `${n.start}–${n.end}` : n.start ?? ""
                    }
                  )}
            </div>
          </OverlayTrigger>
          {n.kind !== "canceled" && (n.location || n.committee) && (
            <div>{[n.committee, n.location].filter(Boolean).join(" · ")}</div>
          )}
        </li>
      ))}
    </HearingList>
  )
}

/**
 * What to say when no hearing is on record. Only a bill or resolve referred
 * to a joint committee is expected to have one; for orders, amendments,
 * reports and other documents the sentence says what the document is.
 */
function NoHearing({ bill }: { bill: Bill }) {
  const { t } = useTranslation("billPage")
  switch (documentKind(bill)) {
    case "referredBill":
    case "unreferredBill":
      return <Muted>{t("hearing.noneRecorded")}</Muted>
    case "committeeDocument":
      return <Muted>{t("hearing.committeeDocument")}</Muted>
    default:
      return (
        <Muted>
          {t("hearing.otherType", {
            type: bill.content.LegislationTypeName
          })}
        </Muted>
      )
  }
}

export function HearingTab({
  bill,
  draft,
  hearings,
  loading
}: {
  bill: Bill
  draft?: DraftOrigin
  /** The bill's hearings from its own session; undefined while loading. */
  hearings: BillHearing[] | undefined
  loading: boolean
}) {
  const { t } = useTranslation(["billPage", "common"])
  const hasIds = (bill.hearingIds?.length ?? 0) > 0
  const notices = hearingsFromHistory(bill.history)
  const hearingSoon =
    bill.nextHearingAt && dateInFuture(bill.nextHearingAt)
      ? fromUnixTime(bill.nextHearingAt.seconds)
      : undefined

  let body
  if (hasIds && hearings === undefined) {
    body = (
      <Muted>
        {t(loading ? "billPage:hearing.loading" : "billPage:hearing.loadError")}
      </Muted>
    )
  } else if (hearings && hearings.length > 0) {
    body = (
      <>
        <Muted className="mb-3">
          {t("billPage:hearing.intro", { count: hearings.length })}
        </Muted>
        <HearingDocumentList bill={bill} hearings={hearings} />
      </>
    )
  } else if (notices.length > 0) {
    body = (
      <>
        <Muted className="mb-3">{t("billPage:hearing.fromHistory")}</Muted>
        <HistoryHearingList notices={notices} />
      </>
    )
  } else if (draft) {
    body = <DraftNote bill={bill} draft={draft} about="hearing" />
  } else if (hearingSoon) {
    body = (
      <Muted>
        {t("common:bill.hearing_scheduled_for", { date: hearingSoon })}
      </Muted>
    )
  } else {
    body = <NoHearing bill={bill} />
  }

  return (
    <PanelSection title={t("billPage:hearing.title")} id="hearing">
      {body}
      <SourceNote>{t("billPage:source.legislature")}</SourceNote>
    </PanelSection>
  )
}
