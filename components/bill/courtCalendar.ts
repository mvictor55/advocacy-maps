/**
 * The dates that decide whether a step can still happen in a session, from
 * docs/bill-tracker-status-model.md §5.1. Known sessions are listed; other
 * sessions are computed from the Legislature's rules (a General Court
 * convenes on the first Wednesday of January of an odd year and dissolves
 * the day before the next one convenes).
 */
export type CourtCalendar = {
  court: number
  /** First Wednesday of January, odd year. */
  convene: string
  /** Joint Rule 10 reporting deadline for joint committees. */
  jr10Default: string
  /** What happens to an unreported bill at the deadline. */
  jr10Rule: "adverse" | "study"
  /** End of formal sessions in the second year. */
  formalEndYear2: string
  /** The day the session ends; the "No further action taken" stamp date. */
  dissolution: string
}

const KNOWN: Record<number, Omit<CourtCalendar, "court">> = {
  192: {
    convene: "2021-01-06",
    jr10Default: "2022-02-02",
    jr10Rule: "adverse",
    formalEndYear2: "2022-07-31",
    dissolution: "2023-01-03"
  },
  193: {
    convene: "2023-01-04",
    jr10Default: "2024-02-07",
    jr10Rule: "adverse",
    formalEndYear2: "2024-07-31",
    dissolution: "2024-12-31"
  },
  194: {
    convene: "2025-01-01",
    jr10Default: "2025-12-03",
    jr10Rule: "study",
    formalEndYear2: "2026-07-31",
    dissolution: "2027-01-05"
  },
  195: {
    convene: "2027-01-06",
    jr10Default: "2027-12-01",
    jr10Rule: "study",
    formalEndYear2: "2028-07-31",
    dissolution: "2029-01-02"
  }
}

/** The first year of a session: the 184th began in 2005. */
export function courtFirstYear(court: number): number {
  return 2005 + 2 * (court - 184)
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** The first Wednesday of a month, in UTC. */
function firstWednesday(year: number, monthIndex: number): Date {
  const d = new Date(Date.UTC(year, monthIndex, 1))
  const offset = (3 - d.getUTCDay() + 7) % 7
  d.setUTCDate(1 + offset)
  return d
}

export function courtCalendar(court: number): CourtCalendar {
  const known = KNOWN[court]
  if (known) return { court, ...known }
  const y1 = courtFirstYear(court)
  const convene = firstWednesday(y1, 0)
  const nextConvene = firstWednesday(y1 + 2, 0)
  const dissolution = new Date(nextConvene.getTime() - 24 * 3600 * 1000)
  // Sessions from the 194th on report in December of the first year and
  // send unreported bills to study; earlier ones reported in February of the
  // second year with an adverse report.
  const modern = court >= 194
  return {
    court,
    convene: iso(convene),
    jr10Default: iso(
      modern ? firstWednesday(y1, 11) : firstWednesday(y1 + 1, 1)
    ),
    jr10Rule: modern ? "study" : "adverse",
    formalEndYear2: `${y1 + 1}-07-31`,
    dissolution: iso(dissolution)
  }
}

/** "2026-03-18" for a Date, in UTC, for comparing with calendar dates. */
export function isoDate(now: Date): string {
  return iso(now)
}
