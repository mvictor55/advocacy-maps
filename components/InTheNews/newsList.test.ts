import { NewsItem } from "components/db/news"
import {
  featuredOutlets,
  firstYear,
  formatCounts,
  groupByYear,
  longDate,
  shortDate
} from "./newsList"

const item = (overrides: Partial<NewsItem>): NewsItem =>
  ({
    id: "id",
    url: "https://example.org",
    title: "A story",
    author: "Example Outlet",
    type: "article",
    publishDate: "2024-06-01",
    ...overrides
  } as NewsItem)

describe("groupByYear", () => {
  it("groups items by publish year, keeping their order", () => {
    const items = [
      item({ id: "a", publishDate: "2026-01-08" }),
      item({ id: "b", publishDate: "2025-11-19" }),
      item({ id: "c", publishDate: "2025-10-06" }),
      item({ id: "d", publishDate: "2023-04-01" })
    ]
    expect(
      groupByYear(items).map(g => [g.year, g.items.map(i => i.id)])
    ).toEqual([
      [2026, ["a"]],
      [2025, ["b", "c"]],
      [2023, ["d"]]
    ])
  })

  it("reads dates as UTC, so January 1 stays in its year", () => {
    expect(groupByYear([item({ publishDate: "2024-01-01" })])[0].year).toBe(
      2024
    )
  })
})

describe("formatCounts", () => {
  it("counts only the formats in use, in filter order", () => {
    const items = [
      item({ format: "research" }),
      item({ format: "news" }),
      item({ format: "news" }),
      item({})
    ]
    expect(formatCounts(items)).toEqual([
      { format: "news", count: 2 },
      { format: "research", count: 1 }
    ])
  })
})

describe("featuredOutlets", () => {
  it("lists each featured outlet once", () => {
    const items = [
      item({ author: "Boston Globe", featured: true }),
      item({ author: "Boston Globe", featured: true }),
      item({ author: "Other", featured: false }),
      item({ author: "Ezra Klein Show", featured: true })
    ]
    expect(featuredOutlets(items)).toEqual(["Boston Globe", "Ezra Klein Show"])
  })
})

describe("dates", () => {
  it("formats short and long dates in UTC", () => {
    const i = item({ publishDate: "2023-04-13" })
    expect(shortDate(i)).toBe("Apr 13")
    expect(longDate(i)).toBe("April 13, 2023")
  })

  it("finds the first year, or null with no items", () => {
    expect(
      firstYear([
        item({ publishDate: "2025-10-06" }),
        item({ publishDate: "2023-04-01" })
      ])
    ).toBe(2023)
    expect(firstYear([])).toBeNull()
  })
})
