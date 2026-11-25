/*
  Sets the format, excerpt, byline and featured fields that the In the News
  page reads, on the news items that existed when the page was redesigned.
  Items are matched by URL. Fields an item already has are left alone, so
  edits made in the admin UI survive a re-run.

  When several items share a URL, only the earliest is updated and the rest
  are listed as likely duplicates, to delete in the admin UI. Nothing is
  deleted here.

  Pass --dry-run to print what would change without writing. Can be removed
  after running against all environments.
*/
import { Boolean, Optional, Record } from "runtypes"
import { Script } from "./types"

const Args = Record({ dryRun: Optional(Boolean) })

type Details = {
  format: "news" | "opinion" | "research" | "interview"
  excerpt?: string
  byline?: string
  featured?: boolean
}

/* Excerpts are quoted word for word from each piece. */
const DETAILS: { urls: string[]; details: Details }[] = [
  {
    urls: [
      "https://therenovator.substack.com/p/ai-supports-legislation-by-the-people",
      "https://www.democracyrenovator.com/p/ai-supports-legislation-by-the-people"
    ],
    details: {
      format: "opinion",
      excerpt:
        "“There’s a fundamentally optimistic vision at the heart of MAPLE.”",
      byline: "Joanna Kenty"
    }
  },
  {
    urls: [
      "https://medium.com/authority-magazine/author-nathan-e-sanders-on-the-future-of-artificial-intelligence-4ab7bc21b476"
    ],
    details: { format: "interview" }
  },
  {
    urls: [
      "https://ash.harvard.edu/resources/a-framework-for-digital-civic-infrastructure/"
    ],
    details: {
      format: "research",
      excerpt:
        "MAPLE is “an innovative civic technology platform designed to democratize access to the legislative process.”",
      byline: "Cynthia Garcia & Sarah Hubbard",
      featured: true
    }
  },
  {
    urls: [
      "https://commonwealthbeacon.org/government/researchers-find-some-worry-some-hope-for-ai-in-democracy/"
    ],
    details: { format: "news", featured: true }
  },
  {
    urls: [
      "https://static.ie.edu/CGC/AI4D%20Paper%203%20Applications%20of%20Artificial%20Intelligence%20Tools%20to%20Engance%20Legislative%20Engagement.pdf"
    ],
    details: { format: "research" }
  },
  {
    urls: [
      "https://masslawyersweekly.com/2023/09/09/boston-lawyer-hopes-hes-building-platform-for-productive-political-discourse/"
    ],
    details: { format: "news", featured: true }
  },
  {
    urls: [
      "https://www.bostonglobe.com/2023/04/13/opinion/civic-tech-maple-massachusetts/"
    ],
    details: {
      format: "opinion",
      excerpt: "MAPLE “makes it easy for the public to weigh in.”",
      byline: "David Scharfenberg",
      featured: true
    }
  },
  {
    urls: [
      "https://www.nytimes.com/2023/04/14/podcasts/ezra-klein-podcast-transcript-danielle-allen.html"
    ],
    details: { format: "interview", featured: true }
  },
  {
    urls: [
      "https://law.northeastern.edu/boston-globe-reports-on-maple-nulawlabs-co-created-tool-for-public-discourse/"
    ],
    details: { format: "news" }
  }
]

export const script: Script = async ({ db, args }) => {
  const { dryRun = false } = Args.check(args)
  const would = dryRun ? "would set" : "set"
  const news = await db.collection("news").get()
  const writer = db.bulkWriter()

  for (const { urls, details } of DETAILS) {
    const matches = news.docs
      .filter(doc => urls.includes(doc.get("url")))
      .sort((a, b) =>
        String(a.get("publishDate")).localeCompare(String(b.get("publishDate")))
      )
    if (!matches.length) {
      console.log(`no item for ${urls[0]}`)
      continue
    }

    const [doc, ...duplicates] = matches
    const data = doc.data()
    const missing = Object.fromEntries(
      Object.entries(details).filter(([field]) => !(field in data))
    )
    const fields = Object.keys(missing)
    console.log(
      `${doc.id} (${data.title}): ${
        fields.length ? `${would} ${fields.join(", ")}` : "already set"
      }`
    )
    if (fields.length && !dryRun) writer.update(doc.ref, missing)

    for (const dup of duplicates)
      console.log(
        `  likely duplicate: ${dup.id} (${dup.get("author")}, ${dup.get(
          "publishDate"
        )}), not changed`
      )
  }

  await writer.close()
}
