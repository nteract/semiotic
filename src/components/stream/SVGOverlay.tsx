"use client"
import * as React from "react"
import { useMemo, useRef } from "react"
import type { StreamScales, MarginalGraphicsConfig, MarginalConfig, MarginalType } from "./types"
import type { AnnotationContext } from "../realtime/types"
import type { ReactNode } from "react"
import type { LegendGroup, GradientLegendConfig } from "../types/legendTypes"
import { renderLegendFromConfig } from "./legendRenderer"
import { MarginalGraphics, normalizeMarginalConfig } from "./MarginalGraphics"
import { createDefaultAnnotationRules } from "../charts/shared/annotationRules"
import { useCrosshairPosition } from "../store/LinkedCrosshairStore"

// ── Axis config ───────────────────────────────────────────────────────────
export interface AxisConfig {
  orient: "left" | "right" | "top" | "bottom"
  label?: string
  ticks?: number
  tickFormat?: (d: any, index?: number, allTicks?: number[]) => string
  baseline?: boolean | "under"
  jaggedBase?: boolean
  /** Highlight ticks at time boundaries (new month, year, etc.) with semibold text.
   * `true` auto-detects Date boundaries. A function receives (value, index) and returns true for landmark ticks. */
  landmarkTicks?: boolean | ((value: any, index: number) => boolean)
}

// ── Jagged baseline helper ────────────────────────────────────────────────

function jaggedBaselinePath(
  orient: "left" | "right" | "top" | "bottom",
  width: number,
  height: number
): string {
  const TOOTH_WIDTH = 8
  const TOOTH_HEIGHT = 4

  if (orient === "left" || orient === "right") {
    // Horizontal zigzag along x-axis at the bottom (y = height) for "left",
    // or top (y = 0) for "right"
    const y = orient === "left" ? height : 0
    const mod = orient === "left" ? -1 : 1
    const teeth = Math.ceil(width / TOOTH_WIDTH)
    let d = `M0,${y}`
    for (let i = 0; i < teeth; i++) {
      const x1 = i * TOOTH_WIDTH + TOOTH_WIDTH / 2
      const x2 = (i + 1) * TOOTH_WIDTH
      d += `L${Math.min(x1, width)},${y + TOOTH_HEIGHT * mod}`
      d += `L${Math.min(x2, width)},${y}`
    }
    return d
  } else {
    // Vertical zigzag along y-axis at x = 0 for "bottom", or x = width for "top"
    const x = orient === "bottom" ? 0 : width
    const mod = orient === "bottom" ? 1 : -1
    const teeth = Math.ceil(height / TOOTH_WIDTH)
    let d = `M${x},0`
    for (let i = 0; i < teeth; i++) {
      const y1 = i * TOOTH_WIDTH + TOOTH_WIDTH / 2
      const y2 = (i + 1) * TOOTH_WIDTH
      d += `L${x + TOOTH_HEIGHT * mod},${Math.min(y1, height)}`
      d += `L${x},${Math.min(y2, height)}`
    }
    return d
  }
}

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
  xFormat?: (d: any, index?: number, allTicks?: number[]) => string
  yFormat?: (d: any) => string

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

  // Foreground graphics (rendered on top in SVG overlay)
  foregroundGraphics?: ReactNode

  // Marginal graphics
  marginalGraphics?: MarginalGraphicsConfig
  xValues?: number[]
  yValues?: number[]

  // Annotations
  annotations?: Record<string, any>[]
  svgAnnotationRules?: (
    annotation: Record<string, any>,
    index: number,
    context: AnnotationContext
  ) => ReactNode
  annotationFrame?: number

  // Annotation context enrichment
  xAccessor?: string
  yAccessor?: string
  annotationData?: Record<string, any>[]
  pointNodes?: { pointId?: string; x: number; y: number; r: number }[]
  /** Curve interpolation type for envelope annotations */
  curve?: string

  /** When true, grid lines and axis baselines are skipped (rendered by SVGUnderlay instead) */
  underlayRendered?: boolean

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
  xFormat?: (d: any, index?: number, allTicks?: number[]) => string
  yFormat?: (d: any) => string
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
    yFormat
  } = props

  const xTicks = useMemo(() => {
    if (!scales) return []
    const bottomAxis = axes?.find(a => a.orient === "bottom")
    const fmt = bottomAxis?.tickFormat || xFormat || defaultTickFormat
    const maxFit = Math.max(2, Math.floor(width / 70))
    const requested = bottomAxis?.ticks ?? 5
    const tickCount = Math.min(requested, maxFit)
    const rawTicks = scales.x.ticks(tickCount)
    const rawValues = rawTicks.map(v => v.valueOf())
    const candidates = rawTicks.map((v, i) => ({
      value: v,
      pixel: scales.x(v),
      label: fmt(v, i, rawValues)
    }))
    // Estimate the widest label and use that as minimum spacing so labels
    // (which are center-anchored) don't overlap.
    const maxLabelWidth = candidates.reduce((max, c) => Math.max(max, c.label.length * 6.5), 0)
    const minPx = Math.max(55, maxLabelWidth + 8)
    return filterTicksByPixelDistance(candidates, minPx)
  }, [scales, axes, xFormat, width])

  const yTicks = useMemo(() => {
    if (!scales) return []
    const leftAxis = axes?.find(a => a.orient === "left")
    const fmt = leftAxis?.tickFormat || yFormat || defaultTickFormat
    const maxFit = Math.max(2, Math.floor(height / 30))
    const requested = leftAxis?.ticks ?? 5
    const tickCount = Math.min(requested, maxFit)
    const candidates = scales.y.ticks(tickCount).map(v => ({
      value: v,
      pixel: scales.y(v),
      label: fmt(v)
    }))
    return filterTicksByPixelDistance(candidates, 22)
  }, [scales, axes, yFormat, height])

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
        {hasGrid && (
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
              />
            ))}
          </g>
        )}

        {/* Axis baselines */}
        {showBottomBaseline && !bottomJagged && (
          <line x1={0} y1={height} x2={width} y2={height} stroke={axisStroke} strokeWidth={1} />
        )}
        {bottomJagged && (
          <path d={jaggedBaselinePath("bottom", width, height)} fill="none" stroke={axisStroke} strokeWidth={1} />
        )}
        {showLeftBaseline && !leftJagged && (
          <line x1={0} y1={0} x2={0} y2={height} stroke={axisStroke} strokeWidth={1} />
        )}
        {leftJagged && (
          <path d={jaggedBaselinePath("left", width, height)} fill="none" stroke={axisStroke} strokeWidth={1} />
        )}
      </g>
    </svg>
  )
}


