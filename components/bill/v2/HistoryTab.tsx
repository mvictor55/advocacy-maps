import { HistoryTable } from "components/bill/HistoryTable"
import { rollCallsFromHistory } from "components/bill/rollCalls"
import { CourtContext } from "components/bill/Status"
import { Bill } from "components/db"
import { useTranslation } from "next-i18next"
import { useMemo } from "react"
import { CommitteeReports } from "./CommitteeReports"
import { RollCallList } from "./RollCallList"
import { Muted, PanelSection, SourceNote } from "./SourceNote"
import { useBillUrlState } from "./useBillUrlState"
import { useFlags } from "components/featureFlags"
import { RollCallMembers } from "./RollCallMembers"

/**
 * The Legislature's record of the bill: its history, the committee's
 * reports with any recorded votes, and the floor roll calls it cites.
 */
export function HistoryTab({ bill }: { bill: Bill }) {
  const { t } = useTranslation("billPage")
  const { rollCallId } = useBillUrlState()
  const flags = useFlags()
  const { rollCalls, unreadable } = useMemo(
    () => rollCallsFromHistory(bill.history),
    [bill.history]
  )
  const votes = rollCalls.filter(r => !r.quorum)

  return (
    <>
      <PanelSection title={t("votes.committeeTitle")} id="committee">
        <CommitteeReports bill={bill} />
        <SourceNote>{t("votes.committeeSource")}</SourceNote>
      </PanelSection>

      <PanelSection title={t("votes.rollCallsTitle")} id="roll-calls">
        {rollCalls.length > 0 || unreadable.length > 0 ? (
          <>
            <Muted className="small mb-2">
              {t("votes.rollCallsIntro", { count: votes.length })}
            </Muted>
            <RollCallList
              court={bill.court}
              rollCalls={rollCalls}
              unreadable={unreadable}
              openId={rollCallId}
            >
              {flags.billVotes
                ? r => (
                    <RollCallMembers
                      court={bill.court}
                      billId={bill.id}
                      rollCall={r}
                    />
                  )
                : undefined}
            </RollCallList>
          </>
        ) : (
          <Muted>{t("votes.noRollCalls")}</Muted>
        )}
        <SourceNote>{t("votes.rollCallSource")}</SourceNote>
      </PanelSection>

      <PanelSection title={t("history.title")} id="history">
        {bill.history.length > 0 ? (
          <CourtContext.Provider value={bill.court}>
            <HistoryTable billHistory={bill.history} />
          </CourtContext.Provider>
        ) : (
          <Muted>{t("header.noHistory")}</Muted>
        )}
        <SourceNote>{t("source.legislature")}</SourceNote>
      </PanelSection>
    </>
  )
}
