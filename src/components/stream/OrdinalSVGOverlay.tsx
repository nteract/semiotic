"use client"
import type { Datum } from "../charts/shared/datumTypes"
import * as React from "react"
import { useMemo, useRef } from "react"
import type { OrdinalScales } from "./ordinalTypes"
import type { AnnotationContext } from "../realtime/types"
import type { ReactNode } from "react"
import type { LegendGroup, GradientLegendConfig, LegendLayout } from "../types/legendTypes"
import { renderLegendFromConfig } from "./legendRenderer"
import { createDefaultAnnotationRules, renderAnnotationPass } from "../charts/shared/annotationRules"
import { ticksForMode, type AxisExtentMode } from "../charts/shared/axisExtent"

interface OrdinalSVGOverlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  scales: OrdinalScales | null

  // Axes
  showAxes?: boolean
  showCategoryTicks?: boolean
  oLabel?: string
  rLabel?: string
  oFormat?: (d: string, index?: number) => string | React.ReactNode
  rFormat?: (d: number) => string
  /** Custom tick values for the value (r) axis */
  rTickValues?: number[]
  /** Align first tick label to start, last to end */
  tickLabelEdgeAlign?: boolean
  /** Axis extent mode. "nice" (default) uses d3-scale's rounded
   *  tick generator. "exact" pins the first and last value-axis
   *  tick to the actual data min and max with equidistant
   *  intermediate ticks. Ignored for the categorical (o) axis;
   *  applies to the value (r) axis only. */
  axisExtent?: AxisExtentMode

  // Grid
  showGrid?: boolean

  // Title
  title?: string | ReactNode

  // Legend
  legend?: ReactNode | { legendGroups: LegendGroup[] } | { gradient: GradientLegendConfig }
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout

  // Foreground graphics
  foregroundGraphics?: ReactNode

  // Annotations
  annotations?: Datum[]
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

  /** When true, grid lines and axis baselines are skipped (rendered by OrdinalSVGUnderlay instead) */
  underlayRendered?: boolean

  children?: ReactNode
}

// ── OrdinalSVGUnderlay ──────────────────────────────────────────────────
// Renders ONLY grid lines and axis baseline lines behind the canvas.

interface OrdinalSVGUnderlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  scales: OrdinalScales | null
  showAxes?: boolean
  showGrid?: boolean
  rFormat?: (d: number) => string
  rTickValues?: number[]
  axisExtent?: AxisExtentMode
}

export function OrdinalSVGUnderlay(props: OrdinalSVGUnderlayProps) {
  const {
    width,
    height,
    totalWidth,
    totalHeight,
    margin,
    scales,
    showAxes,
    showGrid,
    rFormat
  } = props

  const { rTickValues, axisExtent } = props
  const isRadial = scales?.projection === "radial"
  const isHorizontal = scales?.projection === "horizontal"

  const valueTicks = useMemo(() => {
    if (!scales || isRadial) return []
    // Explicit `rTickValues` wins over both modes — caller has hand-
    // picked the positions. Otherwise `ticksForMode` resolves
    // axisExtent: "nice" → d3-scale rounded; "exact" → equidistant
    // from data min to data max inclusive. The r-scale is always
    // linear in ordinal frames; the type narrows naturally.
    const rawTicks: number[] = rTickValues || (ticksForMode(scales.r, 5, axisExtent) as number[])
    return rawTicks.map(v => ({
      value: v,
      pixel: scales.r(v),
      label: (rFormat || defaultRFormat)(v)
    }))
  }, [scales, rFormat, isRadial, rTickValues, axisExtent])

  const hasGrid = showGrid && scales && !isRadial
  const hasBaselines = showAxes && scales && !isRadial

  if (!hasGrid && !hasBaselines) return null

  return (
    <svg
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
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* Grid lines */}
        {hasGrid && (
          <g className="ordinal-grid">
            {valueTicks.map((tick, i) => (
              <line
                key={`grid-${i}`}
                x1={isHorizontal ? tick.pixel : 0}
                y1={isHorizontal ? 0 : tick.pixel}
                x2={isHorizontal ? tick.pixel : width}
                y2={isHorizontal ? height : tick.pixel}
                stroke="var(--semiotic-grid, #e0e0e0)"
                strokeWidth={1}
              />
            ))}
          </g>
        )}

        {/* Axis baselines */}
        {hasBaselines && (
          <>
            {isHorizontal ? (
              <>
                {/* Horizontal: category axis baseline (left) */}
                <line x1={0} y1={0} x2={0} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                {/* Horizontal: value axis baseline (bottom) */}
                <line x1={0} y1={height} x2={width} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
              </>
            ) : (
              <>
                {/* Vertical: category axis baseline (bottom) */}
                <line x1={0} y1={height} x2={width} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                {/* Vertical: value axis baseline (left) */}
                <line x1={0} y1={0} x2={0} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
              </>
            )}
          </>
        )}
      </g>
    </svg>
  )
}


