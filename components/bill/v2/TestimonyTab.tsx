import { useAuth } from "components/auth"
import { Button, Form, Image } from "components/bootstrap"
import { Bill, Position } from "components/db"
import { isCurrentCourt } from "functions/src/shared"
import { useTranslation } from "next-i18next"
import { useEffect, useMemo, useRef, useState } from "react"
import styled from "styled-components"
import { BillTestimonyCard } from "./BillTestimonyCard"
import { DraftNote } from "./DraftNote"
import { DraftOrigin } from "./newDraft"
import { Muted, PanelSection, SourceNote } from "./SourceNote"
import { STANCE_ICONS } from "./StanceBar"
import {
  applyTestimonyFilters,
  isFiltered,
  POSITIONS,
  RoleFilter,
  SortKey
} from "./testimonyFilters"
import { MAX_TESTIMONY, useAllBillTestimony } from "./useAllBillTestimony"
import { useBillUrlState } from "./useBillUrlState"

const FIRST = 25
const MORE = 25

const Controls = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--maple-space-sm);
  margin: var(--maple-space-sm) 0 var(--maple-space-md);

  > [role="group"] {
    grid-column: 1 / -1;
  }

  @media (max-width: 575.98px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

/** The position filter: MAPLE's thumbs beside each stance, never color
 * alone. The pressed one is the filter in the URL. */
const PositionToggles = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--maple-space-sm);

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border-radius: var(--maple-radius-md);
  }

  img {
    height: 16px;
    width: auto;
  }

  .btn-secondary img {
    filter: brightness(0) invert(1);
  }
`

const Banner = styled.p`
  background: var(--maple-color-blue-subtle-bg);
  border: 1px solid var(--maple-color-blue-subtle-border);
  color: var(--maple-color-blue-subtle-text);
  border-radius: var(--maple-radius-md);
  padding: var(--maple-space-sm) var(--maple-space-md);
  font-size: 0.9rem;
  margin: 0 0 var(--maple-space-md);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;

  .btn {
    padding: 0;
    font-size: inherit;
    vertical-align: baseline;
  }
`

const List = styled.div`
  display: flex;
  flex-direction: column;
