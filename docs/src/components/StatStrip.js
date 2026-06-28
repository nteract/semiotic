import React from "react"

/**
 * The "method strip" every example page opens with: a row of value/label stat
 * cards summarizing how the chart was built (divisions, navigable nodes,
 * hand-authored positions, …). Uses docs theme tokens so it reads correctly in
 * light and dark, independent of each page's art-directed chart palette.
 *
 * @param {{ items: { value: React.ReactNode, label: React.ReactNode }[], style?: object, ariaLabel?: string }} props
 */
export function StatStrip({ items, style, ariaLabel }) {
  return (
    <div style={{ ...stripStyle, ...style }} aria-label={ariaLabel}>
      {items.map((item, index) => (
        <StatCard key={index} value={item.value} label={item.label} />
      ))}
    </div>
  )
}

/** One value-over-label cell. Exported for pages that compose their own strip. */
export function StatCard({ value, label }) {
  return (
    <div style={cardStyle}>
      <div style={valueStyle}>{value}</div>
      <div style={labelStyle}>{label}</div>
    </div>
  )
}

const stripStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  marginBottom: "32px",
  border: "1px solid var(--surface-3)",
  background: "var(--surface-3)",
  gap: "1px",
}

const cardStyle = {
  minHeight: "76px",
  padding: "14px 17px",
  display: "grid",
  alignContent: "center",
  background: "var(--surface-1)",
}

const valueStyle = {
  color: "var(--text-primary)",
  fontSize: "23px",
  lineHeight: 1,
}

const labelStyle = {
  marginTop: "5px",
  color: "var(--text-secondary)",
  fontSize: "11px",
  letterSpacing: "0.055em",
  textTransform: "uppercase",
}

export default StatStrip
