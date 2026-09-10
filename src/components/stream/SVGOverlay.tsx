"use client"
import { XYGrid } from "./XYGrid"
import { resolveXYAxes } from "./resolveXYAxes"
import type { Datum } from "../charts/shared/datumTypes"
import * as React from "react"
import { useMemo, useRef, useEffect, useId } from "react"
import type { StreamScales, MarginalGraphicsConfig, XYFrameAxisConfig } from "./types"
import type { AnnotationContext } from "../realtime/types"
import type { ReactNode } from "react"
import type { LegendLayout, LegendValue } from "../types/legendTypes"
import { renderLegendFromConfig } from "./legendRenderer"
import { resolveLegendSideGutter, resolveXYAxisChrome } from "../legendLayout"
import { MarginalGraphicsLazy as MarginalGraphics, normalizeMarginalConfig } from "./MarginalGraphicsLazy"
import { createDefaultAnnotationRules, renderAnnotationPass } from "../charts/shared/annotationRules"
import { annotationLayout, type AutoPlaceAnnotations } from "../recipes/annotationLayout"
import { filterAnnotationsByStatus } from "../charts/shared/annotationStatusFilter"
import { useCrosshairPosition, unlockCrosshair } from "../store/LinkedCrosshairStore"
import { isTimeLandmark } from "./hitTestUtils"
import type { OnObservationCallback } from "../store/ObservationStore"
import {
  useAnnotationActivationOptions,
  type OnAnnotationActivateCallback
} from "../charts/shared/annotationActivation"
import {
  jaggedBaselinePath,
  resolveAxisLineStyle,
  resolveHorizontalTickAnchor,
  resolveVerticalTickBaseline,
  tickPixelExtent
} from "./svgOverlayUtils"
import { generateXYTicks, axisTicksNeedRotation } from "./xyAxisTicks"
import { SVGChartTitle } from "./SVGChartTitle"
import {
  overlayAccessibleDescription,
  overlayAccessibleIds,
  overlayAccessibleTitle
} from "./overlayAccessibleText"

