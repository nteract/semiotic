import * as React from "react"

/** Portable default center readout, shared by React and static GaugeChart. */
export function GaugeReadout({
  value,
  min,
  max,
  radius,
  showScaleLabels,
  label
}: {
  value: React.ReactNode
  min: number
  max: number
  radius: number
  showScaleLabels: boolean
  /** Caption beneath the value (and beneath the scale range when shown). */
  label?: React.ReactNode
}) {
  const fontSize = Math.max(16, radius * 0.3)
  const captionY = fontSize * 0.7 + 11
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
          y={captionY}
          fontSize={11}
          fill="var(--semiotic-text-secondary, #666)"
        >
          {min} – {max}
        </text>
      )}
      {label != null && label !== "" && (
        <text
          y={captionY + (showScaleLabels ? 14 : 0)}
          fontSize={11}
          fill="var(--semiotic-text-secondary, #666)"
        >
          {label}
        </text>
      )}
    </g>
  )
}

export type GaugeCenterContent =
  | React.ReactNode
  | ((value: number, min: number, max: number) => React.ReactNode)

/**
 * The gauge center for React and static GaugeChart: authored `centerContent`
 * (a function receives the value and range), else the default readout, which
 * compact modes omit. Strings and numbers render as native SVG text, like the
 * default readout, so they stay portable in static SVG; other React content
 * passes through unchanged.
 */
export function resolveGaugeCenterContent({
  centerContent,
  centerLabel,
  value,
  min,
  max,
  radius,
  showScaleLabels,
  valueFormat,
  compact
}: {
  centerContent?: GaugeCenterContent
  centerLabel?: string
  value: number
  min: number
  max: number
  radius: number
  showScaleLabels: boolean
  valueFormat?: (value: number) => string
  compact: boolean
}): React.ReactNode | null {
  if (centerContent != null) {
    const content = typeof centerContent === "function"
      ? centerContent(value, min, max)
      : centerContent
    return typeof content === "string" || typeof content === "number"
      ? GaugeReadout({ value: String(content), min, max, radius, showScaleLabels: false, label: centerLabel })
      : content
  }
  if (compact) return null
  const formatted = valueFormat ? valueFormat(value) : String(Math.round(value))
  return GaugeReadout({ value: formatted, min, max, radius, showScaleLabels, label: centerLabel })
}
