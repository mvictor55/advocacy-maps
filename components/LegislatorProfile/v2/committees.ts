import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where
} from "firebase/firestore"
import { loadDoc } from "components/db/common"
import { firestore } from "components/firebase"

export type CommitteeRole = "houseChair" | "senateChair" | "member"

export type MemberCommittee = {
  code: string
  name: string
  role: CommitteeRole
}

type CommitteeDoc = {
  content?: {
    FullName?: string
    HouseChairperson?: { MemberCode?: string } | null
    SenateChairperson?: { MemberCode?: string } | null
  }
}

export function committeeRole(
  doc: CommitteeDoc | undefined,
  memberCode: string
): CommitteeRole {
  if (doc?.content?.HouseChairperson?.MemberCode === memberCode)
    return "houseChair"
  if (doc?.content?.SenateChairperson?.MemberCode === memberCode)
    return "senateChair"
  return "member"
}

/** The member's committees with their names and her role, chairs first. */
export async function loadMemberCommittees(
  court: number,
  memberCode: string,
  codes: string[]
): Promise<MemberCommittee[]> {
  const docs = await Promise.all(
    codes.map(code =>
      (
        loadDoc(`/generalCourts/${court}/committees/${code}`) as Promise<
          CommitteeDoc | undefined
        >
      ).catch(() => undefined)
    )
  )
  const rank = { houseChair: 0, senateChair: 0, member: 1 }
  return codes
    .map((code, i) => ({
      code,
      name: docs[i]?.content?.FullName ?? code,
      role: committeeRole(docs[i], memberCode)
    }))
    .sort((a, b) => rank[a.role] - rank[b.role])
}

export type HearingSummary = {
  eventId: number
  committeeCode: string
  /** ISO date-time, as the Legislature records it. */
  date: string
  title: string | null
  location: string | null
  billCount: number
  /** Her bills on the agenda, as the agenda names them. */
  herBills: string[]
  hasVideo: boolean
}

type HearingDoc = {
  type?: string
  startsAt?: Timestamp
  videos?: unknown[]
  videoURL?: string
  content?: {
    EventId?: number
    EventDate?: string
    Name?: string | null
    Description?: string
    HearingHost?: { CommitteeCode?: string | null }
    Location?: { LocationName?: string | null }
    HearingAgendas?: {
      Topic?: string
      DocumentsInAgenda?: {
        BillNumber?: string
        PrimarySponsor?: { Id?: string | null } | null
      }[]
    }[]
  }
}

/**
 * A hearing as the profile lists it: the published title where the
 * Legislature gives one, the number of bills on the agenda and which are
 * hers. The record doesn't say which members attended, so neither does this.
 */
export function summarizeHearing(
  doc: HearingDoc,
  memberCode: string
): HearingSummary | undefined {
  const c = doc.content
  if (!c?.EventId || !c.EventDate || !c.HearingHost?.CommitteeCode)
    return undefined
  const docs = (c.HearingAgendas ?? []).flatMap(a => a.DocumentsInAgenda ?? [])
  const topics = [
    ...new Set(
      (c.HearingAgendas ?? [])
        .map(a => a.Topic?.trim())
        .filter((t): t is string => !!t)
    )
  ]
  const name = c.Name?.trim()
  return {
    eventId: c.EventId,
    committeeCode: c.HearingHost.CommitteeCode,
    date: c.EventDate,
    title: name && !/^hearing$/i.test(name) ? name : topics[0] ?? null,
    location: c.Location?.LocationName ?? null,
    billCount: new Set(docs.map(d => d.BillNumber).filter(Boolean)).size,
    herBills: [
      ...new Set(
        docs
          .filter(d => d.PrimarySponsor?.Id === memberCode && d.BillNumber)
          .map(d => d.BillNumber as string)
      )
    ],
    hasVideo: !!(doc.videos?.length || doc.videoURL)
  }
}

const DAY = 24 * 60 * 60 * 1000

/**
 * Hearings of the given committees from `daysBack` days ago onward, split
 * into upcoming (soonest first) and past (most recent first). Reads the
 * hearings in that window and keeps her committees', so it uses the
 * existing (type, startsAt) index.
 */
export async function loadCommitteeHearings(
  codes: string[],
  memberCode: string,
  now = Date.now(),
  daysBack = 120
): Promise<{ upcoming: HearingSummary[]; past: HearingSummary[] }> {
  if (!codes.length) return { upcoming: [], past: [] }
  const indexed = await loadByCommittee(codes, memberCode, now).catch(
    () => undefined
  )
  if (indexed) return indexed
  const snap = await getDocs(
    query(
      collection(firestore, "/events"),
      where("type", "==", "hearing"),
      where("startsAt", ">=", Timestamp.fromMillis(now - daysBack * DAY)),
      orderBy("startsAt", "asc")
    )
  )
  const wanted = new Set(codes)
  const all = snap.docs
    .map(d => {
      const data = d.data() as HearingDoc
      const s = summarizeHearing(data, memberCode)
      return s && wanted.has(s.committeeCode)
        ? { s, at: data.startsAt?.toMillis() ?? Date.parse(s.date) }
        : undefined
    })
    .filter((x): x is { s: HearingSummary; at: number } => !!x)
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  return {
    upcoming: all.filter(x => x.at >= startOfToday.getTime()).map(x => x.s),
    past: all
      .filter(x => x.at < startOfToday.getTime())
      .map(x => x.s)
      .reverse()
  }
}

/**
 * The committees' hearings through an index on the host committee and
 * start (firestore.indexes.json): the next ones and the last ten of each,
 * however far back. Fails until that index is deployed; the caller then
 * reads a recent window instead.
 */
async function loadByCommittee(
  codes: string[],
  memberCode: string,
  now: number
): Promise<{ upcoming: HearingSummary[]; past: HearingSummary[] }> {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const at = Timestamp.fromDate(start)
  const host = "content.HearingHost.CommitteeCode"
  const chunks: string[][] = []
  for (let i = 0; i < codes.length; i += 10) chunks.push(codes.slice(i, i + 10))
  const reads = await Promise.all(
    chunks.flatMap(chunk => [
      getDocs(
        query(
          collection(firestore, "/events"),
          where(host, "in", chunk),
          where("startsAt", ">=", at),
          orderBy("startsAt", "asc"),
          limit(20)
        )
      ),
      getDocs(
        query(
          collection(firestore, "/events"),
          where(host, "in", chunk),
          where("startsAt", "<", at),
          orderBy("startsAt", "desc"),
          limit(10)
        )
      )
    ])
  )
  const pick = (i: number) =>
    reads
      .filter((_, j) => j % 2 === i)
      .flatMap(s => s.docs)
      .map(d => ({ data: d.data() as HearingDoc }))
      .filter(x => x.data.type === "hearing")
      .map(x => ({
        s: summarizeHearing(x.data, memberCode),
        at: x.data.startsAt?.toMillis() ?? 0
      }))
      .filter((x): x is { s: HearingSummary; at: number } => !!x.s)
  return {
    upcoming: pick(0)
      .sort((a, b) => a.at - b.at)
      .map(x => x.s),
    past: pick(1)
      .sort((a, b) => b.at - a.at)
      .map(x => x.s)
  }
}
