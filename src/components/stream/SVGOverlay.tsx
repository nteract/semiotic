"use client"
import * as React from "react"
import { useMemo } from "react"
import type { StreamScales, MarginalGraphicsConfig, MarginalConfig, MarginalType } from "./types"
import type { AnnotationContext } from "../realtime/types"
import type { ReactNode } from "react"
import Legend from "../Legend"
import type { LegendGroup } from "../types/legendTypes"
import { MarginalGraphics, normalizeMarginalConfig } from "./MarginalGraphics"
import { createDefaultAnnotationRules } from "../charts/shared/annotationRules"

// ── Axis config ───────────────────────────────────────────────────────────
export interface AxisConfig {
  orient: "left" | "right" | "top" | "bottom"
  label?: string
  ticks?: number
  tickFormat?: (d: any) => string
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
  xFormat?: (d: any) => string
  yFormat?: (d: any) => string

  // Grid
  showGrid?: boolean

  // Title
  title?: string | ReactNode

  // Legend
  legend?: ReactNode | { legendGroups: LegendGroup[] }
  /** Callback when hovering a legend item */
  legendHoverBehavior?: (item: { label: string } | null) => void
  /** Callback when clicking a legend item */
  legendClickBehavior?: (item: { label: string }) => void
  /** Currently highlighted category label (for hover dimming) */
  legendHighlightedCategory?: string | null
  /** Set of isolated category labels (for click isolation) */
  legendIsolatedCategories?: Set<string>

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

  children?: ReactNode
}

function isLegendConfig(value: unknown): value is { legendGroups: LegendGroup[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    !React.isValidElement(value) &&
    "legendGroups" in value
  )
}

function defaultTickFormat(v: number): string {
  return String(Math.round(v * 100) / 100)
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
    xFormat,
    yFormat,
    showGrid,
    title,
    legend,
    legendHoverBehavior,
    legendClickBehavior,
    legendHighlightedCategory,
    legendIsolatedCategories,
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
    children
  } = props

  // Generate axis ticks
  const xTicks = useMemo(() => {
    if (!showAxes || !scales) return []
    return scales.x.ticks(5).map(v => ({
      value: v,
      pixel: scales.x(v),
      label: (xFormat || defaultTickFormat)(v)
    }))
  }, [showAxes, scales, xFormat])

  const yTicks = useMemo(() => {
    if (!showAxes || !scales) return []
    return scales.y.ticks(5).map(v => ({
      value: v,
      pixel: scales.y(v),
      label: (yFormat || defaultTickFormat)(v)
    }))
  }, [showAxes, scales, yFormat])

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
      pointNodes
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations, svgAnnotationRules, width, height, annotationFrame, annXAccessor, annYAccessor, annotationData])

  const hasContent = showAxes || title || legend || foregroundGraphics || marginalGraphics || (renderedAnnotations && renderedAnnotations.length > 0) || showGrid || children

  if (!hasContent) return null

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
        {showGrid && scales && (
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
          const tickColor = "var(--semiotic-text-secondary, #666)"
          const labelColor = "var(--semiotic-text, #333)"

          return (
          <g className="stream-axes">
            {/* X axis baseline */}
            {showBottomBaseline && !bottomJagged && (
              <line x1={0} y1={height} x2={width} y2={height} stroke={axisStroke} strokeWidth={1} />
            )}
            {bottomJagged && (
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

            {/* Y axis baseline */}
            {showLeftBaseline && !leftJagged && (
              <line x1={0} y1={0} x2={0} y2={height} stroke={axisStroke} strokeWidth={1} />
            )}
            {leftJagged && (
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
            {yLabel && (
              <text
                x={-margin.left + 15}
                y={height / 2}
                textAnchor="middle"
                fontSize={12}
                fill={labelColor}
                transform={`rotate(-90, ${-margin.left + 15}, ${height / 2})`}
                style={{ userSelect: "none" }}
              >
                {yLabel}
              </text>
            )}
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
      {legend && (
        <g transform={`translate(${totalWidth - margin.right + 10}, ${margin.top})`}>
          {isLegendConfig(legend)
            ? <Legend
                legendGroups={legend.legendGroups}
                title=""
                width={100}
                customHoverBehavior={legendHoverBehavior}
                customClickBehavior={legendClickBehavior}
                highlightedCategory={legendHighlightedCategory}
                isolatedCategories={legendIsolatedCategories}
              />
            : (legend as ReactNode)}
        </g>
      )}
    </svg>
  )
}
