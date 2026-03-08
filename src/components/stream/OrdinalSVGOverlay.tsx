"use client"
import * as React from "react"
import { useMemo } from "react"
import type { OrdinalScales } from "./ordinalTypes"
import type { AnnotationContext } from "../realtime/types"
import type { ReactNode } from "react"
import Legend from "../Legend"
import type { LegendGroup } from "../types/legendTypes"
import { createDefaultAnnotationRules } from "../charts/shared/annotationRules"

interface OrdinalSVGOverlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  scales: OrdinalScales | null

  // Axes
  showAxes?: boolean
  oLabel?: string
  rLabel?: string
  oFormat?: (d: string) => string
  rFormat?: (d: number) => string

  // Grid
  showGrid?: boolean

  // Title
  title?: string | ReactNode

  // Legend
  legend?: ReactNode | { legendGroups: LegendGroup[] }

  // Foreground graphics
  foregroundGraphics?: ReactNode

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
    oLabel,
    rLabel,
    oFormat,
    rFormat,
    showGrid,
    title,
    legend,
    foregroundGraphics,
    annotations,
    svgAnnotationRules,
    annotationFrame,
    xAccessor: annXAccessor,
    yAccessor: annYAccessor,
    annotationData,
    children
  } = props

  const isRadial = scales?.projection === "radial"
  const isHorizontal = scales?.projection === "horizontal"

  // Category labels (band scale)
  const categoryTicks = useMemo(() => {
    if (!showAxes || !scales || isRadial) return []
    return scales.o.domain().map(cat => ({
      value: cat,
      pixel: (scales.o(cat) ?? 0) + scales.o.bandwidth() / 2,
      label: oFormat ? oFormat(cat) : cat
    }))
  }, [showAxes, scales, oFormat, isRadial])

  // Value ticks (linear scale)
  const valueTicks = useMemo(() => {
    if (!showAxes || !scales || isRadial) return []
    return scales.r.ticks(5).map(v => ({
      value: v,
      pixel: scales.r(v),
      label: (rFormat || defaultRFormat)(v)
    }))
  }, [showAxes, scales, rFormat, isRadial])

  // Annotations
  const renderedAnnotations = useMemo(() => {
    if (!annotations || annotations.length === 0) return null

    const defaultRules = createDefaultAnnotationRules("ordinal")

    // Expose both ordinal (o) and range (r) scales properly.
    // For vertical bars: x = category center (o + bandwidth/2), y = value (r)
    // For horizontal bars: x = value (r), y = category center (o + bandwidth/2)
    const isHoriz = scales?.projection === "horizontal"
    const oCentered = scales?.o
      ? ((v: any) => (scales.o(v) ?? 0) + scales.o.bandwidth() / 2) as any
      : null

    const context: AnnotationContext = {
      scales: scales
        ? {
            x: isHoriz ? scales.r : (oCentered || scales.r),
            y: isHoriz ? (oCentered || scales.r) : scales.r,
            time: scales.r,
            value: scales.r,
          }
        : null,
      timeAxis: "x",
      xAccessor: annXAccessor,
      yAccessor: annYAccessor,
      width,
      height,
      data: annotationData,
      frameType: "ordinal"
    }

    return annotations
      .map((annotation, i) => {
        if (svgAnnotationRules) {
          const userResult = svgAnnotationRules(annotation, i, context)
          if (userResult !== null && userResult !== undefined) return userResult
          return defaultRules(annotation, i, context)
        }
        return defaultRules(annotation, i, context)
      })
      .filter(Boolean)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations, svgAnnotationRules, width, height, annotationFrame, annXAccessor, annYAccessor, annotationData])

  const hasContent = showAxes || title || legend || foregroundGraphics || (renderedAnnotations && renderedAnnotations.length > 0) || showGrid || children
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
        {showGrid && scales && !isRadial && (
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
        {showAxes && scales && !isRadial && (
          <g className="ordinal-axes">
            {isHorizontal ? (
              <>
                {/* Horizontal: categories on left, values on bottom */}
                {/* Category axis (left) */}
                <line x1={0} y1={0} x2={0} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                {categoryTicks.map((tick, i) => (
                  <g key={`cat-${i}`} transform={`translate(0,${tick.pixel})`}>
                    <line x2={-5} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                    <text
                      x={-8}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontSize={10}
                      fill="var(--semiotic-text-secondary, #666)"
                      style={{ userSelect: "none" }}
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}
                {oLabel && (
                  <text
                    x={-margin.left + 15}
                    y={height / 2}
                    textAnchor="middle"
                    fontSize={12}
                    fill="var(--semiotic-text, #333)"
                    transform={`rotate(-90, ${-margin.left + 15}, ${height / 2})`}
                    style={{ userSelect: "none" }}
                  >
                    {oLabel}
                  </text>
                )}

                {/* Value axis (bottom) */}
                <line x1={0} y1={height} x2={width} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                {valueTicks.map((tick, i) => (
                  <g key={`val-${i}`} transform={`translate(${tick.pixel},${height})`}>
                    <line y2={5} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                    <text
                      y={18}
                      textAnchor="middle"
                      fontSize={10}
                      fill="var(--semiotic-text-secondary, #666)"
                      style={{ userSelect: "none" }}
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}
                {rLabel && (
                  <text
                    x={width / 2}
                    y={height + 40}
                    textAnchor="middle"
                    fontSize={12}
                    fill="var(--semiotic-text, #333)"
                    style={{ userSelect: "none" }}
                  >
                    {rLabel}
                  </text>
                )}
              </>
            ) : (
              <>
                {/* Vertical: categories on bottom, values on left */}
                {/* Category axis (bottom) */}
                <line x1={0} y1={height} x2={width} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                {categoryTicks.map((tick, i) => (
                  <g key={`cat-${i}`} transform={`translate(${tick.pixel},${height})`}>
                    <line y2={5} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                    <text
                      y={18}
                      textAnchor="middle"
                      fontSize={10}
                      fill="var(--semiotic-text-secondary, #666)"
                      style={{ userSelect: "none" }}
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}
                {oLabel && (
                  <text
                    x={width / 2}
                    y={height + 40}
                    textAnchor="middle"
                    fontSize={12}
                    fill="var(--semiotic-text, #333)"
                    style={{ userSelect: "none" }}
                  >
                    {oLabel}
                  </text>
                )}

                {/* Value axis (left) */}
                <line x1={0} y1={0} x2={0} y2={height} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                {valueTicks.map((tick, i) => (
                  <g key={`val-${i}`} transform={`translate(0,${tick.pixel})`}>
                    <line x2={-5} stroke="var(--semiotic-border, #ccc)" strokeWidth={1} />
                    <text
                      x={-8}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontSize={10}
                      fill="var(--semiotic-text-secondary, #666)"
                      style={{ userSelect: "none" }}
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
                    fontSize={12}
                    fill="var(--semiotic-text, #333)"
                    transform={`rotate(-90, ${-margin.left + 15}, ${height / 2})`}
                    style={{ userSelect: "none" }}
                  >
                    {rLabel}
                  </text>
                )}
              </>
            )}
          </g>
        )}

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
            ? <Legend legendGroups={legend.legendGroups} title="" width={100} />
            : (legend as ReactNode)}
        </g>
      )}
    </svg>
  )
}
