import { SmartDisclaimer } from "components/bill/SmartDisclaimer"
import { SmartIcon } from "components/bill/SmartIcon"
import { Button, Modal } from "components/bootstrap"
import { Bill } from "components/db"
import * as links from "components/links"
import { BillTopic } from "functions/src/bills/types"
import {
  currentBallotInitiativeCommittee,
  currentGeneralCourt
} from "functions/src/shared"
import { useTranslation } from "next-i18next"
import { useState } from "react"
import styled from "styled-components"
import { Muted, PanelSection, SourceNote } from "./SourceNote"

const Prose = styled.div`
  white-space: pre-wrap;
  color: var(--maple-text-body);
`

const Clamped = styled(Prose)<{ $open: boolean }>`
  max-height: ${p => (p.$open ? "none" : "24rem")};
  overflow: hidden;
  position: relative;
  font-size: 0.95rem;

  ${p =>
    !p.$open &&
    `&::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 4rem;
      background: linear-gradient(transparent, var(--maple-surface-base));
    }`}
`

const Topics = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--maple-space-sm);
`

const TopicChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: var(--maple-radius-pill);
  background: var(--bs-secondary);
  color: var(--maple-text-inverse);
  font-size: 12px;
  padding: 0.25rem 0.6rem;
`

const BALLOT_SUMMARY_CHAR_LIMIT = 1000

function Topic({ topic }: { topic: BillTopic }) {
  return (
    <links.Internal
      href={links.billSearchByTopicLink(currentGeneralCourt, topic)}
      className="text-decoration-none"
    >
      <TopicChip>
        <SmartIcon icon={topic.category} />
        {topic.topic}
      </TopicChip>
    </links.Internal>
  )
}

/**
 * The AI summary and topics, then the bill text as filed. The text MAPLE
 * holds can predate amendments, so it is labeled as filed and the current
 * text is linked on malegislature.gov.
 */
export function TextTab({ bill }: { bill: Bill }) {
  const { t } = useTranslation("billPage")
  const [showFullText, setShowFullText] = useState(false)
  const [showFullSummary, setShowFullSummary] = useState(false)
  const isBallotMeasure =
    bill.currentCommittee?.id === currentBallotInitiativeCommittee
  const summary = bill.summary
  const text = bill.content?.DocumentText
  const legislatureUrl = `https://malegislature.gov/Bills/${bill.court}/${bill.id}`

  return (
    <>
      <PanelSection title={t("text.summaryTitle")} id="summary">
        {summary ? (
          <>
            {!isBallotMeasure && <SmartDisclaimer />}
            {isBallotMeasure && summary.length > BALLOT_SUMMARY_CHAR_LIMIT ? (
              <Prose>
                {summary.slice(0, BALLOT_SUMMARY_CHAR_LIMIT)}…{" "}
                <Button
                  variant="link"
                  className="p-0 align-baseline"
                  onClick={() => setShowFullSummary(true)}
                >
                  {t("text.viewFullSummary")}
                </Button>
                <Modal
                  show={showFullSummary}
                  onHide={() => setShowFullSummary(false)}
                  size="lg"
                >
                  <Modal.Header closeButton>
                    <Modal.Title>{bill.id}</Modal.Title>
                  </Modal.Header>
                  <Modal.Body className="bg-white">
                    <Prose>{summary}</Prose>
                  </Modal.Body>
                </Modal>
              </Prose>
            ) : (
              <Prose>{summary}</Prose>
            )}
          </>
        ) : (
          <Muted>{t("text.noSummary")}</Muted>
        )}
        {bill.topics && bill.topics.length > 0 && (
          <div className="mt-3">
            <div className="fw-semibold small mb-1">{t("text.topics")}</div>
            <Topics>
              {bill.topics.map(topic => (
                <Topic key={topic.topic} topic={topic} />
              ))}
            </Topics>
          </div>
        )}
        {(summary || bill.topics?.length) && (
          <SourceNote>{t("source.ai")}</SourceNote>
        )}
      </PanelSection>

      <PanelSection title={t("text.textTitle")} id="text">
        <Muted className="small mb-2">{t("text.textNote")}</Muted>
        <p className="small mb-3 d-flex flex-wrap gap-3">
          <links.External href={legislatureUrl}>
            {t("text.currentText")}
          </links.External>
          <links.External href={links.billPdfUrl(bill.court, bill.id)}>
            {t("text.pdf")}
          </links.External>
        </p>
        {text ? (
          <>
            <Clamped $open={showFullText}>{text}</Clamped>
            <Button
              variant="link"
              className="p-0 mt-2"
              aria-expanded={showFullText}
              onClick={() => setShowFullText(v => !v)}
            >
              {t(showFullText ? "text.showLess" : "text.showFull")}
            </Button>
          </>
        ) : (
          <Muted>{t("text.noText")}</Muted>
        )}
        <SourceNote>{t("source.legislature")}</SourceNote>
      </PanelSection>
    </>
  )
}