`

const positionCount = (bill: Bill, p: Position) =>
  p === "endorse"
    ? bill.endorseCount ?? 0
    : p === "oppose"
    ? bill.opposeCount ?? 0
    : bill.neutralCount ?? 0

/**
 * Every testimony on the bill, filtered by position and author, sorted, with
 * the reader's own first. Filters live in the URL so a filtered link opens
 * this tab showing the same list.
 */
export function TestimonyTab({
  bill,
  draft
}: {
  bill: Bill
  draft?: DraftOrigin
}) {
  const { t } = useTranslation(["billPage", "common"])
  const { user } = useAuth()
  const { filters, setParams } = useBillUrlState()
  const total = bill.testimonyCount ?? 0
  const { testimony, loading, error } = useAllBillTestimony(
    bill.court,
    bill.id,
    total > 0
  )
  const [shown, setShown] = useState(FIRST)
  const listRef = useRef<HTMLDivElement>(null)

  const list = useMemo(
    () =>
      testimony ? applyTestimonyFilters(testimony, filters, user?.uid) : [],
    [testimony, filters, user?.uid]
  )
  const filtered = isFiltered(filters)

  // A filtered link lands on the list itself.
  useEffect(() => {
    if (filtered && testimony && listRef.current)
      listRef.current.scrollIntoView?.({ block: "start" })
    // Only when the list first appears for a filtered link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testimony !== undefined])

  const positionLabel = (p: Position) => t(`billPage:stance.${p}`)
  const roleLabel = (r: RoleFilter) =>
    t(
      r === "individual"
        ? "billPage:testimony.roleIndividual"
        : r === "organization"
        ? "billPage:testimony.roleOrganization"
        : "billPage:testimony.roleAll"
    )
  const activeFilters = [
    filters.position && positionLabel(filters.position),
    filters.role !== "all" && roleLabel(filters.role)
  ].filter(Boolean) as string[]

  const visible = list.slice(0, shown)

  return (
    <PanelSection title={t("billPage:testimony.title")} id="testimony">
      {total === 0 ? (
        draft ? (
          <DraftNote bill={bill} draft={draft} about="testimony" />
        ) : (
          <Muted>
            {t(
              isCurrentCourt(bill.court)
                ? "billPage:testimony.noneCurrent"
                : "billPage:testimony.nonePast"
            )}
          </Muted>
        )
      ) : (
        <>
          <Muted>{t("billPage:testimony.intro", { count: total })}</Muted>
          <Controls>
            <PositionToggles
              role="group"
              aria-label={t("billPage:testimony.positionFilter")}
            >
              <Button
                variant={filters.position ? "outline-secondary" : "secondary"}
                size="sm"
                aria-pressed={!filters.position}
                onClick={() => setParams({ position: null })}
              >
                {t("billPage:testimony.allPositions", { count: total })}
              </Button>
              {POSITIONS.map(p => (
                <Button
                  key={p}
                  variant={
                    filters.position === p ? "secondary" : "outline-secondary"
                  }
                  size="sm"
                  aria-pressed={filters.position === p}
                  onClick={() =>
                    setParams({ position: filters.position === p ? null : p })
                  }
                >
                  <Image src={STANCE_ICONS[p]} alt="" aria-hidden="true" />
                  {t("billPage:testimony.positionOption", {
                    position: positionLabel(p),
                    count: positionCount(bill, p)
                  })}
                </Button>
              ))}
            </PositionToggles>
            <Form.Select
              aria-label={t("billPage:testimony.roleFilter")}
              value={filters.role}
              onChange={e =>
                setParams({
                  role: e.target.value === "all" ? null : e.target.value
                })
              }
            >
              {(["all", "individual", "organization"] as RoleFilter[]).map(
                r => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                )
              )}
            </Form.Select>
            <Form.Select
              aria-label={t("billPage:testimony.sort")}
              value={filters.sort}
              onChange={e =>
                setParams({
                  sort:
                    (e.target.value as SortKey) === "newest"
                      ? null
                      : e.target.value
                })
              }
            >
              <option value="newest">
                {t("billPage:testimony.sortNewest")}
              </option>
              <option value="oldest">
                {t("billPage:testimony.sortOldest")}
              </option>
            </Form.Select>
          </Controls>

          {filtered && testimony && (
            <Banner role="status">
              {t("billPage:testimony.showing")}{" "}
              <b>{activeFilters.join(", ")}</b>{" "}
              {t("billPage:testimony.showingCount", { count: list.length })} ·{" "}
              <Button
                variant="link"
                onClick={() => setParams({ position: null, role: null })}
              >
                {t("billPage:testimony.clearFilters")}
              </Button>
            </Banner>
          )}
          {total > MAX_TESTIMONY && (
            <Muted className="small mb-2">
              {t("billPage:testimony.cap", { max: MAX_TESTIMONY, total })}
            </Muted>
          )}

          <div ref={listRef}>
            {loading && <Muted>{t("billPage:testimony.loading")}</Muted>}
            {error && <Muted>{t("billPage:testimony.loadError")}</Muted>}
            {testimony && list.length === 0 && (
              <Muted>{t("billPage:testimony.noMatch")}</Muted>
            )}
            <List>
              {visible.map(item => (
                <BillTestimonyCard
                  key={item.id}
                  testimony={item}
                  isOwn={item.authorUid === user?.uid}
                />
              ))}
            </List>
            {list.length > shown && (
              <Button
                variant="outline-secondary"
                className="w-100 mt-3"
                onClick={() => setShown(n => n + MORE)}
              >
                {t("billPage:testimony.showMore", {
                  count: Math.min(MORE, list.length - shown)
                })}{" "}
                <span className="text-muted fw-normal">
                  {t("billPage:testimony.remaining", {
                    count: list.length - shown
                  })}
                </span>
              </Button>
            )}
          </div>
        </>
      )}
      <SourceNote>{t("billPage:source.testimony")}</SourceNote>
    </PanelSection>
  )
}
