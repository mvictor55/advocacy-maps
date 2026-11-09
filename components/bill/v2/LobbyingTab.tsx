import { Bill } from "components/db"
import { External } from "components/links"
import { orgPositionBreakdown } from "components/lobbying/activity"
import { ActivityTable } from "components/lobbying/ActivityTable"
import { LobbyingAttribution } from "components/lobbying/LobbyingAttribution"
import { PositionBar } from "components/lobbying/PositionBar"
import { courtOrdinal } from "components/lobbying/sessions"
import { isCurrentCourt } from "functions/src/shared"
import { useTranslation } from "next-i18next"
import { useBillLobbying } from "./billLobbying"
import { Muted, PanelSection } from "./SourceNote"

/**
 * Lobbying disclosures that name this bill, grouped by client organization
 * with the Lobbying Explorer's own grouping and table. Positions are the
 * ones reported in each disclosure.
 */
export function LobbyingTab({ bill }: { bill: Bill }) {
  const { t } = useTranslation(["billPage", "lobbying"])
  const lobbying = useBillLobbying()
  const explorerHref = `/lobbying/bills/${bill.court}/${bill.id}`

  let body
  switch (lobbying.status) {
    case "off":
      return null
    case "loading":
      body = <Muted>{t("billPage:lobbying.loading")}</Muted>
      break
    case "error":
      body = <Muted>{t("billPage:lobbying.loadError")}</Muted>
      break
    case "ready": {
      const { activity, organizations, coverage } = lobbying
      if (organizations === 0) {
        const ordinal = { courtOrdinal: courtOrdinal(bill.court) }
        body = (
          <Muted>
            {coverage.status === "none"
              ? t("billPage:lobbying.notCovered", ordinal)
              : coverage.status === "partial"
              ? t("billPage:lobbying.partial", ordinal)
              : isCurrentCourt(bill.court) && coverage.latestYear
              ? t("billPage:lobbying.noneThrough", {
                  year: coverage.latestYear
                })
              : t("billPage:lobbying.none")}
          </Muted>
        )
      } else {
        body = (
          <>
            <Muted className="mb-2">
              {t("billPage:lobbying.orgs", { count: organizations })}
            </Muted>
            <PositionBar
              counts={orgPositionBreakdown(activity.rows)}
              height={12}
              legend
            />
            <Muted className="mt-2 mb-3 small">
              {t("billPage:lobbying.positionNote")}
            </Muted>
            <ActivityTable
              by="client"
              data={activity}
              rowHref={row =>
                `/lobbying/clients/${encodeURIComponent(row.key)}`
              }
              itemLabel={t("lobbying:bill.items")}
            />
          </>
        )
      }
    }
  }

  return (
    <PanelSection title={t("billPage:lobbying.title")} id="lobbying">
      {body}
      <p className="mt-3 mb-0 small">
        <External href={explorerHref}>
          {t("billPage:lobbying.explorer")}
        </External>
      </p>
      <LobbyingAttribution className="mb-0" />
    </PanelSection>
  )
}
