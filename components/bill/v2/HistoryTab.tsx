import { HistoryTable } from "components/bill/HistoryTable"
import { CourtContext } from "components/bill/Status"
import { Bill } from "components/db"
import { useTranslation } from "next-i18next"
import { Muted, PanelSection, SourceNote } from "./SourceNote"

export function HistoryTab({ bill }: { bill: Bill }) {
  const { t } = useTranslation("billPage")
  return (
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
  )
}
