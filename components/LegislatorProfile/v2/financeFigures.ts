import {
  MembersFinance,
  MembersFinanceBreakdown
} from "components/db/membersFinance"

export type FinanceRow = { key: string; amount: number }

export type FinancePeriod = {
  /** "all" for the whole record MAPLE holds, or a calendar year. */
  id: string
  raised: number
  spent: number
  /** Only for the latest report: OCPF reports a balance, not per year. */
  cashOnHand?: number
  bySource: FinanceRow[]
  /** Individual contributions by size: unitemized ($50 or less), itemized
   * under $200, and $200 and up. */
  bySize: FinanceRow[]
  finalized: boolean
}

const positive = (rows: FinanceRow[]) => rows.filter(r => r.amount > 0)

function sizes(b: MembersFinanceBreakdown): FinanceRow[] {
  const small = b.smallDonors?.itemized?.amount ?? 0
  return positive([
    { key: "upTo50", amount: b.unitemized?.amount ?? 0 },
    { key: "51to199", amount: small },
    { key: "200up", amount: Math.max(0, (b.individual?.amount ?? 0) - small) }
  ])
}

function sources(
  b: MembersFinanceBreakdown,
  extra: FinanceRow[] = []
): FinanceRow[] {
  return positive([
    { key: "individual", amount: b.individual?.amount ?? 0 },
    { key: "unitemized", amount: b.unitemized?.amount ?? 0 },
    { key: "committee", amount: b.committee?.amount ?? 0 },
    { key: "union", amount: b.union?.amount ?? 0 },
    ...extra
  ]).sort((a, b) => b.amount - a.amount)
}

/** The periods to choose between: each year OCPF data covers, newest
 * first, then the whole record. */
export function financePeriods(finance: MembersFinance): FinancePeriod[] {
  const inKind = finance.inKind
    ? finance.inKind.individual.amount +
      finance.inKind.committee.amount +
      finance.inKind.union.amount +
      finance.inKind.unitemized.amount
    : 0
  const own = finance.candidateFunds
    ? finance.candidateFunds.loans.amount +
      finance.candidateFunds.contributions.amount
    : 0
  const years = Object.entries(finance.years ?? {})
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([year, y]) => ({
      id: year,
      raised: y.totalRaised,
      spent: y.totalSpent,
      bySource: sources(y.breakdown),
      bySize: sizes(y.breakdown),
      finalized: y.finalized
    }))
  const all: FinancePeriod = {
    id: "all",
    raised: finance.totalRaised,
    spent: finance.totalSpent,
    cashOnHand: finance.cashOnHand,
    bySource: sources(finance.breakdown, [
      { key: "candidateFunds", amount: own },
      { key: "inKind", amount: inKind }
    ]),
    bySize: sizes(finance.breakdown),
    finalized: false
  }
  return [...years, all]
}

/** Bars for a breakdown: each row's share of the total and its width
 * against the largest row. */
export function bars(rows: FinanceRow[]) {
  const total = rows.reduce((s, r) => s + r.amount, 0)
  const max = Math.max(0, ...rows.map(r => r.amount))
  return rows.map(r => ({
    ...r,
    share: total ? Math.round((r.amount / total) * 100) : 0,
    width: max ? Math.round((r.amount / max) * 100) : 0
  }))
}

export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US")
