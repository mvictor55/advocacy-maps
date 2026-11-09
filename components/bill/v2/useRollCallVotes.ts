import { RollCall } from "components/bill/rollCalls"
import { loadDoc } from "components/db/common"
import { MemberSearchIndex } from "components/db/members"
import { firestore } from "components/firebase"
import { collection, getDocs } from "firebase/firestore"
import { useAsync } from "react-async-hook"

/**
 * How each legislator voted on a floor roll call, from the `votes`
 * collection the roll-call scrapers write: one document per roll call
 * (`house-194-270`, `senate-194-207`) with a `vote` subcollection holding
 * each member's code and response. Names, parties and districts come from
 * the session's member index. Read only behind the `billVotes` flag.
 */

export const RESPONSES = ["Yea", "Nay", "Not Voting", "Present"] as const
export type Response = (typeof RESPONSES)[number]

export type MemberVote = {
  memberCode: string
  response: Response
  name?: string
  party?: string
  district?: string
}

export type RollCallVotes = {
  members: MemberVote[]
  byResponse: Record<Response, MemberVote[]>
  /** The members' yeas and nays add up to the history's tally. Some
   * backfilled roll calls are truncated, so a list can be short. */
  complete: boolean
  counted: { yeas: number; nays: number }
}

/** The roll call's document id, as the scrapers write it. */
export function rollCallDocId(court: number, rollCall: RollCall): string {
  return `${rollCall.branch.toLowerCase()}-${court}-${rollCall.number}`
}

type RollCallDoc = { bill?: string | null; rollCallNumber?: number }

/**
 * The member votes for a roll call, or `undefined` when they aren't
 * available: no document, a document for another bill, or a read the rules
 * refuse. Every failure is treated the same; the caller shows the tally
 * alone.
 */
export async function fetchRollCallVotes(
  court: number,
  billId: string,
  rollCall: RollCall
): Promise<MemberVote[] | undefined> {
  const id = rollCallDocId(court, rollCall)
  const doc = (await loadDoc(`votes/${id}`)) as RollCallDoc | undefined
  if (!doc) return undefined
  // The scrapers record the bill number the PDF names (null when it has
  // none). A different bill means the numbers don't line up.
  if (doc.bill && doc.bill !== billId) return undefined
  const [votes, index] = await Promise.all([
    getDocs(collection(firestore, `votes/${id}/vote`)),
    loadDoc(`generalCourts/${court}/indexes/memberSearch`) as Promise<
      MemberSearchIndex | undefined
    >
  ])
  const members = new Map(
    [...(index?.representatives ?? []), ...(index?.senators ?? [])].map(m => [
      m.MemberCode,
      m
    ])
  )
  return votes.docs
    .map(d => d.data() as { memberCode?: string; response?: string })
    .filter(
      (v): v is { memberCode: string; response: Response } =>
        typeof v.memberCode === "string" &&
        (RESPONSES as readonly string[]).includes(v.response ?? "")
    )
    .map(v => {
      const m = members.get(v.memberCode)
      return {
        memberCode: v.memberCode,
        response: v.response,
        name: m?.Name,
        party: m?.Party,
        district: m?.District
      }
    })
}

/** Members by response, each list by name, and whether they add up to
 * the history's tally. */
export function summarizeVotes(
  members: MemberVote[],
  rollCall: Pick<RollCall, "yeas" | "nays">
): RollCallVotes {
  const byResponse = Object.fromEntries(
    RESPONSES.map(r => [r, [] as MemberVote[]])
  ) as Record<Response, MemberVote[]>
  for (const m of members) byResponse[m.response].push(m)
  const byName = (a: MemberVote, b: MemberVote) =>
    (a.name ?? a.memberCode).localeCompare(b.name ?? b.memberCode)
  for (const r of RESPONSES) byResponse[r].sort(byName)
  const counted = {
    yeas: byResponse.Yea.length,
    nays: byResponse.Nay.length
  }
  return {
    members,
    byResponse,
    counted,
    complete: counted.yeas === rollCall.yeas && counted.nays === rollCall.nays
  }
}

export type RollCallVotesState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; votes: RollCallVotes }

async function load(
  court: number,
  billId: string,
  branch: RollCall["branch"],
  number: number,
  yeas: number,
  nays: number
): Promise<RollCallVotes | undefined> {
  try {
    const rollCall = { branch, number, yeas, nays } as RollCall
    const members = await fetchRollCallVotes(court, billId, rollCall)
    return members ? summarizeVotes(members, rollCall) : undefined
  } catch {
    // Permission denied, a missing index, or no data: the tally stands alone.
    return undefined
  }
}

export function useRollCallVotes(
  court: number,
  billId: string,
  rollCall: RollCall
): RollCallVotesState {
  const { result, loading } = useAsync(load, [
    court,
    billId,
    rollCall.branch,
    rollCall.number,
    rollCall.yeas,
    rollCall.nays
  ])
  if (loading) return { status: "loading" }
  return result ? { status: "ready", votes: result } : { status: "unavailable" }
}
