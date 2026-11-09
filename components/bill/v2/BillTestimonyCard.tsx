import { useReportTestimony } from "components/api/report"
import { Button, Image } from "components/bootstrap"
import { ToastContainer } from "react-bootstrap"
import { Testimony } from "components/db"
import { Internal, maple, siteUrl } from "components/links"
import { formUrl } from "components/publish/hooks"
import {
  ReportModal,
  RequestDeleteOwnTestimonyModal
} from "components/TestimonyCard/ReportModal"
import ReportToast from "components/TestimonyCard/ReportToast"
import { UserInfoHeader } from "components/TestimonyCard/UserInfoHeader"
import { TestimonyContent } from "components/testimony/TestimonyContent"
import { ViewAttachment } from "components/ViewAttachment"
import { useTranslation } from "next-i18next"
import { useEffect, useState } from "react"
import styled from "styled-components"

/** Letters longer than this are clamped until "Read more". */
export const CLAMP_CHARS = 600

const Card = styled.article`
  padding: var(--maple-space-md) 0 var(--maple-space-lg);
  border-top: 1px solid var(--maple-surface-border);

  &:first-child {
    border-top: 0;
  }

  &.highlight {
    background: var(--maple-color-blue-subtle-bg);
    border-radius: var(--maple-radius-md);
    padding-left: var(--maple-space-md);
    padding-right: var(--maple-space-md);
  }
`

const Body = styled.div<{ $clamped: boolean }>`
  position: relative;
  max-height: ${p => (p.$clamped ? "12rem" : "none")};
  overflow: hidden;

  @media (max-width: 575.98px) {
    max-height: ${p => (p.$clamped ? "8rem" : "none")};
  }

  ${p =>
    p.$clamped &&
    `&::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 3rem;
      background: linear-gradient(transparent, var(--maple-surface-base));
    }`}
`

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--maple-space-xs) var(--maple-space-lg);
  align-items: center;
  margin-top: var(--maple-space-sm);
  font-size: 0.9rem;

  .btn,
  a {
    padding: 0;
    font-size: inherit;
    text-decoration: none;
  }
`

const Shared = styled.p`
  font-size: 0.85rem;
  color: var(--maple-text-muted);
  margin: 0 0 var(--maple-space-xs);
`

/** Copies the testimony's own page to the clipboard. */
export function CopyLinkButton({
  testimony,
  name
}: {
  testimony: Testimony
  name: string
}) {
  const { t } = useTranslation("billPage")
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])
  const url = siteUrl(maple.testimony({ publishedId: testimony.id }))
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      window.prompt(t("card.linkTo", { name }), url)
    }
  }
  return (
    <Button
      variant="link"
      className="text-secondary"
      onClick={copy}
      aria-label={t("card.linkTo", { name })}
      aria-live="polite"
    >
      {t(copied ? "card.copied" : "card.copyLink")}
    </Button>
  )
}

/**
 * One testimony on the bill page: author and position (the existing
 * header), the letter clamped until "Read more", and links to its own page,
 * the attachment, reporting and, for the reader's own, editing.
 */
export function BillTestimonyCard({
  testimony,
  isOwn,
  shared = 1,
  highlight = false
}: {
  testimony: Testimony
  isOwn: boolean
  /** How many testimonies share this text, this one included. */
  shared?: number
  highlight?: boolean
}) {
  const { t } = useTranslation(["billPage", "testimony"])
  const [open, setOpen] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  const reportMutation = useReportTestimony()
  const didReport = reportMutation.isError || reportMutation.isSuccess

  const name = testimony.fullName || testimony.authorDisplayName
  const content = testimony.content || t("billPage:card.emptyDraft")
  const canClamp = content.length > CLAMP_CHARS
  const clamped = canClamp && !open
  const publishedDate = testimony.publishedAt
    ? testimony.publishedAt.toDate().toLocaleDateString()
    : ""
  const billLink = maple.bill({ id: testimony.billId, court: testimony.court })

  return (
    <Card
      id={`testimony-${testimony.id}`}
      className={highlight ? "highlight" : undefined}
    >
      <UserInfoHeader
        testimony={testimony}
        billLink={billLink}
        publishedDate={publishedDate}
      />
      {shared > 1 && (
        <Shared>{t("billPage:card.shared", { count: shared })}</Shared>
      )}
      <Body $clamped={clamped}>
        <TestimonyContent testimony={content} />
      </Body>
      <Footer>
        {canClamp && (
          <Button
            variant="link"
            className="text-secondary"
            aria-expanded={open}
            aria-label={t(
              open ? "billPage:card.showLessOf" : "billPage:card.readMoreOf",
              {
                name
              }
            )}
            onClick={() => setOpen(v => !v)}
          >
            {t(open ? "billPage:card.showLess" : "billPage:card.readMore")}
          </Button>
        )}
        <Internal href={maple.testimony({ publishedId: testimony.id })}>
          {t("billPage:card.moreDetails")}
        </Internal>
        <CopyLinkButton testimony={testimony} name={name} />
        {testimony.attachmentId && <ViewAttachment testimony={testimony} />}
        <Button
          variant="link"
          className="text-secondary"
          onClick={() => setIsReporting(true)}
        >
          {t("billPage:card.report")}
        </Button>
        {isOwn && (
          <Internal
            className="text-secondary d-inline-flex align-items-center"
            href={formUrl(testimony.billId, testimony.court, "position")}
          >
            {t("billPage:card.edit")}
            <Image
              className="ms-1"
              src="/edit-testimony.svg"
              alt=""
              aria-hidden="true"
              height={24}
              width={24}
            />
          </Internal>
        )}
      </Footer>

      {isReporting &&
        (isOwn ? (
          <RequestDeleteOwnTestimonyModal
            onClose={() => setIsReporting(false)}
            onReport={report => reportMutation.mutate({ report, testimony })}
            isLoading={reportMutation.isLoading}
          />
        ) : (
          <ReportModal
            onClose={() => setIsReporting(false)}
            onReport={report => reportMutation.mutate({ report, testimony })}
            isLoading={reportMutation.isLoading}
            additionalInformationLabel="Additional information:"
            reasons={[
              t("testimony:reportModal.personalInformation"),
              t("testimony:reportModal.offensive"),
              t("testimony:reportModal.violent"),
              t("testimony:reportModal.spam"),
              t("testimony:reportModal.phishing")
            ]}
          />
        ))}
      {didReport && (
        <ToastContainer
          position="top-center"
          style={{ position: "fixed", top: 20, zIndex: 1 }}
        >
          <ReportToast isSuccessful={reportMutation.isSuccess} />
        </ToastContainer>
      )}
    </Card>
  )
}
