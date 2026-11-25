import ArrowOutward from "@mui/icons-material/ArrowOutward"
import { useTranslation } from "next-i18next"
import styled from "styled-components"
import { NewsItem } from "components/db/news"
import { longDate } from "./newsList"

const Card = styled.figure`
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem 1.25rem 1.125rem;
  background: var(--maple-surface-base);
  border: 1px solid var(--maple-card-edge);
  border-radius: var(--maple-radius-lg);

  blockquote {
    flex: 1;
    margin: 0;
    font-family: var(--maple-font-heading);
    font-weight: 500;
    font-size: 1.0625rem;
    line-height: 1.45;
    color: var(--maple-brand-primary-strong);
  }

  figcaption {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .outlet {
    font-size: 0.875rem;
    font-weight: 800;
    color: var(--maple-brand-primary);
  }

  .byline {
    font-weight: 600;
    color: var(--maple-text-muted);
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 2.75rem;
    align-self: flex-start;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--maple-brand-primary);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`

/** An opening quotation mark in MAPLE red. */
const QuoteMark = () => (
  <svg aria-hidden="true" width="24" height="20" viewBox="0 0 34 28">
    <path
      fill="var(--maple-brand-danger)"
      d="M0 28V16.6C0 7.4 4.6 1.9 13.3 0l1.6 3.6C10 5.2 7.6 8.2 7.4 12.6H14V28H0zm19 0V16.6C19 7.4 23.6 1.9 32.3 0l1.6 3.6c-4.9 1.6-7.3 4.6-7.5 9H33V28H19z"
    />
  </svg>
)

/** A short passage quoted from a piece, with its source and a link to it. */
export const ExcerptCard = ({ item }: { item: NewsItem }) => {
  const { t } = useTranslation("inTheNews")
  const byline = [item.byline, longDate(item)].filter(Boolean).join(" · ")

  return (
    <Card>
      <QuoteMark />
      <blockquote cite={item.url}>{item.excerpt}</blockquote>
      <figcaption>
        <span className="outlet">{item.author}</span>
        <span className="byline">{byline}</span>
      </figcaption>
      <a href={item.url} target="_blank" rel="noopener noreferrer">
        {t(`readCta.${item.format ?? "default"}`)}
        <ArrowOutward sx={{ fontSize: "1rem" }} aria-hidden="true" />
        <span className="visually-hidden"> {t("opensInNewTab")}</span>
      </a>
    </Card>
  )
}
