import { useRouter } from "next/router"
import { useCallback, useMemo } from "react"
import { parseTestimonyFilters, TestimonyFilters } from "./testimonyFilters"

export const TAB_KEYS = [
  "overview",
  "testimony",
  "hearing",
  "history",
  "lobbying",
  "text"
] as const
export type TabKey = (typeof TAB_KEYS)[number]

/** Query parameters that only mean something on the Testimony tab. A link
 * carrying one of them without `tab` opens that tab. */
export const TESTIMONY_PARAMS = ["position", "role", "sort"] as const
/** `?rc=house-270` opens History & votes with that roll call expanded. */
export const ROLL_CALL_PARAM = "rc"

type Query = Record<string, string | string[] | undefined>

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v

/** The tab a `?tab=` value names. Anything else, or no value, is Overview. */
export function parseTab(value: string | string[] | undefined): TabKey {
  const v = first(value)
  return (TAB_KEYS as readonly string[]).includes(v ?? "")
    ? (v as TabKey)
    : "overview"
}

/** The tab the whole query asks for: `tab` wins; a testimony filter alone
 * opens the Testimony tab. */
export function tabForQuery(query: Query): TabKey {
  if (query.tab !== undefined) return parseTab(query.tab)
  if (TESTIMONY_PARAMS.some(k => first(query[k]) !== undefined))
    return "testimony"
  if (first(query[ROLL_CALL_PARAM]) !== undefined) return "history"
  return "overview"
}

/**
 * The query for a tab, keeping every other parameter (pagination, feature
 * flag overrides) as it is. Overview is the page with no `tab` parameter.
 * Testimony filters belong to the Testimony tab and are dropped on leaving it.
 */
export function queryForTab(query: Query, tab: TabKey): Query {
  const { tab: _tab, ...rest } = query
  if (tab !== "testimony") for (const k of TESTIMONY_PARAMS) delete rest[k]
  if (tab !== "history") delete rest[ROLL_CALL_PARAM]
  return tab === "overview" ? rest : { ...rest, tab }
}

/** The names of a route's dynamic segments: "/bills/[court]/[billId]" has
 * `court` and `billId`. They are in `router.query` but not in the URL's
 * query string. */
export function routeParams(pathname: string): string[] {
  return [...pathname.matchAll(/\[(?:\.\.\.)?(\w+)\]/g)].map(m => m[1])
}

/** The page's path with the given query. */
export function hrefWithQuery(
  asPath: string,
  pathname: string,
  query: Query
): string {
  const path = asPath.split(/[?#]/)[0]
  const params = new URLSearchParams()
  const dynamic = new Set(routeParams(pathname))
  for (const [key, value] of Object.entries(query)) {
    if (dynamic.has(key) || value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value])
      params.append(key, v)
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

/** "/bills/194/H4746?page=2&tab=history": the page's path with the tab and
 * the other query parameters. */
export function hrefFor(
  asPath: string,
  pathname: string,
  query: Query,
  tab: TabKey
): string {
  return hrefWithQuery(asPath, pathname, queryForTab(query, tab))
}

/**
 * Which section of the bill page is open and how the testimony is filtered,
 * read from and written to the URL so links land on a section and Back and
 * Forward move between sections.
 */
export function useBillUrlState() {
  const router = useRouter()
  const tab = tabForQuery(router.query)
  const filters: TestimonyFilters = useMemo(
    () => parseTestimonyFilters(router.query),
    [router.query]
  )
  const rollCallId = first(router.query[ROLL_CALL_PARAM])

  const hrefForTab = useCallback(
    (next: TabKey) =>
      hrefFor(router.asPath, router.pathname, router.query, next),
    [router.asPath, router.pathname, router.query]
  )

  const setTab = useCallback(
    (next: TabKey) => {
      if (next === tab) return
      void router.push(hrefForTab(next), undefined, {
        shallow: true,
        scroll: false
      })
    },
    [hrefForTab, router, tab]
  )

  /** Sets or removes (`null`) query parameters in place, without a history
   * entry, so a filter change doesn't become a Back stop. */
  const setParams = useCallback(
    (changes: Record<string, string | null>) => {
      const query: Query = { ...router.query }
      for (const [k, v] of Object.entries(changes)) {
        if (v === null) delete query[k]
        else query[k] = v
      }
      void router.replace(
        hrefWithQuery(router.asPath, router.pathname, query),
        undefined,
        { shallow: true, scroll: false }
      )
    },
    [router]
  )

  return useMemo(
    () => ({ tab, filters, rollCallId, hrefForTab, setTab, setParams }),
    [tab, filters, rollCallId, hrefForTab, setTab, setParams]
  )
}
