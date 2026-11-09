import { Position, Testimony } from "components/db"

export type RoleFilter = "all" | "individual" | "organization"
export type SortKey = "newest" | "oldest"

export type TestimonyFilters = {
  position?: Position
  role: RoleFilter
  sort: SortKey
}

export const POSITIONS: Position[] = ["endorse", "neutral", "oppose"]

type Query = Record<string, string | string[] | undefined>
const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v

/** The testimony filters named in the URL. Unknown values are ignored. */
export function parseTestimonyFilters(query: Query): TestimonyFilters {
  const position = first(query.position)
  const role = first(query.role)
  const sort = first(query.sort)
  return {
    position: POSITIONS.includes(position as Position)
      ? (position as Position)
      : undefined,
    role: role === "individual" || role === "organization" ? role : "all",
    sort: sort === "oldest" ? "oldest" : "newest"
  }
}

/** Whether any filter narrows the list (sorting alone doesn't). */
export function isFiltered(filters: TestimonyFilters): boolean {
  return filters.position !== undefined || filters.role !== "all"
}

export function matchesRole(t: Testimony, role: RoleFilter): boolean {
  if (role === "all") return true
  const isOrg = t.authorRole === "organization"
  return role === "organization" ? isOrg : !isOrg
}

const millis = (t: Testimony) => t.publishedAt?.toMillis?.() ?? 0

/**
 * The testimony to list: filtered by position and author role, sorted by
 * date, with the reader's own testimony first whatever the sort.
 */
export function applyTestimonyFilters(
  items: Testimony[],
  filters: TestimonyFilters,
  ownUid?: string
): Testimony[] {
  const kept = items.filter(
    t =>
      (!filters.position || t.position === filters.position) &&
      matchesRole(t, filters.role)
  )
  const dir = filters.sort === "oldest" ? 1 : -1
  return kept.sort((a, b) => {
    const ownA = ownUid !== undefined && a.authorUid === ownUid ? 1 : 0
    const ownB = ownUid !== undefined && b.authorUid === ownUid ? 1 : 0
    if (ownA !== ownB) return ownB - ownA
    return dir * (millis(a) - millis(b))
  })
}

// ---- Grouping identical and near-identical letters -------------------------

export type LetterGroup = {
  /** The testimony shown for the group: the newest, or the reader's own. */
  representative: Testimony
  /** Every testimony in the group, the representative included. */
  members: Testimony[]
}

/** Words only, lower case, markup and punctuation dropped. */
export function normalizeLetter(content: string): string[] {
  return content
    .replace(/<[^>]+>/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
}

function shingles(words: string[], n = 3): Set<string> {
  const out = new Set<string>()
  for (let i = 0; i + n <= words.length; i++)
    out.add(words.slice(i, i + n).join(" "))
  return out
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  let shared = 0
  a.forEach(s => {
    if (b.has(s)) shared++
  })
  return shared / (a.size + b.size - shared)
}

/** Letters shorter than this are grouped only when identical. */
export const NEAR_IDENTICAL_MIN_WORDS = 40
/** Share of three-word phrases two long letters must have in common. */
export const NEAR_IDENTICAL_THRESHOLD = 0.8

export function isNearIdentical(a: string, b: string): boolean {
  const wa = normalizeLetter(a)
  const wb = normalizeLetter(b)
  const ja = wa.join(" ")
  const jb = wb.join(" ")
  if (ja === jb) return true
  if (
    wa.length < NEAR_IDENTICAL_MIN_WORDS ||
    wb.length < NEAR_IDENTICAL_MIN_WORDS
  )
    return false
  return jaccard(shingles(wa), shingles(wb)) >= NEAR_IDENTICAL_THRESHOLD
}

/**
 * One entry per author (their newest testimony), then identical and
 * near-identical letters (a form letter sent by many people) folded into
 * one group, so a campaign cannot fill the page. Order is kept: the
 * representative of a group is its first member in `items`.
 */
export function groupLetters(items: Testimony[]): LetterGroup[] {
  const seenAuthors = new Set<string>()
  const onePerAuthor = items.filter(t => {
    if (seenAuthors.has(t.authorUid)) return false
    seenAuthors.add(t.authorUid)
    return true
  })

  const groups: LetterGroup[] = []
  for (const t of onePerAuthor) {
    const group = groups.find(g =>
      isNearIdentical(g.representative.content, t.content)
    )
    if (group) group.members.push(t)
    else groups.push({ representative: t, members: [t] })
  }
  return groups
}
