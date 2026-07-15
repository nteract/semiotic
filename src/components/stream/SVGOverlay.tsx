"use client"
import type { Datum } from "../charts/shared/datumTypes"
import * as React from "react"
import { useMemo, useRef, useEffect } from "react"
import type { StreamScales, MarginalGraphicsConfig, XYFrameAxisConfig } from "./types"
import type { AnnotationContext } from "../realtime/types"
import type { ReactNode } from "react"
import type { LegendGroup, GradientLegendConfig, LegendLayout } from "../types/legendTypes"
import { renderLegendFromConfig } from "./legendRenderer"
import { MarginalGraphics, normalizeMarginalConfig } from "./MarginalGraphics"
import { createDefaultAnnotationRules, renderAnnotationPass } from "../charts/shared/annotationRules"
import { annotationLayout, type AutoPlaceAnnotations } from "../recipes/annotationLayout"
import { useCrosshairPosition, unlockCrosshair } from "../store/LinkedCrosshairStore"
import { isTimeLandmark } from "./hitTestUtils"
import { ticksForMode } from "../charts/shared/axisExtent"
import type { OnObservationCallback } from "../store/ObservationStore"
import {
  useAnnotationActivationOptions,
  type OnAnnotationActivateCallback
} from "../charts/shared/annotationActivation"
import {
  jaggedBaselinePath,
  resolveGridDash,
  resolveHorizontalTickAnchor,
  resolveVerticalTickBaseline,
  tickPixelExtent
} from "./svgOverlayUtils"

// ── Axis config ───────────────────────────────────────────────────────────
//
// Canonical type lives in `stream/types.ts` as `XYFrameAxisConfig` so
// `StreamXYFrameProps.axes[i]` can reference the full shape (including
// the newer `tickAnchor`, `landmarkTicks`, `autoRotate`, `gridStyle`,
// `includeMax` fields) without the type drifting between the frame
// surface and the SVG overlay. Re-exported here under the original
// name `AxisConfig` for backwards-compatibility with any internal
// callers that import it from `SVGOverlay`.
export type AxisConfig = XYFrameAxisConfig

interface SVGOverlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  scales: StreamScales | null

  // Axes
  showAxes?: boolean
  axes?: AxisConfig[]
  xLabel?: string
  yLabel?: string
  /** Label for the right Y axis (dual-axis charts) */
  yLabelRight?: string
  xFormat?: (d: number | Date | string, index?: number, allTicks?: number[]) => string | ReactNode
  yFormat?: (d: number | Date | string) => string | ReactNode
  /** Axis extent mode. "nice" (default) uses d3-scale's rounded
   *  tick generator — labels stay round but the first/last tick
   *  may sit inside the data domain. "exact" pins the first and
   *  last tick to the actual data min and max with equidistant
   *  intermediate ticks. Applies to both x and y axes. */
  axisExtent?: import("../charts/shared/axisExtent").AxisExtentMode

  // Grid
  showGrid?: boolean

  // Title
  title?: string | ReactNode

  // Legend
  legend?: ReactNode | { legendGroups: LegendGroup[] } | { gradient: GradientLegendConfig }
  /** Callback when hovering a legend item */
  legendHoverBehavior?: (item: { label: string } | null) => void
  /** Callback when clicking a legend item */
  legendClickBehavior?: (item: { label: string }) => void
  /** Currently highlighted category label (for hover dimming) */
  legendHighlightedCategory?: string | null
  /** Set of isolated category labels (for click isolation) */
  legendIsolatedCategories?: Set<string>
  /** Legend position relative to chart area */
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout

  // Foreground graphics (rendered on top in SVG overlay)
  foregroundGraphics?: ReactNode

  // Marginal graphics
  marginalGraphics?: MarginalGraphicsConfig
  xValues?: number[]
  yValues?: number[]

  // Annotations
  annotations?: Datum[]
  onAnnotationActivate?: OnAnnotationActivateCallback
  onObservation?: OnObservationCallback
  chartId?: string
  chartType?: string
  autoPlaceAnnotations?: AutoPlaceAnnotations
  svgAnnotationRules?: (
    annotation: Datum,
    index: number,
    context: AnnotationContext
  ) => ReactNode
  annotationFrame?: number

  // Annotation context enrichment
  xAccessor?: string
  yAccessor?: string
  annotationData?: Datum[]
  pointNodes?: { pointId?: string; x: number; y: number; r: number }[]
  /** Curve interpolation type for envelope annotations */
  curve?: string

  /** When true, grid lines and axis baselines are skipped (rendered by SVGUnderlay instead) */
  underlayRendered?: boolean
  /**
   * Hint from the frame about whether the canvas is painting an opaque
   * background that will hide `SVGUnderlay`. When `true`, this overlay
   * also renders grid + baselines (otherwise nothing shows in the CSR
   * steady state — the canvas covers the underlay copy). When `false`
   * — e.g. `background="transparent"` or a `backgroundGraphics` SVG
   * sibling — the underlay is visible and we skip the overlay copy to
   * avoid the doubled / slightly-darker stroke. Defaults to `true` so
   * existing callers behave the same as the post-jagged-base-fix
   * baseline.
   */
  canvasObscuresUnderlay?: boolean

  /** Name of the linked crosshair store entry to read */
  linkedCrosshairName?: string
  /** Source chart ID — crosshair line is suppressed on the source to avoid double rendering */
  linkedCrosshairSourceId?: string

  children?: ReactNode
}

