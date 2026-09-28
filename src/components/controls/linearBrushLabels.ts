import type { LinearBrushTrack } from "./linearBrushGeometry"

// Pure LinearBrush label layout, shared by the browser control and static
// SVG. Widths are estimated from the text so both agree without measuring.

/** Two decimals at most; pass `formatValue` for dates or units. */
export function formatBrushValue(value: number): string {
  if (!Number.isFinite(value)) return ""
  const rounded = Math.round(value * 100) / 100
  return String(Object.is(rounded, -0) ? 0 : rounded)
}

export interface LinearBrushLabelLayout {
  kind: "start" | "end" | "domain-start" | "domain-end"
  value: number
  text: string
  lines: string[]
  /** Anchor position along the track, 0–1. */
  fraction: number
  /** The label ends at its anchor ("before") or starts at it ("after"). */
  placement: "before" | "after"
  row: 0 | 1
  /** Size along the track in px. */
  size: number
  /** Occupied span along the track in px. */
  from: number
  to: number
}

export interface LinearBrushLabelInput {
  /** The labeled selection, in value order. */
  value: [number, number]
  track: LinearBrushTrack
  /** Track length along the brushed axis in px. */
  length: number
  orientation: "x" | "y"
  format: (value: number) => string
  fontSize: number
  /** @default fontSize * 1.2 */
  lineHeight?: number
  /** Label width in px along an x track; estimated when omitted. */
  labelWidth?: number
  /** The px range, relative to the track start, labels stay inside. @default [0, length] */
  bounds?: readonly [number, number]
  showDomainLabels?: boolean
  /** Smallest gap between neighboring labels in px. @default 6 */
  gap?: number
}

/** Size along the track: the longest line's estimated width on x, the line stack on y. */
export function estimateBrushLabelSize(
  lines: readonly string[],
  orientation: "x" | "y",
  fontSize: number,
  lineHeight = fontSize * 1.2,
  labelWidth?: number
): number {
  if (orientation === "y") return lines.length * lineHeight
  if (labelWidth != null) return labelWidth
  return Math.max(0, ...lines.map((line) => Array.from(line).length)) * fontSize * 0.6
}

/**
 * Place the extent labels beside their handles: the first (in track order)
 * ends at its handle and the second starts at its handle. A label that would
 * leave `bounds` flips to the other side, and when the two still collide the
 * second steps down a row. Domain-end labels are added only where they fit
 * beside the extent labels.
 */
export function placeLinearBrushLabels(input: LinearBrushLabelInput): LinearBrushLabelLayout[] {
  const { value, track, length, orientation, format, fontSize, labelWidth, showDomainLabels } = input
  const lineHeight = input.lineHeight ?? fontSize * 1.2
  const gap = input.gap ?? 6
  const [low, high] = input.bounds ?? [0, length]
  const make = (kind: LinearBrushLabelLayout["kind"], labelValue: number, fraction = track.toFraction(labelValue)) => {
    const text = format(labelValue)
    const lines = text.split("\n")
    return { kind, value: labelValue, text, lines, fraction, size: estimateBrushLabelSize(lines, orientation, fontSize, lineHeight, labelWidth) }
  }
  const place = (label: ReturnType<typeof make>, preferred: "before" | "after"): LinearBrushLabelLayout => {
    const anchor = label.fraction * length
    let placement = preferred
    if (placement === "before" && anchor - label.size < low) placement = "after"
    else if (placement === "after" && anchor + label.size > high) placement = "before"
    const from = placement === "before" ? anchor - label.size : anchor
    return { ...label, placement, row: 0, from, to: from + label.size }
  }

  const start = make("start", value[0])
  const end = make("end", value[1])
  const [first, second] = start.fraction <= end.fraction ? [start, end] : [end, start]
  const firstLabel = place(first, "before")
  const secondLabel = place(second, "after")
  if (firstLabel.to + gap > secondLabel.from) secondLabel.row = 1
  const labels = [firstLabel, secondLabel]
  if (!showDomainLabels) return labels

  const rowZero = labels.filter((label) => label.row === 0)
  const fits = (label: LinearBrushLabelLayout) =>
    label.from >= low && label.to <= high &&
    rowZero.every((other) => label.to + gap <= other.from || other.to + gap <= label.from)
  const domainLabel = (fraction: 0 | 1): LinearBrushLabelLayout => {
    const edgeValue = track.fromFraction(fraction)
    const label = make(edgeValue === track.min ? "domain-start" : "domain-end", edgeValue, fraction)
    const from = fraction === 0 ? 0 : length - label.size
    return { ...label, placement: fraction === 0 ? "after" : "before", row: 0, from, to: from + label.size }
  }
  const domainLabels = [domainLabel(0), domainLabel(1)].filter(fits)
  return [...domainLabels, ...labels]
}
