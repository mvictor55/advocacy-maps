import { Meta, StoryObj } from "@storybook/react"
import { InTheNewsView } from "components/InTheNews/InTheNews"
import { NewsItem } from "components/db/news"

/* The About › In the News page with invented items: the real page reads them
   from Firestore (components/db/news.ts). The navbar is not part of this. */
const meta: Meta<typeof InTheNewsView> = {
  title: "Pages/About/In the News",
  component: InTheNewsView,
  parameters: { layout: "fullscreen" }
}

export default meta

type Story = StoryObj<typeof InTheNewsView>

const item = (n: number, fields: Partial<NewsItem>): NewsItem =>
  ({
    id: `news-${n}`,
    url: `https://example.org/story-${n}`,
    type: "article",
    ...fields
  } as NewsItem)

const items: NewsItem[] = [
  item(1, {
    author: "The Civic Quarterly",
    title: "Opening up the State House, one bill at a time",
    publishDate: "2026-01-08",
    format: "opinion",
    excerpt: "“A quietly hopeful idea about how residents can be heard.”",
    byline: "Robin Example"
  }),
  item(2, {
    author: "Bay State Ledger",
    title: "Residents can now read each other’s testimony online",
    publishDate: "2025-11-19",
    format: "news",
    featured: true
  }),
  item(3, {
    author: "Center for Example Studies",
    title: "A framework for public digital infrastructure",
    publishDate: "2025-10-06",
    format: "research",
    excerpt:
      "The platform “makes the legislative process easier to follow and to join.”",
    byline: "Sam Placeholder & Alex Sample",
    featured: true
  }),
  item(4, {
    author: "Commonwealth Radio Hour",
    title: "How testimony works, and why it matters",
    publishDate: "2024-12-09",
    format: "interview",
    featured: true
  }),
  item(5, {
    author: "Journal of Imagined Policy",
    title:
      "Case studies in tools that help people take part in lawmaking, from two volunteer-built platforms",
    publishDate: "2024-09-01",
    format: "research"
  }),
  item(6, {
    author: "Harbor City Times",
    title: "Volunteers build a new way to testify on state bills",
    publishDate: "2023-04-13",
    format: "news",
    featured: true,
    excerpt: "It “lets anyone weigh in on a bill in a few minutes.”",
    byline: "Jordan Sample"
  }),
  item(7, {
    author: "Example University",
    title: "Law school partners launch a public testimony tool",
    publishDate: "2023-04-01",
    format: "news",
    description:
      "A short description, shown when an item has one, clamped to two lines."
  })
]

export const Primary: Story = {
  name: "In the News",
  args: { items }
}

export const WithoutDetails: Story = {
  name: "Items without formats or excerpts",
  args: {
    items: items.map(
      ({ format, excerpt, byline, featured, ...rest }) => rest as NewsItem
    )
  }
}

export const Loading: Story = {
  args: { items: [], loading: true }
}
