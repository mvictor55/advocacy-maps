import Link from "next/link"
import { Bill } from "components/db"
import { dateInFuture } from "components/db/events"
import { fromUnixTime } from "date-fns"
import { useTranslation } from "next-i18next"
import { isCurrentCourt } from "functions/src/shared"
import { DraftNote } from "./DraftNote"
import { DraftOrigin } from "./newDraft"
import { Muted, PanelSection, SourceNote } from "./SourceNote"
import { StanceBar } from "./StanceBar"
import { useBillUrlState } from "./useBillUrlState"

export function OverviewTab({
  bill,
  draft
}: {
  bill: Bill
  draft?: DraftOrigin
}) {
  const { t } = useTranslation(["billPage", "common"])
  const { hrefForTab } = useBillUrlState()
  const total = bill.testimonyCount ?? 0
  const hearingSoon =
    bill.nextHearingAt && dateInFuture(bill.nextHearingAt)
      ? fromUnixTime(bill.nextHearingAt.seconds)
      : undefined
  const hasHearings = (bill.hearingIds?.length ?? 0) > 0

  return (
    <>
      <PanelSection title={t("billPage:stance.title")}>
        {total > 0 ? (
          <>
            <Muted className="mb-2">
              {t("billPage:stance.count", { count: total })}
            </Muted>
            <StanceBar
              counts={{
                endorse: bill.endorseCount ?? 0,
                neutral: bill.neutralCount ?? 0,
                oppose: bill.opposeCount ?? 0
              }}
            />
            <p className="mt-3 mb-0">
              <Link href={hrefForTab("testimony")} shallow scroll={false}>
                {t("billPage:overview.seeAll", { count: total })}
              </Link>
            </p>
          </>
        ) : draft ? (
          <DraftNote bill={bill} draft={draft} about="testimony" />
        ) : (
          <Muted>
            {t(
              isCurrentCourt(bill.court)
                ? "billPage:stance.noneCurrent"
                : "billPage:stance.nonePast"
            )}
          </Muted>
        )}
        <SourceNote>{t("billPage:source.testimony")}</SourceNote>
      </PanelSection>

      {(hearingSoon || hasHearings || draft) && (
        <PanelSection title={t("billPage:overview.hearingTitle")}>
          {hearingSoon && (
            <Muted>
              {t("common:bill.hearing_scheduled_for", { date: hearingSoon })}
            </Muted>
          )}
          {!hearingSoon && !hasHearings && draft && (
            <DraftNote bill={bill} draft={draft} about="hearing" />
          )}
          {hasHearings && (
            <p className="mb-0 mt-1">
              <Link href={hrefForTab("hearing")} shallow scroll={false}>
                {t("billPage:overview.hearingSee")}
              </Link>
            </p>
          )}
          <SourceNote>{t("billPage:source.legislature")}</SourceNote>
        </PanelSection>
      )}
    </>
  )
}
