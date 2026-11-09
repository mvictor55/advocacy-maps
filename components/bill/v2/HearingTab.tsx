import { Bill } from "components/db"
import { dateInFuture } from "components/db/events"
import { useFlags } from "components/featureFlags"
import { External, Internal, maple } from "components/links"
import { fromUnixTime } from "date-fns"
import { useTranslation } from "next-i18next"
import styled from "styled-components"
import { documentKind } from "./documentKind"
import { DraftNote } from "./DraftNote"
import { DraftOrigin } from "./newDraft"
import { Muted, PanelSection, SourceNote } from "./SourceNote"

const HearingList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    padding: var(--maple-space-sm) 0;
    border-top: 1px solid var(--maple-surface-border);
  }

  li:first-child {
    border-top: 0;
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--maple-space-sm) var(--maple-space-lg);
    font-size: 0.9rem;
  }
`

/** The number the Legislature gives a hearing: "hearing-5452" → 5452. */
export function hearingNumber(hearingId: string): number {
  return Number(hearingId.replace(/^hearing-/, ""))
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
  draft
}: {
  bill: Bill
  draft?: DraftOrigin
}) {
  const { t } = useTranslation(["billPage", "common"])
  const flags = useFlags()
  const ids = bill.hearingIds ?? []
  const hearingSoon =
    bill.nextHearingAt && dateInFuture(bill.nextHearingAt)
      ? fromUnixTime(bill.nextHearingAt.seconds)
      : undefined

  return (
    <PanelSection title={t("billPage:hearing.title")}>
      {hearingSoon && (
        <Muted className="mb-2">
          {t("common:bill.hearing_scheduled_for", { date: hearingSoon })}
        </Muted>
      )}
      {ids.length > 0 ? (
        <>
          <Muted className="mb-2">
            {t("billPage:hearing.intro", { count: ids.length })}
          </Muted>
          <HearingList>
            {ids.map(id => {
              const n = hearingNumber(id)
              return (
                <li key={id}>
                  <div className="fw-semibold">
                    {t("billPage:hearing.hearingNumber", { id: n })}
                  </div>
                  <div className="links">
                    {flags.hearingsAndTranscriptions && (
                      <Internal href={maple.hearing({ eventId: n })}>
                        {t("billPage:hearing.videoAndTranscript")}
                      </Internal>
                    )}
                    <External
                      href={`https://malegislature.gov/Events/Hearings/Detail/${n}`}
                    >
                      {t("billPage:hearing.onLegislatureSite")}
                    </External>
                  </div>
                </li>
              )
            })}
          </HearingList>
        </>
      ) : draft ? (
        <DraftNote bill={bill} draft={draft} about="hearing" />
      ) : (
        !hearingSoon && <NoHearing bill={bill} />
      )}
      <SourceNote>{t("billPage:source.legislature")}</SourceNote>
    </PanelSection>
  )
}
