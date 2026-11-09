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
import { formatHistoryDate } from "./dates"
import { DraftOrigin } from "./newDraft"

const Crumb = styled.div`
  font-size: 0.85rem;
  color: var(--maple-text-body);
  margin-bottom: var(--maple-space-sm);

  a {
    color: inherit;
  }
`

const NumberLine = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--maple-brand-primary);

  a {
    color: inherit;
  }
`

const Title = styled.h1`
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--maple-text-strong);
  margin: var(--maple-space-xs) 0 var(--maple-space-sm);

  @media (max-width: 575.98px) {
    font-size: 1.3rem;
  }
`

/** The plain-language status, as MAPLE's half-pill navy flag (today's
 * bill page shows the latest action the same way). */
const StatusFlag = styled.div`
  display: inline-block;
  max-width: 100%;
  background: var(--bs-secondary);
  color: var(--maple-text-inverse);
  border-radius: var(--maple-radius-pill) 0 0 var(--maple-radius-pill);
  padding: 0.4rem var(--maple-space-lg) 0.4rem var(--maple-space-xl);
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.3;
  cursor: default;

  &:focus-visible {
    outline: 3px solid var(--maple-focus-border);
    outline-offset: 2px;
  }
`

const FlagColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--maple-space-sm);
  flex-shrink: 0;
  max-width: 45%;

  @media (max-width: 767.98px) {
    max-width: 100%;
    align-items: flex-start;
  }
`

const LatestAction = styled.p`
  font-size: 0.9rem;
  color: var(--maple-text-body);
  margin: 0 0 var(--maple-space-sm);

  b {
    color: var(--maple-text-strong);
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

  @media (max-width: 767.98px) {
    flex-direction: column;
  }
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
  draft
}: {
  bill: Bill
  isBallotMeasure: boolean
  draft?: DraftOrigin
}) {
  const { t } = useTranslation(["billPage", "common"])
  const flags = useFlags()
  const { user } = useAuth()

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
        <FlagColumn>
          {latest && (
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
              <StatusFlag tabIndex={0}>
                {oneLineActionText(latest.Action)}
              </StatusFlag>
            </OverlayTrigger>
          )}
          {flags.notifications && user && <FollowBillButton bill={bill} />}
        </FlagColumn>
      </TopRow>

      {latest ? (
        <LatestAction>
          <b>{t("billPage:header.latestAction")}</b>
          {latest.Date && <> ({formatHistoryDate(latest.Date)})</>}:{" "}
          {oneLineActionText(latest.Action)}
        </LatestAction>
      ) : (
        <LatestAction>{t("billPage:header.noHistory")}</LatestAction>
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
        {hearingSoon && (
          <span>
            <b>
              {t("common:bill.hearing_scheduled_for", { date: hearingSoon })}
            </b>
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
