"use client"
import * as React from "react"
import { useMemo } from "react"
import type { StreamScales, AnnotationContext } from "./types"
import type { ReactNode } from "react"

interface SVGOverlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  scales: StreamScales | null

  // Axes
  showAxes?: boolean
  xLabel?: string
  yLabel?: string
  xFormat?: (d: any) => string
  yFormat?: (d: any) => string

  // Grid
  showGrid?: boolean

  // Title
  title?: string | ReactNode

  // Legend
  legend?: ReactNode

  // Annotations
  annotations?: Record<string, any>[]
  svgAnnotationRules?: (
    annotation: Record<string, any>,
    index: number,
    context: AnnotationContext
  ) => ReactNode
  annotationFrame?: number

  children?: ReactNode
}

function defaultTickFormat(v: number): string {
  return String(Math.round(v * 100) / 100)
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
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    showGrid,
    title,
    legend,
    annotations,
    svgAnnotationRules,
    annotationFrame,
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
    if (!annotations || annotations.length === 0 || !svgAnnotationRules) return null
    return annotations
      .map((annotation, i) =>
        svgAnnotationRules(annotation, i, {
          scales: scales ? { time: scales.x, value: scales.y } : null,
          timeAxis: "x",
          width,
          height
        })
      )
      .filter(Boolean)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations, svgAnnotationRules, width, height, annotationFrame])

  const hasContent = showAxes || title || legend || (renderedAnnotations && renderedAnnotations.length > 0) || showGrid || children

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
                stroke="#e0e0e0"
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
                stroke="#e0e0e0"
                strokeWidth={1}
              />
            ))}
          </g>
        )}

        {/* Axes */}
        {showAxes && scales && (
          <g className="stream-axes">
            {/* X axis */}
            <line x1={0} y1={height} x2={width} y2={height} stroke="#ccc" strokeWidth={1} />
            {xTicks.map((tick, i) => (
              <g key={`xtick-${i}`} transform={`translate(${tick.pixel},${height})`}>
                <line y2={5} stroke="#ccc" strokeWidth={1} />
                <text
                  y={18}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#666"
                  style={{ userSelect: "none" }}
                >
                  {tick.label}
                </text>
              </g>
            ))}
            {xLabel && (
              <text
                x={width / 2}
                y={height + 40}
                textAnchor="middle"
                fontSize={12}
                fill="#333"
                style={{ userSelect: "none" }}
              >
                {xLabel}
              </text>
            )}

            {/* Y axis */}
            <line x1={0} y1={0} x2={0} y2={height} stroke="#ccc" strokeWidth={1} />
            {yTicks.map((tick, i) => (
              <g key={`ytick-${i}`} transform={`translate(0,${tick.pixel})`}>
                <line x2={-5} stroke="#ccc" strokeWidth={1} />
                <text
                  x={-8}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={10}
                  fill="#666"
                  style={{ userSelect: "none" }}
                >
                  {tick.label}
                </text>
              </g>
            ))}
            {yLabel && (
              <text
                x={-margin.left + 15}
                y={height / 2}
                textAnchor="middle"
                fontSize={12}
                fill="#333"
                transform={`rotate(-90, ${-margin.left + 15}, ${height / 2})`}
                style={{ userSelect: "none" }}
              >
                {yLabel}
              </text>
            )}
          </g>
        )}

        {/* Annotations */}
        {renderedAnnotations}

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
          fill="#333"
          style={{ userSelect: "none" }}
        >
          {typeof title === "string" ? title : null}
        </text>
      )}

      {/* Legend */}
      {legend && (
        <g transform={`translate(${totalWidth - margin.right + 10}, ${margin.top})`}>
          {legend}
        </g>
      )}
    </svg>
  )
}
