import { useTranslation } from "next-i18next"
import { useMemo, useState } from "react"
import styled from "styled-components"
import { MembersFinance } from "components/db/membersFinance"
import { External } from "components/links"
import { bars, financePeriods, FinanceRow, money } from "./financeFigures"
import {
  Bar,
  Card,
  CardTitle,
  Empty,
  Figure,
  Figures,
  Note,
  SectionTitle,
  Source,
  Toggle
} from "./ui"

const Two = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 0 var(--maple-space-lg);
`

function Breakdown({ rows, prefix }: { rows: FinanceRow[]; prefix: string }) {
  const { t } = useTranslation("legislators")
  if (!rows.length) return <Empty>{t("v2.finance.noneItemized")}</Empty>
  return (
    <>
      {bars(rows).map(r => (
        <Bar
          key={r.key}
          label={t(`${prefix}.${r.key}`)}
          value={`${money(r.amount)} · ${r.share}%`}
          width={r.width}
        />
      ))}
    </>
  )
}

export function FinanceSection({
  finance,
  loading
}: {
  finance: MembersFinance | undefined
  loading: boolean
}) {
  const { t } = useTranslation("legislators")
  const periods = useMemo(
    () => (finance ? financePeriods(finance) : []),
    [finance]
  )
  const [periodId, setPeriodId] = useState<string>()
  const period = periods.find(p => p.id === periodId) ?? periods[0]
  const asOf = finance?.bankDataAsOf?.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })

  return (
    <div>
      <SectionTitle>{t("v2.nav.finance")}</SectionTitle>
      <Source>{t("v2.finance.source")}</Source>
      {loading ? (
        <Empty>{t("v2.common.loading")}</Empty>
      ) : !finance || !period ? (
        <Card>
          <Empty>{t("finance.noData")}</Empty>
        </Card>
      ) : (
        <>
          <Toggle
            label={t("v2.finance.periodLabel")}
            value={period.id}
            onChange={setPeriodId}
            options={periods.map(p => ({
              key: p.id,
              label:
                p.id === "all"
                  ? t("v2.finance.allPeriods")
                  : p.finalized
                  ? p.id
                  : t("v2.finance.yearSoFar", { year: p.id })
            }))}
          />
          <Card aria-label={t("v2.finance.keyFigures")}>
            <CardTitle>{t("v2.finance.keyFigures")}</CardTitle>
            <Figures>
              <Figure
                label={t("v2.finance.raised")}
                value={money(period.raised)}
              />
              <Figure
                label={t("v2.finance.spent")}
                value={money(period.spent)}
              />
              {period.cashOnHand !== undefined && (
                <Figure
                  label={
                    asOf
                      ? t("v2.finance.cashAsOf", { date: asOf })
                      : t("v2.finance.cash")
                  }
                  value={money(period.cashOnHand)}
                />
              )}
              {period.id === "all" && (
                <Figure
                  label={t("v2.finance.contributors")}
                  value={finance.uniqueContributorsCount.toLocaleString(
                    "en-US"
                  )}
                />
              )}
            </Figures>
          </Card>
          <Two>
            <Card aria-labelledby="fin-source">
              <CardTitle id="fin-source">{t("v2.finance.bySource")}</CardTitle>
              <Breakdown rows={period.bySource} prefix="v2.finance.sources" />
            </Card>
            <Card aria-labelledby="fin-size">
              <CardTitle id="fin-size">{t("v2.finance.bySize")}</CardTitle>
              <Breakdown rows={period.bySize} prefix="v2.finance.sizes" />
              <Note>{t("v2.finance.sizeNote")}</Note>
            </Card>
          </Two>
          <Note>{t("v2.finance.limitsNote")}</Note>
          <p className="mt-2">
            <External href="https://www.ocpf.us/">
              {t("v2.finance.fullReports", { id: finance.ocpfCpfId })}
            </External>
          </p>
        </>
      )}
    </div>
  )
}
