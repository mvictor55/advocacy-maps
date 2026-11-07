import { useState } from "react"
import { useTranslation } from "next-i18next"
import styled from "styled-components"
import { DONATE_URL } from "components/about/SupportMaple/SupportMaple"
import { CHALLENGE_COLORS as C, formatUsd } from "./challengeData"

const AMOUNTS = [50, 100, 250, 500, 1000] as const
type Amount = (typeof AMOUNTS)[number] | "other"
type Frequency = "oneTime" | "monthly"

/**
 * Stand-in for the FundraiseUp Donation Form Element. The choices only shape
 * the button label; the button opens MAPLE's existing donation form at
 * Partners in Democracy, which asks for the amount again.
 */
export function DonationForm({ id }: { id?: string }) {
  const { t } = useTranslation("challenge")
  const [frequency, setFrequency] = useState<Frequency>("oneTime")
  const [amount, setAmount] = useState<Amount>(250)

  const giveLabel =
    amount === "other"
      ? t("form.give")
      : t(
          frequency === "monthly"
            ? "form.giveAmountMonthly"
            : "form.giveAmount",
          {
            amount: formatUsd(amount)
          }
        )

  return (
    <Card id={id}>
      <h2>{t("form.title")}</h2>

      <fieldset>
        <legend>{t("form.frequency")}</legend>
        <div className="grid two">
          {(["oneTime", "monthly"] as const).map(f => (
            <Choice
              key={f}
              type="button"
              aria-pressed={frequency === f}
              $selected={frequency === f}
              $variant="frequency"
              onClick={() => setFrequency(f)}
            >
              {t(`form.${f}`)}
            </Choice>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>{t("form.amount")}</legend>
        <div className="grid three">
          {[...AMOUNTS, "other" as const].map(a => (
            <Choice
              key={a}
              type="button"
              aria-pressed={amount === a}
              $selected={amount === a}
              $variant="amount"
              onClick={() => setAmount(a)}
            >
              {a === "other" ? t("form.other") : formatUsd(a)}
            </Choice>
          ))}
        </div>
      </fieldset>

      <a
        className="give"
        href={DONATE_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        {giveLabel}
      </a>
      <p className="note">{t("form.note")}</p>
    </Card>
  )
}

const Card = styled.div`
  flex: 1 1 22.5rem;
  min-width: 0;
  background: #fff;
  border: 1px solid ${C.borderStrong};
  border-radius: 16px;
  padding: 1.75rem;
  box-shadow: 0 1px 2px rgba(22, 33, 58, 0.06);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  scroll-margin-top: 5rem;

  h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    line-height: 1.25;
    color: ${C.ink};
  }

  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
  }

  legend {
    font-size: 0.9375rem;
    font-weight: 600;
    margin-bottom: 0.625rem;
    float: none;
  }

  .grid {
    display: grid;
    gap: 0.5rem;
  }
  .two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .give {
    min-height: 54px;
    border-radius: 8px;
    background: ${C.accent};
    color: #fff;
    font-size: 1.125rem;
    font-weight: 700;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: ${C.accentHover};
      color: #fff;
    }
  }

  .note {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.5;
    color: ${C.muted};
  }
`

const Choice = styled.button<{
  $selected: boolean
  $variant: "frequency" | "amount"
}>`
  min-height: 48px;
  border-radius: 8px;
  font: inherit;
  font-size: 1rem;
  font-weight: ${p => (p.$selected ? 700 : 600)};
  color: ${p => (p.$selected && p.$variant === "frequency" ? "#fff" : C.ink)};
  border: ${p =>
    p.$selected
      ? `2px solid ${p.$variant === "frequency" ? C.ink : C.accent}`
      : `1px solid ${C.borderControl}`};
  background: ${p =>
    !p.$selected ? "#fff" : p.$variant === "frequency" ? C.ink : C.accentSoft};
`
