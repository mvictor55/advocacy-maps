import { collection, getDocs, limit, query, where } from "firebase/firestore"
import { useRef } from "react"
import { useAsync } from "react-async-hook"
import { Bill } from "components/db"
import { loadDoc } from "components/db/common"
import { Profile } from "components/db/profile/types"
import { firestore } from "components/firebase"
import {
  HearingSummary,
  loadCommitteeHearings,
  loadMemberCommittees,
  MemberCommittee
} from "./committees"
import { byNumberDesc, loadBills } from "./loadBills"
import { loadMemberVotes, MemberVote } from "./memberVotes"

export type Async<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; value: T }

function asAsync<T>(a: {
  loading: boolean
  error?: Error
  result?: T
}): Async<T> {
  if (a.loading) return { status: "loading" }
  if (a.error || a.result === undefined) return { status: "error" }
  return { status: "ready", value: a.result }
}

/**
 * The MAPLE account a legislator's office set up, if any: a public profile
 * linked to the member code. A claimed page shows the legislator's own
 * statement and testimony.
 */
export type Claim = { uid: string; profile: Profile } | null

async function loadClaim(memberCode: string): Promise<Claim> {
  const snap = await getDocs(
    query(
      collection(firestore, "profiles"),
      where("memberId", "==", memberCode),
      where("public", "==", true),
      limit(1)
    )
  )
  const d = snap.docs[0]
  return d ? { uid: d.id, profile: d.data() as Profile } : null
}

export function useClaim(memberCode: string): Async<Claim> {
  return asAsync(useAsync(loadClaim, [memberCode]))
}

export type BillTopicSummary = {
  topic: string
  count: number
  subtopics: { topic: string; count: number }[]
}

/** The daily job's per-member topic counts (functions/src/members). */
export type MemberBillSummary = {
  sponsored: { count: number; topics: BillTopicSummary[] }
  cosponsored: { count: number; topics: BillTopicSummary[] }
}

async function loadSummary(court: number, memberCode: string) {
  const doc = await loadDoc(
    `/generalCourts/${court}/memberBillSummaries/${memberCode}`
  )
  return (doc ?? null) as MemberBillSummary | null
}

export function useBillSummary(court: number, memberCode: string) {
  return asAsync(useAsync(loadSummary, [court, memberCode]))
}

/** All of a member's recorded floor votes in the session. Reads that the
 * rules refuse (before the votes backend is deployed) come back empty. */
export function useMemberVotes(
  court: number,
  memberCode: string
): Async<MemberVote[]> {
  return asAsync(
    useAsync(
      (c: number, m: string) => loadMemberVotes(c, m).catch(() => []),
      [court, memberCode]
    )
  )
}

export function useCommittees(
  court: number,
  memberCode: string,
  codes: string[]
): Async<MemberCommittee[]> {
  const key = codes.join(",")
  return asAsync(
    useAsync(
      (c: number, m: string, k: string) =>
        loadMemberCommittees(c, m, k ? k.split(",") : []),
      [court, memberCode, key]
    )
  )
}

export function useCommitteeHearings(
  memberCode: string,
  codes: string[]
): Async<{ upcoming: HearingSummary[]; past: HearingSummary[] }> {
  const key = codes.join(",")
  return asAsync(
    useAsync(
      (m: string, k: string) =>
        loadCommitteeHearings(k ? k.split(",") : [], m).catch(() => ({
          upcoming: [],
          past: []
        })),
      [memberCode, key]
    )
  )
}

/**
 * A page of bills, newest filing first. `count` grows as the reader asks
 * for more; earlier pages stay loaded.
 */
export function useBillsPage(
  court: number,
  ids: string[],
  count: number
): Async<Bill[]> & { previous?: Bill[] } {
  const key = [...ids].sort(byNumberDesc).slice(0, count).join(",")
  const state = asAsync(
    useAsync(
      (c: number, k: string): Promise<Bill[]> =>
        k ? loadBills(c, k.split(",")) : Promise.resolve([]),
      [court, key]
    )
  )
  // While the next page loads, the bills already shown stay on screen.
  const last = useRef<Bill[] | undefined>(undefined)
  if (state.status === "ready") last.current = state.value
  return { ...state, previous: last.current }
}
