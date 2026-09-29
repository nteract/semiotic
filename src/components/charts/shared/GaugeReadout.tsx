import * as React from "react"
import { estimateLabelWidth } from "./AnnotationLabel"

/** Share of the hub's diameter the readout text may span. */
const HUB_TEXT_FRACTION = 0.8

/**
 * Readout font size: `max(16, radius * 0.3)`, shrunk until the text's
 * estimated width fits across the hub, so a long string ("140 / 200") stays
 * inside the arc instead of spilling over it. Short values keep the full size.
 */
export function gaugeReadoutFontSize(text: string, radius: number, innerRadius?: number): number {
  const baseSize = Math.max(16, radius * 0.3)
  if (innerRadius == null || innerRadius <= 0) return baseSize
  const width = estimateLabelWidth(text, baseSize)
  const available = 2 * innerRadius * HUB_TEXT_FRACTION
  return width <= available ? baseSize : (baseSize * available) / width
}

/** Portable default center readout, shared by React and static GaugeChart. */
export function GaugeReadout({
  value,
  min,
  max,
  radius,
  innerRadius,
  showScaleLabels,
  label
}: {
  value: string
  min: number
  max: number
  radius: number
  /** Hub radius the value text is fitted within; omit to keep the radius-based size. */
  innerRadius?: number
  showScaleLabels: boolean
  /** Caption beneath the value (and beneath the scale range when shown). */
  label?: React.ReactNode
}) {
  const fontSize = gaugeReadoutFontSize(value, radius, innerRadius)
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
 * default readout, fitted to the hub, so they stay portable in static SVG;
 * other React content passes through unchanged.
 */
export function resolveGaugeCenterContent({
  centerContent,
  centerLabel,
  value,
  min,
  max,
  radius,
  innerRadius,
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
  innerRadius: number
  showScaleLabels: boolean
  valueFormat?: (value: number) => string
  compact: boolean
}): React.ReactNode | null {
  if (centerContent != null) {
    const content = typeof centerContent === "function"
      ? centerContent(value, min, max)
      : centerContent
    return typeof content === "string" || typeof content === "number"
      ? GaugeReadout({ value: String(content), min, max, radius, innerRadius, showScaleLabels: false, label: centerLabel })
      : content
  }
  if (compact) return null
  const formatted = valueFormat ? valueFormat(value) : String(Math.round(value))
  return GaugeReadout({ value: formatted, min, max, radius, innerRadius, showScaleLabels, label: centerLabel })
}
