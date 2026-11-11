import { useTranslation } from "next-i18next"
import { useState } from "react"
import styled from "styled-components"
import { useAuth } from "components/auth"
import { MemberContent } from "components/db"
import { courtOrdinal } from "components/lobbying/sessions"
import { External, Internal } from "components/links"
import { FollowUserButton } from "components/shared/FollowButton"
import { MemberCommittee } from "./committees"
import { Claim } from "./useProfileData"
import { Chip } from "./ui"

const CLAIM_ADDRESS = "info@mapletestimony.org"

const Header = styled.section`
  background: var(--maple-surface-base);
  border: 1px solid var(--maple-surface-border);
  border-radius: var(--maple-radius-xl);
  box-shadow: var(--maple-shadow-sm);
  padding: var(--maple-space-xl);
  margin-bottom: var(--maple-space-lg);

  .top {
    display: flex;
    flex-wrap: wrap;
    gap: var(--maple-space-xl);
    justify-content: space-between;
  }

  .who {
    display: flex;
    gap: var(--maple-space-lg);
    min-width: 0;
    flex: 1 1 420px;
  }

  .photo {
    width: 96px;
    height: 120px;
    border-radius: var(--maple-radius-md);
    object-fit: cover;
    background: var(--maple-color-gray-subtle-bg);
    flex: none;
  }

  .eyebrow {
    font-size: 0.8125rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--maple-text-muted);
  }

  h1 {
    font-size: 2rem;
    font-weight: 800;
    color: var(--maple-text-strong);
    margin: 2px 0;
  }

  .seat {
    margin: 0 0 var(--maple-space-sm);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--maple-space-sm);
    margin-bottom: var(--maple-space-sm);
  }

  .contact {
    display: flex;
    flex-wrap: wrap;
    gap: 4px var(--maple-space-lg);
    font-size: 0.9375rem;
  }

  .actions {
    flex: 0 1 280px;
    display: flex;
    flex-direction: column;
    gap: var(--maple-space-sm);
    font-size: 0.875rem;
  }

  .claim {
    border-top: 1px solid var(--maple-border-default);
    padding-top: var(--maple-space-sm);
    color: var(--maple-text-body);
  }

  .link-button {
    background: none;
    border: 0;
    padding: 0;
    color: var(--bs-secondary);
    text-decoration: underline;
    font: inherit;
    min-height: 24px;
  }

  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: var(--maple-space-sm) var(--maple-space-2xl);
    border-top: 1px solid var(--maple-border-default);
    margin: var(--maple-space-lg) 0 0;
    padding-top: var(--maple-space-lg);
  }

  .facts div {
    display: flex;
    flex-direction: column;
  }

  .facts dd {
    order: -1;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--bs-secondary);
  }

  .facts dt {
    font-weight: 400;
    font-size: 0.875rem;
  }

  @media (max-width: 575.98px) {
    padding: var(--maple-space-lg);

    .photo {
      width: 72px;
      height: 90px;
    }

    h1 {
      font-size: 1.5rem;
    }
  }
`

/** "(617) 722-2680" from the digits the Legislature records. */
export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "")
  return d.length === 10
    ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
    : value.trim()
}

/** "Rep." or "Sen.", for the lines that name the legislator. */
export function honorific(member: Pick<MemberContent, "Branch">): string {
  return member.Branch === "Senate" ? "Sen." : "Rep."
}

export function lastName(name: string): string {
  return name.trim().split(/\s+/).slice(-1)[0] ?? name
}

