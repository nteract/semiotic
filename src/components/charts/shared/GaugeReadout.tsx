import * as React from "react"

/** Portable default center readout, shared by React and static GaugeChart. */
export function GaugeReadout({
  value,
  min,
  max,
  radius,
  showScaleLabels
}: {
  value: React.ReactNode
  min: number
  max: number
  radius: number
  showScaleLabels: boolean
}) {
  const fontSize = Math.max(16, radius * 0.3)
  return (
    <g textAnchor="middle">
      <text
        y={0}
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight={700}
        fill="var(--semiotic-text, #333)"
      >
        {value}
      </text>
      {showScaleLabels && (
        <text
          y={fontSize * 0.7 + 11}
          fontSize={11}
          fill="var(--semiotic-text-secondary, #666)"
        >
          {min} – {max}
        </text>
      )}
    </g>
  )
}