// ── SVGUnderlay ─────────────────────────────────────────────────────────
// Renders ONLY grid lines and axis baseline lines behind the canvas.

interface SVGUnderlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  scales: StreamScales | null
  showAxes?: boolean
  axes?: AxisConfig[]
  showGrid?: boolean
  xFormat?: (d: number | Date | string, index?: number, allTicks?: number[]) => string | ReactNode
  yFormat?: (d: number | Date | string) => string | ReactNode
  axisExtent?: import("../charts/shared/axisExtent").AxisExtentMode
}

export function SVGUnderlay(props: SVGUnderlayProps) {
  const {
    width,
    height,
    totalWidth,
    totalHeight,
    margin,
    scales,
    showAxes,
    axes,
    showGrid,
    xFormat,
    yFormat,
    axisExtent
  } = props
  const xTicks = useMemo(() => {
    if (!scales) return []
    const bottomAxis = axes?.find(a => a.orient === "bottom")
    const fmt = bottomAxis?.tickFormat || xFormat || defaultTickFormat
    const maxFit = Math.max(2, Math.floor(width / 70))
    const requested = bottomAxis?.ticks ?? 5
    // Explicit `tickValues` bypasses both d3's "nice" generator and
    // `axisExtent: "exact"` — the caller has hand-picked the positions
    // and we honor them verbatim. Same contract as the ordinal frame's
    // `rTickValues`. Pixel-distance filtering downstream still drops
    // overlapping labels.
    // Exact mode (without explicit values) honors the requested count
    // rather than clamping it to `maxFit`; floor at 2 because
    // `equidistantTicks` needs both endpoints.
    const tickCount = axisExtent === "exact" ? Math.max(2, requested) : Math.min(requested, maxFit)
    const rawTicks = bottomAxis?.tickValues ?? ticksForMode(scales.x, tickCount, axisExtent)
    const rawValues = rawTicks.map(v => v.valueOf())
    const candidates = rawTicks.map((v, i) => ({
      value: v,
      pixel: scales.x(v),
      label: fmt(v, i, rawValues)
    }))
    // Estimate the widest label and use that as minimum spacing so labels
    // (which are center-anchored) don't overlap.
    const maxLabelWidth = candidates.reduce((max, c) => Math.max(max, typeof c.label === "string" ? c.label.length * 6.5 : typeof c.label === "number" ? String(c.label).length * 6.5 : 60), 0)
    const minPx = Math.max(55, maxLabelWidth + 8)
    return filterTicksByPixelDistance(candidates, minPx)
  }, [scales, axes, xFormat, width, axisExtent])

  const yTicks = useMemo(() => {
    if (!scales) return []
    const leftAxis = axes?.find(a => a.orient === "left")
    const fmt = leftAxis?.tickFormat || yFormat || defaultTickFormat
    const maxFit = Math.max(2, Math.floor(height / 30))
    const requested = leftAxis?.ticks ?? 5
    const tickCount = axisExtent === "exact" ? Math.max(2, requested) : Math.min(requested, maxFit)
    // Explicit `tickValues` wins over generated ticks — see xTicks comment.
    const rawTicks = leftAxis?.tickValues ?? ticksForMode(scales.y, tickCount, axisExtent)
    const candidates = rawTicks.map(v => ({
      value: v,
      pixel: scales.y(v),
      label: fmt(v)
    }))
    return filterTicksByPixelDistance(candidates, 22)
  }, [scales, axes, yFormat, height, axisExtent])

  const hasGrid = showGrid && scales
  const hasBaselines = showAxes && scales

  if (!hasGrid && !hasBaselines) return null

  const bottomAxis = axes?.find(a => a.orient === "bottom")
  const leftAxis = axes?.find(a => a.orient === "left")
  const showBottomBaseline = hasBaselines && (bottomAxis ? bottomAxis.baseline !== false : true)
  const showLeftBaseline = hasBaselines && (leftAxis ? leftAxis.baseline !== false : true)
  const bottomJagged = bottomAxis?.jaggedBase || false
  const leftJagged = leftAxis?.jaggedBase || false
  const axisStroke = "var(--semiotic-border, #ccc)"

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none"
      }}
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* Grid lines */}
        {hasGrid && (() => {
          const bottomGridStyle = resolveGridDash(axes?.find(a => a.orient === "bottom")?.gridStyle)
          const leftGridStyle = resolveGridDash(axes?.find(a => a.orient === "left")?.gridStyle)
          return (
          <g className="stream-grid">
            {xTicks.map((tick, i) => (
              <line
                key={`xgrid-${i}`}
                x1={tick.pixel}
                y1={0}
                x2={tick.pixel}
                y2={height}
                stroke="var(--semiotic-grid, #e0e0e0)"
                strokeWidth={1}
                strokeDasharray={bottomGridStyle}
              />
            ))}
            {yTicks.map((tick, i) => (
              <line
                key={`ygrid-${i}`}
                x1={0}
                y1={tick.pixel}
                x2={width}
                y2={tick.pixel}
                stroke="var(--semiotic-grid, #e0e0e0)"
                strokeWidth={1}
                strokeDasharray={leftGridStyle}
              />
            ))}
          </g>
          )
        })()}

        {/* Axis baselines */}
        {showBottomBaseline && !bottomJagged && (
          <line x1={0} y1={height} x2={width} y2={height} stroke={axisStroke} strokeWidth={1}  />
        )}
        {bottomJagged && (
          <path d={jaggedBaselinePath("bottom", width, height)} fill="none" stroke={axisStroke} strokeWidth={1} />
        )}
        {showLeftBaseline && !leftJagged && (
          <line x1={0} y1={0} x2={0} y2={height} stroke={axisStroke} strokeWidth={1}  />
        )}
        {leftJagged && (
          <path d={jaggedBaselinePath("left", width, height)} fill="none" stroke={axisStroke} strokeWidth={1} />
        )}
      </g>
    </svg>
  )
}


