import { DateTime } from "luxon"
import { useTranslation } from "next-i18next"
import { useMemo, useState } from "react"
import {
  InstantSearch,
  useConfigure,
  useHits,
  useInstantSearch
} from "react-instantsearch"
import styled from "styled-components"
import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter"
import { usePublishedTestimonyListing } from "components/db/testimony/usePublishedTestimonyListing"
import { formatBillId, truncateText } from "components/formatting"
import { Internal, maple } from "components/links"
import { getServerConfig } from "components/search/common"
import { testimonySearchParams } from "components/search/searchParams"
import {
  Card,
  CardTitle,
  Chip,
  Empty,
  Rows,
  SectionTitle,
  Source,
  Toggle,
  Tone
} from "./ui"

type Position = "endorse" | "oppose" | "neutral"

const stanceTone = (p: string): Tone =>
  p === "endorse" ? "green" : p === "oppose" ? "orange" : "blue"

const Item = styled.li`
  .top {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--maple-space-sm);
    align-items: center;
  }

  .bill {
    display: flex;
    flex-wrap: wrap;
    gap: var(--maple-space-sm);
    align-items: center;
  }

  blockquote {
    margin: var(--maple-space-sm) 0;
    color: var(--maple-text-body);
  }

  .by {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--maple-space-sm);
    font-size: 0.875rem;
  }
`

type Row = {
  id: string
  billId: string
  court: number
  position: string
  content: string
  author?: string
  date: string
}

function TestimonyRow({ row, showAuthor }: { row: Row; showAuthor: boolean }) {
  const { t } = useTranslation("legislators")
  return (
    <Item>
      <div className="top">
        <div className="bill">
          <Chip $tone={stanceTone(row.position)}>
            {t(`position.${row.position as Position}`)}
          </Chip>
          <Internal href={maple.bill({ court: row.court, id: row.billId })}>
            {formatBillId(row.billId)}
          </Internal>
        </div>
        <span style={{ fontSize: "0.875rem" }}>{row.date}</span>
      </div>
      <blockquote>“{truncateText(row.content, 320)}”</blockquote>
      <div className="by">
        {showAuthor && (
          <strong>{row.author || t("v2.testimony.anonymous")}</strong>
        )}
        <Internal href={maple.testimony({ publishedId: row.id })}>
          {t("v2.testimony.readFull")}
        </Internal>
      </div>
    </Item>
  )
}

function ByLegislator({ uid }: { uid: string }) {
  const { t } = useTranslation("legislators")
  const listing = usePublishedTestimonyListing({ uid })
  const rows: Row[] = useMemo(
    () =>
      [...(listing.items.result ?? [])]
        .sort((a, b) => b.publishedAt.toMillis() - a.publishedAt.toMillis())
        .map(x => ({
          id: x.id,
          billId: x.billId,
          court: x.court,
          position: x.position,
          content: x.content,
          date: DateTime.fromMillis(x.publishedAt.toMillis()).toLocaleString(
            DateTime.DATE_MED
          )
        })),
    [listing.items.result]
  )
  if (listing.items.loading) return <Empty>{t("v2.common.loading")}</Empty>
  if (!rows.length) return <Empty>{t("v2.testimony.noneBy")}</Empty>
  return (
    <Rows>
      {rows.map(r => (
        <TestimonyRow key={r.id} row={r} showAuthor={false} />
      ))}
    </Rows>
  )
}

type Hit = {
  id: string
  billId: string
  court: number
  position: Position
  content: string
  authorDisplayName: string
  publishedAt: number
}

function Configure({ court, billIds }: { court: number; billIds: string[] }) {
  useConfigure({
    hitsPerPage: 10,
    filters: `court:=${court} && billId:=[${billIds.join(",")}]`
  } as any)
  return null
}

function OnHerBillsList() {
  const { t } = useTranslation("legislators")
  const { hits } = useHits<Hit>()
  const { status } = useInstantSearch()
  if ((status === "loading" || status === "stalled") && !hits.length)
    return <Empty>{t("v2.common.loading")}</Empty>
  if (!hits.length) return <Empty>{t("v2.testimony.noneOn")}</Empty>
  return (
    <Rows>
      {hits.map(h => (
        <TestimonyRow
          key={h.id}
          showAuthor
          row={{
            id: h.id,
            billId: h.billId,
            court: h.court,
            position: h.position,
            content: h.content,
            author: h.authorDisplayName,
            date: h.publishedAt
              ? DateTime.fromMillis(h.publishedAt).toLocaleString(
                  DateTime.DATE_MED
                )
              : ""
          }}
        />
      ))}
    </Rows>
  )
}

function OnHerBills({ court, billIds }: { court: number; billIds: string[] }) {
  const { t } = useTranslation("legislators")
  const client = useMemo(
    () =>
      new TypesenseInstantSearchAdapter({
        server: getServerConfig(),
        additionalSearchParameters: testimonySearchParams
      }).searchClient,
    []
  )
  if (!billIds.length) return <Empty>{t("v2.testimony.noneOn")}</Empty>
  return (
    <InstantSearch
      indexName="publishedTestimony/sort/publishedAt:desc"
      searchClient={client}
    >
      <Configure court={court} billIds={billIds} />
      <OnHerBillsList />
    </InstantSearch>
  )
}

/** Shown only on a claimed page: what the legislator published on MAPLE,
 * and what others wrote about the bills she filed. */
export function TestimonySection({
  court,
  uid,
  title,
  leadIds
}: {
  court: number
  uid: string
  title: string
  leadIds: string[]
}) {
  const { t } = useTranslation("legislators")
  const [view, setView] = useState<"by" | "on">("by")
  return (
    <div>
      <SectionTitle>{t("v2.nav.testimony")}</SectionTitle>
      <Source>{t("v2.testimony.source", { title })}</Source>
      <Toggle
        label={t("v2.nav.testimony")}
        value={view}
        onChange={setView}
        options={[
          { key: "by", label: t("v2.testimony.byTab", { title }) },
          { key: "on", label: t("v2.testimony.onTab") }
        ]}
      />
      <Card>
        <CardTitle>
          {view === "by"
            ? t("v2.testimony.byHeading", { title })
            : t("v2.testimony.onHeading")}
        </CardTitle>
        {view === "by" ? (
          <ByLegislator uid={uid} />
        ) : (
          <OnHerBills court={court} billIds={leadIds} />
        )}
      </Card>
      <Internal href="/testimony">{t("v2.testimony.browse")}</Internal>
    </div>
  )
}
