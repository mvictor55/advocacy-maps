import {
  fetchLobbyingStats,
  useLobbyingFilingsForBill,
  useLobbyingInHouseFilers,
  useLobbyingRegistrantsByIds
} from "components/db/lobbying"
import {
  Activity,
  groupActivity,
  organizationRows
} from "components/lobbying/activity"
import { createContext, ReactNode, useContext, useMemo } from "react"
import { useAsync } from "react-async-hook"

/**
 * Lobbying on one bill, grouped by client organization exactly as the
 * Lobbying Explorer's bill page groups it (`groupActivity`).
 *
 * - `off`: the lobbying feature flag is off; nothing was read.
 * - `loading`, `error`: as the Explorer's hooks report them.
 * - `ready`: `activity` has one row per organization; `organizations` counts
 *   the real ones ("No client" placeholders are left out). `covered` says
 *   whether MAPLE's lobbying data includes this bill's session at all.
 */
export type BillLobbying =
  | { status: "off" }
  | { status: "loading" }
  | { status: "error"; error?: Error }
  | {
      status: "ready"
      activity: Activity
      organizations: number
      covered: boolean
    }

const BillLobbyingContext = createContext<BillLobbying>({ status: "off" })

export const useBillLobbying = () => useContext(BillLobbyingContext)

function Loaded({
  court,
  billId,
  children
}: {
  court: number
  billId: string
  children: ReactNode
}) {
  const filings = useLobbyingFilingsForBill(court, billId)
  const registrantIds = useMemo(
    () => (filings.result ?? []).map(f => f.registrantId),
    [filings.result]
  )
  const registrants = useLobbyingRegistrantsByIds(registrantIds)
  const inHouse = useLobbyingInHouseFilers(court)
  const stats = useAsync(fetchLobbyingStats, [])

  const value = useMemo<BillLobbying>(() => {
    const failed = [filings, registrants, inHouse].find(
      s => s.status === "error"
    )
    if (failed) return { status: "error", error: failed.error }
    if (
      !filings.result ||
      !registrants.result ||
      !inHouse.result ||
      stats.loading
    )
      return { status: "loading" }
    const activity = groupActivity(
      filings.result,
      "client",
      registrants.result,
      inHouse.result
    )
    return {
      status: "ready",
      activity,
      organizations: organizationRows(activity.rows).length,
      covered: (stats.result?.courtsWithData ?? []).includes(court)
    }
  }, [court, filings, registrants, inHouse, stats.loading, stats.result])

  return (
    <BillLobbyingContext.Provider value={value}>
      {children}
    </BillLobbyingContext.Provider>
  )
}

/** Reads the bill's lobbying when `enabled`; otherwise reads nothing. */
export function BillLobbyingProvider({
  enabled,
  court,
  billId,
  children
}: {
  enabled: boolean
  court: number
  billId: string
  children: ReactNode
}) {
  if (!enabled)
    return (
      <BillLobbyingContext.Provider value={{ status: "off" }}>
        {children}
      </BillLobbyingContext.Provider>
    )
  return (
    <Loaded court={court} billId={billId}>
      {children}
    </Loaded>
  )
}
