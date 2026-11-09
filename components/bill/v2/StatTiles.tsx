import Link from "next/link"
import { useTranslation } from "next-i18next"
import { ReactNode } from "react"
import styled from "styled-components"
import { StanceBar, StanceCounts } from "./StanceBar"
import { TabKey, useBillUrlState } from "./useBillUrlState"

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--maple-space-sm);
  margin: var(--maple-space-md) 0 var(--maple-space-xs);

  @media (max-width: 767.98px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const Tile = styled.a`
  display: block;
  background: var(--maple-surface-base);
  border: 1px solid var(--maple-surface-border);
  border-radius: var(--maple-radius-xl);
  box-shadow: var(--maple-shadow-sm);
  padding: 0.7rem 0.85rem;
  color: inherit;
  text-decoration: none;

  &:hover {
    border-color: var(--maple-border-accent-strong);
    color: inherit;
  }

  &:focus-visible {
    outline: 3px solid var(--maple-focus-border);
    outline-offset: 2px;
  }

  .n {
    font-size: 1.35rem;
    font-weight: 700;
    color: var(--maple-brand-primary);
    line-height: 1.2;
  }

  .l {
    font-size: 0.8rem;
    color: var(--maple-text-body);
    line-height: 1.3;
  }
`

export type StatTileSpec = {
  tab: TabKey
  value: number
  label: string
  extra?: ReactNode
}

function StatTile({ tab, value, label, extra }: StatTileSpec) {
  const { hrefForTab } = useBillUrlState()
  return (
    <Link href={hrefForTab(tab)} shallow scroll={false} passHref legacyBehavior>
      <Tile>
        <div className="n">{value}</div>
        {extra}
        <div className="l">{label}</div>
      </Tile>
    </Link>
  )
}

/**
 * The counts at the top of the page. Each tile opens its section. The
 * organizations tile is shown only when lobbying data is on.
 */
export function StatTiles({
  testimony,
  hearings,
  rollCalls,
  organizations
}: {
  testimony: StanceCounts & { total: number }
  hearings: number
  rollCalls: number
  /** `undefined` hides the tile (the lobbying feature is off). */
  organizations?: number
}) {
  const { t } = useTranslation("billPage")
  return (
    <Tiles>
      <StatTile
        tab="testimony"
        value={testimony.total}
        label={t("tiles.testimony", { count: testimony.total })}
        extra={
          <StanceBar
            counts={testimony}
            height={6}
            legend={false}
            className="my-1"
          />
        }
      />
      <StatTile
        tab="hearing"
        value={hearings}
        label={t("tiles.hearings", { count: hearings })}
      />
      <StatTile
        tab="history"
        value={rollCalls}
        label={t("tiles.rollCalls", { count: rollCalls })}
      />
      {organizations !== undefined && (
        <StatTile
          tab="lobbying"
          value={organizations}
          label={t("tiles.organizations", { count: organizations })}
        />
      )}
    </Tiles>
  )
}