function defaultRFormat(v: number): string {
  return String(Math.round(v * 100) / 100)
}

export function OrdinalSVGOverlay(props: OrdinalSVGOverlayProps) {
  const {
    width,
    height,
    totalWidth,
    totalHeight,
    margin,
    scales,
    showAxes,
    showCategoryTicks: showCategoryTicksProp,
    oLabel,
    rLabel,
    oFormat,
    rFormat,
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
    annotations,
    svgAnnotationRules,
    annotationFrame: _annotationFrame,
    xAccessor: annXAccessor,
    yAccessor: annYAccessor,
    annotationData,
    underlayRendered,
    children
  } = props

  const isRadial = scales?.projection === "radial"
  const isHorizontal = scales?.projection === "horizontal"
  const showCategoryTicks = showCategoryTicksProp !== false

  // Category labels (band scale)
  const categoryTicks = useMemo(() => {
    if (!showAxes || !showCategoryTicks || !scales || isRadial) return []
    return scales.o.domain().map((cat, index) => ({
      value: cat,
      pixel: (scales.o(cat) ?? 0) + scales.o.bandwidth() / 2,
      label: oFormat ? oFormat(cat, index) : cat
    }))
  }, [showAxes, showCategoryTicks, scales, oFormat, isRadial])

  // Value ticks (linear scale) — custom rTickValues override d3 ticks
  const rTickValues = props.rTickValues
  const tickLabelEdgeAlign = props.tickLabelEdgeAlign
  const axisExtent = props.axisExtent
  const valueTicks = useMemo(() => {
    if (!showAxes || !scales || isRadial) return []
    // Explicit `rTickValues` wins; otherwise resolve via `axisExtent`
    // ("nice" → d3-scale rounded | "exact" → equidistant from data
    // min to data max inclusive). The r-scale is always linear.
    const rawTicks: number[] = rTickValues || (ticksForMode(scales.r, 5, axisExtent) as number[])
    return rawTicks.map(v => ({
      value: v,
      pixel: scales.r(v),
      label: (rFormat || defaultRFormat)(v)
    }))
  }, [showAxes, scales, rFormat, isRadial, rTickValues, axisExtent])

  // Persistent cache for sticky annotation positions
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

  // Annotations
  const renderedAnnotations = useMemo(() => {
    if (!annotations || annotations.length === 0) return null

    const defaultRules = createDefaultAnnotationRules("ordinal")

    // Expose both ordinal (o) and range (r) scales properly.
    // For vertical bars: x = category center (o + bandwidth/2), y = value (r)
    // For horizontal bars: x = value (r), y = category center (o + bandwidth/2)
    const isHoriz = scales?.projection === "horizontal"
    type AnnotationAxisScale = NonNullable<NonNullable<AnnotationContext["scales"]>["x"]>
    const oCentered = scales?.o
      ? ((v: string) => (scales.o(v) ?? 0) + scales.o.bandwidth() / 2) as unknown as AnnotationAxisScale
      : null

    const context: AnnotationContext = {
      scales: scales
        ? {
            x: isHoriz ? scales.r : (oCentered || scales.r),
            y: isHoriz ? (oCentered || scales.r) : scales.r,
            time: scales.r,
            value: scales.r,
            o: scales.o,
          }
        : null,
      timeAxis: "x",
      xAccessor: annXAccessor,
      yAccessor: annYAccessor,
      width,
      height,
      data: annotationData,
      frameType: "ordinal",
      projection: isHoriz ? "horizontal" : "vertical",
      stickyPositionCache: stickyPositionCacheRef.current
    }

    // Dispatch → drop empty renders → apply emphasis hierarchy (shared with the
    // XY overlay). Falsy-node filtering matches the prior `.filter(Boolean)`.
    return renderAnnotationPass(annotations, defaultRules, svgAnnotationRules, context)
  }, [annotations, svgAnnotationRules, width, height, scales, annXAccessor, annYAccessor, annotationData])

  const hasContent = showAxes || title || legend || foregroundGraphics || (renderedAnnotations && renderedAnnotations.length > 0) || showGrid || children
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
      <title>{typeof title === "string" ? title : "Ordinal Chart"}</title>
      <desc>{typeof title === "string" ? `${title} — ordinal data visualization` : "Ordinal data visualization"}</desc>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* Grid lines (skipped when underlayRendered — they're in OrdinalSVGUnderlay) */}
        {showGrid && scales && !isRadial && !underlayRendered && (
          <g className="ordinal-grid">
            {valueTicks.map((tick, i) => (
              <line
                key={`grid-${i}`}
                x1={isHorizontal ? tick.pixel : 0}
                y1={isHorizontal ? 0 : tick.pixel}
                x2={isHorizontal ? tick.pixel : width}
                y2={isHorizontal ? height : tick.pixel}
                stroke="var(--semiotic-grid, #e0e0e0)"
                strokeWidth={1}
              />
            ))}
          </g>
        )}

        {/* Axes */}
        {showAxes && scales && !isRadial && (() => {
          // Per-axis font-size resolution — see SVGOverlay for the
          // rationale. CSS var with literal fallback so consumers
          // override via the var rather than fighting inline specificity.
          const tickFontStyle = { fontSize: "var(--semiotic-tick-font-size, 10px)" }
          const axisLabelFontStyle = { fontSize: "var(--semiotic-axis-label-font-size, 12px)" }
          return (
          <g className="ordinal-axes">
            {isHorizontal ? (
              <>
                {/* Horizontal: categories on left, values on bottom */}
                <g className="semiotic-axis semiotic-axis-left" data-orient="left">
                {/* Category axis baseline (left) — skipped when underlayRendered */}
                {!underlayRendered && <line x1={0} y1={0} x2={0} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />}
                {categoryTicks.map((tick, i) => (
                  <g key={`cat-${i}`} transform={`translate(0,${tick.pixel})`}>
                    <line x2={-5} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                    {typeof tick.label === "string" || typeof tick.label === "number" ? (
                      <text
                        x={-8}
                        textAnchor="end"
                        dominantBaseline="middle"
                        fill="var(--semiotic-text-secondary, #666)"
                        className="semiotic-axis-tick"
                        style={{ userSelect: "none", ...tickFontStyle }}
                      >
                        {tick.label}
                      </text>
                    ) : (
                      <foreignObject x={-68} y={-12} width={60} height={24} style={{ overflow: "visible" }}>
                        <div style={{ textAlign: "right", userSelect: "none", ...tickFontStyle }}>{tick.label}</div>
                      </foreignObject>
                    )}
                  </g>
                ))}
                {oLabel && (
                  <text
                    x={-margin.left + 15}
                    y={height / 2}
                    textAnchor="middle"
                    fill="var(--semiotic-text, #333)"
                    transform={`rotate(-90, ${-margin.left + 15}, ${height / 2})`}
                    className="semiotic-axis-label"
                    style={{ userSelect: "none", ...axisLabelFontStyle }}
                  >
                    {oLabel}
                  </text>
                )}
                </g>

                <g className="semiotic-axis semiotic-axis-bottom" data-orient="bottom">
                {/* Value axis baseline (bottom) — skipped when underlayRendered */}
                {/* Value axis baseline (bottom) + zero line if different */}
                {!underlayRendered && <line x1={0} y1={height} x2={width} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />}
                {!underlayRendered && scales?.r && (() => {
                  const zeroX = scales.r(0)
                  if (zeroX > 1 && zeroX < width - 1) {
                    return <line x1={zeroX} y1={0} x2={zeroX} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} strokeDasharray="4,4" />
                  }
                  return null
                })()}
                {valueTicks.map((tick, i) => {
                  const anchor = tickLabelEdgeAlign
                    ? (i === 0 ? "start" : i === valueTicks.length - 1 ? "end" : "middle")
                    : "middle"
                  return (
                    <g key={`val-${i}`} transform={`translate(${tick.pixel},${height})`}>
                      <line y2={5} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                      <text
                        y={18}
                        textAnchor={anchor}
                        fill="var(--semiotic-text-secondary, #666)"
                        className="semiotic-axis-tick"
                        style={{ userSelect: "none", ...tickFontStyle }}
                      >
                        {tick.label}
                      </text>
                    </g>
                  )
                })}
                {rLabel && (
                  <text
                    x={width / 2}
                    y={height + 40}
                    textAnchor="middle"
                    fill="var(--semiotic-text, #333)"
                    className="semiotic-axis-label"
                    style={{ userSelect: "none", ...axisLabelFontStyle }}
                  >
                    {rLabel}
                  </text>
                )}
                </g>
              </>
            ) : (
              <>
                {/* Vertical: categories on bottom, values on left */}
                <g className="semiotic-axis semiotic-axis-bottom" data-orient="bottom">
                {/* Category axis baseline — drawn at rScale(0) to align with bar baseline, falls back to chart bottom */}
                {!underlayRendered && (() => {
                  const zeroY = scales?.r ? scales.r(0) : height
                  const baseY = (zeroY >= 0 && zeroY <= height) ? zeroY : height
                  return <line x1={0} y1={baseY} x2={width} y2={baseY} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                })()}
                {categoryTicks.map((tick, i) => (
                  <g key={`cat-${i}`} transform={`translate(${tick.pixel},${height})`}>
                    <line y2={5} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                    {typeof tick.label === "string" || typeof tick.label === "number" ? (
                      <text
                        y={18}
                        textAnchor="middle"
                        fill="var(--semiotic-text-secondary, #666)"
                        className="semiotic-axis-tick"
                        style={{ userSelect: "none", ...tickFontStyle }}
                      >
                        {tick.label}
                      </text>
                    ) : (
                      <foreignObject x={-30} y={6} width={60} height={24} style={{ overflow: "visible" }}>
                        <div style={{ textAlign: "center", userSelect: "none", ...tickFontStyle }}>{tick.label}</div>
                      </foreignObject>
                    )}
                  </g>
                ))}
                {oLabel && (
                  <text
                    x={width / 2}
                    y={height + 40}
                    textAnchor="middle"
                    fill="var(--semiotic-text, #333)"
                    className="semiotic-axis-label"
                    style={{ userSelect: "none", ...axisLabelFontStyle }}
                  >
                    {oLabel}
                  </text>
                )}
                </g>

                <g className="semiotic-axis semiotic-axis-left" data-orient="left">
                {/* Value axis baseline (left) — skipped when underlayRendered */}
                {!underlayRendered && <line x1={0} y1={0} x2={0} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />}
                {valueTicks.map((tick, i) => (
                  <g key={`val-${i}`} transform={`translate(0,${tick.pixel})`}>
                    <line x2={-5} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                    <text
                      x={-8}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fill="var(--semiotic-text-secondary, #666)"
                      className="semiotic-axis-tick"
                      style={{ userSelect: "none", ...tickFontStyle }}
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}
                {rLabel && (
                  <text
                    x={-margin.left + 15}
                    y={height / 2}
                    textAnchor="middle"
                    fill="var(--semiotic-text, #333)"
                    transform={`rotate(-90, ${-margin.left + 15}, ${height / 2})`}
                    className="semiotic-axis-label"
                    style={{ userSelect: "none", ...axisLabelFontStyle }}
                  >
                    {rLabel}
                  </text>
                )}
                </g>
              </>
            )}
          </g>
          )
        })()}

        {/* Annotations */}
        {renderedAnnotations}

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
