import { estimateLabelWidth } from "./AnnotationLabel"
import { gaugeReadoutExtent, gaugeReadoutFontSize } from "./GaugeReadout"
import { computeArcBoundingBox, sweepToAngles } from "./radialGeometry"

/** Space kept between the value text and the chord across the arc's ends. */
const READOUT_CHORD_GAP = 2
/** Readout clearance below the needle hub (hub radius ≤ 5px plus a gap). */
const NEEDLE_HUB_CLEARANCE = 8
/** Readout clearance from the needle's stroke. */
const NEEDLE_STROKE_CLEARANCE = 3
/** Threshold scale labels sit this far outside the arc, at this font size. */
export const GAUGE_LABEL_OFFSET = 10
export const GAUGE_LABEL_FONT_SIZE = 10

/** Threshold label on the scale: its position along the sweep (0–1) and text. */
export interface GaugeScaleLabelFit {
  fraction: number
  text: string
}

type GaugeLabelAnchor = "start" | "middle" | "end"
type GaugeLabelBaseline = "auto" | "middle" | "hanging"

/**
 * Text alignment for a scale label at `angle` (radians, 0 = 3 o'clock),
 * following the clock position of its mark: top sector (11–1) centered above,
 * right sector (1–5) left-aligned, bottom sector (5–7) centered below, left
 * sector (7–11) right-aligned. Shared by React and static rendering.
 */
export function gaugeScaleLabelAlignment(angle: number): {
  textAnchor: GaugeLabelAnchor
  dominantBaseline: GaugeLabelBaseline
} {
  const hour = (((angle + Math.PI / 2) / (2 * Math.PI)) * 12 + 12) % 12
  if (hour >= 11 || hour < 1) return { textAnchor: "middle", dominantBaseline: "auto" }
  if (hour < 5) return { textAnchor: "start", dominantBaseline: "middle" }
  if (hour < 7) return { textAnchor: "middle", dominantBaseline: "hanging" }
  return { textAnchor: "end", dominantBaseline: "middle" }
}

/** A scale label's text box relative to the arc center. */
function scaleLabelBox(angle: number, radius: number, text: string) {
  const r = radius + GAUGE_LABEL_OFFSET
  const x = Math.cos(angle) * r
  const y = Math.sin(angle) * r
  const size = GAUGE_LABEL_FONT_SIZE
  const width = estimateLabelWidth(text, size)
  const { textAnchor, dominantBaseline } = gaugeScaleLabelAlignment(angle)
  const left = textAnchor === "start" ? x : textAnchor === "end" ? x - width : x - width / 2
  const top = dominantBaseline === "auto" ? y - size * 0.8 : dominantBaseline === "hanging" ? y : y - size / 2
  return { left, right: left + width, top, bottom: top + size }
}

/** Text readout drawn at the arc center, sized before the arc is placed. */
export interface GaugeReadoutFit {
  /** Value text; its estimated width sets the fitted font size. */
  value: string
  /** Caption lines beneath the value (scale range, `centerLabel`). */
  captionLines: number
}

export interface GaugeLayout {
  /** Outer arc radius. */
  radius: number
  innerRadius: number
  /** Arc center in chart coordinates. */
  centerX: number
  centerY: number
  /** Value center line relative to the arc center (negative = up). */
  readoutOffset: number
  /** Frame margins whose square layout reproduces `radius` at the center. */
  margin: { top: number; right: number; bottom: number; left: number }
}

/** Hub radius for an arc of `radius`, keeping at least 1.5px of band. */
function gaugeInnerRadius(radius: number, arcWidth: number): number {
  return Math.max(0, Math.min(radius - 1.5, radius * (1 - arcWidth)))
}

/**
 * Value center line relative to the arc center (negative = up).
 *
 * With a needle, the readout goes below the hub into the gap the needle never
 * sweeps, dropping just far enough that the needle's widest reach (the sweep
 * ends) clears the text's top corners; anywhere above the hub the needle would
 * cross it at most values. A full circle has no such gap, so the readout
 * still sits below the hub and only meets the needle near min and max.
 *
 * Without a needle, the value stays at the center but is lifted into the
 * arc's opening when the chord between the arc's inner ends would cut through
 * it (sweeps of about 200° or less), so it sits inside the arch rather than
 * level with its ends.
 */
function readoutOffset(sweep: number, innerRadius: number, fontSize: number, value: string, needle: boolean): number {
  const halfGap = ((360 - Math.min(360, sweep)) / 2) * (Math.PI / 180)
  if (needle) {
    // Drop the text until its top corner is NEEDLE_STROKE_CLEARANCE away from
    // a needle resting at either end of the sweep (halfGap from straight down).
    const halfWidth = estimateLabelWidth(value, fontSize) / 2
    const cornerDrop = halfGap >= Math.PI / 2 || halfGap <= 0
      ? 0
      : halfWidth / Math.tan(halfGap) + NEEDLE_STROKE_CLEARANCE / Math.sin(halfGap)
    return Math.max(NEEDLE_HUB_CLEARANCE, cornerDrop) + fontSize / 2
  }
  if (sweep >= 360) return 0
  const chordY = innerRadius * Math.cos(halfGap)
  return Math.min(0, chordY - READOUT_CHORD_GAP - fontSize / 2)
}