function defaultTickFormat(v: number, _index?: number, _allTicks?: number[]): string {
  return String(Math.round(v * 100) / 100)
}

/** Greedily filter ticks so consecutive labels are at least `minPx` apart.
 *  Always keeps the first and last tick. */
function filterTicksByPixelDistance(
  ticks: Array<{ value: number; pixel: number; label: string }>,
  minPx: number
): Array<{ value: number; pixel: number; label: string }> {
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

/** Detect whether a tick marks a time boundary (new month, year, day) compared to the previous tick */
function isTimeLandmark(value: any, prevValue: any): boolean {
  if (!(value instanceof Date)) return false
  if (!prevValue || !(prevValue instanceof Date)) return true
  // New year, new month, or new day
  return (
    value.getFullYear() !== prevValue.getFullYear() ||
    value.getMonth() !== prevValue.getMonth() ||
    value.getDate() !== prevValue.getDate()
  )
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
    showGrid,
    title,
    legend,
    legendHoverBehavior,
    legendClickBehavior,
    legendHighlightedCategory,
    legendIsolatedCategories,
    legendPosition = "right",
    foregroundGraphics,
    marginalGraphics,
    xValues,
    yValues,
    annotations,
    svgAnnotationRules,
    annotationFrame,
    xAccessor: annXAccessor,
    yAccessor: annYAccessor,
    annotationData,
    pointNodes,
    curve: annCurve,
    underlayRendered,
    linkedCrosshairName,
    linkedCrosshairSourceId,
    children
  } = props

  // Generate axis ticks — use per-axis config, auto-reduce to prevent overlap.
  // After generating candidate ticks, filter by minimum pixel distance so labels
  // never collide — critical for log scales where ticks cluster non-uniformly.
  const xTicks = useMemo(() => {
    if (!showAxes || !scales) return []
    const bottomAxis = axes?.find(a => a.orient === "bottom")
    const fmt = bottomAxis?.tickFormat || xFormat || defaultTickFormat
    const maxFit = Math.max(2, Math.floor(width / 70))
    const requested = bottomAxis?.ticks ?? 5
    const tickCount = Math.min(requested, maxFit)
    const rawTicks = scales.x.ticks(tickCount)
    const rawValues = rawTicks.map(v => v.valueOf())
    const candidates = rawTicks.map((v, i) => ({
      value: v,
      pixel: scales.x(v),
      label: fmt(v, i, rawValues)
    }))
    const maxLabelWidth = candidates.reduce((max, c) => Math.max(max, c.label.length * 6.5), 0)
    const minPx = Math.max(55, maxLabelWidth + 8)
    return filterTicksByPixelDistance(candidates, minPx)
  }, [showAxes, scales, axes, xFormat, width])

  const yTicks = useMemo(() => {
    if (!showAxes || !scales) return []
    const leftAxis = axes?.find(a => a.orient === "left")
    const fmt = leftAxis?.tickFormat || yFormat || defaultTickFormat
    const maxFit = Math.max(2, Math.floor(height / 30))
    const requested = leftAxis?.ticks ?? 5
    const tickCount = Math.min(requested, maxFit)
    const candidates = scales.y.ticks(tickCount).map(v => ({
      value: v,
      pixel: scales.y(v),
      label: fmt(v)
    }))
    return filterTicksByPixelDistance(candidates, 22)
  }, [showAxes, scales, axes, yFormat, height])

  // Right Y axis ticks — same pixel positions as left but different labels
  const yTicksRight = useMemo(() => {
    if (!showAxes || !scales) return []
    const rightAxis = axes?.find(a => a.orient === "right")
    if (!rightAxis) return []
    const fmt = rightAxis.tickFormat || yFormat || defaultTickFormat
    const maxFit = Math.max(2, Math.floor(height / 30))
    const requested = rightAxis.ticks ?? 5
    const tickCount = Math.min(requested, maxFit)
    const candidates = scales.y.ticks(tickCount).map(v => ({
      value: v,
      pixel: scales.y(v),
      label: fmt(v)
    }))
    return filterTicksByPixelDistance(candidates, 22)
  }, [showAxes, scales, axes, yFormat, height])

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

    const defaultRules = createDefaultAnnotationRules("xy")

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

    return annotations
      .map((annotation, i) => {
        if (svgAnnotationRules) {
          // Try user rules first, fall back to defaults
          const userResult = svgAnnotationRules(annotation, i, context)
          if (userResult !== null && userResult !== undefined) return userResult
          return defaultRules(annotation, i, context)
        }
        return defaultRules(annotation, i, context)
      })
      .filter(Boolean)
  }, [annotations, svgAnnotationRules, width, height, annXAccessor, annYAccessor, annotationData, scales, pointNodes, annCurve])

  // Linked crosshair from coordinate-based hover sync
  const crosshairPos = useCrosshairPosition(linkedCrosshairName)

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
        {/* Grid lines (skipped when underlayRendered — they're in SVGUnderlay) */}
        {showGrid && scales && !underlayRendered && (
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
              />
            ))}
          </g>
        )}

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

          return (
          <g className="stream-axes" style={{ fontFamily: "var(--semiotic-font-family, sans-serif)" }}>
            {/* X axis baseline (skipped when underlayRendered) */}
            {!underlayRendered && showBottomBaseline && !bottomJagged && (
              <line x1={0} y1={height} x2={width} y2={height} stroke={axisStroke} strokeWidth={1} />
            )}
            {!underlayRendered && bottomJagged && (
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
                <text
                  y={18}
                  textAnchor="middle"
                  fontSize={isLandmark ? 11 : 10}
                  fontWeight={isLandmark ? 600 : 400}
                  fill={tickColor}
                  style={{ userSelect: "none" }}
                >
                  {tick.label}
                </text>
              </g>
              )
            })}
            {xLabel && (
              <text
                x={width / 2}
                y={height + 40}
                textAnchor="middle"
                fontSize={12}
                fill={labelColor}
                style={{ userSelect: "none" }}
              >
                {xLabel}
              </text>
            )}

            {/* Y axis baseline (skipped when underlayRendered) */}
            {!underlayRendered && showLeftBaseline && !leftJagged && (
              <line x1={0} y1={0} x2={0} y2={height} stroke={axisStroke} strokeWidth={1} />
            )}
            {!underlayRendered && leftJagged && (
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
                <text
                  x={-8}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={isLandmark ? 11 : 10}
                  fontWeight={isLandmark ? 600 : 400}
                  fill={tickColor}
                  style={{ userSelect: "none" }}
                >
                  {tick.label}
                </text>
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
                fontSize={12}
                fill={labelColor}
                transform={`rotate(-90, ${-margin.left + 15}, ${height / 2})`}
                style={{ userSelect: "none" }}
              >
                {leftLabel}
              </text>
              ) : null
            })()}

            {/* Right Y axis */}
            {(() => {
              const rightAxis = axes?.find(a => a.orient === "right")
              if (!rightAxis || yTicksRight.length === 0) return null
              const showRightBaseline = rightAxis.baseline !== false
              const rightLandmark = rightAxis.landmarkTicks
              const rightLabel = rightAxis.label || yLabelRight
              return (
                <>
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
                      <text
                        x={8}
                        textAnchor="start"
                        dominantBaseline="middle"
                        fontSize={isLandmark ? 11 : 10}
                        fontWeight={isLandmark ? 600 : 400}
                        fill={tickColor}
                        style={{ userSelect: "none" }}
                      >
                        {tick.label}
                      </text>
                    </g>
                    )
                  })}
                  {rightLabel && (
                    <text
                      x={width + margin.right - 15}
                      y={height / 2}
                      textAnchor="middle"
                      fontSize={12}
                      fill={labelColor}
                      transform={`rotate(90, ${width + margin.right - 15}, ${height / 2})`}
                      style={{ userSelect: "none" }}
                    >
                      {rightLabel}
                    </text>
                  )}
                </>
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
          return (
            <line
              x1={px} y1={0} x2={px} y2={height}
              stroke="var(--semiotic-text-secondary, rgba(0,0,0,0.25))"
              strokeWidth={1}
              strokeDasharray="4,4"
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
          fontSize={14}
          fontWeight="bold"
          fill="var(--semiotic-text, #333)"
          style={{ userSelect: "none" }}
        >
          {typeof title === "string" ? title : null}
        </text>
      )}

      {/* Legend */}
      {renderLegendFromConfig({
        legend, totalWidth, totalHeight, margin, legendPosition, title,
        legendHoverBehavior, legendClickBehavior, legendHighlightedCategory, legendIsolatedCategories,
      })}
    </svg>
  )
}
