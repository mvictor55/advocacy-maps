import { NEWS_FORMATS, NewsFormat, NewsItem } from "components/db/news"

/** publishDate is a date with no time ("2026-01-08"), so read it as UTC. */
export const publishYear = (item: NewsItem) =>
  new Date(item.publishDate).getUTCFullYear()

/** "Jan 8", for a row under its year heading. */
export const shortDate = (item: NewsItem) =>
  new Date(item.publishDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  })

/** "January 8, 2026", for an excerpt's caption. */
export const longDate = (item: NewsItem) =>
  new Date(item.publishDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  })

export type YearGroup = { year: number; items: NewsItem[] }

/** Items grouped by the year they came out, keeping their order (newest
 * first, as listNews returns them). */
export const groupByYear = (items: NewsItem[]): YearGroup[] => {
  const groups: YearGroup[] = []
  for (const item of items) {
    const year = publishYear(item)
    const last = groups[groups.length - 1]
    if (last && last.year === year) last.items.push(item)
    else groups.push({ year, items: [item] })
  }
  return groups
}

/** The formats that have at least one item, in filter order, with counts. */
export const formatCounts = (
  items: NewsItem[]
): { format: NewsFormat; count: number }[] =>
  NEWS_FORMATS.map(format => ({
    format,
    count: items.filter(item => item.format === format).length
  })).filter(({ count }) => count > 0)

/** The outlets of featured items, each once, in the order they appear. */
export const featuredOutlets = (items: NewsItem[]): string[] =>
  Array.from(
    new Set(items.filter(item => item.featured).map(item => item.author))
  )

/** The year of the oldest item, or null when there are none. */
export const firstYear = (items: NewsItem[]): number | null =>
  items.length ? Math.min(...items.map(publishYear)) : null
