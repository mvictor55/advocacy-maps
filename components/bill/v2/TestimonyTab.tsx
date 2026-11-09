import { BillTestimonies } from "components/bill/BillTestimonies"
import { Bill } from "components/db"
import { useTranslation } from "next-i18next"
import { DraftNote } from "./DraftNote"
import { DraftOrigin } from "./newDraft"
import { PanelSection } from "./SourceNote"

/** Today's testimony list. A new draft with no testimony of its own says
 * where the testimony on its subject is. */
export function TestimonyTab({
  bill,
  draft
}: {
  bill: Bill
  draft?: DraftOrigin
}) {
  const { t } = useTranslation("billPage")
  return (
    <div id="testimony">
      {draft && (bill.testimonyCount ?? 0) === 0 && (
        <PanelSection title={t("testimony.title")}>
          <DraftNote bill={bill} draft={draft} about="testimony" />
        </PanelSection>
      )}
      <BillTestimonies bill={bill} />
    </div>
  )
}
