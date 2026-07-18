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
import type { OnObservationCallback } from "../store/ObservationStore"
import {
  useAnnotationActivationOptions,
  type OnAnnotationActivateCallback
} from "../charts/shared/annotationActivation"
import { annotationLayout, type AutoPlaceAnnotations } from "../recipes/annotationLayout"
import { filterAnnotationsByStatus } from "../ai/annotationProvenance"
import { ticksForMode, type AxisExtentMode } from "../charts/shared/axisExtent"
import { TITLE_BASELINE } from "./titleLayout"

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

  /** When true, grid lines and axis baselines are also rendered by OrdinalSVGUnderlay. */
  underlayRendered?: boolean
  /** Whether an opaque canvas hides the SVG underlay and needs an overlay copy. */
  canvasObscuresUnderlay?: boolean

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
    underlayRendered,
    canvasObscuresUnderlay = true,
    children
  } = props
  const annotationActivation = useAnnotationActivationOptions({
    onAnnotationActivate,
    onObservation,
    chartId,
    chartType
  })

  const isRadial = scales?.projection === "radial"
  const isHorizontal = scales?.projection === "horizontal"
  const showCategoryTicks = showCategoryTicksProp !== false
  const rendersUnderlayAboveCanvas = !underlayRendered || canvasObscuresUnderlay

  // Category labels (band scale). When many categories crowd the axis —
  // the classic temporal-histogram / many-bin case — drawing every label
  // produces an unreadable overlapping smear. Thin to evenly-spaced labels
  // (every Nth) so the remaining set never collides. The thinning is a
  // no-op when labels already fit (step === 1), so charts with few
  // categories render byte-identically.
  const categoryTicks = useMemo(() => {
    if (!showAxes || !showCategoryTicks || !scales || isRadial) return []
    const band = scales.o.bandwidth()
    const all = scales.o.domain().map((cat, index) => ({
      value: cat,
      pixel: (scales.o(cat) ?? 0) + band / 2,
      label: oFormat ? oFormat(cat, index) : cat
    }))
    if (all.length <= 2) return all

    // Uniform spacing between adjacent category centers (band scale).
    const spacing = Math.abs(all[1].pixel - all[0].pixel) || band
    // Estimate each label independently, then compare adjacent label
    // footprints. Using the longest label for *both* sides of every gap
    // over-thins ordinary mixed-length category sets (for example,
    // Alpha/Beta/Gamma/Delta/Epsilon at 360px) even when the labels do fit.
    // A centered label occupies half of its footprint on either side of its
    // tick, so two adjacent labels need half of each footprint plus the
    // desired visual gap. ReactNode labels are rendered in a 60×24
    // foreignObject and cannot be measured here, so use that conservative
    // footprint.
    const footprint = (label: React.ReactNode): number => {
      if (isHorizontal) {
        return typeof label === "string" || typeof label === "number" ? 16 : 24
      }
      if (typeof label === "string" || typeof label === "number") {
        // 6.5 px/char mirrors SVGOverlay's deterministic SSR-safe estimate.
        return String(label).length * 6.5
      }
      return 60
    }
    const footprints = all.map(t => footprint(t.label))
    const minimumGap = isHorizontal ? 0 : 6
    const adjacentLabelsFit = footprints.every((current, index) =>
      index === 0 || (footprints[index - 1] + current) / 2 + minimumGap <= spacing
    )
    if (adjacentLabelsFit) return all

    // Once a real collision is detected, preserve the prior conservative
    // every-N thinning policy. The largest selected label can then be next
    // to another largest label, so its complete footprint is required.
    const needed = Math.max(...footprints) + minimumGap
    const step = Math.max(1, Math.ceil(needed / spacing))
    if (step === 1) return all
    return all.filter((_, i) => i % step === 0)
  }, [showAxes, showCategoryTicks, scales, oFormat, isRadial, isHorizontal])

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
    const visibleAnnotations = filterAnnotationsByStatus(annotations)

    const defaultRules = createDefaultAnnotationRules("ordinal", annotationActivation)

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

    const layoutAnnotations = autoPlaceAnnotations
      ? annotationLayout({
          annotations: visibleAnnotations,
          context,
          ...(typeof autoPlaceAnnotations === "object" ? autoPlaceAnnotations : {}),
        })
      : visibleAnnotations

    // Dispatch → drop empty renders → apply emphasis hierarchy (shared with the
    // XY overlay). Falsy-node filtering matches the prior `.filter(Boolean)`.
    return renderAnnotationPass(layoutAnnotations, defaultRules, svgAnnotationRules, context)
  }, [annotations, autoPlaceAnnotations, svgAnnotationRules, width, height, scales, annXAccessor, annYAccessor, annotationData, annotationActivation])

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
      <desc>
        {typeof title === "string"
          ? `${title} (ordinal data visualization)`
          : "Ordinal data visualization"}
      </desc>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* Grid lines (skipped when underlayRendered — they're in OrdinalSVGUnderlay) */}
        {showGrid && scales && !isRadial && rendersUnderlayAboveCanvas && (
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
          const tickFontStyle = { fontSize: "var(--semiotic-tick-font-size, 12px)" }
          const axisLabelFontStyle = { fontSize: "var(--semiotic-axis-label-font-size, 12px)" }
          return (
          <g className="ordinal-axes">
            {isHorizontal ? (
              <>
                {/* Horizontal: categories on left, values on bottom */}
                <g className="semiotic-axis semiotic-axis-left" data-orient="left">
                {/* Category axis baseline (left) — skipped when underlayRendered */}
                {rendersUnderlayAboveCanvas && <line x1={0} y1={0} x2={0} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />}
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
                {rendersUnderlayAboveCanvas && <line x1={0} y1={height} x2={width} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />}
                {rendersUnderlayAboveCanvas && scales?.r && (() => {
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
                {rendersUnderlayAboveCanvas && (() => {
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
                {rendersUnderlayAboveCanvas && <line x1={0} y1={0} x2={0} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />}
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
      {title && typeof title === "string" ? (
        <text
          x={totalWidth / 2}
          y={TITLE_BASELINE}
          textAnchor="middle"
          fontWeight="bold"
          fill="var(--semiotic-text, #333)"
          className="semiotic-chart-title"
          style={{ userSelect: "none", fontSize: "var(--semiotic-title-font-size, 14px)" }}
        >
          {title}
        </text>
      ) : title ? (
        <foreignObject x={0} y={0} width={totalWidth} height={margin.top}>
          {title}
        </foreignObject>
      ) : null}

      {/* Legend */}
      {renderLegendFromConfig({
        legend, totalWidth, totalHeight, margin, legendPosition, title,
        legendLayout,
        legendHoverBehavior, legendClickBehavior, legendHighlightedCategory, legendIsolatedCategories,
      })}
    </svg>
  )
}
