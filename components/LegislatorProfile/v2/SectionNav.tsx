import Link from "next/link"
import { useTranslation } from "next-i18next"
import styled from "styled-components"
import { Section } from "./useProfileSection"

const Nav = styled.nav`
  position: sticky;
  top: var(--maple-space-lg);

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    background: var(--maple-surface-base);
    border: 1px solid var(--maple-surface-border);
    border-radius: var(--maple-radius-xl);
    box-shadow: var(--maple-shadow-sm);
    overflow: hidden;
  }

  a,
  .locked {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--maple-space-sm);
    min-height: 48px;
    padding: 0 var(--maple-space-lg);
    color: var(--maple-text-body);
    text-decoration: none;
  }

  a:hover {
    background: var(--maple-color-gray-subtle-bg);
  }

  a[aria-current="page"] {
    background: #e8eaf3;
    box-shadow: inset 3px 0 0 var(--bs-primary);
    color: var(--bs-secondary);
    font-weight: 700;
  }

  a:focus-visible {
    outline: 3px solid var(--maple-focus-border);
    outline-offset: -3px;
  }

  .locked {
    color: var(--maple-text-muted);
    cursor: not-allowed;
  }

  .count {
    font-size: 0.8125rem;
    font-weight: 700;
    padding: 0 8px;
    border-radius: var(--maple-radius-pill);
    background: var(--maple-color-gray-subtle-bg);
    color: var(--maple-text-body);
  }

  .sources {
    font-size: 0.875rem;
    margin: var(--maple-space-md) var(--maple-space-sm) 0;
  }

  /* On phones the sections are a strip that scrolls sideways. */
  @media (max-width: 767.98px) {
    position: static;

    ul {
      display: flex;
      overflow-x: auto;
      border-radius: var(--maple-radius-md);
    }

    li {
      flex: none;
    }

    a[aria-current="page"] {
      box-shadow: inset 0 -3px 0 var(--bs-primary);
    }

    .sources {
      display: none;
    }
  }
`

const LockIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)

export type NavItem = { key: Section; count?: number; locked?: boolean }

/**
 * The profile's sections. Each is a link, so a section opens in a new tab
 * and Back and Forward move between them. Testimony is grayed out until the
 * legislator's office claims the page.
 */
export function SectionNav({
  items,
  active,
  hrefFor
}: {
  items: NavItem[]
  active: Section
  hrefFor: (s: Section) => string
}) {
  const { t } = useTranslation("legislators")
  return (
    <Nav aria-label={t("v2.nav.label")}>
      <ul>
        {items.map(({ key, count, locked }) => (
          <li key={key}>
            {locked ? (
              <span
                className="locked"
                aria-disabled="true"
                title={t("v2.nav.lockedHint")}
              >
                <span>{t(`v2.nav.${key}`)}</span>
                <LockIcon />
              </span>
            ) : (
              <Link
                href={hrefFor(key)}
                shallow
                scroll={false}
                aria-current={key === active ? "page" : undefined}
              >
                <span>{t(`v2.nav.${key}`)}</span>
                {count !== undefined && <span className="count">{count}</span>}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className="sources">
        <a href="#data-sources">{t("v2.sources.link")}</a>
      </p>
    </Nav>
  )
}