/**
 * Shared GaugeChart geometry for React and static rendering: the largest arc
 * whose visible bounding box, plus the center readout and threshold labels
 * when there are any, fits inside `width` x `height` with a small inset,
 * centered in the chart. The readout can hang below the arc (always on a
 * half-circle gauge) and labels sit outside it, so both count toward the fit
 * instead of being drawn past the chart's edges.
 */
export function computeGaugeLayout({
  width,
  height,
  sweep,
  arcWidth,
  readout,
  needle = false,
  scaleLabels = [],
  topInset = 0
}: {
  width: number
  height: number
  sweep: number
  arcWidth: number
  readout?: GaugeReadoutFit | null
  /** Whether a needle is drawn; the readout then keeps out of its sweep. */
  needle?: boolean
  /** Threshold labels drawn outside the arc, which must fit too. */
  scaleLabels?: GaugeScaleLabelFit[]
  /**
   * Height reserved above the gauge, such as the frame's title strip. The
   * frame enforces it as a minimum top margin, so the fit must leave it free.
   */
  topInset?: number
}): GaugeLayout {
  const box = computeArcBoundingBox(sweep)
  const { offsetRad, sweepRad } = sweepToAngles(sweep)
  const bandHeight = Math.max(0, height - topInset)
  // Scale padding with the smaller dimension so compact gauges retain a
  // visible arc while larger modes keep the standard inset.
  const pad = Math.min(10, Math.max(1, Math.min(width, bandHeight) / 12))
  const availableWidth = width - 2 * pad
  const availableHeight = bandHeight - 2 * pad

  // Reach of the arc, readout, and scale labels around the arc center at a
  // candidate radius.
  const extent = (radius: number) => {
    let left = box.minX * radius
    let right = box.maxX * radius
    let top = box.minY * radius
    let bottom = box.maxY * radius
    let offset = 0
    if (readout) {
      const innerRadius = gaugeInnerRadius(radius, arcWidth)
      const fontSize = gaugeReadoutFontSize(readout.value, radius, innerRadius)
      offset = readoutOffset(sweep, innerRadius, fontSize, readout.value, needle)
      const reach = gaugeReadoutExtent(fontSize, readout.captionLines)
      top = Math.min(top, offset - reach.above)
      bottom = Math.max(bottom, offset + reach.below)
    }
    for (const label of scaleLabels) {
      const labelBox = scaleLabelBox(offsetRad + label.fraction * sweepRad, radius, label.text)
      left = Math.min(left, labelBox.left)
      right = Math.max(right, labelBox.right)
      top = Math.min(top, labelBox.top)
      bottom = Math.max(bottom, labelBox.bottom)
    }
    return { left, right, top, bottom, offset }
  }
  const fits = (radius: number) => {
    const { left, right, top, bottom } = extent(radius)
    return right - left <= availableWidth && bottom - top <= availableHeight
  }

  // Floor the radius at 4px (arbitrary but enough for the canvas content-check
  // to detect painted pixels) rather than 10, since a 10 floor at 120×24 would
  // push the gauge outside its own bbox. The arc stays legible at any realistic
  // primary/context size and remains detectable as "has content" at sparkline.
  let radius = Math.max(4, Math.min(
    availableWidth / box.width,
    availableHeight / box.height
  ) - 2)
  if ((readout || scaleLabels.length > 0) && radius > 4 && !fits(radius)) {
    // The readout's font tracks the radius, so search for the largest radius
    // whose arc, readout, and labels fit together.
    let lo = 4
    let hi = radius
    for (let i = 0; i < 24 && hi - lo > 0.25; i++) {
      const mid = (lo + hi) / 2
      if (fits(mid)) lo = mid
      else hi = mid
    }
    radius = lo
  }

  const innerRadius = gaugeInnerRadius(radius, arcWidth)
  const { left, right, top, bottom, offset } = extent(radius)
  // Center the arc's bounding box (with readout and labels) in the widget.
  // Arc unit coordinates map to the frame layout center, so the arc center
  // sits at the widget center minus the content's midpoint.
  const centerX = width / 2 - (left + right) / 2
  const centerY = topInset + bandHeight / 2 - (top + bottom) / 2

  // The frame derives its radius from a square layout of side 2·(R + 4); the
  // layout may extend outside the widget, which the canvas clips anyway.
  const side = 2 * (radius + 4)
  return {
    radius,
    innerRadius,
    centerX,
    centerY,
    readoutOffset: offset,
    margin: {
      top: centerY - side / 2,
      bottom: height - centerY - side / 2,
      left: centerX - side / 2,
      right: width - centerX - side / 2,
    },
  }
}
