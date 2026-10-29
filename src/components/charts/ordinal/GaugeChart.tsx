"use client"
import { GAUGE_CHART_SIZE } from "../shared/chartSizeDefaultsOrdinal"
import { describeGaugeCenter, gaugeCenterCaptionLines, renderGaugeCenter } from "../shared/GaugeReadout"
import { computeGaugeLayout, gaugeScaleLabelAlignment, GAUGE_LABEL_FONT_SIZE, GAUGE_LABEL_OFFSET } from "../shared/gaugeLayout"
import { MIN_TITLE_TOP_MARGIN } from "../../stream/titleLayout"
import type { Datum } from "../shared/datumTypes"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import { useResponsiveSize } from "../../stream/useResponsiveSize"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import type { BaseChartProps } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import { sweepToAngles } from "../shared/radialGeometry"
import { useChartMode, useChartSelection } from "../shared/hooks"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { buildGaugeArcModel, type GaugeGradientFill } from "../shared/gaugeGradient"
import { normalizeColorGradient } from "../shared/gradient"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import { useResolvedSelection } from "../shared/useResolvedSelection"
import { composeStyleRules, type StyleRule } from "../shared/styleRules"
import { withChartErrorBoundary } from "../shared/withChartErrorBoundary"

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
  /**
   * Arc-length gradient for the gauge band.
   *
   * Offset 0 is the sweep start and offset 1 is the sweep end. Stops can set
   * `color`, `opacity`, or both.
   *
   * The gradient is sampled along the visible filled arc from sweep start
   * toward the current value. If `fillZones` is false, the entire arc uses
   * the gradient. If `fillZones` is true, the unfilled remainder stays on
   * `backgroundColor`.
   */
  gradientFill?: GaugeGradientFill
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
  /**
   * Center content, or a function of `(value, min, max)`. Defaults to the
   * formatted value. Strings and numbers render as native SVG text, and SVG
   * elements (or fragments of them) stay native; other React content falls
   * back to an HTML overlay, and to a `foreignObject` in static SVG, which
   * some SVG importers drop. Wrap custom SVG components in a `<g>`.
   */
  centerContent?: React.ReactNode | ((value: number, min: number, max: number) => React.ReactNode)
  /** Caption drawn as SVG text beneath the center value, for example a unit or metric name. */
  centerLabel?: string
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
  /** Ordered styling for rendered gauge segments. Rules see the synthetic segment fields (`category`, `value`, `_zone`, `_isFill`). */
  styleRules?: StyleRule[]
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
export const GaugeChart = /* @__PURE__ */ withChartErrorBoundary(/* @__PURE__ */ forwardRef(function GaugeChart(props: GaugeChartProps, _ref: React.Ref<RealtimeFrameHandle>) {
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
      mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
}, GAUGE_CHART_SIZE)

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)

  // Mode-aware defaults: context and sparkline (compactMode) hide the min/max
  // scale labels and per-threshold annotations — they don't read at compact
  // sizes. Context keeps its own value readout as an SVG annotation; sparkline
  // suppresses that too. User-supplied values always win.
  const modeIsContext = resolved.mode === "context"
  const { compactMode } = resolved

  const {
    value,
    min = 0,
    max = 100,
    thresholds,
    gradientFill,
    color: fillColor,
    backgroundColor = "var(--semiotic-grid, #e0e0e0)",
    arcWidth = 0.3,
    cornerRadius,
    showNeedle = true,
    needleColor = "var(--semiotic-text, #333)",
    centerContent,
    centerLabel,
    valueFormat,
    showScaleLabels = !compactMode,
    sweep = 240,
    fillZones = true,
    tooltip,
    styleRules,
    annotations,
    frameProps = {},
    className,
    stroke,
    strokeWidth,
    opacity,
  } = props

  const { width, height, title, description, summary, accessibleTable } = resolved
  // The arc, readout, and margins are laid out here rather than in the frame,
  // so a responsive gauge measures its own host (as the Physics charts do) and
  // hands the frame that fixed size; the nominal size stays the fallback and
  // the size of loading/empty placeholders.
  const isResponsive = Boolean(props.responsiveWidth || props.responsiveHeight)
  const [responsiveHostRef, measuredSize] = useResponsiveSize(
    [width, height],
    props.responsiveWidth,
    props.responsiveHeight,
  )
  const layoutWidth = Math.max(1, measuredSize[0])
  const layoutHeight = Math.max(1, measuredSize[1])
  const resolvedGradientFill = normalizeColorGradient(gradientFill)

  // Clamp value to [min, max]
  const clampedValue = Math.max(min, Math.min(max, value))
  const range = max - min || 1
  const pct = (clampedValue - min) / range

  // ── Build synthetic ordinal data ──────────────────────────────────────
  // Each threshold zone becomes a category with its proportional arc size.
  // The "remaining" (unfilled) portion of each zone is a separate category.

  const { gaugeData, pieceStyle, gaugeAnnotations } = useMemo(() => buildGaugeArcModel({
    min,
    max,
    value,
    thresholds,
    fillColor,
    backgroundColor,
    fillZones,
    showScaleLabels,
    gradientFill: resolvedGradientFill,
  }), [value, min, max, thresholds, fillColor, backgroundColor, showScaleLabels, fillZones, resolvedGradientFill])

  const ruledPieceStyle = useMemo(
    () => composeStyleRules(pieceStyle, styleRules, (d, category) => ({
      value: typeof d.value === "number" ? d.value : undefined,
      category: category ?? (d.category == null ? undefined : String(d.category)),
    })),
    [pieceStyle, styleRules],
  )

  // Overlay top-level primitive props (stroke/strokeWidth/opacity) so each
  // zone arc respects them without the user needing a per-zone pieceStyle.
  const pieceStyleWithPrimitives = useMemo(
    () => mergeShapeStyle(ruledPieceStyle, { stroke, strokeWidth, opacity }),
    [ruledPieceStyle, stroke, strokeWidth, opacity]
  )
  const {
    activeSelectionHook,
    customHoverBehavior,
    customClickBehavior,
  } = useChartSelection({
    selection: props.selection,
    linkedHover: props.linkedHover,
    fallbackFields: ["category"],
    onObservation: props.onObservation,
    chartType: "GaugeChart",
    chartId: props.chartId,
    onClick: props.onClick,
    hoverHighlight: props.hoverHighlight,
    colorByField: "category",
    mobileInteraction: resolved.mobileInteraction,
  })
  const resolvedSelection = useResolvedSelection(props.selection)
  const interactivePieceStyle = useMemo(
    () => wrapStyleWithSelection(pieceStyleWithPrimitives, activeSelectionHook, resolvedSelection),
    [pieceStyleWithPrimitives, activeSelectionHook, resolvedSelection],
  )

  // ── Center content ──────────────────────────────────────────────────────
  // - primary: value in the hub, min–max range beneath it
  // - context: centerContent suppressed — value renders as an SVG annotation
  //   below the dial (see `gauge-value` rule) so it can't be clipped by the
  //   center-slot's absolute-positioning constraints
  // - sparkline: nothing at all — a sparkline gauge is a dial indicator
  // Resolved before the arc geometry so a text readout can be fitted with it.
  const center = useMemo(() => describeGaugeCenter({
    centerContent,
    centerLabel,
    value: clampedValue,
    min,
    max,
    showScaleLabels,
    valueFormat,
    compact: compactMode,
  }), [centerContent, centerLabel, clampedValue, min, max, valueFormat, showScaleLabels, compactMode])

  // ── Arc geometry ────────────────────────────────────────────────────
  // Sweep convention (pieScene.ts): 0° = 12 o'clock, positive = clockwise.
  // `sweepToAngles` produces the matching start angle (gap centered at the
  // 6 o'clock position) and the radian offset for unit-circle math.
  // `computeGaugeLayout` (shared with static rendering) sizes the arc so its
  // visible bounding box and any text readout fit the widget, then centers it.
  const { sweepRad, startAngleDeg: startAngleDegFinal } = sweepToAngles(sweep)
  const readoutValue = center && "readout" in center ? center.readout.value : undefined
  const captionLines = gaugeCenterCaptionLines(center)
  const scaleLabels = useMemo(
    () => gaugeAnnotations
      .filter((ann) => ann.type === "gauge-label")
      .map((ann) => ({ fraction: (ann.value - min) / range, text: String(ann.label) })),
    [gaugeAnnotations, min, range]
  )
  const layout = useMemo(() => computeGaugeLayout({
    width: layoutWidth,
    height: layoutHeight,
    sweep,
    arcWidth,
    readout: readoutValue != null ? { value: readoutValue, captionLines } : null,
    needle: showNeedle,
    scaleLabels,
    // The frame reserves this strip for any title (see reserveFrameChromeMargin).
    topInset: title ? MIN_TITLE_TOP_MARGIN : 0,
  }), [layoutWidth, layoutHeight, sweep, arcWidth, readoutValue, captionLines, showNeedle, scaleLabels, title])
  const { radius, innerRadius, readoutOffset } = layout

  const centerEl = useMemo(
    () => renderGaugeCenter(center, { min, max, radius, innerRadius, offsetY: readoutOffset }),
    [center, min, max, radius, innerRadius, readoutOffset]
  )

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
    // Length scales with innerRadius so compact gauges retain a visible needle.
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
  }, [showNeedle, startAngleDegFinal, pct, sweepRad, innerRadius, radius, needleColor])

  // Custom SVG annotation rule for gauge-specific annotations
  const svgAnnotationRules = useMemo(() => {
    return (ann: Datum, index: number, context: Datum) => {
      if (ann.type === "gauge-needle") {
        const cx = (context.width || layoutWidth) / 2
        const cy = (context.height || layoutHeight) / 2
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
        const cx = (context.width || layoutWidth) / 2
        const cy = (context.height || layoutHeight) / 2
        // Radial tick mark spanning the arc band — 1px past each edge so it
        // reads as 2px wider than the arc total.
        const markInner = innerRadius - 1
        const markOuter = radius + 1
        const mx1 = Math.cos(labelAngle) * markInner
        const my1 = Math.sin(labelAngle) * markInner
        const mx2 = Math.cos(labelAngle) * markOuter
        const my2 = Math.sin(labelAngle) * markOuter
        // Text sits outside the arc, aligned by the mark's clock position;
        // computeGaugeLayout reserves room for it.
        const labelR = radius + GAUGE_LABEL_OFFSET
        const lx = Math.cos(labelAngle) * labelR
        const ly = Math.sin(labelAngle) * labelR
        const { textAnchor, dominantBaseline } = gaugeScaleLabelAlignment(labelAngle)
        return (
          <g key={`gauge-label-${index}`} transform={`translate(${cx},${cy})`}>
            <line
              x1={mx1} y1={my1} x2={mx2} y2={my2}
              stroke="var(--semiotic-border, #ccc)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <text
              x={lx} y={ly}
              textAnchor={textAnchor} dominantBaseline={dominantBaseline}
              fill="var(--semiotic-text-secondary, #666)"
              fontSize={GAUGE_LABEL_FONT_SIZE}
              style={{
                userSelect: "none",
                fontSize: "var(--semiotic-gauge-label-font-size, 10px)",
              }}
            >
              {ann.label}
            </text>
          </g>
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
        const cx = (context.width || layoutWidth) / 2
        const cy = (context.height || layoutHeight) / 2
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
  }, [layoutWidth, layoutHeight, min, range, startAngleDegFinal, sweepRad, innerRadius, radius])

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
            Current: {valueFormat ? valueFormat(clampedValue) : Math.round(clampedValue)}
          </div>
          {!isFill && <div style={{ fontSize: "0.85em", color: "var(--semiotic-text-secondary, #666)" }}>
            Remaining: {valueFormat ? valueFormat(max - clampedValue) : Math.round(max - clampedValue)}
          </div>}
        </div>
      )
    }
  }, [clampedValue, max, valueFormat])

  const loadingEl = renderLoadingState(props.loading, width, height, props.loadingContent, props)
  const emptyEl = !loadingEl
    ? renderEmptyState(Number.isFinite(value) ? [{ value }] : [], width, height, props.emptyContent, props)
    : null

  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl
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
    pieceStyle: interactivePieceStyle,
    innerRadius,
    startAngle: startAngleDegFinal,
    sweepAngle: sweep,
    // Flow through to the pie scene builder + renderers. Gradient gauges
    // render the band as one wedge carrying `_gradientBand.colors`; the
    // wedge renderer uses its rounded outline (from this cornerRadius +
    // roundedEnds) as a clip mask and paints unrounded slices inside.
    ...(cornerRadius != null && { cornerRadius }),
    centerContent: centerEl,
    size: [layoutWidth, layoutHeight],
    maxDevicePixelRatio: props.maxDevicePixelRatio,
    margin: layout.margin,
    enableHover: resolved.enableHover,
    showAxes: false,
    showCategoryTicks: false,
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...buildCustomBehaviorProps({
      linkedHover: props.linkedHover,
      selection: props.selection,
      onObservation: props.onObservation,
      onClick: props.onClick,
      hoverRadius: props.hoverRadius,
      hoverHighlight: props.hoverHighlight,
      mobileInteraction: resolved.mobileInteraction,
      customHoverBehavior,
      customClickBehavior,
    }),
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

  const frame = <StreamOrdinalFrame ref={frameRef} {...streamProps} />
  if (!isResponsive) return frame
  return (
    <div
      ref={responsiveHostRef}
      data-semiotic-gauge-responsive-host="true"
      style={{
        position: "relative",
        width: props.responsiveWidth ? "100%" : layoutWidth,
        height: props.responsiveHeight ? "100%" : layoutHeight,
        // Let a flex parent shrink the host below the frame it last measured.
        minWidth: 0,
        minHeight: 0,
      }}
    >
      {frame}
    </div>
  )
}), "GaugeChart", GAUGE_CHART_SIZE) as unknown as {
  (props: GaugeChartProps & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