export { SVGUnderlay } from "./SVGUnderlay"

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
  /** Accessible long description; wins over the title-derived `<desc>` suffix. */
  description?: string
  /** Prefix for `<title>`/`<desc>` ids so multiple charts on a page do not collide. */
  idPrefix?: string

  // Legend
  legend?: LegendValue
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
    description,
    idPrefix,
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
  const legendAxisChrome = resolveXYAxisChrome({
    showAxes,
    xLabel,
    yLabel,
    yLabelRight,
    axes,
  })
  const leftSideLegendGutter = resolveLegendSideGutter(
    legendLayout,
    legendAxisChrome.leftAxis,
  )
  const rightSideLegendGutter = resolveLegendSideGutter(
    legendLayout,
    legendAxisChrome.rightAxis,
  )
  const leftAxisLabelMargin =
    legend && legendPosition === "left" && leftSideLegendGutter > 0
      ? leftSideLegendGutter
      : margin.left
  const rightAxisLabelMargin =
    legend && legendPosition === "right" && rightSideLegendGutter > 0
      ? rightSideLegendGutter
      : margin.right

  const xTicks = useMemo(() => {
    if ((!showAxes && !showGrid) || !scales) return []
    const axis = axes?.find(a => a.orient === "bottom") ?? axes?.find(a => a.orient === "top")
    return generateXYTicks({ scale: scales.x, axis, size: width, horizontal: true, format: xFormat, axisExtent })
  }, [showAxes, showGrid, scales, axes, xFormat, width, axisExtent])

  const shouldRotateBottomTicks = useMemo(() => {
    const axis = axes?.find(a => a.orient === "bottom") ?? axes?.find(a => a.orient === "top")
    return Boolean(axis?.autoRotate && axisTicksNeedRotation(xTicks))
  }, [axes, xTicks])

  const yTicks = useMemo(() => {
    if ((!showAxes && !showGrid) || !scales) return []
    const axis = axes?.find(a => a.orient === "left") ?? axes?.find(a => a.orient === "right")
    return generateXYTicks({ scale: scales.y, axis, size: height, format: yFormat, axisExtent })
  }, [showAxes, showGrid, scales, axes, yFormat, height, axisExtent])

  const yTicksRight = useMemo(() => {
    if (!showAxes || !scales || !axes?.some(a => a.orient === "left")) return []
    const axis = axes?.find(a => a.orient === "right")
    if (!axis) return []
    return generateXYTicks({ scale: scales.y, axis, size: height, format: yFormat, axisExtent })
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
    // Hide retracted/superseded by default so paint matches describe/nav tree.
    const visibleAnnotations = filterAnnotationsByStatus(annotations)

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
          annotations: visibleAnnotations,
          context,
          ...(typeof autoPlaceAnnotations === "object" ? autoPlaceAnnotations : {}),
        })
      : visibleAnnotations

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

  const hasContent = showAxes || title || description || legend || foregroundGraphics || marginalGraphics || (renderedAnnotations && renderedAnnotations.length > 0) || showGrid || children || crosshairPos
  const generatedId = useId()
  const { titleId, descId, labelledBy } = overlayAccessibleIds(idPrefix || chartId || generatedId)

  if (!hasContent) return null

  return (
    <svg
      role="img"
      aria-labelledby={labelledBy}
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
      <title id={titleId}>{overlayAccessibleTitle(title, "XY Chart")}</title>
      <desc id={descId}>
        {overlayAccessibleDescription(title, description, {
          familyPhrase: "XY data visualization",
          fallback: "XY data visualization"
        })}
      </desc>
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
        {showGrid && scales && (!underlayRendered || canvasObscuresUnderlay) && (
          <XYGrid axes={axes} xTicks={xTicks} yTicks={yTicks} width={width} height={height} />
        )}

        {/* Axes */}
        {showAxes && scales && (() => {
          const { xAxis, yAxis, xOrient, yOrient, leftAxis } = resolveXYAxes(axes)
          const xBaselineY = xOrient === "top" ? 0 : height
          const yBaselineX = yOrient === "right" ? width : 0
          const xTickDirection = xOrient === "top" ? -1 : 1
          const yTickDirection = yOrient === "right" ? 1 : -1
          const showXBaseline = xAxis ? xAxis.baseline !== false : true
          const showYBaseline = yAxis ? yAxis.baseline !== false : true
          const xJagged = xAxis?.jaggedBase || false
          const yJagged = yAxis?.jaggedBase || false
          const xLandmark = xAxis?.landmarkTicks
          const yLandmark = yAxis?.landmarkTicks
          const xAxisLine = resolveAxisLineStyle(xAxis?.axisStyle, { stroke: "var(--semiotic-border, #ccc)", strokeWidth: 1 })
          const yAxisLine = resolveAxisLineStyle(yAxis?.axisStyle, { stroke: "var(--semiotic-border, #ccc)", strokeWidth: 1 })
          const tickColor = "var(--semiotic-text-secondary, var(--semiotic-text, #666))"
          const labelColor = "var(--semiotic-text, #333)"
          const shouldRotateXAxis = shouldRotateBottomTicks

          // Per-axis font-size resolution. Inline `style` references the
          // CSS var with the literal default as the fallback — consumers
          // override the var on any DOM ancestor and the cascade carries
          // through. Landmark ticks get a +1px bump via calc().
          const tickFontStyle = { fontSize: "var(--semiotic-tick-font-size, 12px)" }
          const tickFontStyleLandmark = { fontSize: "calc(var(--semiotic-tick-font-size, 12px) + 1px)" }
          const axisLabelFontStyle = { fontSize: "var(--semiotic-axis-label-font-size, 12px)" }
          // Plain `fontSize` presentation-attribute fallbacks alongside the
          // `style` above. A real browser's `style` attribute always wins
          // over a presentation attribute, so live CSS-var cascade
          // overrides are unaffected — but a consumer that doesn't run a
          // CSS engine over the SVG (a sanitizer, the Figma plugin's SVG
          // importer, static rasterization) can't resolve `var(...)` and
          // would otherwise silently inherit the host document's font-size.
          const TICK_FONT_SIZE = 12
          const LANDMARK_TICK_FONT_SIZE = 13
          const AXIS_LABEL_FONT_SIZE = 12
          const xTickAnchorMode = xAxis?.tickAnchor
          const yTickAnchorMode = yAxis?.tickAnchor
          const xAxisLabel = xAxis?.label ?? xLabel
          const yAxisLabel = yAxis?.label ?? (yOrient === "right" ? yLabelRight ?? yLabel : yLabel)
          const yAxisLabelX = yOrient === "right"
            ? width + rightAxisLabelMargin - 15
            : -leftAxisLabelMargin + 15
          // Pre-compute the edge pixels for each axis so the tick-render
          // loop can identify the leftmost/rightmost or topmost/bottommost
          // entry without depending on array index — y ticks are in
          // ascending value order but pixel order is inverted, and
          // streaming x scales can also be reversed by `arrowOfTime`.
          const xPixelExtent = tickPixelExtent(xTicks)
          const yPixelExtent = tickPixelExtent(yTicks)
          return (
          <g className="stream-axes" style={{ fontFamily: "var(--semiotic-font-family, sans-serif)" }}>
            {xAxis?.visible !== false && <g className={`semiotic-axis semiotic-axis-${xOrient}`} data-orient={xOrient}>
            {/* Horizontal-axis baseline. Same three-state gate as the grid block
                above: render unless the underlay is already showing
                through a transparent canvas. */}
            {(!underlayRendered || canvasObscuresUnderlay) && showXBaseline && !xJagged && (
              <line x1={0} y1={xBaselineY} x2={width} y2={xBaselineY} {...xAxisLine} />
            )}
            {(!underlayRendered || canvasObscuresUnderlay) && xJagged && (
              <path d={jaggedBaselinePath(xOrient, width, height)} fill="none" {...xAxisLine} />
            )}
            {xTicks.map((tick, i) => {
              const isLandmark = xLandmark
                ? typeof xLandmark === "function"
                  ? xLandmark(tick.value, i)
                  : isTimeLandmark(tick.value, i > 0 ? xTicks[i - 1].value : undefined)
                : false
              return (
              <g key={`xtick-${i}`} transform={`translate(${tick.pixel},${xBaselineY})`}>
                <line y2={xTickDirection * 5} {...xAxisLine} />
                {typeof tick.label === "string" || typeof tick.label === "number" ? (
                  <text
                    y={xTickDirection * (shouldRotateXAxis ? 12 : 18)}
                    textAnchor={shouldRotateXAxis ? "end" : resolveHorizontalTickAnchor(
                      xTickAnchorMode,
                      tick.pixel === xPixelExtent.min,
                      tick.pixel === xPixelExtent.max,
                    )}
                    fontWeight={isLandmark ? 600 : 400}
                    fill={tickColor}
                    fontSize={isLandmark ? LANDMARK_TICK_FONT_SIZE : TICK_FONT_SIZE}
                    className="semiotic-axis-tick"
                    style={{ userSelect: "none", ...(isLandmark ? tickFontStyleLandmark : tickFontStyle) }}
                    transform={shouldRotateXAxis ? xOrient === "top" ? "rotate(45)" : "rotate(-45)" : undefined}
                  >
                    {tick.label}
                  </text>
                ) : (
                  <foreignObject x={-30} y={xOrient === "top" ? -30 : 6} width={60} height={24} style={{ overflow: "visible" }}>
                    <div style={{ textAlign: "center", userSelect: "none", ...tickFontStyle }}>{tick.label}</div>
                  </foreignObject>
                )}
              </g>
              )
            })}
            {xAxisLabel && (
              <text
                x={width / 2}
                y={xOrient === "top" ? -(shouldRotateXAxis ? 58 : 40) : height + (shouldRotateXAxis ? 58 : 40)}
                textAnchor="middle"
                fill={labelColor}
                fontSize={AXIS_LABEL_FONT_SIZE}
                className="semiotic-axis-label"
                style={{ userSelect: "none", ...axisLabelFontStyle }}
              >
                {xAxisLabel}
              </text>
            )}
            </g>}

            {yAxis?.visible !== false && <g className={`semiotic-axis semiotic-axis-${yOrient}`} data-orient={yOrient}>
            {/* Vertical-axis baseline. Same gate as the horizontal baseline above. */}
            {(!underlayRendered || canvasObscuresUnderlay) && showYBaseline && !yJagged && (
              <line x1={yBaselineX} y1={0} x2={yBaselineX} y2={height} {...yAxisLine} />
            )}
            {(!underlayRendered || canvasObscuresUnderlay) && yJagged && (
              <path d={jaggedBaselinePath(yOrient, width, height)} fill="none" {...yAxisLine} />
            )}
            {yTicks.map((tick, i) => {
              const isLandmark = yLandmark
                ? typeof yLandmark === "function"
                  ? yLandmark(tick.value, i)
                  : isTimeLandmark(tick.value, i > 0 ? yTicks[i - 1].value : undefined)
                : false
              return (
              <g key={`ytick-${i}`} transform={`translate(${yBaselineX},${tick.pixel})`}>
                <line x2={yTickDirection * 5} {...yAxisLine} />
                {typeof tick.label === "string" || typeof tick.label === "number" ? (
                  <text
                    x={yTickDirection * 8}
                    textAnchor={yOrient === "right" ? "start" : "end"}
                    dominantBaseline={resolveVerticalTickBaseline(
                      yTickAnchorMode,
                      tick.pixel === yPixelExtent.min,
                      tick.pixel === yPixelExtent.max,
                    )}
                    fontWeight={isLandmark ? 600 : 400}
                    fill={tickColor}
                    fontSize={isLandmark ? LANDMARK_TICK_FONT_SIZE : TICK_FONT_SIZE}
                    className="semiotic-axis-tick"
                    style={{ userSelect: "none", ...(isLandmark ? tickFontStyleLandmark : tickFontStyle) }}
                  >
                    {tick.label}
                  </text>
                ) : (
                  <foreignObject x={yOrient === "right" ? 8 : -68} y={-12} width={60} height={24} style={{ overflow: "visible" }}>
                    <div style={{ textAlign: yOrient === "right" ? "left" : "right", userSelect: "none", ...tickFontStyle }}>{tick.label}</div>
                  </foreignObject>
                )}
              </g>
              )
            })}
            {yAxisLabel && (
              <text
                x={yAxisLabelX}
                y={height / 2}
                textAnchor="middle"
                fill={labelColor}
                transform={`rotate(${yOrient === "right" ? 90 : -90}, ${yAxisLabelX}, ${height / 2})`}
                fontSize={AXIS_LABEL_FONT_SIZE}
                className="semiotic-axis-label"
                style={{ userSelect: "none", ...axisLabelFontStyle }}
              >
                {yAxisLabel}
              </text>
            )}
            </g>}

            {/* Right Y axis */}
            {(() => {
              const rightAxis = axes?.find(a => a.orient === "right")
              // With no left axis, the primary vertical-axis block above is
              // the right axis. Render this second block only for an explicit
              // left/right pair so right-only configs do not also create a
              // default left axis.
              if (!leftAxis || !rightAxis || rightAxis.visible === false || yTicksRight.length === 0) return null
              const showRightBaseline = rightAxis.baseline !== false
              const rightLandmark = rightAxis.landmarkTicks
              const rightLabel = rightAxis.label || yLabelRight
              const rightTickAnchorMode = rightAxis.tickAnchor
              const rightAxisLine = resolveAxisLineStyle(rightAxis.axisStyle, { stroke: "var(--semiotic-border, #ccc)", strokeWidth: 1 })
              const yRightPixelExtent = tickPixelExtent(yTicksRight)
              return (
                <g className="semiotic-axis semiotic-axis-right" data-orient="right">
                  {showRightBaseline && !rightAxis.jaggedBase && (
                    <line x1={width} y1={0} x2={width} y2={height} {...rightAxisLine} />
                  )}
                  {rightAxis.jaggedBase && (
                    <path d={jaggedBaselinePath("right", width, height)} fill="none" {...rightAxisLine} />
                  )}
                  {yTicksRight.map((tick, i) => {
                    const isLandmark = rightLandmark
                      ? typeof rightLandmark === "function"
                        ? rightLandmark(tick.value, i)
                        : isTimeLandmark(tick.value, i > 0 ? yTicksRight[i - 1].value : undefined)
                      : false
                    return (
                    <g key={`ytick-r-${i}`} transform={`translate(${width},${tick.pixel})`}>
                      <line x2={5} {...rightAxisLine} />
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
                          fontSize={isLandmark ? LANDMARK_TICK_FONT_SIZE : TICK_FONT_SIZE}
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
                      x={width + rightAxisLabelMargin - 15}
                      y={height / 2}
                      textAnchor="middle"
                      fill={labelColor}
                      transform={`rotate(90, ${width + rightAxisLabelMargin - 15}, ${height / 2})`}
                      fontSize={AXIS_LABEL_FONT_SIZE}
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

      <SVGChartTitle title={title} totalWidth={totalWidth} marginTop={margin.top} />

      {/* Legend */}
      {renderLegendFromConfig({
        legend, totalWidth, totalHeight, margin, legendPosition, title,
        legendLayout,
        // `resolveXYAxisChrome` deliberately reserves the rotated title
        // band whenever auto-rotation is enabled. That conservative choice
        // is shared with HOCs and static SVG, which calculate margins before
        // runtime collision measurement can decide whether to rotate.
        axisChrome: legendAxisChrome,
        legendHoverBehavior, legendClickBehavior, legendHighlightedCategory, legendIsolatedCategories,
      })}
    </svg>
  )
}
