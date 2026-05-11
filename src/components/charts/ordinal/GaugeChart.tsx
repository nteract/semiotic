"use client"
import type { Datum } from "../shared/datumTypes"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import type { BaseChartProps } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import { sweepToAngles, computeArcBoundingBox } from "../shared/radialGeometry"
import { useChartMode } from "../shared/hooks"
import type { RealtimeFrameHandle } from "../../realtime/types"

// ── Types ─────────────────────────────────────────────────────────────────

export interface GaugeThreshold {
  /** Upper bound of this zone (value, not percentage) */
  value: number
  /** Color for this threshold zone */
  color: string
  /** Optional label for the zone */
  label?: string
}

export interface GaugeChartProps extends BaseChartProps {
  /** Current gauge value */
  value: number
  /** Minimum scale value (default 0) */
  min?: number
  /** Maximum scale value (default 100) */
  max?: number
  /** Threshold zones — ordered list of { value, color, label? }. Last threshold's value should equal max. */
  thresholds?: GaugeThreshold[]
  /** Color of the value arc when no thresholds defined (default: theme primary) */
  color?: string
  /** Background arc color (default: var(--semiotic-grid, #e0e0e0)) */
  backgroundColor?: string
  /** Arc thickness as fraction of radius (0–1, default 0.3) */
  arcWidth?: number
  /** Pixel radius for the rounded ends of each arc segment, same prop
   *  semantics as `DonutChart.cornerRadius`. Default `undefined`
   *  (sharp corners). Useful for the "pill" aesthetic where each
   *  threshold zone reads as a discrete capsule. */
  cornerRadius?: number
  /** Show needle indicator (default true) */
  showNeedle?: boolean
  /** Needle color (default: var(--semiotic-text, #333)) */
  needleColor?: string
  /** Center content — ReactNode rendered at the gauge center. If not provided, shows the value. */
  centerContent?: React.ReactNode | ((value: number, min: number, max: number) => React.ReactNode)
  /** Format function for the default center value label */
  valueFormat?: (value: number) => string
  /** Show scale tick labels at min, max, and threshold boundaries (default true) */
  showScaleLabels?: boolean
  /** Arc sweep angle in degrees (default 240 — leaves a 120° gap at the bottom) */
  sweep?: number
  /** When false, all threshold zones render at full color and only the needle indicates value. Default true (zones fill up to value). */
  fillZones?: boolean
  /** Enable tooltip on arc segments */
  tooltip?: TooltipProp
  /** Annotations — supports threshold markers via standard annotation system */
  annotations?: Datum[]
  /** Enable hover interaction (default true) */
  enableHover?: boolean
  /** frameProps escape hatch */
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

// ── Component ─────────────────────────────────────────────────────────────

/**
 * GaugeChart - A single-value indicator with an optional needle and threshold zones.
 *
 * Pass a `value` between `min` and `max`; threshold zones color the arc
 * by status. Useful for KPI tiles, health-check displays, and scorecards.
 *
 * @example
 * ```tsx
 * // Simple gauge with threshold zones
 * <GaugeChart
 *   value={72}
 *   min={0}
 *   max={100}
 *   thresholds={[
 *     { value: 60, color: "#22c55e", label: "ok" },
 *     { value: 80, color: "#f59e0b", label: "warn" },
 *     { value: 100, color: "#ef4444", label: "crit" },
 *   ]}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Half-sweep gauge with center value text
 * <GaugeChart
 *   value={42}
 *   min={0}
 *   max={100}
 *   sweep={Math.PI}
 *   arcWidth={20}
 *   centerContent={<text fontSize={32}>42%</text>}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Hide needle, fill the zone-of-current-value instead
 * <GaugeChart
 *   value={87}
 *   thresholds={[{ value: 50, color: "#22c55e" }, { value: 90, color: "#f59e0b" }, { value: 100, color: "#ef4444" }]}
 *   showNeedle={false}
 *   fillZones
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Rounded segment ends — same `cornerRadius` semantics as DonutChart.
 * // Each threshold zone reads as a capsule with the others.
 * <GaugeChart
 *   value={65}
 *   thresholds={[
 *     { value: 60, color: "#22c55e" },
 *     { value: 80, color: "#f59e0b" },
 *     { value: 100, color: "#ef4444" },
 *   ]}
 *   cornerRadius={6}
 * />
 * ```
 */
export const GaugeChart = forwardRef(function GaugeChart(props: GaugeChartProps, _ref: React.Ref<RealtimeFrameHandle>) {
  // Width/height passed through unmassaged so `useChartMode` can substitute
  // the mode default (context: 400×250, sparkline: 120×24). Primary-mode
  // default is 300×250 via the third arg — a gauge reads better compact.
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    showLegend: false,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
  }, { width: 300, height: 250 })

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)

  // Mode-aware defaults: context and sparkline (compactMode) hide the min/max
  // scale labels and per-threshold annotations — they don't read at compact
  // sizes. Context keeps its own value readout as an SVG annotation; sparkline
  // suppresses that too. User-supplied values always win.
  const modeIsContext = props.mode === "context"
  const { compactMode } = resolved

  const {
    value,
    min = 0,
    max = 100,
    thresholds,
    color: fillColor,
    backgroundColor = "var(--semiotic-grid, #e0e0e0)",
    arcWidth = 0.3,
    cornerRadius,
    showNeedle = true,
    needleColor = "var(--semiotic-text, #333)",
    centerContent,
    valueFormat,
    showScaleLabels = !compactMode,
    sweep = 240,
    fillZones = true,
    tooltip,
    annotations,
    frameProps = {},
    className,
    stroke,
    strokeWidth,
    opacity,
  } = props

  const { width, height, title, description, summary, accessibleTable } = resolved

  // Clamp value to [min, max]
  const clampedValue = Math.max(min, Math.min(max, value))
  const range = max - min || 1
  const pct = (clampedValue - min) / range

  // ── Build synthetic ordinal data ──────────────────────────────────────
  // Each threshold zone becomes a category with its proportional arc size.
  // The "remaining" (unfilled) portion of each zone is a separate category.

  const { gaugeData, pieceStyle, gaugeAnnotations } = useMemo(() => {
    const data: Array<{ category: string; value: number; _zone?: string; _isFill: boolean }> = []
    const styles = new Map<string, { fill: string; opacity?: number }>()
    const scaleAnnotations: Datum[] = []

    // Normalize thresholds: sort by value, clamp to [min, max], ensure last zone reaches max
    let zones = thresholds && thresholds.length > 0
      ? [...thresholds].sort((a, b) => a.value - b.value)
      : [{ value: max, color: fillColor || "var(--semiotic-primary, #007bff)" }]
    // Clamp zone values to [min, max]
    zones = zones.map(z => ({ ...z, value: Math.max(min, Math.min(max, z.value)) }))
    // Ensure the last zone reaches max
    if (zones[zones.length - 1].value < max) {
      zones.push({ value: max, color: zones[zones.length - 1].color })
    }

    // Data values sum to 1.0. pieScene uses sweepAngle to limit the arc.
    let prevBound = min
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i]
      const zonePct = (zone.value - prevBound) / range

      if (!fillZones) {
        // No fill tracking — all zones render at full color, only needle moves
        const key = `zone-${i}`
        data.push({ category: key, value: zonePct, _zone: zone.label || `Zone ${i + 1}`, _isFill: true })
        styles.set(key, { fill: zone.color })
      } else {
        const zoneStart = (prevBound - min) / range
        const zoneEnd = (zone.value - min) / range
        const fillEnd = Math.min(pct, zoneEnd)
        const fillPct = Math.max(0, fillEnd - zoneStart)
        const bgPct = zonePct - fillPct

        if (fillPct > 0) {
          const fillKey = `fill-${i}`
          data.push({ category: fillKey, value: fillPct, _zone: zone.label || `Zone ${i + 1}`, _isFill: true })
          styles.set(fillKey, { fill: zone.color })
        }
        if (bgPct > 0) {
          const bgKey = `bg-${i}`
          data.push({ category: bgKey, value: bgPct, _zone: zone.label || `Zone ${i + 1}`, _isFill: false })
          styles.set(bgKey, { fill: backgroundColor, opacity: 0.4 })
        }
      }

      prevBound = zone.value
    }

    // Scale label annotations at threshold boundaries
    if (showScaleLabels && thresholds && thresholds.length > 0) {
      for (const t of thresholds) {
        if (t.value > min && t.value < max) {
          scaleAnnotations.push({
            type: "gauge-label",
            value: t.value,
            label: t.label || String(t.value),
          })
        }
      }
    }

    const styleFn = (d: Datum, category?: string) => {
      const key = category || d.category
      return styles.get(key) || { fill: backgroundColor }
    }

    return { gaugeData: data, pieceStyle: styleFn, gaugeAnnotations: scaleAnnotations }
  }, [value, min, max, thresholds, fillColor, backgroundColor, pct, range, showScaleLabels, fillZones])

  // Overlay top-level primitive props (stroke/strokeWidth/opacity) so each
  // zone arc respects them without the user needing a per-zone pieceStyle.
  const pieceStyleWithPrimitives = useMemo(
    () => mergeShapeStyle(pieceStyle, { stroke, strokeWidth, opacity }),
    [pieceStyle, stroke, strokeWidth, opacity]
  )

  // ── Arc geometry ────────────────────────────────────────────────────
  // Sweep convention (pieScene.ts): 0° = 12 o'clock, positive = clockwise.
  // `sweepToAngles` produces the matching start angle (gap centered at the
  // 6 o'clock position) and the radian offset for unit-circle math.
  // `computeArcBoundingBox` returns the visible bbox so the arc radius can
  // be sized to fit the widget. Both helpers live in `radialGeometry.ts`
  // and are exported from `semiotic/utils`.
  const { sweepRad, startAngleDeg: startAngleDegFinal } = sweepToAngles(sweep)
  const arcBBox = computeArcBoundingBox(sweep)

  // PAD shrinks at very small widget sizes (sparkline 120×24 etc.) so the
  // arc isn't squeezed to zero thickness by the fixed edge inset. At
  // 120×24 with the old PAD=10, `(height - 20)/1 = 4` forced radius=10
  // (the floor) while innerRadius also hit 10 — resulting in a
  // zero-thickness arc that painted nothing. Scaling PAD with the smaller
  // dimension keeps the arc visible at sparkline sizes while leaving
  // larger modes unchanged.
  const PAD = Math.min(10, Math.max(1, Math.min(width, height) / 12))
  const arcW = arcBBox.width
  const arcH = arcBBox.height
  const arcCX = arcBBox.cx
  const arcCY = arcBBox.cy
  // Floor the radius at 4px (arbitrary but enough for the canvas content-check
  // to detect painted pixels) rather than 10, since a 10 floor at 120×24 would
  // push the gauge outside its own bbox. The arc stays legible at any realistic
  // primary/context size and remains detectable as "has content" at sparkline.
  const radius = Math.max(4, Math.min(
    (width - 2 * PAD) / arcW,
    (height - 2 * PAD) / arcH
  ) - 2)
  // Minimum visible thickness: ensure `radius - innerRadius >= 1.5px` so the
  // arc always has SOME width to paint, even when the outer radius itself is
  // near the floor.
  const innerRadius = Math.max(0, Math.min(radius - 1.5, radius * (1 - arcWidth)))

  // Position the frame center so the arc bbox is centered in the widget.
  // The arc center (0,0 in unit circle) maps to the frame layout center.
  // Arc bbox center = frameCenterY + arcCY*R. We want this at height/2.
  // So frameCenterY = height/2 - arcCY*R.
  const frameCenterX = width / 2 - arcCX * radius
  const frameCenterY = height / 2 - arcCY * radius

  // The layout must be at least 2*(R+4) square for the frame to produce this radius.
  // Allow the layout to extend outside the widget — the canvas clips to the widget size anyway.
  const S = 2 * (radius + 4)

  // ── Center content ──────────────────────────────────────────────────────
  // - primary: value in the hub, min–max range beneath it
  // - context: centerContent suppressed — value renders as an SVG annotation
  //   below the dial (see `gauge-value` rule) so it can't be clipped by the
  //   center-slot's absolute-positioning constraints
  // - sparkline: nothing at all — a sparkline gauge is a dial indicator
  const centerEl = useMemo(() => {
    if (compactMode && centerContent == null) return null
    if (centerContent != null) {
      return typeof centerContent === "function" ? centerContent(clampedValue, min, max) : centerContent
    }
    const formatted = valueFormat ? valueFormat(clampedValue) : String(Math.round(clampedValue))
    return (
      <div style={{ textAlign: "center", lineHeight: 1.2 }}>
        <div style={{ fontSize: Math.max(16, radius * 0.3), fontWeight: 700, color: "var(--semiotic-text, #333)" }}>
          {formatted}
        </div>
        {showScaleLabels && (
          <div style={{ fontSize: 11, color: "var(--semiotic-text-secondary, #666)" }}>
            {min} – {max}
          </div>
        )}
      </div>
    )
  }, [centerContent, clampedValue, min, max, valueFormat, showScaleLabels, radius, compactMode])

  // Context-mode value annotation: rendered as SVG text inside the bottom gap
  // of the arc (the 120° wedge the 240° sweep leaves at 6 o'clock). User-
  // supplied centerContent short-circuits this since they've expressed intent.
  const contextValueAnnotation = useMemo(() => {
    if (!modeIsContext || centerContent != null) return null
    const formatted = valueFormat ? valueFormat(clampedValue) : String(Math.round(clampedValue))
    return { type: "gauge-value", text: formatted }
  }, [modeIsContext, centerContent, clampedValue, valueFormat])

  // ── Needle SVG ──────────────────────────────────────────────────────────
  const needleAnnotation = useMemo(() => {
    if (!showNeedle) return null
    // pieScene coordinate system: -π/2 = 12 o'clock, then + startAngle (in radians)
    // Needle maps pct [0,1] to [startAngle, startAngle + sweep] in the same frame.
    // Length scales with innerRadius so sparkline gauges (innerRadius ~2px) still
    // draw a visible needle. The old `innerRadius - 8` formula went negative at
    // compact sizes and flipped the needle away from the dial.
    const startRad = -Math.PI / 2 + (startAngleDegFinal * Math.PI) / 180
    const needleAngle = startRad + pct * sweepRad
    // Primary/context (innerRadius > 20): traditional gauge — needle tip sits
    // ~8px shy of the inner arc edge. Sparkline (innerRadius ≤ 20): the
    // traditional formula collapses to a dot, so extend through the arc band
    // to ~1px shy of the outer radius. The 20px threshold is where the
    // "inside" needle would become too short to read as a line.
    const needleLength = innerRadius > 20 ? innerRadius - 8 : radius - 1
    const tipX = Math.cos(needleAngle) * needleLength
    const tipY = Math.sin(needleAngle) * needleLength
    return { type: "gauge-needle", tipX, tipY, color: needleColor }
  }, [showNeedle, pct, startAngleDegFinal, sweepRad, innerRadius, needleColor])

  // Custom SVG annotation rule for gauge-specific annotations
  const svgAnnotationRules = useMemo(() => {
    return (ann: any, index: number, context: any) => {
      if (ann.type === "gauge-needle") {
        const cx = (context.width || width) / 2
        const cy = (context.height || height) / 2
        // Needle stroke + hub scale with the arc's thickness so sparkline's
        // 24px-tall gauge gets a ~1px needle and a ~2px hub rather than the
        // literal 2.5/5 values that overwhelmed the tiny dial.
        const arcThickness = Math.max(1, radius - innerRadius)
        const needleStroke = Math.max(1, Math.min(2.5, arcThickness * 0.4))
        const hubR = Math.max(1, Math.min(5, arcThickness * 0.6))
        return (
          <g key={`gauge-needle-${index}`} transform={`translate(${cx},${cy})`}>
            <line x1={0} y1={0} x2={ann.tipX} y2={ann.tipY}
              stroke={ann.color} strokeWidth={needleStroke} strokeLinecap="round" />
            <circle cx={0} cy={0} r={hubR} fill={ann.color} />
          </g>
        )
      }
      if (ann.type === "gauge-label") {
        const labelPct = (ann.value - min) / range
        const startRad = -Math.PI / 2 + (startAngleDegFinal * Math.PI) / 180
        const labelAngle = startRad + labelPct * sweepRad
        const labelR = innerRadius - 14
        const cx = (context.width || width) / 2
        const cy = (context.height || height) / 2
        const lx = Math.cos(labelAngle) * labelR
        const ly = Math.sin(labelAngle) * labelR
        return (
          <text key={`gauge-label-${index}`}
            x={cx + lx} y={cy + ly}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fill="var(--semiotic-text-secondary, #666)"
            style={{ userSelect: "none" }}
          >
            {ann.label}
          </text>
        )
      }
      if (ann.type === "gauge-value") {
        // Sit the value in the empty space between the arc's peak and the
        // needle hub. `cy` alone put the text right on top of the hub dot;
        // the older `cy + innerRadius * 0.55` sat ~220px from the top of a
        // 250px-tall widget, which the user flagged as ~70px too low.
        // `cy - innerRadius * 0.2` lands the text roughly mid-arc — same
        // visual weight as primary's hub label, no hub overlap, and matches
        // the requested upward shift.
        const cx = (context.width || width) / 2
        const cy = (context.height || height) / 2
        const ty = cy - innerRadius * 0.2
        const fontSize = Math.max(12, Math.min(22, radius * 0.28))
        return (
          <text key={`gauge-value-${index}`}
            x={cx} y={ty}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={fontSize} fontWeight={700}
            fill="var(--semiotic-text, #333)"
            style={{ userSelect: "none" }}
          >
            {ann.text}
          </text>
        )
      }
      return null
    }
  }, [width, height, min, range, startAngleDegFinal, sweepRad, innerRadius, radius])

  // Combine annotations
  const allAnnotations = useMemo(() => {
    const anns = [...gaugeAnnotations, ...(annotations || [])]
    if (needleAnnotation) anns.push(needleAnnotation)
    if (contextValueAnnotation) anns.push(contextValueAnnotation)
    return anns
  }, [gaugeAnnotations, annotations, needleAnnotation, contextValueAnnotation])

  // ── Default tooltip ──────────────────────────────────────────────────────
  const defaultTooltipContent = useMemo(() => {
    return (d: Datum) => {
      const datum = d?.data?.[0] || d?.data || d
      const zone = datum?._zone || ""
      const isFill = datum?._isFill
      return (
        <div className="semiotic-tooltip" style={{ padding: "6px 10px", background: "var(--semiotic-tooltip-bg, white)", borderRadius: "var(--semiotic-tooltip-radius, 6px)", boxShadow: "var(--semiotic-tooltip-shadow, 0 2px 8px rgba(0,0,0,0.15))" }}>
          <div style={{ fontWeight: 600 }}>{zone}</div>
          <div style={{ fontSize: "0.85em", color: "var(--semiotic-text-secondary, #666)" }}>
            {isFill ? `Current: ${Math.round(clampedValue)}` : "Remaining"}
          </div>
        </div>
      )
    }
  }, [clampedValue])

  if (gaugeData.length === 0) {
    return <ChartError componentName="GaugeChart" message="No data to display" width={width} height={height} />
  }

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "donut",
    data: gaugeData,
    oAccessor: "category",
    rAccessor: "value",
    oSort: false,  // preserve threshold zone order (don't sort by value)
    projection: "radial",
    pieceStyle: pieceStyleWithPrimitives,
    innerRadius,
    startAngle: startAngleDegFinal,
    sweepAngle: sweep,
    // Flow through to the pie scene builder + canvas wedge renderer; both
    // already honor `cornerRadius` the same way DonutChart does, so the
    // arc segments render with rounded ends without any new infrastructure.
    ...(cornerRadius != null && { cornerRadius }),
    centerContent: centerEl,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: {
      top: frameCenterY - S / 2,
      bottom: height - frameCenterY - S / 2,
      left: frameCenterX - S / 2,
      right: width - frameCenterX - S / 2,
    },
    enableHover: resolved.enableHover,
    showAxes: false,
    showCategoryTicks: false,
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    svgAnnotationRules,
    ...(allAnnotations.length > 0 && { annotations: allAnnotations }),
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    ...(props.animate != null && { animate: props.animate }),
    ...frameProps,
  }

  return (
    <SafeRender componentName="GaugeChart" width={width} height={height}>
      <StreamOrdinalFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  (props: GaugeChartProps & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
GaugeChart.displayName = "GaugeChart"
