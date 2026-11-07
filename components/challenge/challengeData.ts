/** The challenge's terms. */
export const GOAL_USD = 125_000
/** End of February 15, 2027 in Boston (midnight EST). */
export const DEADLINE = new Date("2027-02-16T05:00:00Z")

/**
 * Live totals. `null` until they come from FundraiseUp; the page then shows a
 * placeholder and leaves the progress bar empty rather than inventing a figure.
 */
export const RAISED_USD: number | null = null
export const SUPPORTER_COUNT: number | null = null

/** The campaign page's own palette, from its design. */
export const CHALLENGE_COLORS = {
  ink: "#16213A",
  body: "#2D3748",
  muted: "#4A5568",
  accent: "#B8441A",
  accentHover: "#8F3412",
  accentSoft: "#FBEDE6",
  page: "#FBFAF7",
  track: "#EDE9E0",
  border: "#E2E0D8",
  borderStrong: "#D9D5CA",
  borderControl: "#C9C4B8",
  inverseBody: "#E6E9F0",
  inverseMuted: "#D7DCE6"
}

export const formatUsd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  })

/** Whole days left until the deadline, or 0 once it has passed. */
export const daysLeft = (now: Date) =>
  Math.max(0, Math.ceil((DEADLINE.getTime() - now.getTime()) / 86_400_000))
