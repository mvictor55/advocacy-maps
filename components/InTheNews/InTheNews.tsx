import { useState } from "react"
import { Spinner } from "react-bootstrap"
import { useTranslation } from "next-i18next"
import styled from "styled-components"
import { NewsFormat, NewsItem, useNews } from "components/db/news"
import LearnBreadcrumb from "../learn/LearnBreadcrumb"
import { maxWidths } from "../learn/LearnLayout"
import { FEEDBACK_EMAIL } from "../shared/CopyEmail"
import { ExcerptCard } from "./ExcerptCard"
import { NewsRow } from "./NewsRow"
import {
  featuredOutlets,
  firstYear,
  formatCounts,
  groupByYear
} from "./newsList"

/** Press inquiries go to the site's general contact address. */
const PRESS_EMAIL = FEEDBACK_EMAIL

/* The Learn and About pages' ground and type (components/learn/LearnLayout),
   with bands that run the full width of the window. */
const Page = styled.div`
  background-color: var(--maple-surface-learn);
  color: var(--maple-text-body);

  *:root & {
    --bs-font-sans-serif: var(--maple-font-body);
    --bs-body-font-family: var(--maple-font-body);
    font-family: var(--maple-font-body);
    --maple-surface-border: rgba(15, 23, 42, 0.16);
    --maple-card-edge: rgba(15, 23, 42, 0.16);
  }
`

/* A centred column at the Learn section's wide width, 2rem in from each
   side (1rem on a phone). */
const Column = styled.div`
  max-width: ${maxWidths.wide};
  margin: 0 auto;
  padding: 0 2rem;

  @media (max-width: 36rem) {
    padding: 0 1rem;
  }
`

const SectionTitle = styled.h2`
  margin: 0;
  font-family: var(--maple-font-heading);
  font-weight: 600;
  font-size: 1.5rem;
  line-height: 1.3;
  color: var(--maple-brand-primary-strong);

  @media (max-width: 36rem) {
    font-size: 1.3125rem;
  }
`

/* The tinted band at the top: breadcrumb, title, subhead and two facts,
   with the State House illustration beside them. */
const Hero = styled.header`
  background: color-mix(in srgb, var(--maple-brand-primary) 14%, #ffffff);
  padding: 2.75rem 0 2.25rem;

  @media (max-width: 36rem) {
    padding: 1.75rem 0 1.5rem;
  }

  .hero-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.5rem 2.5rem;
  }

  .hero-text {
    flex: 999 1 26rem;
    min-width: 0;
  }

  /* A little less room under the breadcrumb than on the Learn pages. */
  nav {
    margin-bottom: 0.75rem;
  }

  h1 {
    margin: 0 0 0.625rem;
    font-family: var(--maple-font-heading);
    font-weight: 700;
    font-size: clamp(2rem, 6vw, 2.5rem);
    line-height: 1.15;
    color: var(--maple-brand-primary-strong);
  }

  .subhead {
    margin: 0;
    max-width: 35rem;
    font-size: 1.125rem;
    line-height: 1.5;
  }

  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    margin-top: 1.25rem;
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--maple-brand-primary-strong);

    a {
      color: inherit;
    }
  }

  img {
    flex: 1 1 12.5rem;
    max-width: 15rem;
    height: auto;
  }

  @media (max-width: 36rem) {
    .subhead {
      font-size: 1rem;
    }

    /* No room beside the text on a phone, and on its own row it pushes
       the list down. */
    img {
      display: none;
    }
  }
`

/* A white strip naming the outlets marked as featured. */
const FeaturedIn = styled.section`
  background: var(--maple-surface-base);
  border-bottom: 1px solid var(--maple-surface-border);
  padding: 1.125rem 0;

  .featured-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem 1.75rem;
  }

  h2 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--maple-text-body);
  }

  ul {
    display: contents;
  }

  li {
    list-style: none;
    font-family: var(--maple-font-heading);
    font-weight: 600;
    font-size: 1.0625rem;
    color: var(--maple-brand-primary-strong);
  }

  @media (max-width: 36rem) {
    li {
      font-size: 0.9375rem;
    }
  }
`

const ExcerptGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`

const ListHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.875rem 1.5rem;
  margin: 3.5rem 0 0.5rem;

  @media (max-width: 36rem) {
    margin-top: 2.25rem;
  }
`

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;

  /* One scrolling row on a phone, rather than three wrapped ones. */
  @media (max-width: 36rem) {
    flex-wrap: nowrap;
    overflow-x: auto;
    margin: 0 -1rem;
    padding: 0 1rem 0.25rem;
  }

  button {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.5rem;
    padding: 0 1rem;
    border-radius: var(--maple-radius-pill);
    border: 1px solid var(--maple-border-default);
    background: var(--maple-surface-base);
    color: var(--maple-brand-primary-strong);
    font-size: 0.875rem;
    font-weight: 700;
    transition: background-color var(--maple-transition-fast);

    &:hover {
      background: var(--maple-color-blue-subtle-bg);
    }

    &[aria-pressed="true"] {
      border-color: var(--maple-brand-primary);
      background: var(--maple-brand-primary);
      color: var(--maple-text-inverse);
    }

    &:focus-visible {
      outline: 3px solid var(--maple-focus-ring);
      outline-offset: 2px;
    }

    .count {
      opacity: 0.8;
    }
  }
`

/* A year beside its list; the year sits above the list on a phone. */
const YearGroup = styled.section`
  display: grid;
  grid-template-columns: 6rem minmax(0, 1fr);
  column-gap: 1.5rem;
  margin-top: 1.5rem;

  h3 {
    margin: 0;
    padding-top: 0.875rem;
    font-family: var(--maple-font-heading);
    font-weight: 600;
    font-size: 1.375rem;
    color: var(--maple-brand-primary-strong);
  }

  @media (max-width: 48rem) {
    display: block;
    margin-top: 1.25rem;

    h3 {
      padding-top: 0;
      margin-bottom: 0.5rem;
      font-size: 1.1875rem;
    }
  }
`

const RowList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--maple-surface-base);
  border: 1px solid var(--maple-card-edge);
  border-radius: var(--maple-radius-lg);
  overflow: hidden;

  li + li {
    border-top: 1px solid var(--maple-surface-border);
  }
`

/* The navy band at the foot of the page, for reporters. */
const PressBand = styled.section`
  margin-top: 4rem;
  background: var(--maple-brand-primary);
  padding: 2.75rem 0;
  color: var(--maple-text-inverse);

  @media (max-width: 36rem) {
    margin-top: 2.5rem;
    padding: 2rem 0 2.25rem;
  }

  .press-inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1.25rem 2.5rem;
  }

  .press-text {
    flex: 1 1 26rem;
    min-width: 0;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-family: var(--maple-font-heading);
    font-weight: 700;
    font-size: 1.625rem;
    color: var(--maple-text-inverse);
  }

  p {
    margin: 0;
    font-size: 1.0625rem;
    line-height: 1.5;
  }

  /* The page's one red call to action (the site keeps red for these). */
  .press-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 3rem;
    padding: 0 1.5rem;
    border-radius: var(--maple-radius-md);
    background: var(--maple-brand-danger);
    color: var(--maple-text-inverse);
    font-size: 1rem;
    font-weight: 800;
    text-decoration: none;
    transition: background-color var(--maple-transition-fast);

    &:hover {
      background: color-mix(in srgb, var(--maple-brand-danger) 85%, #000);
      color: var(--maple-text-inverse);
    }

    &:focus-visible {
      outline: 3px solid var(--maple-text-inverse);
      outline-offset: 2px;
    }
  }

  @media (max-width: 36rem) {
    .press-cta {
      width: 100%;
    }
  }
`

type Filter = NewsFormat | "all"

