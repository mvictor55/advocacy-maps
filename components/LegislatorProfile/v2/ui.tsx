import { ReactNode } from "react"
import styled from "styled-components"

/** The profile's card: white on the page's warm gray. */
export const Card = styled.section`
  background: var(--maple-surface-base);
  border: 1px solid var(--maple-surface-border);
  border-radius: var(--maple-radius-xl);
  box-shadow: var(--maple-shadow-sm);
  padding: var(--maple-space-xl);
  margin-bottom: var(--maple-space-lg);
  min-width: 0;

  @media (max-width: 575.98px) {
    padding: var(--maple-space-lg);
  }
`

export const SectionTitle = styled.h2`
  font-size: 1.375rem;
  font-weight: 800;
  color: var(--maple-text-strong);
  margin: 0 0 var(--maple-space-xs);
`

export const CardTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--maple-text-strong);
  margin: 0 0 var(--maple-space-sm);
`

/** The line under a section heading naming its source. */
export const Source = styled.p`
  font-size: 0.875rem;
  color: var(--maple-text-muted);
  margin: 0 0 var(--maple-space-lg);

  a {
    color: inherit;
  }
`

export const Note = styled.p`
  font-size: 0.8125rem;
  color: var(--maple-text-muted);
  margin: var(--maple-space-md) 0 0;
`

export const Empty = styled.p`
  color: var(--maple-text-body);
  margin: 0;
`

/** A small pill label: a role, a party, a vote. */
export const Chip = styled.span<{ $tone?: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: var(--maple-radius-pill);
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid ${p => tones[p.$tone ?? "gray"].border};
  background: ${p => tones[p.$tone ?? "gray"].bg};
  color: ${p => tones[p.$tone ?? "gray"].text};
`

export type Tone = "blue" | "orange" | "green" | "gray"
const tones: Record<Tone, { bg: string; border: string; text: string }> = {
  blue: {
    bg: "var(--maple-color-blue-subtle-bg)",
    border: "var(--maple-color-blue-subtle-border)",
    text: "var(--maple-color-blue-subtle-text)"
  },
  green: {
    bg: "var(--maple-color-green-subtle-bg)",
    border: "var(--maple-color-green-subtle-border)",
    text: "var(--maple-color-green-subtle-text)"
  },
  // Blue and orange tell two answers apart for color-blind readers too.
  orange: { bg: "#ffe7cc", border: "#ffcf99", text: "#663600" },
  gray: {
    bg: "var(--maple-color-gray-subtle-bg)",
    border: "var(--maple-color-gray-subtle-border)",
    text: "var(--maple-color-gray-subtle-text)"
  }
}

/** A row of toggle buttons (lead sponsor / cosponsor, floor / committee). */
const ToggleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--maple-space-lg);
  border-bottom: 1px solid var(--maple-border-default);
  margin-bottom: var(--maple-space-lg);

  button {
    background: none;
    border: 0;
    border-bottom: 3px solid transparent;
    padding: 10px 2px;
    min-height: 44px;
    color: var(--maple-text-body);
    font: inherit;
    margin-bottom: -1px;
  }

  button[aria-pressed="true"] {
    border-bottom-color: var(--bs-primary);
    color: var(--bs-secondary);
    font-weight: 700;
  }

  button:focus-visible {
    outline: 3px solid var(--maple-focus-border);
  }
`

export function Toggle<K extends string>({
  label,
  options,
  value,
  onChange
}: {
  label: string
  options: { key: K; label: ReactNode }[]
  value: K
  onChange: (key: K) => void
}) {
  return (
    <ToggleRow role="group" aria-label={label}>
      {options.map(o => (
        <button
          key={o.key}
          type="button"
          aria-pressed={o.key === value}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </ToggleRow>
  )
}

/** Filter pills (all roll calls / on her bills). */
export const Pills = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--maple-space-sm);
  margin-bottom: var(--maple-space-lg);

  button {
    min-height: 40px;
    padding: 0 16px;
    border-radius: var(--maple-radius-pill);
    border: 1px solid var(--maple-border-default);
    background: var(--maple-surface-base);
    color: var(--bs-secondary);
    font-weight: 700;
  }

  button[aria-pressed="true"] {
    background: var(--bs-secondary);
    border-color: var(--bs-secondary);
    color: #fff;
  }
`

/** A labeled horizontal bar: topics, finance breakdowns. */
const BarRow = styled.div`
  margin-bottom: var(--maple-space-md);

  .head {
    display: flex;
    justify-content: space-between;
    gap: var(--maple-space-md);
    font-size: 0.9375rem;
  }

  .value {
    color: var(--maple-text-muted);
    white-space: nowrap;
  }

  .track {
    height: 8px;
    border-radius: var(--maple-radius-pill);
    background: var(--maple-color-gray-subtle-bg);
    margin-top: 4px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--bs-secondary);
    border-radius: inherit;
  }
`

export function Bar({
  label,
  value,
  width
}: {
  label: ReactNode
  value: ReactNode
  /** Percent of the track to fill. */
  width: number
}) {
  return (
    <BarRow>
      <div className="head">
        <span>{label}</span>
        <span className="value">{value}</span>
      </div>
      <div className="track" aria-hidden="true">
        <div className="fill" style={{ width: `${width}%` }} />
      </div>
    </BarRow>
  )
}

/** A stacked bar for a tally: segments in order, with an accessible label. */
const Stack = styled.div`
  display: flex;
  height: 10px;
  border-radius: var(--maple-radius-pill);
  overflow: hidden;
  background: var(--maple-color-gray-subtle-bg);
  margin: 6px 0 4px;
`

export function TallyBar({
  segments,
  label
}: {
  segments: { value: number; color: string }[]
  label: string
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  return (
    <Stack role="img" aria-label={label}>
      {segments.map((s, i) => (
        <div
          key={i}
          style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
        />
      ))}
    </Stack>
  )
}

export const TALLY_COLORS = {
  yes: "#1a3185",
  no: "#d4731c",
  other: "#94a3b8",
  reserved: "#7c8db8"
}

/** A definition-list row of numbers (facts, summaries, key figures). */
export const Figures = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--maple-space-md);
  margin: 0 0 var(--maple-space-lg);

  > div {
    background: var(--maple-surface-base);
    border: 1px solid var(--maple-surface-border);
    border-radius: var(--maple-radius-md);
    padding: var(--maple-space-md) var(--maple-space-lg);
  }

  dd {
    order: -1;
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--bs-secondary);
    margin: 0;
  }

  dt {
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--maple-text-body);
  }

  > div {
    display: flex;
    flex-direction: column;
  }
`

export function Figure({
  label,
  value
}: {
  label: ReactNode
  value: ReactNode
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/** A list of items separated by rules. */
export const Rows = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;

  > li {
    padding: var(--maple-space-lg) 0;
    border-top: 1px solid var(--maple-border-default);
  }

  > li:first-child {
    border-top: 0;
    padding-top: 0;
  }
`

export const MoreButton = styled.button.attrs({ type: "button" })`
  background: none;
  border: 1px solid var(--maple-border-default);
  border-radius: var(--maple-radius-md);
  color: var(--bs-secondary);
  font-weight: 700;
  min-height: 44px;
  padding: 0 var(--maple-space-lg);
  margin-top: var(--maple-space-md);
`

export const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--maple-space-sm);
  font-size: 0.875rem;
  color: var(--maple-text-muted);
  margin-top: var(--maple-space-md);

  a {
    font-weight: 700;
  }
`
