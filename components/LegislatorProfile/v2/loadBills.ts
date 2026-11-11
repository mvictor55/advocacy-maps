import {
  collection,
  documentId,
  getDocs,
  query,
  where
} from "firebase/firestore"
import { Bill } from "components/db"
import { firestore } from "components/firebase"

/** The most values an `in` filter takes in the Firebase SDK this site
 * uses (9.6); later SDKs allow 30. */
const IN_LIMIT = 10

/** Bill numbers, newest filing first: "H4302" before "H1204". */
export function byNumberDesc(a: string, b: string): number {
  const n = (id: string) => Number(/(\d+)$/.exec(id)?.[1] ?? 0)
  return n(b) - n(a) || b.localeCompare(a)
}

/**
 * Bill documents by id, in the order asked, leaving out any MAPLE doesn't
 * have. Read in chunks of 10, the most an `in` filter takes.
 */
export async function loadBills(court: number, ids: string[]): Promise<Bill[]> {
  const unique = [...new Set(ids)]
  const chunks: string[][] = []
  for (let i = 0; i < unique.length; i += IN_LIMIT)
    chunks.push(unique.slice(i, i + IN_LIMIT))
  const snaps = await Promise.all(
    chunks.map(chunk =>
      getDocs(
        query(
          collection(firestore, `/generalCourts/${court}/bills`),
          where(documentId(), "in", chunk)
        )
      )
    )
  )
  const byId = new Map<string, Bill>()
  for (const snap of snaps)
    for (const d of snap.docs) byId.set(d.id, d.data() as Bill)
  return unique.map(id => byId.get(id)).filter((b): b is Bill => !!b)
}
