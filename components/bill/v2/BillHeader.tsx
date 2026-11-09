import { Cosponsors } from "components/bill/Cosponsors"
import { Bill } from "components/db"
import { dateInFuture } from "components/db/events"
import { useFlags } from "components/featureFlags"
import { formatBillId } from "components/formatting"
import { committeeURL, External, Internal, maple } from "components/links"
import { courtOrdinal } from "components/lobbying/sessions"
import { FollowBillButton } from "components/shared/FollowButton"
import { fromUnixTime } from "date-fns"
import { last } from "lodash"
import { useTranslation } from "next-i18next"
import { Fragment } from "react"
import styled from "styled-components"
import { useAuth } from "components/auth"
import { OverlayTrigger, Tooltip } from "components/bootstrap"
import { oneLineActionText, plainActionText } from "./actionText"
import { formatHearingDate, formatHistoryDate } from "./dates"
import { DraftOrigin } from "./newDraft"
import { BillHearing, heardWith } from "./useBillHearings"
import { useBillUrlState } from "./useBillUrlState"
import Link from "next/link"

const Crumb = styled.div`
  font-size: 0.85rem;
  color: var(--maple-text-muted);
  margin-bottom: var(--maple-space-sm);

  a {
    color: inherit;
  }
`

const NumberLine = styled.div`
  font-family: var(--maple-font-heading);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--maple-brand-primary);

  a {
    color: inherit;
  }
`

const Title = styled.h1`
  font-family: var(--maple-font-heading);
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--maple-text-strong);
  margin: var(--maple-space-xs) 0 var(--maple-space-sm);

  @media (max-width: 575.98px) {
    font-size: 1.3rem;
  }
`

const StatusLine = styled.p`
  font-size: 0.95rem;
  color: var(--maple-text-body);
  margin: 0 0 var(--maple-space-sm);

  b {
    color: var(--maple-text-strong);
  }

  a {
    color: inherit;
  }
`

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--maple-space-sm) var(--maple-space-xl);
  font-size: 0.9rem;
  color: var(--maple-text-body);
  align-items: center;

  b {
    color: var(--maple-text-strong);
    font-weight: 600;
  }

  a {
    color: var(--maple-brand-primary);
  }

  .sponsor-photo {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    margin-right: 0.4rem;
    vertical-align: middle;
    background: var(--maple-color-gray-subtle-bg);
  }
`

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--maple-space-md);
`

const DraftLine = styled.p`
  font-size: 0.9rem;
  color: var(--maple-text-body);
  margin: var(--maple-space-sm) 0 0;
`

/** Bill numbers in a sentence, each linking to its page in the same court. */
export function BillLinks({
  court,
  ids,
  max
}: {
  court: number
  ids: string[]
  /** List this many, then "and N others". */
  max?: number
}) {
  const { t } = useTranslation(["billPage", "common"])
  const shown = max !== undefined && ids.length > max ? ids.slice(0, max) : ids
  const rest = ids.length - shown.length
  return (
    <>
      {shown.map((id, i) => (
        <Fragment key={id}>
          {i > 0 &&
            (i === shown.length - 1 && rest === 0
              ? ` ${t("billPage:list.and")} `
              : ", ")}
          <Internal href={maple.bill({ court, id })}>
            {formatBillId(id)}
          </Internal>
        </Fragment>
      ))}
      {rest > 0 && <> {t("common:bill.and_others", { count: rest })}</>}
    </>
  )
}

