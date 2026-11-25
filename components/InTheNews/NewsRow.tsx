import ArrowOutward from "@mui/icons-material/ArrowOutward"
import { useTranslation } from "next-i18next"
import styled from "styled-components"
import { NewsFormat, NewsItem } from "components/db/news"
import { shortDate } from "./newsList"

/* Each format's chip uses one of the site's subtle colour pairs. */
const FORMAT_COLORS: Record<NewsFormat, string> = {
  news: "blue",
  opinion: "amber",
  research: "green",
  interview: "purple"
}

const Row = styled.a`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  grid-template-areas: "text chip arrow";
  align-items: center;
  gap: 0.5rem 1.25rem;
  padding: 1rem 1.25rem;
  color: inherit;
  text-decoration: none;
  transition: background-color var(--maple-transition-fast);

  &:hover {
    background: color-mix(in srgb, var(--maple-brand-primary) 4%, #ffffff);
    color: inherit;

    .title {
      text-decoration: underline;
      text-decoration-color: var(--maple-brand-primary);
      text-underline-offset: 3px;
    }
  }

  &:focus-visible {
    outline: 3px solid var(--maple-focus-ring);
    outline-offset: -3px;
  }

  .text {
    grid-area: text;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .source {
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .outlet {
    font-weight: 800;
    color: var(--maple-brand-primary);
  }

  .date {
    font-weight: 600;
    color: var(--maple-text-muted);
  }

  .title {
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.35;
    color: var(--maple-text-strong);
  }

  .description {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 0.9375rem;
    line-height: 1.45;
    color: var(--maple-text-body);
  }

  .chip {
    grid-area: chip;
    justify-self: start;
    padding: 0.1875rem 0.625rem;
    border-radius: var(--maple-radius-pill);
    font-size: 0.75rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .arrow {
    grid-area: arrow;
    color: var(--maple-brand-primary);
  }

  /* On a phone the chip moves under the title. */
  @media (max-width: 36rem) {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "text arrow"
      "chip .";
    align-items: start;
    column-gap: 0.75rem;
    padding: 0.875rem 1rem;

    .title {
      font-size: 1.0625rem;
    }

    .arrow {
      margin-top: 0.125rem;
    }
  }
`

const Chip = ({ format }: { format: NewsFormat }) => {
  const { t } = useTranslation("inTheNews")
  const color = FORMAT_COLORS[format]
  return (
    <span
      className="chip"
      style={{
        background: `var(--maple-color-${color}-subtle-bg)`,
        color: `var(--maple-color-${color}-subtle-text)`
      }}
    >
      {t(`formats.${format}`)}
    </span>
  )
}

/** One piece in the full list: its outlet and date, title, and format. The
 * whole row links to the piece, in a new tab. */
export const NewsRow = ({ item }: { item: NewsItem }) => {
  const { t } = useTranslation("inTheNews")

  return (
    <Row href={item.url} target="_blank" rel="noopener noreferrer">
      <span className="text">
        <span className="source">
          <span className="outlet">{item.author}</span>
          <span className="date"> · {shortDate(item)}</span>
        </span>
        <span className="title">
          {item.title}
          <span className="visually-hidden"> {t("opensInNewTab")}</span>
        </span>
        {item.description && (
          <span className="description">{item.description}</span>
        )}
      </span>
      {item.format && <Chip format={item.format} />}
      <ArrowOutward
        className="arrow"
        sx={{ fontSize: "1.125rem" }}
        aria-hidden="true"
      />
    </Row>
  )
}
