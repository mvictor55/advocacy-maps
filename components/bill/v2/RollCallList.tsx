import {
  RollCall,
  rollCallPdfUrl,
  UnreadableRollCall
} from "components/bill/rollCalls"
import { Button } from "components/bootstrap"
import { External, siteUrl } from "components/links"
import { useTranslation } from "next-i18next"
import { ReactNode, useEffect, useRef, useState } from "react"
import styled from "styled-components"
import { formatHistoryDate } from "./dates"
import { Muted } from "./SourceNote"
import { Term } from "./Term"

const List = styled.div`
  details {
    border-top: 1px solid var(--maple-surface-border);
  }

  details:first-of-type {
    border-top: 0;
  }

  summary {
    display: grid;
    grid-template-columns: 9rem minmax(0, 1fr) auto;
    gap: var(--maple-space-sm) var(--maple-space-md);
    align-items: baseline;
    padding: var(--maple-space-sm) 0;
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary:focus-visible {
    outline: 2px solid var(--maple-focus-border);
    outline-offset: 2px;
  }

  .when {
    font-size: 0.875rem;
    color: var(--maple-text-muted);
    white-space: nowrap;
  }

  .question {
    color: var(--maple-text-strong);
  }

  .tally {
    font-family: var(--maple-font-heading);
    font-weight: 600;
    color: var(--maple-text-strong);
    white-space: nowrap;
  }

  .body {
    padding: 0 0 var(--maple-space-md) 0;
    font-size: 0.9rem;
    display: flex;
    flex-wrap: wrap;
    gap: var(--maple-space-sm) var(--maple-space-lg);
    align-items: baseline;
  }

  .body .btn {
    padding: 0;
    font-size: inherit;
  }

  details.highlight {
    background: var(--maple-color-blue-subtle-bg);
    border-radius: var(--maple-radius-md);
    padding: 0 var(--maple-space-sm);
  }

  @media (max-width: 575.98px) {
    summary {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .when {
      grid-column: 1 / -1;
    }
  }
`

function CopyRollCallLink({ rollCall }: { rollCall: RollCall }) {
  const { t } = useTranslation("billPage")
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])
  const copy = async () => {
    const url = new URL(siteUrl(window.location.pathname))
    url.searchParams.set("tab", "history")
    url.searchParams.set("rc", rollCall.id)
    try {
      await navigator.clipboard.writeText(url.toString())
      setCopied(true)
    } catch {
      window.prompt(
        t("votes.linkTo", { number: rollCall.number }),
        url.toString()
      )
    }
  }
  return (
    <Button
      variant="link"
      className="text-secondary"
      onClick={copy}
      aria-label={t("votes.linkTo", { number: rollCall.number })}
      aria-live="polite"
    >
      {t(copied ? "votes.copied" : "votes.copyLink")}
    </Button>
  )
}

/**
 * The roll calls cited in the bill history, each expandable to its PDF and
 * link. `?rc=house-270` opens that one and scrolls to it. Nothing is
 * computed from the tallies.
 */
export function RollCallList({
  court,
  rollCalls,
  unreadable,
  openId,
  children
}: {
  court: number
  rollCalls: RollCall[]
  unreadable: UnreadableRollCall[]
  /** The roll call named in the URL, opened and scrolled into view. */
  openId?: string
  /** Rendered inside an open roll call (the members' votes, in a later PR). */
  children?: (rollCall: RollCall) => ReactNode
}) {
  const { t } = useTranslation("billPage")
  const openRef = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    openRef.current?.scrollIntoView?.({ block: "center" })
  }, [openId])

  return (
    <List>
      {rollCalls.map(r => {
        const open = r.id === openId
        const pdf = rollCallPdfUrl(court, r)
        return (
          <details
            key={`${r.id}-${r.historyIndex}`}
            id={`rc-${r.id}`}
            open={open || undefined}
            ref={open ? openRef : undefined}
            className={open ? "highlight" : undefined}
          >
            <summary>
              <span className="when">
                {formatHistoryDate(r.date)} · {r.branch}
              </span>
              <span className="question">
                {r.quorum ? t("votes.quorumCall") : r.question}
              </span>
              <span className="tally">
                {t("votes.tally", { yeas: r.yeas, nays: r.nays })}
              </span>
            </summary>
            <div className="body">
              {r.quorum && (
                <Muted className="w-100">{t("votes.quorumNote")}</Muted>
              )}
              <span>
                <Term id="rollCall">{t("terms.rollCall.term")}</Term> {r.number}
              </span>
              {pdf ? (
                <External href={pdf}>{t("votes.pdf")}</External>
              ) : (
                <Muted as="span">{t("votes.noPdf")}</Muted>
              )}
              <CopyRollCallLink rollCall={r} />
              {children?.(r)}
            </div>
          </details>
        )
      })}
      {unreadable.length > 0 && (
        <div className="pt-3">
          <Muted className="small">{t("votes.unreadable")}</Muted>
          <ul className="small mb-0">
            {unreadable.map(u => (
              <li key={u.historyIndex}>
                {formatHistoryDate(u.date)} · {u.branch}: {u.action}
              </li>
            ))}
          </ul>
        </div>
      )}
    </List>
  )
}
