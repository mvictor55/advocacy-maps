import Link from "next/link"
import { useTranslation } from "next-i18next"
import { useEffect, useRef } from "react"
import styled from "styled-components"
import { TabKey, useBillUrlState } from "./useBillUrlState"

export type TabSpec = {
  key: TabKey
  /** Shown after the label; omitted when undefined. */
  count?: number
}

const Nav = styled.nav`
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--maple-border-default);
  margin: var(--maple-space-sm) 0 var(--maple-space-lg);
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    display: none;
  }

  a {
    padding: 0.625rem 0.875rem;
    font-size: 0.925rem;
    font-weight: 600;
    color: var(--maple-text-body);
    border-bottom: 3px solid transparent;
    white-space: nowrap;
    margin-bottom: -1px;
    text-decoration: none;
  }

  a:hover {
    color: var(--maple-text-strong);
    background: var(--maple-surface-base);
  }

  a[aria-current="page"] {
    color: var(--bs-primary);
    border-bottom-color: var(--bs-primary);
  }

  a:focus-visible {
    outline: 3px solid var(--maple-focus-border);
    outline-offset: -3px;
  }

  .count {
    display: inline-block;
    font-weight: 600;
    font-size: 0.75rem;
    line-height: 1.2rem;
    min-width: 1.2rem;
    text-align: center;
    padding: 0 0.4rem;
    margin-left: 0.35rem;
    border-radius: var(--maple-radius-pill);
    background: var(--maple-color-gray-subtle-bg);
    color: var(--maple-text-body);
  }
`

/** Keeps the active tab in view when the strip scrolls sideways. */
function scrollIntoStrip(strip: HTMLElement, tab: HTMLElement) {
  const left = tab.offsetLeft - strip.offsetLeft
  const right = left + tab.offsetWidth
  if (left < strip.scrollLeft) strip.scrollLeft = Math.max(0, left - 16)
  else if (right > strip.scrollLeft + strip.clientWidth)
    strip.scrollLeft = right - strip.clientWidth + 16
}

/**
 * The section strip. Each tab is a link, so a tab can be opened in a new
 * window and Back and Forward move between sections. The open tab carries
 * `aria-current="page"`.
 */
export function BillTabs({ tabs }: { tabs: TabSpec[] }) {
  const { t } = useTranslation("billPage")
  const { tab: active, hrefForTab } = useBillUrlState()
  const stripRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const strip = stripRef.current
    const current = strip?.querySelector<HTMLElement>('a[aria-current="page"]')
    if (strip && current) scrollIntoStrip(strip, current)
  }, [active])

  return (
    <Nav ref={stripRef} aria-label={t("tabs.ariaLabel")}>
      {tabs.map(({ key, count }) => (
        <Link
          key={key}
          href={hrefForTab(key)}
          shallow
          scroll={false}
          aria-current={key === active ? "page" : undefined}
        >
          {t(`tabs.${key}`)}
          {count !== undefined && <span className="count">{count}</span>}
        </Link>
      ))}
    </Nav>
  )
}
