import { Testimony } from "components/db"
import { nullableQuery } from "components/db/common"
import { firestore } from "components/firebase"
import {
  collectionGroup,
  getDocs,
  limit,
  orderBy,
  startAfter,
  where
} from "firebase/firestore"
import { useAsync } from "react-async-hook"

/** How many testimonies one read fetches. */
export const PAGE = 100
/** The most the page loads for filtering and grouping in the browser. */
export const MAX_TESTIMONY = 1000

/**
 * The bill's published testimony, newest first, in pages of `PAGE` up to
 * `max`. The query is the one `usePublishedTestimonyListing` runs for a
 * bill (no new index), repeated page by page.
 */
export async function fetchBillTestimony(
  court: number,
  billId: string,
  max = MAX_TESTIMONY
): Promise<Testimony[]> {
  const all: Testimony[] = []
  let after: unknown = null
  while (all.length < max) {
    const snapshot = await getDocs(
      nullableQuery(
        collectionGroup(firestore, "publishedTestimony"),
        where("billId", "==", billId),
        where("ballotQuestionId", "==", null),
        where("conferenceId", "==", null),
        where("court", "==", court),
        orderBy("publishedAt", "desc"),
        limit(Math.min(PAGE, max - all.length)),
        after !== null && startAfter(after)
      )
    )
    const page = snapshot.docs.map(d => d.data() as Testimony)
    all.push(...page)
    if (page.length < PAGE) break
    after = page[page.length - 1].publishedAt
  }
  return all
}

/**
 * Loads the bill's testimony when `enabled`. Nothing is read until the
 * Testimony tab is open or a filter is in the URL; the Overview and the
 * tiles use the counts on the bill document.
 */
export function useAllBillTestimony(
  court: number,
  billId: string,
  enabled: boolean,
  max = MAX_TESTIMONY
) {
  const { result, loading, error } = useAsync(fetchIfEnabled, [
    court,
    billId,
    enabled,
    max
  ])
  return { testimony: result, loading: enabled && loading, error }
}

async function fetchIfEnabled(
  court: number,
  billId: string,
  enabled: boolean,
  max: number
): Promise<Testimony[] | undefined> {
  return enabled ? fetchBillTestimony(court, billId, max) : undefined
}
