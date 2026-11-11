import ErrorPage from "next/error"
import Head from "next/head"
import { useTranslation } from "next-i18next"
import styled from "styled-components"
import { Container, Row, Spinner } from "components/bootstrap"
import { MemberContent, useMember } from "components/db"
import { useMembersFinance } from "components/db/membersFinance"
import { Internal, maple } from "components/links"
import { BillsSection, memberBillIds } from "./BillsSection"
import { CommitteesSection } from "./CommitteesSection"
import { FinanceSection } from "./FinanceSection"
import { OverviewSection } from "./OverviewSection"
import { honorific, lastName, ProfileHeader } from "./ProfileHeader"
import { NavItem, SectionNav } from "./SectionNav"
import { TestimonySection } from "./TestimonySection"
import {
  useBillSummary,
  useClaim,
  useCommitteeHearings,
  useCommittees,
  useMemberVotes
} from "./useProfileData"
import { useProfileSection } from "./useProfileSection"
import { VotesSection } from "./VotesSection"

const Page = styled(Container)`
  padding-top: var(--maple-space-lg);
  padding-bottom: var(--maple-space-3xl);
`

const Crumbs = styled.nav`
  font-size: 0.875rem;
  margin-bottom: var(--maple-space-md);

  ol {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li + li::before {
    content: "›";
    margin-right: 6px;
    color: var(--maple-text-muted);
  }
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: var(--maple-space-xl);
  align-items: start;

  @media (max-width: 767.98px) {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--maple-space-lg);
  }
`

const Sources = styled.section`
  margin-top: var(--maple-space-2xl);
  border-top: 1px solid var(--maple-border-default);
  padding-top: var(--maple-space-xl);

  h2 {
    font-size: 1.25rem;
    font-weight: 800;
  }

  dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--maple-space-lg);
    margin: 0;
  }

  dt {
    font-weight: 700;
  }

  dd {
    margin: 0;
    color: var(--maple-text-body);
  }
`

function DataSources({ claimed, title }: { claimed: boolean; title: string }) {
  const { t } = useTranslation("legislators")
  return (
    <Sources id="data-sources" aria-labelledby="data-sources-h">
      <h2 id="data-sources-h">{t("v2.sources.link")}</h2>
      <dl>
        <div>
          <dt>{t("v2.sources.recordTitle")}</dt>
          <dd>{t("v2.sources.record")}</dd>
        </div>
        <div>
          <dt>{t("v2.sources.usersTitle")}</dt>
          <dd>{t("v2.sources.users")}</dd>
        </div>
        {claimed && (
          <div>
            <dt>{t("v2.sources.legislatorTitle")}</dt>
            <dd>{t("v2.sources.legislator", { title })}</dd>
          </div>
        )}
      </dl>
    </Sources>
  )
}

/**
 * The legislator profile behind the `legislatorProfileV2` flag: a header
 * that says whether the legislator's office has claimed the page, a section
 * nav, and six sections, each filled from a feed, a join or a fixed rule.
 */
export function LegislatorProfileV2({
  court,
  memberCode
}: {
  court: number
  memberCode: string
}) {
  const { member, loading } = useMember(court, memberCode)
  if (loading)
    return (
      <Row>
        <Spinner animation="border" className="mx-auto my-5" />
      </Row>
    )
  if (!member) return <ErrorPage statusCode={404} withDarkMode={false} />
  return <Profile court={court} member={member} />
}

function Profile({ court, member }: { court: number; member: MemberContent }) {
  const { t } = useTranslation(["legislators", "common"])
  const memberCode = member.MemberCode
  const codes = (member.Committees ?? []).map(c => c.CommitteeCode)
  const claimState = useClaim(memberCode)
  const claim =
    claimState.status === "ready"
      ? claimState.value
      : claimState.status === "error"
      ? null
      : undefined
  const summary = useBillSummary(court, memberCode)
  const votes = useMemberVotes(court, memberCode)
  const committees = useCommittees(court, memberCode, codes)
  const hearings = useCommitteeHearings(memberCode, codes)
  const { finance, loading: financeLoading } = useMembersFinance(
    court,
    memberCode
  )
  const { section: requested, hrefFor } = useProfileSection()
  const section = requested === "testimony" && !claim ? "overview" : requested

  const ids = memberBillIds(member)
  const title = `${honorific(member)} ${lastName(member.Name)}`
  const committeeList =
    committees.status === "ready" ? committees.value : undefined

  const items: NavItem[] = [
    { key: "overview" },
    { key: "bills", count: ids.lead.length + ids.cosponsored.length },
    {
      key: "votes",
      count:
        votes.status === "ready" && votes.value.length
          ? votes.value.length
          : undefined
    },
    { key: "testimony", locked: !claim },
    { key: "committees", count: codes.length },
    { key: "finance" }
  ]

  return (
    <Page>
      <Head>
        <title>
          {t("legislators:v2.head.title", {
            name: member.Name,
            maple: t("common:maple_abbr")
          })}
        </title>
      </Head>
      <Crumbs aria-label={t("legislators:v2.crumbs.label")}>
        <ol>
          <li>
            <Internal href={maple.home()}>{t("legislators:home")}</Internal>
          </li>
          <li>{t("legislators:legislators")}</li>
          <li>{member.Branch}</li>
          <li aria-current="page">{member.Name}</li>
        </ol>
      </Crumbs>
      <ProfileHeader
        member={member}
        court={court}
        claim={claim}
        committees={committeeList}
        counts={{
          lead: ids.lead.length,
          cosponsored: ids.cosponsored.length,
          committees: codes.length
        }}
      />
      <Layout>
        <SectionNav items={items} active={section} hrefFor={hrefFor} />
        <div id="profile-sections" style={{ minWidth: 0 }}>
          {section === "overview" && (
            <OverviewSection
              court={court}
              title={title}
              claim={claim}
              summary={summary.status === "ready" ? summary.value : undefined}
              leadIds={ids.lead}
              votes={votes}
              committees={committeeList}
              hearings={hearings}
              hrefFor={hrefFor}
            />
          )}
          {section === "bills" && (
            <BillsSection
              member={member}
              court={court}
              summary={summary.status === "ready" ? summary.value : undefined}
            />
          )}
          {section === "votes" && (
            <VotesSection
              court={court}
              member={member}
              votes={votes}
              leadIds={ids.lead}
              committees={committeeList}
            />
          )}
          {section === "testimony" && claim && (
            <TestimonySection
              court={court}
              uid={claim.uid}
              title={title}
              leadIds={ids.lead}
            />
          )}
          {section === "committees" && (
            <CommitteesSection
              committees={committees}
              hearings={hearings}
              possessive={t("legislators:v2.common.possessive", { title })}
            />
          )}
          {section === "finance" && (
            <FinanceSection finance={finance} loading={financeLoading} />
          )}
        </div>
      </Layout>
      <DataSources claimed={!!claim} title={title} />
    </Page>
  )
}
