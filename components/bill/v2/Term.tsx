import { OverlayTrigger } from "components/bootstrap"
import { Popover } from "react-bootstrap"
import { Internal } from "components/links"
import { useTranslation } from "next-i18next"
import { ReactNode, useId } from "react"
import styled from "styled-components"

/** Terms a first-time reader meets, defined in billPage.json under
 * `terms.<key>`. Those the Learn page covers link to it. */
export const TERM_KEYS = [
  "studyOrder",
  "reportedFavorably",
  "reservedRight",
  "engrossed",
  "newDraft",
  "jointRule10",
  "placedOnFile",
  "conferenceCommittee",
  "rollCall",
  "ordersOfTheDay",
  "correctlyDrawn",
  "billsInTheThirdReading",
  "enacted"
] as const
export type TermKey = (typeof TERM_KEYS)[number]

const LEARN_PROCESS = "/learn/legislative-process"

/** Terms About the Legislative Process already explains. */
export const TERMS_ON_LEARN_PAGE: ReadonlySet<TermKey> = new Set<TermKey>([
  "studyOrder",
  "reportedFavorably",
  "engrossed",
  "conferenceCommittee",
  "billsInTheThirdReading"
])

const Word = styled.button`
  all: unset;
  cursor: help;
  text-decoration: underline dotted;
  text-underline-offset: 0.15em;
  color: inherit;

  &:focus-visible {
    outline: 2px solid var(--maple-focus-border);
    outline-offset: 2px;
    border-radius: 2px;
  }
`

/**
 * A term with its definition on hover and focus. The definition is the
 * popover's text; a term the Learn page covers also links there.
 */
export function Term({ id, children }: { id: TermKey; children: ReactNode }) {
  const { t } = useTranslation("billPage")
  const popoverId = useId()
  return (
    <OverlayTrigger
      trigger={["hover", "focus"]}
      placement="top"
      overlay={
        <Popover id={popoverId}>
          <Popover.Header as="h3" className="fs-6">
            {t(`terms.${id}.term`)}
          </Popover.Header>
          <Popover.Body>
            {t(`terms.${id}.definition`)}
            {TERMS_ON_LEARN_PAGE.has(id) && (
              <>
                {" "}
                <Internal href={LEARN_PROCESS}>{t("terms.learnMore")}</Internal>
              </>
            )}
          </Popover.Body>
        </Popover>
      }
    >
      <Word type="button" aria-describedby={popoverId}>
        {children}
      </Word>
    </OverlayTrigger>
  )
}
