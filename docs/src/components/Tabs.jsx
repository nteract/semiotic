import React, { useState } from "react"

/**
 * Simple tab switcher for docs pages.
 *
 * Usage:
 *   <Tabs tabs={["Break", "Interpolate", "Zero"]}>
 *     <div>Break content</div>
 *     <div>Interpolate content</div>
 *     <div>Zero content</div>
 *   </Tabs>
 */
export default function Tabs({ tabs, children, defaultIndex = 0 }) {
  const [active, setActive] = useState(defaultIndex)
  const panels = React.Children.toArray(children)

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "2px solid var(--semiotic-border, #e0e0e0)",
          marginBottom: 16,
        }}
      >
        {tabs.map((label, i) => (
          <button
            key={label}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: i === active ? 600 : 400,
              color: i === active
                ? "var(--semiotic-text, #333)"
                : "var(--semiotic-text-secondary, #666)",
              borderBottom: i === active
                ? "2px solid var(--semiotic-text, #333)"
                : "2px solid transparent",
              marginBottom: -2,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{panels[active]}</div>
    </div>
  )
}