export function BillHeader({
  bill,
  isBallotMeasure,
  draft,
  hearings
}: {
  bill: Bill
  isBallotMeasure: boolean
  draft?: DraftOrigin
  /** The bill's hearing documents, once loaded. */
  hearings?: BillHearing[]
}) {
  const { t } = useTranslation(["billPage", "common"])
  const flags = useFlags()
  const { user } = useAuth()
  const { hrefForTab } = useBillUrlState()
  const latestHearing = hearings?.find(h => h.date)
  const heardWithCount = hearings
    ? new Set(
        hearings.flatMap(h => heardWith(h, bill.id).map(b => b.BillNumber))
      ).size
    : 0

  const latest = last(bill.history)
  const primary = bill.content.PrimarySponsor
  const cosponsors = bill.content.Cosponsors.filter(s => s.Id !== primary?.Id)
  const committee = bill.currentCommittee
  const hearingSoon =
    bill.nextHearingAt && dateInFuture(bill.nextHearingAt)
      ? fromUnixTime(bill.nextHearingAt.seconds)
      : undefined

  return (
    <header>
      <Crumb>
        <Internal href="/bills">{t("billPage:breadcrumb.bills")}</Internal>
        {" / "}
        {formatBillId(bill.id)}
      </Crumb>
      <TopRow>
        <div>
          <NumberLine>
            <External
              href={`https://malegislature.gov/Bills/${bill.court}/${bill.id}`}
            >
              {formatBillId(bill.id)}
            </External>
            {" · "}
            {t("billPage:header.court", {
              courtOrdinal: courtOrdinal(bill.court)
            })}
          </NumberLine>
          <Title>{bill.content.Title}</Title>
        </div>
        {flags.notifications && user && (
          <div className="flex-shrink-0">
            <FollowBillButton bill={bill} />
          </div>
        )}
      </TopRow>

      {latest ? (
        <StatusLine>
          <b>{t("billPage:header.latestAction")}:</b>{" "}
          <OverlayTrigger
            placement="bottom"
            overlay={
              <Tooltip id="bill-latest-action">
                {t("billPage:header.latestActionTooltip", {
                  date: formatHistoryDate(latest.Date)
                })}
                <br />
                {plainActionText(latest.Action)}
              </Tooltip>
            }
          >
            <span tabIndex={0}>{oneLineActionText(latest.Action)}</span>
          </OverlayTrigger>
          {latest.Date && (
            <span className="text-muted">
              {" "}
              · {formatHistoryDate(latest.Date)}
            </span>
          )}
        </StatusLine>
      ) : (
        <StatusLine>{t("billPage:header.noHistory")}</StatusLine>
      )}

      <Meta>
        {!isBallotMeasure && primary && (
          <span>
            {t("billPage:header.sponsor")}:{" "}
            <img
              className="sponsor-photo"
              src={`https://malegislature.gov/Legislators/Profile/170/${primary.Id}.jpg`}
              alt=""
              aria-hidden="true"
            />
            <b>
              <External
                href={`https://malegislature.gov/Legislators/Profile/${primary.Id}`}
              >
                {primary.Name}
              </External>
            </b>
          </span>
        )}
        {committee && (
          <span>
            {t("billPage:header.committee")}:{" "}
            <b>
              <External href={committeeURL(committee.id)}>
                {committee.name}
              </External>
            </b>
          </span>
        )}
        {hearingSoon ? (
          <span>
            <b>
              {t("common:bill.hearing_scheduled_for", { date: hearingSoon })}
            </b>
          </span>
        ) : (
          latestHearing && (
            <span>
              {t("billPage:header.hearing")}:{" "}
              <b>
                <Link href={hrefForTab("hearing")} shallow scroll={false}>
                  {formatHearingDate(latestHearing.date)}
                </Link>
              </b>
            </span>
          )
        )}
        {heardWithCount > 0 && (
          <span>
            <Link href={hrefForTab("hearing")} shallow scroll={false}>
              {t("billPage:header.heardWith", { count: heardWithCount })}
            </Link>
          </span>
        )}
        {!isBallotMeasure && cosponsors.length > 0 && (
          <span>
            <Cosponsors bill={bill}>
              {t("billPage:header.cosponsors", { count: cosponsors.length })}
            </Cosponsors>
          </span>
        )}
      </Meta>

      {draft && (
        <DraftLine>
          {t(
            draft.kind === "newDraft"
              ? "billPage:header.newDraftOf"
              : "billPage:header.substitutedFor"
          )}{" "}
          <BillLinks court={bill.court} ids={draft.billIds} />
        </DraftLine>
      )}
    </header>
  )
}
