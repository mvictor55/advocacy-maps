import { fetchHearingData, HearingData } from "components/hearing/hearing"
import { useAsync } from "react-async-hook"

/** One bill on a hearing's agenda, as the Legislature lists it. */
export type AgendaBill = {
  BillNumber: string
  Title?: string
  GeneralCourtNumber: number
}

/** A hearing from the Legislature's record (an `events/hearing-{id}`
 * document), with the other bills on its agenda. */
export type BillHearing = {
  /** The Legislature's event number, e.g. 5452 for "hearing-5452". */
  eventId: number
  /** The session the hearing belongs to, from the hearing document. A
   * bill's `hearingIds` are matched by bill number, and bill numbers are
   * reused every session, so this can differ from the bill's court. */
  court: number | null
  /** ISO date-time with its zone (America/New_York), or null. */
  date: string | null
  committeeName: string | null
  committeeCode: string | null
  /** Every document on the agenda, this bill included. */
  agenda: AgendaBill[]
  hasVideo: boolean
}

/** "hearing-5452" → 5452. */
export function hearingEventId(hearingId: string): number {
  return Number(hearingId.replace(/^hearing-/, ""))
}

function toBillHearing(eventId: number, data: HearingData): BillHearing {
  const agenda = (data.billsInAgenda ?? [])
    .filter(
      (d): d is AgendaBill =>
        typeof d?.BillNumber === "string" &&
        typeof d?.GeneralCourtNumber === "number"
    )
    .map(d => ({
      BillNumber: d.BillNumber,
      Title: d.Title,
      GeneralCourtNumber: d.GeneralCourtNumber
    }))
  const court = Number(data.generalCourtNumber)
  return {
    eventId,
    court: Number.isFinite(court) && court > 0 ? court : null,
    date: data.hearingDate,
    committeeName: data.committeeName,
    committeeCode: data.committeeCode,
    agenda,
    hasVideo: data.videos.length > 0
  }
}

/**
 * The hearings behind a bill's `hearingIds`, in the order the bill lists
 * them. A hearing that can't be read is left out, and so is a hearing from
 * another session: `hearingIds` are matched by bill number, and numbers are
 * reused every session, so a bill can point at an earlier session's hearing
 * on a different bill of the same number.
 */
export async function fetchBillHearings(
  hearingIds: string[],
  court: number
): Promise<BillHearing[]> {
  const results = await Promise.all(
    hearingIds.map(async id => {
      const eventId = hearingEventId(id)
      try {
        const data = await fetchHearingData(String(eventId))
        return data ? toBillHearing(eventId, data) : null
      } catch {
        return null
      }
    })
  )
  return ownSessionHearings(
    results.filter((h): h is BillHearing => h !== null),
    court
  )
}

/** Whether the hearing is from the bill's own session. A hearing from
 * another session was on that session's bill of the same number. A hearing
 * document that names no session is kept. */
export function isOwnSession(hearing: BillHearing, court: number): boolean {
  return hearing.court === null || hearing.court === court
}

/** Only the hearings from the bill's own session. */
export function ownSessionHearings(
  hearings: BillHearing[],
  court: number
): BillHearing[] {
  return hearings.filter(h => isOwnSession(h, court))
}

/** The bills on a hearing's agenda other than `billId`. */
export function heardWith(hearing: BillHearing, billId: string): AgendaBill[] {
  return hearing.agenda.filter(b => b.BillNumber !== billId)
}

/** The bill's hearings from its own session; `undefined` while loading. */
export function useBillHearings(
  hearingIds: string[] | undefined,
  court: number
) {
  const key = (hearingIds ?? []).join(",")
  const { result, loading, error } = useAsync(fetchForKey, [key, court])
  return { hearings: result, loading, error }
}

function fetchForKey(key: string, court: number): Promise<BillHearing[]> {
  return key ? fetchBillHearings(key.split(","), court) : Promise.resolve([])
}
