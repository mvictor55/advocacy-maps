import { useEffect, useState } from "react"
import { useTranslation } from "next-i18next"
import styled from "styled-components"
import {
  CHALLENGE_COLORS as C,
  GOAL_USD,
  RAISED_USD,
  SUPPORTER_COUNT,
  daysLeft,
  formatUsd
} from "./challengeData"
import { DonationForm } from "./DonationForm"

type Card = { label: string; title: string; body: string }
type Item = { title: string; body: string }
type Level = { amount: string; body: string; cta: string }
type Faq = { q: string; a: string }

const ANCHORS = {
  what: "what",
  funds: "funds",
  faq: "faq",
  give: "give",
  otherWays: "other-ways"
} as const

export function ChallengePage() {
  const { t } = useTranslation("challenge")
  const list = <T,>(key: string) => t(key, { returnObjects: true }) as T[]

  // Days left depends on today's date, so it is worked out in the browser:
  // the page is built ahead of time and would otherwise show a stale count.
  const [days, setDays] = useState<number | null>(null)
  useEffect(() => setDays(daysLeft(new Date())), [])

  const goal = formatUsd(GOAL_USD)
  const progress =
    RAISED_USD === null ? 0 : Math.min(100, (RAISED_USD / GOAL_USD) * 100)

  return (
    <Root>
      <Subnav aria-label={t("nav.label")}>
        <div className="inner">
          <a href={`#${ANCHORS.what}`}>{t("nav.what")}</a>
          <a href={`#${ANCHORS.funds}`}>{t("nav.funds")}</a>
          <a href={`#${ANCHORS.faq}`}>{t("nav.faq")}</a>
          <a className="button" href={`#${ANCHORS.give}`}>
            {t("nav.give")}
          </a>
        </div>
      </Subnav>

      <Hero>
        <div className="inner">
          <div className="lead">
            <p className="eyebrow">{t("hero.eyebrow")}</p>
            <h1>{t("hero.title")}</h1>
            <p className="intro">{t("hero.body")}</p>

            <div className="meter">
              <div className="totals">
                <p className="raised">
                  {RAISED_USD === null
                    ? t("hero.raisedPlaceholder")
                    : formatUsd(RAISED_USD)}{" "}
                  <span>{t("hero.ofGoal", { goal })}</span>
                </p>
                {days !== null && (
                  <p className="muted">
                    {days > 0
                      ? t("hero.daysLeft", { count: days })
                      : t("hero.challengeEnded")}
                  </p>
                )}
              </div>
              <div
                className="track"
                role="progressbar"
                aria-label={t("hero.progressLabel", { goal })}
                aria-valuemin={0}
                aria-valuemax={GOAL_USD}
                aria-valuenow={RAISED_USD ?? undefined}
              >
                <div className="fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="muted">
                <strong>
                  {SUPPORTER_COUNT === null
                    ? t("hero.supportersPlaceholder")
                    : t("hero.supporters", { count: SUPPORTER_COUNT })}
                </strong>
                {t("hero.supportersSuffix")}
              </p>
            </div>

            <div className="actions">
              <a className="button large" href={`#${ANCHORS.give}`}>
                {t("hero.cta")}
              </a>
              <a href={`#${ANCHORS.otherWays}`}>{t("hero.otherWays")}</a>
            </div>
          </div>

          <DonationForm id={ANCHORS.give} />
        </div>
      </Hero>

      <Section id={ANCHORS.what}>
        <div className="inner">
          <div className="heading">
            <h2>{t("what.title")}</h2>
            <p>{t("what.body")}</p>
          </div>
          <div className="cards">
            {list<Card>("what.cards").map(card => (
              <div className="card" key={card.title}>
                <p className="label">{card.label}</p>
                <h3>{card.title}</h3>
                <p className="muted">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Why>
        <div className="inner">
          <h2>{t("why.title")}</h2>
          {list<string>("why.paragraphs").map(p => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Why>

      <Section id={ANCHORS.funds} $white>
        <div className="inner">
          <div className="heading">
            <h2>{t("funds.title")}</h2>
            <p>{t("funds.body")}</p>
          </div>
          <div className="funds">
            {list<Item>("funds.items").map(item => (
              <div key={item.title}>
                <h3>{item.title}</h3>
                <p className="muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section>
        <div className="inner">
          <div className="heading">
            <h2>{t("levels.title")}</h2>
          </div>
          <div className="cards">
            {list<Level>("levels.items").map(level => (
              <div className="card level" key={level.amount}>
                <p className="amount">{level.amount}</p>
                <p className="muted grow">{level.body}</p>
                <a href={`#${ANCHORS.give}`}>{level.cta}</a>
              </div>
            ))}
            <div className="card level dark">
              <p className="amount">
                {t("levels.sustainer.amount")}
                <span>{t("levels.sustainer.per")}</span>
              </p>
              <p className="grow">{t("levels.sustainer.body")}</p>
              <a href={`#${ANCHORS.give}`}>{t("levels.sustainer.cta")}</a>
            </div>
          </div>
          <div className="other" id={ANCHORS.otherWays}>
            <h3>{t("levels.otherTitle")}</h3>
            <p className="muted">{t("levels.otherBody")}</p>
          </div>
        </div>
      </Section>

      <Section id={ANCHORS.faq} $white $narrow>
        <div className="inner">
          <h2>{t("faq.title")}</h2>
          <div className="faq">
            {list<Faq>("faq.items").map((item, i) => (
              <details key={item.q} open={i === 0}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      <Closing>
        <div className="inner">
          <div>
            <p className="name">{t("closing.name")}</p>
            <p className="tagline">{t("closing.tagline")}</p>
          </div>
          <p className="body">{t("closing.body")}</p>
        </div>
      </Closing>
    </Root>
  )
}

const Root = styled.div`
  background: ${C.page};
  color: ${C.ink};
  font-size: 1.125rem;
  line-height: 1.6;

  .inner {
    max-width: 1200px;
    margin: 0 auto;
  }

  h1,
  h2,
  h3 {
    color: inherit;
    margin: 0;
  }

  h2 {
    font-size: clamp(2rem, 4vw, 2.5rem);
    line-height: 1.15;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  h3 {
    font-size: 1.3125rem;
    line-height: 1.3;
    font-weight: 700;
  }

  p {
    margin: 0;
  }

  a {
    color: ${C.accent};
    font-weight: 600;

    &:hover {
      color: ${C.accentHover};
    }
  }

  .muted {
    color: ${C.muted};
    font-size: 1rem;
  }

  .button {
    background: ${C.accent};
    color: #fff;
    text-decoration: none;
    font-weight: 700;
    border-radius: 8px;
    padding: 0.75rem 1.25rem;
    min-height: 44px;
    display: inline-flex;
    align-items: center;

    &:hover {
      background: ${C.accentHover};
      color: #fff;
    }
  }

  .button.large {
    font-size: 1.125rem;
    padding: 1rem 1.75rem;
    min-height: 52px;
  }

  [id] {
    scroll-margin-top: 5rem;
  }
`

const Subnav = styled.nav`
  background: #fff;
  border-bottom: 1px solid ${C.border};

  .inner {
    padding: 0.75rem 1.5rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem 1.5rem;
    font-size: 1rem;
  }

  a:not(.button) {
    color: ${C.ink};
    font-weight: 400;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  /* Keep the four links on one row at phone width. */
  @media (max-width: 575px) {
    .inner {
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }

    .button {
      padding: 0.5rem 0.875rem;
    }
  }
`

const Hero = styled.section`
  background: #fff;
  border-bottom: 1px solid ${C.border};

  > .inner {
    padding: 4.5rem 1.5rem 5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 3.5rem;
    align-items: flex-start;
  }

  .lead {
    flex: 999 1 35rem;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .eyebrow {
    font-size: 0.9375rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: ${C.accent};
  }

  h1 {
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    line-height: 1.08;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .intro {
    font-size: 1.3125rem;
    line-height: 1.55;
    color: ${C.body};
    max-width: 40rem;
  }

  .meter {
    background: ${C.page};
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    max-width: 40rem;
  }

  .totals {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
  }

  .raised {
    font-size: 2rem;
    font-weight: 800;
    line-height: 1.1;

    span {
      font-size: 1.125rem;
      font-weight: 500;
      color: ${C.muted};
    }
  }

  .track {
    height: 16px;
    background: ${C.track};
    border-radius: 999px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: ${C.accent};
    border-radius: 999px;
  }

  .meter strong {
    color: ${C.ink};
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
    font-size: 1.0625rem;
  }
`

const Section = styled.section<{ $white?: boolean; $narrow?: boolean }>`
  padding: 5.5rem 1.5rem;
  background: ${p => (p.$white ? "#fff" : "transparent")};
  border-top: ${p => (p.$white ? `1px solid ${C.border}` : "0")};
  border-bottom: ${p => (p.$white ? `1px solid ${C.border}` : "0")};

  > .inner {
    max-width: ${p => (p.$narrow ? "860px" : "1200px")};
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  .heading {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 47.5rem;

    p {
      font-size: 1.25rem;
      color: ${C.body};
    }
  }

  .cards {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
  }

  .card {
    flex: 1 1 15rem;
    min-width: 0;
    background: #fff;
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .label {
    font-size: 0.875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${C.accent};
  }

  .level {
    padding: 1.75rem;
    gap: 0.75rem;

    a {
      font-weight: 700;
      font-size: 1rem;
    }
  }

  .amount {
    font-size: 2.125rem;
    font-weight: 800;
    line-height: 1.1;

    span {
      font-size: 1.125rem;
      font-weight: 500;
    }
  }

  .grow {
    flex-grow: 1;
  }

  .dark {
    background: ${C.ink};
    border-color: ${C.ink};
    color: #fff;

    p {
      color: ${C.inverseMuted};
      font-size: 1rem;
    }
    .amount {
      color: #fff;
      font-size: 2.125rem;
    }
    a {
      color: #fff;
    }
  }

  .other {
    background: #fff;
    border: 1px solid ${C.border};
    border-radius: 12px;
    padding: 1.5rem 1.75rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 2rem;
    align-items: baseline;

    h3 {
      font-size: 1.1875rem;
    }
    p {
      flex: 1 1 22.5rem;
      font-size: 1.0625rem;
    }
  }

  .funds {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16.25rem, 1fr));
    gap: 2rem 2.5rem;

    > div {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border-top: 3px solid ${C.ink};
      padding-top: 1.25rem;
    }
    .muted {
      font-size: 1.0625rem;
    }
  }

  .faq {
    border-top: 1px solid ${C.border};
  }

  details {
    border-bottom: 1px solid ${C.border};
    padding: 1.375rem 0;
  }

  summary {
    font-size: 1.25rem;
    font-weight: 700;
    cursor: pointer;
  }

  details p {
    margin-top: 0.75rem;
    color: ${C.body};
  }
`

const Why = styled.section`
  background: ${C.ink};
  color: #fff;
  padding: 5.5rem 1.5rem;

  > .inner {
    max-width: 860px;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  p {
    font-size: 1.3125rem;
    color: ${C.inverseBody};
  }
`

const Closing = styled.section`
  background: ${C.ink};
  color: ${C.inverseMuted};
  padding: 3.5rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);

  > .inner {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1.5rem;
  }

  .name {
    font-size: 1.625rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    color: #fff;
  }

  .tagline {
    font-style: italic;
  }

  .body {
    font-size: 0.9375rem;
    max-width: 28.75rem;
  }
`