export const InTheNewsView = ({
  items,
  loading = false
}: {
  items: NewsItem[]
  loading?: boolean
}) => {
  const { t } = useTranslation(["inTheNews", "common"])
  const [filter, setFilter] = useState<Filter>("all")

  const outlets = featuredOutlets(items)
  const excerpts = items.filter(item => item.excerpt)
  const formats = formatCounts(items)
  const since = firstYear(items)
  const shown =
    filter === "all" ? items : items.filter(item => item.format === filter)

  return (
    <Page className="maple-learn-page">
      <Hero>
        <Column className="hero-inner">
          <div className="hero-text">
            <LearnBreadcrumb
              section={t("breadcrumb")}
              eyebrow={t("common:about")}
              withoutHome
            />
            <h1>{t("title")}</h1>
            <p className="subhead">{t("subhead")}</p>
            <div className="facts">
              {since !== null && (
                <span>{t("pieceCount", { count: items.length, since })}</span>
              )}
              <span>
                {t("pressInquiries")}{" "}
                <a href={`mailto:${PRESS_EMAIL}`}>{PRESS_EMAIL}</a>
              </span>
            </div>
          </div>
          <img src="/gov-with-mics.svg" alt="" />
        </Column>
      </Hero>

      {outlets.length > 0 && (
        <FeaturedIn aria-labelledby="featured-in">
          <Column className="featured-inner">
            <h2 id="featured-in">{t("featuredIn")}</h2>
            <ul>
              {outlets.map(outlet => (
                <li key={outlet}>{outlet}</li>
              ))}
            </ul>
          </Column>
        </FeaturedIn>
      )}

      <Column>
        {loading ? (
          <div className="d-flex justify-content-center p-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">{t("loading")}</span>
            </Spinner>
          </div>
        ) : (
          <>
            {excerpts.length > 0 && (
              <section className="pt-5" aria-labelledby="excerpts">
                <SectionTitle id="excerpts">{t("excerpts")}</SectionTitle>
                <ExcerptGrid>
                  {excerpts.map(item => (
                    <ExcerptCard key={item.id} item={item} />
                  ))}
                </ExcerptGrid>
              </section>
            )}

            <section aria-labelledby="full-list">
              <ListHeader>
                <SectionTitle id="full-list">{t("fullList")}</SectionTitle>
                {formats.length > 1 && (
                  <Filters role="group" aria-label={t("filter.label")}>
                    <button
                      type="button"
                      aria-pressed={filter === "all"}
                      onClick={() => setFilter("all")}
                    >
                      {t("filter.all")}{" "}
                      <span className="count">{items.length}</span>
                    </button>
                    {formats.map(({ format, count }) => (
                      <button
                        key={format}
                        type="button"
                        aria-pressed={filter === format}
                        onClick={() => setFilter(format)}
                      >
                        {t(`formats.${format}`)}{" "}
                        <span className="count">{count}</span>
                      </button>
                    ))}
                  </Filters>
                )}
              </ListHeader>

              {items.length === 0 && <p className="mt-3">{t("empty")}</p>}
              {groupByYear(shown).map(({ year, items: yearItems }) => (
                <YearGroup key={year} aria-labelledby={`year-${year}`}>
                  <h3 id={`year-${year}`}>{year}</h3>
                  <RowList>
                    {yearItems.map(item => (
                      <li key={item.id}>
                        <NewsRow item={item} />
                      </li>
                    ))}
                  </RowList>
                </YearGroup>
              ))}
            </section>
          </>
        )}
      </Column>

      <PressBand aria-labelledby="press">
        <Column className="press-inner">
          <div className="press-text">
            <h2 id="press">{t("press.title")}</h2>
            <p>{t("press.body")}</p>
          </div>
          <a className="press-cta" href={`mailto:${PRESS_EMAIL}`}>
            {t("press.cta", { email: PRESS_EMAIL })}
          </a>
        </Column>
      </PressBand>
    </Page>
  )
}

export const InTheNews = () => {
  const { result, loading } = useNews()
  return <InTheNewsView items={result ?? []} loading={loading} />
}
