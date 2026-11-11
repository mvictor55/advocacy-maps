import { useRouter } from "next/router"
import { useCallback, useEffect } from "react"
import { hrefWithQuery } from "components/bill/v2/useBillUrlState"

export const SECTIONS = [
  "overview",
  "bills",
  "votes",
  "testimony",
  "committees",
  "finance"
] as const
export type Section = (typeof SECTIONS)[number]

type Query = Record<string, string | string[] | undefined>

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v

const isSection = (v: string | undefined): v is Section =>
  (SECTIONS as readonly string[]).includes(v ?? "")

/** The earlier profile's tabs were URL hashes; they land on the section
 * that took their place. */
const LEGACY_HASHES: Record<string, Section> = {
  priorities: "overview",
  bills: "bills",
  votes: "votes",
  testimony: "testimony",
  finance: "finance",
  elections: "finance",
  district: "overview"
}

export function sectionForQuery(query: Query): Section {
  const v = first(query.tab)
  return isSection(v) ? v : "overview"
}

/** Overview is the page without a `tab` parameter; others keep the rest
 * of the query (flag overrides) as it is. */
export function queryForSection(query: Query, section: Section): Query {
  const { tab: _tab, ...rest } = query
  return section === "overview" ? rest : { ...rest, tab: section }
}

/** Which section of the profile is open, read from and written to `?tab=`
 * so a link lands on a section and Back and Forward move between them. */
export function useProfileSection() {
  const router = useRouter()
  const section = sectionForQuery(router.query)

  const hrefFor = useCallback(
    (next: Section) =>
      hrefWithQuery(
        router.asPath,
        router.pathname,
        queryForSection(router.query, next)
      ),
    [router.asPath, router.pathname, router.query]
  )

  const go = useCallback(
    (next: Section) => {
      if (next === section) return
      void router.push(hrefFor(next), undefined, {
        shallow: true,
        scroll: false
      })
    },
    [hrefFor, router, section]
  )

  // An old "#finance" link opens Campaign finance.
  useEffect(() => {
    if (!router.isReady) return
    const hash = router.asPath.split("#", 2)[1]
    const legacy = hash && LEGACY_HASHES[hash]
    if (legacy && router.query.tab === undefined && legacy !== "overview")
      void router.replace(hrefFor(legacy), undefined, {
        shallow: true,
        scroll: false
      })
  }, [router, hrefFor])

  return { section, hrefFor, go }
}
