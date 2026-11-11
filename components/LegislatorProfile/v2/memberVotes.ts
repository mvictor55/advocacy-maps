import {
  collectionGroup,
  DocumentReference,
  getDoc,
  getDocs,
  query,
  where
} from "firebase/firestore"
import { RollCall, voteRollCalls } from "components/bill/rollCalls"
import { Bill } from "components/db"
import { firestore } from "components/firebase"

/**
 * A legislator's floor roll calls, from the `vote` subcollections the
 * roll-call scrapers write under `votes/{branch}-{court}-{n}`. Each vote
 * document holds one member's response; the roll call's own document holds
 * the motion as the Clerk recorded it and the bill it names. The tally comes
 * from the bill's history, where the Legislature cites the roll call.
 */

export const RESPONSES = ["Yea", "Nay", "Not Voting", "Present"] as const
export type Response = (typeof RESPONSES)[number]

export type MemberVote = {
  /** "house-194-270", the roll call's document id. */
  id: string
  branch: "House" | "Senate"
  rollCallNumber: number
  response: Response
  /** The roll call's document, for its motion and bill. */
  ref: DocumentReference | null
}

export type RollCallDetail = MemberVote & {
  motion: string | null
  billId: string | null
  date: string | null
  pdfUrl: string | null
}

export type VoteKind = "amendment" | "veto" | "enactment" | "passage" | "other"

/** A label for the motion, read from its wording only. */
export function voteKind(motion: string | null | undefined): VoteKind {
  const m = motion ?? ""
  if (/amendment/i.test(m)) return "amendment"
  if (/veto/i.test(m)) return "veto"
  if (/enact/i.test(m)) return "enactment"
  if (/engross|passage|pass(ed|ing)? the bill|to be read a third/i.test(m))
    return "passage"
  return "other"
}

export function tallyVotes(votes: Pick<MemberVote, "response">[]) {
  const counts: Record<Response, number> = {
    Yea: 0,
    Nay: 0,
    "Not Voting": 0,
    Present: 0
  }
  for (const v of votes) counts[v.response] += 1
  return counts
}

const isResponse = (r: unknown): r is Response =>
  (RESPONSES as readonly string[]).includes(r as string)

/** Every recorded response of the member in a session, newest first. */
export async function loadMemberVotes(
  court: number,
  memberCode: string
): Promise<MemberVote[]> {
  const snap = await getDocs(
    query(
      collectionGroup(firestore, "vote"),
      where("memberCode", "==", memberCode),
      where("generalCourtNumber", "==", court)
    )
  )
  return snap.docs
    .map(d => {
      const data = d.data() as {
        response?: unknown
        rollCallNumber?: number
        branch?: string
      }
      const parent = d.ref.parent.parent
      if (!isResponse(data.response) || typeof data.rollCallNumber !== "number")
        return undefined
      const branch: MemberVote["branch"] =
        data.branch === "Senate" ? "Senate" : "House"
      return {
        id:
          parent?.id ??
          `${branch.toLowerCase()}-${court}-${data.rollCallNumber}`,
        branch,
        rollCallNumber: data.rollCallNumber,
        response: data.response,
        ref: parent ?? null
      }
    })
    .filter((v): v is MemberVote => !!v)
    .sort((a, b) => b.rollCallNumber - a.rollCallNumber)
}

type RollCallDoc = {
  bill?: string | null
  questionMotion?: string | null
  downloadUrl?: string
  time?: { toDate?: () => Date }
}

/** The roll call documents for a page of votes. */
export async function loadRollCallDetails(
  votes: MemberVote[]
): Promise<RollCallDetail[]> {
  return Promise.all(
    votes.map(async v => {
      const snap = v.ref ? await getDoc(v.ref).catch(() => null) : null
      const doc = (snap?.exists() ? snap.data() : {}) as RollCallDoc
      const time = doc.time?.toDate?.()
      return {
        ...v,
        motion: doc.questionMotion ?? null,
        billId: doc.bill ?? null,
        date: time ? time.toISOString() : null,
        pdfUrl: doc.downloadUrl ?? null
      }
    })
  )
}

/** The roll call as the bill's history cites it: its tally and date. */
export function rollCallInHistory(
  bill: Pick<Bill, "history"> | undefined,
  branch: "House" | "Senate",
  number: number
): RollCall | undefined {
  if (!bill) return undefined
  return voteRollCalls(bill.history ?? []).find(
    r => r.branch === branch && r.number === number
  )
}
