import { useRouter } from "next/router"
import { useCallback, useMemo } from "react"

export const TAB_KEYS = [
  "overview",
  "testimony",
  "hearing",
  "history",
  "lobbying",
  "text"
] as const
export type TabKey = (typeof TAB_KEYS)[number]

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

/**
 * The query for a tab, keeping every other parameter (pagination, feature
 * flag overrides) as it is. Overview is the page with no `tab` parameter.
 */
export function queryForTab(query: Query, tab: TabKey): Query {
  const { tab: _tab, ...rest } = query
  return tab === "overview" ? rest : { ...rest, tab }
}

/** The names of a route's dynamic segments: "/bills/[court]/[billId]" has
 * `court` and `billId`. They are in `router.query` but not in the URL's
 * query string. */
export function routeParams(pathname: string): string[] {
  return [...pathname.matchAll(/\[(?:\.\.\.)?(\w+)\]/g)].map(m => m[1])
}

/** "/bills/194/H4746?page=2&tab=history": the page's path with the tab and
 * the other query parameters. */
export function hrefFor(
  asPath: string,
  pathname: string,
  query: Query,
  tab: TabKey
): string {
  const path = asPath.split(/[?#]/)[0]
  const params = new URLSearchParams()
  const dynamic = new Set(routeParams(pathname))
  for (const [key, value] of Object.entries(queryForTab(query, tab))) {
    if (dynamic.has(key) || value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value])
      params.append(key, v)
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

/**
 * Which section of the bill page is open, read from and written to the URL
 * so links land on a section and Back and Forward move between sections.
 */
export function useBillUrlState() {
  const router = useRouter()
  const tab = parseTab(router.query.tab)

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

  return useMemo(() => ({ tab, hrefForTab, setTab }), [tab, hrefForTab, setTab])
}
