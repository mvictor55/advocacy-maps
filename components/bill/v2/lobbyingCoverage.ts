import type { LobbyingStats } from "functions/src/lobbying/types"

/**
 * How well MAPLE's lobbying data covers a session, from the lobbyingMeta
 * stats document.
 *
 * - `none`: no disclosures for the session at all.
 * - `partial`: some, but far fewer lobbied bills than a full session has
 *   (the earliest sessions in the Secretary of State's data are sparse:
 *   the 184th has 38 lobbied bills, the 194th 5,660). A bill missing from
 *   them may simply not have been captured.
 * - `full`: a full session's worth of disclosures.
 *
 * `latestYear` is the most recent year with any disclosure, for saying how
 * recent the data is.
 */
export type LobbyingCoverage = {
  status: "none" | "partial" | "full"
  latestYear?: number
}

/** A session with fewer lobbied bills than this share of the busiest
 * session's is treated as partial. */
export const PARTIAL_SHARE = 0.5

export function lobbyingCoverage(
  stats:
    | Pick<LobbyingStats, "courtsWithData" | "courts" | "filingsByYear">
    | undefined,
  court: number
): LobbyingCoverage {
  const years = Object.keys(stats?.filingsByYear ?? {})
    .map(Number)
    .filter(y => Number.isFinite(y))
  const latestYear = years.length ? Math.max(...years) : undefined

  if (!stats?.courtsWithData.includes(court))
    return { status: "none", latestYear }

  const perCourt = stats.courts
  if (!perCourt) return { status: "full", latestYear }
  const counts = Object.values(perCourt).map(c => c.bills)
  const busiest = counts.length ? Math.max(...counts) : 0
  const bills = perCourt[String(court)]?.bills ?? 0
  const status = bills < busiest * PARTIAL_SHARE ? "partial" : "full"
  return { status, latestYear }
}
