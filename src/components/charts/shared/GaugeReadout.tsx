import * as React from "react"
import { estimateLabelWidth } from "./AnnotationLabel"

/** Share of the hub's diameter the readout text may span. */
const HUB_TEXT_FRACTION = 0.8
/** Caption lines (scale range, `centerLabel`) beneath the value. */
const CAPTION_FONT_SIZE = 11
const CAPTION_LINE_HEIGHT = 14
/** Descender room below the last caption baseline. */
const CAPTION_DESCENT = 3

/** Baseline of the first caption line, measured from the value's center line. */
function captionBaseline(fontSize: number): number {
  return fontSize * 0.7 + 11
}

/**
 * Vertical reach of a readout from its value center line: `above` is the
 * value's half-height, `below` reaches the last caption's descenders (or the
 * value's lower half when there is no caption). Layout uses this to keep the
 * whole readout inside the chart.
 */
export function gaugeReadoutExtent(fontSize: number, captionLines: number): { above: number; below: number } {
  const above = fontSize / 2
  if (captionLines <= 0) return { above, below: fontSize / 2 }
  return {
    above,
    below: captionBaseline(fontSize) + (captionLines - 1) * CAPTION_LINE_HEIGHT + CAPTION_DESCENT,
  }
}

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
  label,
  offsetY = 0
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
  /** Value center line relative to the arc center (negative moves it up). */
  offsetY?: number
}) {
  const fontSize = gaugeReadoutFontSize(value, radius, innerRadius)
  const captionY = offsetY + captionBaseline(fontSize)
  return (
    <g textAnchor="middle">
      <text
        y={offsetY}
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
          fontSize={CAPTION_FONT_SIZE}
          fill="var(--semiotic-text-secondary, #666)"
        >
          {min} – {max}
        </text>
      )}
      {label != null && label !== "" && (
        <text
          y={captionY + (showScaleLabels ? CAPTION_LINE_HEIGHT : 0)}
          fontSize={CAPTION_FONT_SIZE}
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
 * What the gauge center shows, resolved before layout so the arc can be sized
 * around a text readout: a `readout` (default value, or string/number
 * `centerContent`) whose lines are known, or an authored React `node` whose
 * size is not.
 */
export type GaugeCenter =
  | { readout: { value: string; showScaleLabels: boolean; label?: string } }
  | { node: React.ReactNode }
  | null

/** Caption lines a center readout draws beneath its value. */
export function gaugeCenterCaptionLines(center: GaugeCenter): number {
  if (!center || !("readout" in center)) return 0
  const { showScaleLabels, label } = center.readout
  return (showScaleLabels ? 1 : 0) + (label != null && label !== "" ? 1 : 0)
}

/**
 * The gauge center for React and static GaugeChart: authored `centerContent`
 * (a function receives the value and range), else the default readout, which
 * compact modes omit. Strings and numbers render as native SVG text, like the
 * default readout, fitted to the hub, so they stay portable in static SVG;
 * other React content passes through unchanged.
 */
export function describeGaugeCenter({
  centerContent,
  centerLabel,
  value,
  min,
  max,
  showScaleLabels,
  valueFormat,
  compact
}: {
  centerContent?: GaugeCenterContent
  centerLabel?: string
  value: number
  min: number
  max: number
  showScaleLabels: boolean
  valueFormat?: (value: number) => string
  compact: boolean
}): GaugeCenter {
  if (centerContent != null) {
    const content = typeof centerContent === "function"
      ? centerContent(value, min, max)
      : centerContent
    return typeof content === "string" || typeof content === "number"
      ? { readout: { value: String(content), showScaleLabels: false, label: centerLabel } }
      : { node: content }
  }
  if (compact) return null
  const formatted = valueFormat ? valueFormat(value) : String(Math.round(value))
  return { readout: { value: formatted, showScaleLabels, label: centerLabel } }
}

/** Render a described gauge center at the radius and offset the layout chose. */
export function renderGaugeCenter(
  center: GaugeCenter,
  { min, max, radius, innerRadius, offsetY = 0 }: {
    min: number
    max: number
    radius: number
    innerRadius: number
    offsetY?: number
  }
): React.ReactNode | null {
  if (!center) return null
  if ("node" in center) return center.node
  return GaugeReadout({ ...center.readout, min, max, radius, innerRadius, offsetY })
}
