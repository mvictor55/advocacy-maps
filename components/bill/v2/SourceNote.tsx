import { ReactNode } from "react"
import styled from "styled-components"

/**
 * One line under a section naming where its data comes from: the
 * Legislature's record, Secretary of State disclosures, MAPLE users, or AI.
 */
export const SourceNote = styled.p.attrs({ className: "mb-0" })`
  font-size: 0.8rem;
  color: var(--maple-text-muted);
  margin-top: var(--maple-space-md);

  a {
    color: inherit;
  }
`

/** A surface for one section of the page. */
export const Panel = styled.section`
  background: var(--maple-surface-base);
  border: 1px solid var(--maple-surface-border);
  border-radius: var(--maple-radius-lg);
  box-shadow: var(--maple-shadow-sm);
  padding: var(--maple-space-lg) var(--maple-space-xl);
  margin-bottom: var(--maple-space-lg);

  @media (max-width: 575.98px) {
    padding: var(--maple-space-md) var(--maple-space-lg);
  }
`

export const PanelTitle = styled.h2`
  font-family: var(--maple-font-heading);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--maple-text-strong);
  margin: 0 0 var(--maple-space-sm);
`

export const Muted = styled.p`
  color: var(--maple-text-body);
  margin: 0;
`

export function PanelSection({
  title,
  children,
  id,
  className
}: {
  title?: ReactNode
  children: ReactNode
  id?: string
  className?: string
}) {
  return (
    <Panel id={id} className={className}>
      {title && <PanelTitle>{title}</PanelTitle>}
      {children}
    </Panel>
  )
}
