import { useTranslation } from "next-i18next"
import styled from "styled-components"

export type StanceCounts = {
  endorse: number
  neutral: number
  oppose: number
}

/** MAPLE's position colors, as in `.bg-endorse`, `.bg-neutral` and
 * `.bg-oppose` in styles/globals.css. */
export const STANCE_COLORS: Record<keyof StanceCounts, string> = {
  endorse: "var(--bs-green)",
  neutral: "var(--bs-blue)",
  oppose: "var(--bs-orange)"
}

const ORDER: (keyof StanceCounts)[] = ["endorse", "neutral", "oppose"]

const Bar = styled.div<{ $height: number }>`
  display: flex;
  height: ${p => p.$height}px;
  border-radius: ${p => p.$height / 2}px;
  overflow: hidden;
  background: var(--maple-color-gray-subtle-border);
  gap: 2px;

  span {
    height: 100%;
    min-width: 3px;
  }
`

const Legend = styled.ul`
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--maple-space-sm) var(--maple-space-lg);
  padding: 0;
  margin: var(--maple-space-sm) 0 0;
  font-size: 0.875rem;
  color: var(--maple-text-body);

  li {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  b {
    color: var(--maple-text-strong);
  }
`

const Swatch = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: ${p => p.$color};
  flex: none;
`

/**
 * Endorse / neutral / oppose as one bar. The bar is an image with a text
 * label; the legend repeats the counts as text.
 */
export function StanceBar({
  counts,
  height = 12,
  legend = true,
  className
}: {
  counts: StanceCounts
  height?: number
  legend?: boolean
  className?: string
}) {
  const { t } = useTranslation("billPage")
  const total = ORDER.reduce((sum, k) => sum + (counts[k] ?? 0), 0)
  const label = t("stance.label", {
    endorse: counts.endorse,
    neutral: counts.neutral,
    oppose: counts.oppose
  })
  return (
    <div className={className}>
      <Bar role="img" aria-label={label} $height={height}>
        {total > 0 &&
          ORDER.filter(k => counts[k] > 0).map(k => (
            <span
              key={k}
              style={{
                width: `${(counts[k] / total) * 100}%`,
                background: STANCE_COLORS[k]
              }}
            />
          ))}
      </Bar>
      {legend && (
        <Legend aria-hidden="true">
          {ORDER.map(k => (
            <li key={k}>
              <Swatch $color={STANCE_COLORS[k]} />
              <b>{counts[k]}</b> {t(`stance.${k}`)}
            </li>
          ))}
        </Legend>
      )}
    </div>
  )
}