function defaultTickFormat(v: string | number | Date, _index?: number, _allTicks?: number[]): string {
  if (v instanceof Date) {
    return `${v.toLocaleString("en", { month: "short" })} ${v.getDate()}`
  }
  if (typeof v === "number") return String(Math.round(v * 100) / 100)
  return String(v)
}

/** Greedily filter ticks so consecutive labels are at least `minPx` apart.
 *  Always keeps the first and last tick. */
// `value` is widened to `number | Date` so this helper accepts the
// candidates produced for both linear scales and time-scale axes (the
// latter emit Date instances; only `pixel` is used for distance math).
function filterTicksByPixelDistance<T extends { value: number | Date; pixel: number; label: string | ReactNode }>(
  ticks: T[],
  minPx: number
): T[] {
  if (ticks.length <= 2) return ticks
  const result = [ticks[0]]
  for (let i = 1; i < ticks.length - 1; i++) {
    if (Math.abs(ticks[i].pixel - result[result.length - 1].pixel) >= minPx) {
      result.push(ticks[i])
    }
  }
  const last = ticks[ticks.length - 1]
  // Always keep the last tick (axis endpoint); if too close, replace the previous intermediate tick
  if (Math.abs(last.pixel - result[result.length - 1].pixel) >= minPx) {
    result.push(last)
  } else {
    result[result.length - 1] = last
  }
  return result
}

