import { ConferenceSummary } from "components/conference/types"
import { loadConferenceForBill } from "components/conference/load"
import { BillPageV2 } from "components/bill/v2"
import { dbService } from "components/db/api"
import { flags, useFlags } from "components/featureFlags"
import { GetServerSideProps } from "next"
import { z } from "zod"
import { BillDetails } from "../../../components/bill"
import { Bill } from "../../../components/db"
import { createPage } from "../../../components/page"
import { usePublishService } from "../../../components/publish/hooks"
import { serverSideTranslations } from "next-i18next/serverSideTranslations"

const Query = z.object({ court: z.coerce.number(), billId: z.string({}) })

export default createPage<{ bill: Bill; conference: ConferenceSummary | null }>(
  {
    titleI18nKey: "titles.bill",
    Page: ({ bill, conference }) => {
      const { billPageV2 } = useFlags()
      return (
        <>
          <usePublishService.Provider />
          {billPageV2 ? (
            <BillPageV2 bill={bill} conference={conference} />
          ) : (
            <BillDetails bill={bill} conference={conference} />
          )}
        </>
      )
    }
  }
)

export const getServerSideProps: GetServerSideProps = async ctx => {
  ctx.res.setHeader(
    "Cache-Control",
    "public, s-maxage=10, stale-while-revalidate=59"
  )

  const locale = ctx.locale ?? ctx.defaultLocale ?? "en"

  const query = Query.safeParse(ctx.query)
  if (!query.success) return { notFound: true }
  const [bill, conference, translations] = await Promise.all([
    dbService().getBill(query.data),
    flags().conferences
      ? // The banner is secondary: a failed lookup must not fail the bill page.
        loadConferenceForBill(query.data.court, query.data.billId).catch(
          () => null
        )
      : null,
    serverSideTranslations(locale, [
      "auth",
      "billPage",
      "common",
      "footer",
      "lobbying",
      "testimony",
      "profile",
      "conferences"
    ])
  ])
  if (!bill) return { notFound: true }
  return {
    props: {
      bill: JSON.parse(JSON.stringify(bill)),
      conference,
      ...translations
    }
  }
}
