import { Bill } from "components/db"
import { formatBillId } from "components/formatting"
import { useTranslation } from "next-i18next"
import { BillLinks } from "./BillHeader"
import { DraftOrigin } from "./newDraft"
import { Muted } from "./SourceNote"

/**
 * For a new draft or substitute: where its hearing and testimony live. The
 * hearing was held, and testimony filed, on the bills this one replaces.
 */
export function DraftNote({
  bill,
  draft,
  about
}: {
  bill: Bill
  draft: DraftOrigin
  about: "hearing" | "testimony"
}) {
  const { t } = useTranslation("billPage")
  const key = `${about}.${
    draft.kind === "newDraft" ? "newDraft" : "substitute"
  }`
  return (
    <Muted>
      {t(`${key}.before`, { bill: formatBillId(bill.id) })}{" "}
      <BillLinks court={bill.court} ids={draft.billIds} max={2} />
      {t(`${key}.after`)}
    </Muted>
  )
}
