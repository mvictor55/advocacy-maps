import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp
} from "firebase/firestore"
import { useAsync } from "react-async-hook"
import { firestore } from "../firebase"

export type NewsType = "article" | "award" | "book"

/** What kind of piece it is, for the format filter on the In the News page. */
export type NewsFormat = "news" | "opinion" | "research" | "interview"

export const NEWS_FORMATS: NewsFormat[] = [
  "news",
  "opinion",
  "research",
  "interview"
]

export type NewsItem = {
  id: string
  url: string
  title: string
  /** The outlet or publisher, shown above the title. */
  author: string
  type: NewsType
  description?: string
  publishDate: string
  createdAt: Timestamp
  /** Sorts the piece under a format filter. Pieces without one show under
   * "All" only. */
  format?: NewsFormat
  /** A short passage quoted from the piece, word for word. Pieces with one
   * are shown under "Selected excerpts". */
  excerpt?: string
  /** Who wrote the piece, shown with its excerpt. */
  byline?: string
  /** Name the outlet in the "Featured in" line. */
  featured?: boolean
}

export async function listNews(): Promise<NewsItem[]> {
  const newsRef = collection(firestore, "news")
  const q = query(newsRef, orderBy("publishDate", "desc"))
  const result = await getDocs(q)
  return result.docs.map(d => ({ id: d.id, ...d.data() } as NewsItem))
}

export function useNews() {
  return useAsync(listNews, [])
}