export function ProfileHeader({
  member,
  court,
  claim,
  committees,
  counts
}: {
  member: MemberContent
  court: number
  claim: Claim | undefined
  committees: MemberCommittee[] | undefined
  counts: { lead: number; cosponsored: number; committees: number }
}) {
  const { t } = useTranslation("legislators")
  const { user } = useAuth()
  const [claimOpen, setClaimOpen] = useState(false)
  const title = `${honorific(member)} ${lastName(member.Name)}`
  const chairs = (committees ?? []).filter(c => c.role !== "member")
  const official = `https://malegislature.gov/Legislators/Profile/${member.MemberCode}`

  const claimBody = t("v2.claim.mailBody", {
    name: member.Name,
    url: typeof window === "undefined" ? "" : window.location.href
  })
  const claimHref = `mailto:${CLAIM_ADDRESS}?subject=${encodeURIComponent(
    t("v2.claim.mailSubject", { name: member.Name })
  )}&body=${encodeURIComponent(claimBody)}`

  return (
    <Header aria-labelledby="legislator-name">
      <div className="top">
        <div className="who">
          <img
            className="photo"
            src={`https://malegislature.gov/Legislators/Profile/170/${member.MemberCode}.jpg`}
            alt={t("v2.header.photoAlt", { name: member.Name })}
          />
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">
              {member.Branch === "Senate"
                ? t("stateSenator")
                : t("stateRepresentative")}
              {" · "}
              {t("v2.header.court", { court: courtOrdinal(court) })}
            </div>
            <h1 id="legislator-name">{member.Name}</h1>
            <p className="seat">
              {[member.Party, member.District].filter(Boolean).join(" · ")}
            </p>
            <div className="chips">
              {member.LeadershipPosition && (
                <Chip $tone="blue">{member.LeadershipPosition}</Chip>
              )}
              {chairs.map(c => (
                <Chip key={c.code} $tone="blue">
                  {t(`v2.committees.role.${c.role}`)}, {c.name}
                </Chip>
              ))}
              {claim === undefined ? null : claim ? (
                <Chip $tone="green">{t("v2.header.claimed", { title })}</Chip>
              ) : (
                <Chip>{t("v2.header.unclaimed")}</Chip>
              )}
            </div>
            <div className="contact">
              {member.EmailAddress && (
                <a href={`mailto:${member.EmailAddress}`}>
                  {member.EmailAddress}
                </a>
              )}
              {member.PhoneNumber && (
                <span>{formatPhone(member.PhoneNumber)}</span>
              )}
              {member.RoomNumber && (
                <span>{t("v2.header.room", { room: member.RoomNumber })}</span>
              )}
              <External href={official}>{t("v2.header.official")}</External>
            </div>
          </div>
        </div>

        <div className="actions">
          {claim && user ? (
            <>
              <FollowUserButton profileId={claim.uid} />
              <span>{t("v2.header.followHint")}</span>
            </>
          ) : claim ? (
            <span>
              <Internal href="/login">{t("v2.header.signInToFollow")}</Internal>
            </span>
          ) : null}
          <External href="https://malegislature.gov/Search/FindMyLegislator">
            {t("v2.header.findYours")}
          </External>
          {claim === null && (
            <div className="claim">
              {!claimOpen ? (
                <span>
                  {t("v2.claim.prompt", { title })}{" "}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setClaimOpen(true)}
                    aria-expanded={false}
                  >
                    {t("v2.claim.open")}
                  </button>
                </span>
              ) : (
                <div>
                  <p className="mb-1">
                    {t("v2.claim.how", {
                      email: member.EmailAddress,
                      maple: CLAIM_ADDRESS
                    })}
                  </p>
                  <a href={claimHref}>{t("v2.claim.send")}</a>
                  {" · "}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setClaimOpen(false)}
                    aria-expanded={true}
                  >
                    {t("v2.claim.cancel")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <dl className="facts">
        <div>
          <dt>{t("v2.facts.lead")}</dt>
          <dd>{counts.lead}</dd>
        </div>
        <div>
          <dt>{t("v2.facts.cosponsored")}</dt>
          <dd>{counts.cosponsored}</dd>
        </div>
        <div>
          <dt>{t("v2.facts.committees")}</dt>
          <dd>{counts.committees}</dd>
        </div>
      </dl>
    </Header>
  )
}