export function SVGOverlay(props: SVGOverlayProps) {
  const {
    width,
    height,
    totalWidth,
    totalHeight,
    margin,
    scales,
    showAxes,
    axes,
    xLabel,
    yLabel,
    yLabelRight,
    xFormat,
    yFormat,
    axisExtent,
    showGrid,
    title,
    legend,
    legendHoverBehavior,
    legendClickBehavior,
    legendHighlightedCategory,
    legendIsolatedCategories,
    legendPosition = "right",
    legendLayout,
    foregroundGraphics,
    marginalGraphics,
    xValues,
    yValues,
    annotations,
    onAnnotationActivate,
    onObservation,
    chartId,
    chartType,
    autoPlaceAnnotations,
    svgAnnotationRules,
    annotationFrame: _annotationFrame,
    xAccessor: annXAccessor,
    yAccessor: annYAccessor,
    annotationData,
    pointNodes,
    curve: annCurve,
    underlayRendered,
    canvasObscuresUnderlay = true,
    linkedCrosshairName,
    linkedCrosshairSourceId,
    children
  } = props
  const annotationActivation = useAnnotationActivationOptions({
    onAnnotationActivate,
    onObservation,
    chartId,
    chartType
  })

  // Generate axis ticks — use per-axis config, auto-reduce to prevent overlap.
  // After generating candidate ticks, filter by minimum pixel distance so labels
  // never collide — critical for log scales where ticks cluster non-uniformly.
  const xTicks = useMemo(() => {
    if (!showAxes || !scales) return []
    const bottomAxis = axes?.find(a => a.orient === "bottom")
    const fmt = bottomAxis?.tickFormat || xFormat || defaultTickFormat
    const maxFit = Math.max(2, Math.floor(width / 70))
    const requested = bottomAxis?.ticks ?? 5
    // Exact-mode contract: honor the requested count verbatim. The
    // `maxFit` clamp would silently collapse "give me exactly 7 ticks"
    // to whatever the width permits — pixel-distance filtering below
    // still drops physically-overlapping labels, but we don't pre-clamp
    // away an explicit count.
    const tickCount = axisExtent === "exact" ? Math.max(2, requested) : Math.min(requested, maxFit)
    // Explicit `tickValues` wins over generated ticks (and skips
    // `includeMax` below since the user already locked in the set).
    const rawTicks = bottomAxis?.tickValues ?? ticksForMode(scales.x, tickCount, axisExtent)
    const rawValues = rawTicks.map(v => v.valueOf())
    const candidates = rawTicks.map((v, i) => ({
      value: v,
      pixel: scales.x(v),
      label: fmt(v, i, rawValues)
    }))
    const maxLabelWidth = candidates.reduce((max, c) => Math.max(max, typeof c.label === "string" ? c.label.length * 6.5 : typeof c.label === "number" ? String(c.label).length * 6.5 : 60), 0)
    // When autoRotate is enabled, labels will be angled so they need much less horizontal space
    const minPx = bottomAxis?.autoRotate
      ? Math.max(20, Math.min(maxLabelWidth + 8, 55))
      : Math.max(55, maxLabelWidth + 8)
    let filtered = filterTicksByPixelDistance(candidates, minPx)
    // Deduplicate adjacent identical labels (e.g. low-resolution date formats)
    if (filtered.length > 1) {
      filtered = filtered.filter((t, i) => i === 0 || String(t.label) !== String(filtered[i - 1].label))
    }
    // includeMax: ensure the domain max is represented as a tick.
    // In exact-mode the last tick is always pinned to the domain max
    // already, so this branch is a no-op there. Skip it entirely when
    // the user supplied explicit `tickValues` — they've already picked
    // the set they want, and appending would violate that contract.
    if (bottomAxis?.includeMax && filtered.length > 0 && axisExtent !== "exact" && !bottomAxis?.tickValues) {
      const domain = scales.x.domain() as [number, number]
      const domainMax = domain[1]
      const maxPx = scales.x(domainMax)
      const lastPx = filtered[filtered.length - 1].pixel
      if (Math.abs(maxPx - lastPx) > 1) {
        const maxLabel = fmt(domainMax, filtered.length, rawValues)
        if (maxPx - lastPx < minPx && filtered.length > 1) filtered = filtered.slice(0, -1)
        filtered.push({ value: domainMax, pixel: maxPx, label: maxLabel })
      }
    }
    return filtered
  }, [showAxes, scales, axes, xFormat, width, axisExtent])

  const yTicks = useMemo(() => {
    if (!showAxes || !scales) return []
    const leftAxis = axes?.find(a => a.orient === "left")
    const fmt = leftAxis?.tickFormat || yFormat || defaultTickFormat
    const maxFit = Math.max(2, Math.floor(height / 30))
    const requested = leftAxis?.ticks ?? 5
    const tickCount = axisExtent === "exact" ? Math.max(2, requested) : Math.min(requested, maxFit)
    const rawYTicks = leftAxis?.tickValues ?? ticksForMode(scales.y, tickCount, axisExtent)
    const candidates = rawYTicks.map(v => ({
      value: v,
      pixel: scales.y(v),
      label: fmt(v)
    }))
    let filtered = filterTicksByPixelDistance(candidates, 22)
    // Deduplicate adjacent identical labels
    if (filtered.length > 1) {
      filtered = filtered.filter((t, i) => i === 0 || String(t.label) !== String(filtered[i - 1].label))
    }
    if (leftAxis?.includeMax && filtered.length > 0 && axisExtent !== "exact" && !leftAxis?.tickValues) {
      const domain = scales.y.domain() as [number, number]
      const domainMax = domain[1]
      const maxPx = scales.y(domainMax)
      // Y axis is inverted (domain max = top = smallest pixel). Compare with
      // the tick closest to the top (first after filtering, since ticks are
      // sorted by ascending domain value but descending pixel).
      const nearestPx = filtered[filtered.length - 1].pixel
      if (Math.abs(maxPx - nearestPx) > 1) {
        const maxLabel = fmt(domainMax)
        if (Math.abs(maxPx - nearestPx) < 22 && filtered.length > 1) filtered = filtered.slice(0, -1)
        filtered.push({ value: domainMax, pixel: maxPx, label: maxLabel })
      }
    }
    return filtered
  }, [showAxes, scales, axes, yFormat, height, axisExtent])

  // Right Y axis ticks — same pixel positions as left but different labels
  const yTicksRight = useMemo(() => {
    if (!showAxes || !scales) return []
    const rightAxis = axes?.find(a => a.orient === "right")
    if (!rightAxis) return []
    const fmt = rightAxis.tickFormat || yFormat || defaultTickFormat
    const maxFit = Math.max(2, Math.floor(height / 30))
    const requested = rightAxis.ticks ?? 5
    const tickCount = axisExtent === "exact" ? Math.max(2, requested) : Math.min(requested, maxFit)
    const rawYTicksRight = rightAxis.tickValues ?? ticksForMode(scales.y, tickCount, axisExtent)
    const candidates = rawYTicksRight.map(v => ({
      value: v,
      pixel: scales.y(v),
      label: fmt(v)
    }))
    return filterTicksByPixelDistance(candidates, 22)
  }, [showAxes, scales, axes, yFormat, height, axisExtent])

  // Persistent cache for sticky annotation positions (survives re-renders)
  const stickyPositionCacheRef = useRef<Map<number, { x: number; y: number }>>(new Map())

  // Clear sticky cache when annotation count changes to avoid mismatched indices.
  // We compare length (not reference) to avoid clearing on every render when
  // callers pass inline annotation arrays.
  const prevAnnotationsLenRef = useRef(annotations?.length ?? 0)
  const currentLen = annotations?.length ?? 0
  if (prevAnnotationsLenRef.current !== currentLen) {
    prevAnnotationsLenRef.current = currentLen
    stickyPositionCacheRef.current = new Map()
  }

  // Render annotations
  const renderedAnnotations = useMemo(() => {
    if (!annotations || annotations.length === 0) return null

    const defaultRules = createDefaultAnnotationRules("xy", annotationActivation)

    const context: AnnotationContext = {
      scales: scales
        ? { x: scales.x, y: scales.y, time: scales.x, value: scales.y }
        : null,
      timeAxis: "x",
      xAccessor: annXAccessor,
      yAccessor: annYAccessor,
      width,
      height,
      data: annotationData,
      frameType: "xy",
      pointNodes,
      curve: annCurve,
      stickyPositionCache: stickyPositionCacheRef.current
    }

    const layoutAnnotations = autoPlaceAnnotations
      ? annotationLayout({
          annotations,
          context,
          ...(typeof autoPlaceAnnotations === "object" ? autoPlaceAnnotations : {}),
        })
      : annotations

    // Dispatch → drop empty renders → apply emphasis hierarchy (shared with the
    // ordinal overlay). Falsy-node filtering matches the prior `.filter(Boolean)`.
    return renderAnnotationPass(layoutAnnotations, defaultRules, svgAnnotationRules, context)
  }, [annotations, autoPlaceAnnotations, svgAnnotationRules, width, height, annXAccessor, annYAccessor, annotationData, scales, pointNodes, annCurve, annotationActivation])

  // Linked crosshair from coordinate-based hover sync
  const crosshairPos = useCrosshairPosition(linkedCrosshairName)

  // Escape key unlocks a locked crosshair
  useEffect(() => {
    if (!crosshairPos?.locked || !linkedCrosshairName) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") unlockCrosshair(linkedCrosshairName)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [crosshairPos?.locked, linkedCrosshairName])

  const hasContent = showAxes || title || legend || foregroundGraphics || marginalGraphics || (renderedAnnotations && renderedAnnotations.length > 0) || showGrid || children || crosshairPos

  if (!hasContent) return null

  return (
    <svg
      role="img"
      width={totalWidth}
      height={totalHeight}
      overflow="visible"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        overflow: "visible"
      }}
    >
      <title>{typeof title === "string" ? title : "XY Chart"}</title>
      <desc>{typeof title === "string" ? `${title} — XY data visualization` : "XY data visualization"}</desc>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* Grid lines.
         *
         * Three states:
         *  • No `underlayRendered` — overlay is the only source, render here.
         *  • `underlayRendered` AND canvas paints opaquely — underlay is
         *    hidden by the canvas, so we still render here.
         *  • `underlayRendered` AND canvas is transparent (the
         *    `background="transparent"` / `backgroundGraphics` cases) —
         *    the underlay shows through, so we skip the overlay copy
         *    to avoid the doubled / slightly-darker stroke from two
         *    SVG paths overlaid pixel-for-pixel. Skipping the overlay
         *    copy was the cause of a "jagged baseline disappeared"
         *    regression on `/features/axes` BEFORE this gate considered
         *    canvas opacity; pinning the canvas-opacity hint via
         *    `canvasObscuresUnderlay` keeps both regressions out of
         *    play simultaneously. */}
        {showGrid && scales && (!underlayRendered || canvasObscuresUnderlay) && (() => {
          const bottomGridStyle = resolveGridDash(axes?.find(a => a.orient === "bottom")?.gridStyle)
          const leftGridStyle = resolveGridDash(axes?.find(a => a.orient === "left")?.gridStyle)
          return (
          <g className="stream-grid">
            {xTicks.map((tick, i) => (
              <line
                key={`xgrid-${i}`}
                x1={tick.pixel}
                y1={0}
                x2={tick.pixel}
                y2={height}
                stroke="var(--semiotic-grid, #e0e0e0)"
                strokeWidth={1}
                strokeDasharray={bottomGridStyle}
              />
            ))}
            {yTicks.map((tick, i) => (
              <line
                key={`ygrid-${i}`}
                x1={0}
                y1={tick.pixel}
                x2={width}
                y2={tick.pixel}
                stroke="var(--semiotic-grid, #e0e0e0)"
                strokeWidth={1}
                strokeDasharray={leftGridStyle}
              />
            ))}
          </g>
          )
        })()}

        {/* Axes */}
        {showAxes && scales && (() => {
          // Resolve per-axis config from the axes array
          const leftAxis = axes?.find(a => a.orient === "left")
          const bottomAxis = axes?.find(a => a.orient === "bottom")
          const showLeftBaseline = leftAxis ? leftAxis.baseline !== false : true
          const showBottomBaseline = bottomAxis ? bottomAxis.baseline !== false : true
          const leftJagged = leftAxis?.jaggedBase || false
          const bottomJagged = bottomAxis?.jaggedBase || false
          const bottomLandmark = bottomAxis?.landmarkTicks
          const leftLandmark = leftAxis?.landmarkTicks

          const axisStroke = "var(--semiotic-border, #ccc)"
          const tickColor = "var(--semiotic-text-secondary, var(--semiotic-text, #666))"
          const labelColor = "var(--semiotic-text, #333)"

          // Rotate bottom-axis labels 45° when autoRotate is set AND labels would overlap horizontally
          const shouldRotateBottom = !!bottomAxis?.autoRotate && xTicks.length > 1 && (() => {
            const avgSpacing = width / Math.max(xTicks.length - 1, 1)
            const maxLabelW = xTicks.reduce((max, t) => Math.max(max, typeof t.label === "string" ? t.label.length * 6.5 : 60), 0)
            return avgSpacing < maxLabelW + 8
          })()
          const bottomTickLabelY = shouldRotateBottom ? 12 : 18
          const bottomAxisLabelY = height + (shouldRotateBottom ? 58 : 40)

          // Per-axis font-size resolution. Inline `style` references the
          // CSS var with the literal default as the fallback — consumers
          // override the var on any DOM ancestor and the cascade carries
          // through. Landmark ticks get a +1px bump via calc().
          const tickFontStyle = { fontSize: "var(--semiotic-tick-font-size, 12px)" }
          const tickFontStyleLandmark = { fontSize: "calc(var(--semiotic-tick-font-size, 12px) + 1px)" }
          const axisLabelFontStyle = { fontSize: "var(--semiotic-axis-label-font-size, 12px)" }
          const bottomTickAnchorMode = bottomAxis?.tickAnchor
          const leftTickAnchorMode = leftAxis?.tickAnchor
          // Pre-compute the edge pixels for each axis so the tick-render
          // loop can identify the leftmost/rightmost or topmost/bottommost
          // entry without depending on array index — y ticks are in
          // ascending value order but pixel order is inverted, and
          // streaming x scales can also be reversed by `arrowOfTime`.
          const xPixelExtent = tickPixelExtent(xTicks)
          const yPixelExtent = tickPixelExtent(yTicks)
          return (
          <g className="stream-axes" style={{ fontFamily: "var(--semiotic-font-family, sans-serif)" }}>
            <g className="semiotic-axis semiotic-axis-bottom" data-orient="bottom">
            {/* X axis baseline. Same three-state gate as the grid block
                above: render unless the underlay is already showing
                through a transparent canvas. */}
            {(!underlayRendered || canvasObscuresUnderlay) && showBottomBaseline && !bottomJagged && (
              <line x1={0} y1={height} x2={width} y2={height} stroke={axisStroke} strokeWidth={1}  />
            )}
            {(!underlayRendered || canvasObscuresUnderlay) && bottomJagged && (
              <path d={jaggedBaselinePath("bottom", width, height)} fill="none" stroke={axisStroke} strokeWidth={1} />
            )}
            {xTicks.map((tick, i) => {
              const isLandmark = bottomLandmark
                ? typeof bottomLandmark === "function"
                  ? bottomLandmark(tick.value, i)
                  : isTimeLandmark(tick.value, i > 0 ? xTicks[i - 1].value : undefined)
                : false
              return (
              <g key={`xtick-${i}`} transform={`translate(${tick.pixel},${height})`}>
                <line y2={5} stroke={axisStroke} strokeWidth={1} />
                {typeof tick.label === "string" || typeof tick.label === "number" ? (
                  <text
                    y={bottomTickLabelY}
                    textAnchor={shouldRotateBottom ? "end" : resolveHorizontalTickAnchor(
                      bottomTickAnchorMode,
                      tick.pixel === xPixelExtent.min,
                      tick.pixel === xPixelExtent.max,
                    )}
                    fontWeight={isLandmark ? 600 : 400}
                    fill={tickColor}
                    className="semiotic-axis-tick"
                    style={{ userSelect: "none", ...(isLandmark ? tickFontStyleLandmark : tickFontStyle) }}
                    transform={shouldRotateBottom ? "rotate(-45)" : undefined}
                  >
                    {tick.label}
                  </text>
                ) : (
                  <foreignObject x={-30} y={6} width={60} height={24} style={{ overflow: "visible" }}>
                    <div style={{ textAlign: "center", userSelect: "none", ...tickFontStyle }}>{tick.label}</div>
                  </foreignObject>
                )}
              </g>
              )
            })}
            {xLabel && (
              <text
                x={width / 2}
                y={bottomAxisLabelY}
                textAnchor="middle"
                fill={labelColor}
                className="semiotic-axis-label"
                style={{ userSelect: "none", ...axisLabelFontStyle }}
              >
                {xLabel}
              </text>
            )}
            </g>

            <g className="semiotic-axis semiotic-axis-left" data-orient="left">
            {/* Y axis baseline. Same gate as the X baseline above. */}
            {(!underlayRendered || canvasObscuresUnderlay) && showLeftBaseline && !leftJagged && (
              <line x1={0} y1={0} x2={0} y2={height} stroke={axisStroke} strokeWidth={1}  />
            )}
            {(!underlayRendered || canvasObscuresUnderlay) && leftJagged && (
              <path d={jaggedBaselinePath("left", width, height)} fill="none" stroke={axisStroke} strokeWidth={1} />
            )}
            {yTicks.map((tick, i) => {
              const isLandmark = leftLandmark
                ? typeof leftLandmark === "function"
                  ? leftLandmark(tick.value, i)
                  : isTimeLandmark(tick.value, i > 0 ? yTicks[i - 1].value : undefined)
                : false
              return (
              <g key={`ytick-${i}`} transform={`translate(0,${tick.pixel})`}>
                <line x2={-5} stroke={axisStroke} strokeWidth={1} />
                {typeof tick.label === "string" || typeof tick.label === "number" ? (
                  <text
                    x={-8}
                    textAnchor="end"
                    dominantBaseline={resolveVerticalTickBaseline(
                      leftTickAnchorMode,
                      tick.pixel === yPixelExtent.min,
                      tick.pixel === yPixelExtent.max,
                    )}
                    fontWeight={isLandmark ? 600 : 400}
                    fill={tickColor}
                    className="semiotic-axis-tick"
                    style={{ userSelect: "none", ...(isLandmark ? tickFontStyleLandmark : tickFontStyle) }}
                  >
                    {tick.label}
                  </text>
                ) : (
                  <foreignObject x={-68} y={-12} width={60} height={24} style={{ overflow: "visible" }}>
                    <div style={{ textAlign: "right", userSelect: "none", ...tickFontStyle }}>{tick.label}</div>
                  </foreignObject>
                )}
              </g>
              )
            })}
            {(() => {
              const leftLabel = leftAxis?.label || yLabel
              return leftLabel ? (
              <text
                x={-margin.left + 15}
                y={height / 2}
                textAnchor="middle"
                fill={labelColor}
                transform={`rotate(-90, ${-margin.left + 15}, ${height / 2})`}
                className="semiotic-axis-label"
                style={{ userSelect: "none", ...axisLabelFontStyle }}
              >
                {leftLabel}
              </text>
              ) : null
            })()}
            </g>

            {/* Right Y axis */}
            {(() => {
              const rightAxis = axes?.find(a => a.orient === "right")
              if (!rightAxis || yTicksRight.length === 0) return null
              const showRightBaseline = rightAxis.baseline !== false
              const rightLandmark = rightAxis.landmarkTicks
              const rightLabel = rightAxis.label || yLabelRight
              const rightTickAnchorMode = rightAxis.tickAnchor
              const yRightPixelExtent = tickPixelExtent(yTicksRight)
              return (
                <g className="semiotic-axis semiotic-axis-right" data-orient="right">
                  {showRightBaseline && (
                    <line x1={width} y1={0} x2={width} y2={height} stroke={axisStroke} strokeWidth={1} />
                  )}
                  {yTicksRight.map((tick, i) => {
                    const isLandmark = rightLandmark
                      ? typeof rightLandmark === "function"
                        ? rightLandmark(tick.value, i)
                        : isTimeLandmark(tick.value, i > 0 ? yTicksRight[i - 1].value : undefined)
                      : false
                    return (
                    <g key={`ytick-r-${i}`} transform={`translate(${width},${tick.pixel})`}>
                      <line x2={5} stroke={axisStroke} strokeWidth={1} />
                      {typeof tick.label === "string" || typeof tick.label === "number" ? (
                        <text
                          x={8}
                          textAnchor="start"
                          dominantBaseline={resolveVerticalTickBaseline(
                            rightTickAnchorMode,
                            tick.pixel === yRightPixelExtent.min,
                            tick.pixel === yRightPixelExtent.max,
                          )}
                          fontWeight={isLandmark ? 600 : 400}
                          fill={tickColor}
                          className="semiotic-axis-tick"
                          style={{ userSelect: "none", ...(isLandmark ? tickFontStyleLandmark : tickFontStyle) }}
                        >
                          {tick.label}
                        </text>
                      ) : (
                        <foreignObject x={8} y={-12} width={60} height={24} style={{ overflow: "visible" }}>
                          <div style={{ textAlign: "left", userSelect: "none", ...tickFontStyle }}>{tick.label}</div>
                        </foreignObject>
                      )}
                    </g>
                    )
                  })}
                  {rightLabel && (
                    <text
                      x={width + margin.right - 15}
                      y={height / 2}
                      textAnchor="middle"
                      fill={labelColor}
                      transform={`rotate(90, ${width + margin.right - 15}, ${height / 2})`}
                      className="semiotic-axis-label"
                      style={{ userSelect: "none", ...axisLabelFontStyle }}
                    >
                      {rightLabel}
                    </text>
                  )}
                </g>
              )
            })()}
          </g>
          )
        })()}

        {/* Annotations */}
        {renderedAnnotations}

        {/* Marginal graphics */}
        {marginalGraphics && scales && xValues && yValues && (
          <>
            {marginalGraphics.top && (
              <g transform={`translate(0, 0)`}>
                <MarginalGraphics
                  orient="top"
                  config={normalizeMarginalConfig(marginalGraphics.top)}
                  values={xValues}
                  scale={scales.x}
                  size={margin.top}
                  length={width}
                />
              </g>
            )}
            {marginalGraphics.bottom && (
              <g transform={`translate(0, ${height})`}>
                <MarginalGraphics
                  orient="bottom"
                  config={normalizeMarginalConfig(marginalGraphics.bottom)}
                  values={xValues}
                  scale={scales.x}
                  size={margin.bottom}
                  length={width}
                />
              </g>
            )}
            {marginalGraphics.left && (
              <g transform={`translate(0, 0)`}>
                <MarginalGraphics
                  orient="left"
                  config={normalizeMarginalConfig(marginalGraphics.left)}
                  values={yValues}
                  scale={scales.y}
                  size={margin.left}
                  length={height}
                />
              </g>
            )}
            {marginalGraphics.right && (
              <g transform={`translate(${width}, 0)`}>
                <MarginalGraphics
                  orient="right"
                  config={normalizeMarginalConfig(marginalGraphics.right)}
                  values={yValues}
                  scale={scales.y}
                  size={margin.right}
                  length={height}
                />
              </g>
            )}
          </>
        )}

        {/* Foreground graphics */}
        {foregroundGraphics}

        {/* Linked crosshair line (coordinate-based hover sync) */}
        {crosshairPos && crosshairPos.sourceId !== linkedCrosshairSourceId && scales?.x && (() => {
          const px = scales.x(crosshairPos.xValue)
          if (px == null || px < 0 || px > width) return null
          const isLocked = crosshairPos.locked
          return (
            <line
              x1={px} y1={0} x2={px} y2={height}
              stroke={isLocked ? "white" : "var(--semiotic-text-secondary, rgba(0,0,0,0.25))"}
              strokeWidth={isLocked ? 1.5 : 1}
              strokeDasharray={isLocked ? "6,3" : "4,4"}
              pointerEvents="none"
            />
          )
        })()}

        {children}
      </g>

      {/* Title */}
      {title && (
        <text
          x={totalWidth / 2}
          y={20}
          textAnchor="middle"
          fontWeight="bold"
          fill="var(--semiotic-text, #333)"
          className="semiotic-chart-title"
          style={{ userSelect: "none", fontSize: "var(--semiotic-title-font-size, 14px)" }}
        >
          {typeof title === "string" ? title : null}
        </text>
      )}

      {/* Legend */}
      {renderLegendFromConfig({
        legend, totalWidth, totalHeight, margin, legendPosition, title,
        legendLayout,
        legendHoverBehavior, legendClickBehavior, legendHighlightedCategory, legendIsolatedCategories,
      })}
    </svg>
  )
}
