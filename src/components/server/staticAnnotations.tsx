/**
 * Static annotation rendering for server-side SVG.
 *
 * Supports common annotation types without DOM or React hooks.
 * Converts data coordinates to pixels using provided scales.
 */

import * as React from "react"
import type { SemioticTheme } from "../store/ThemeStore"

interface AnnotationScales {
  x?: (v: any) => number
  y?: (v: any) => number
  /** For ordinal charts: band scale */
  o?: { (v: string): number | undefined; bandwidth?: () => number }
  /** For ordinal charts: value scale */
  r?: (v: number) => number
}

interface AnnotationLayout {
  width: number
  height: number
}

export interface StaticAnnotationConfig {
  annotations: Record<string, any>[]
  scales: AnnotationScales
  layout: AnnotationLayout
  theme: SemioticTheme
  xAccessor?: string
  yAccessor?: string
  /** Ordinal projection — determines whether r maps to x or y */
  projection?: "vertical" | "horizontal" | "radial"
}

function resolveXPixel(
  ann: Record<string, any>,
  scales: AnnotationScales,
  xAccessor?: string
): number | null {
  if (ann.x != null && scales.x) return scales.x(ann.x)
  if (xAccessor && ann[xAccessor] != null && scales.x) return scales.x(ann[xAccessor])
  return null
}

function resolveYPixel(
  ann: Record<string, any>,
  scales: AnnotationScales,
  yAccessor?: string
): number | null {
  if (ann.y != null && scales.y) return scales.y(ann.y)
  if (yAccessor && ann[yAccessor] != null && scales.y) return scales.y(ann[yAccessor])
  return null
}

/**
 * Render annotations as static SVG elements.
 */
export function renderStaticAnnotations(config: StaticAnnotationConfig): React.ReactNode {
  const { annotations } = config
  if (!annotations || annotations.length === 0) return null

  const elements: React.ReactNode[] = []

  for (let i = 0; i < annotations.length; i++) {
    const node = renderAnnotation(annotations[i], i, config)
    if (node) elements.push(node)
  }

  return elements.length > 0 ? <g className="semiotic-annotations">{elements}</g> : null
}

function renderAnnotation(
  ann: Record<string, any>,
  index: number,
  config: StaticAnnotationConfig,
): React.ReactNode | null {
  const { scales, layout, theme, xAccessor, yAccessor } = config
  switch (ann.type) {
    case "y-threshold": {
      const value = ann.value
      if (value == null) return null
      const color = ann.color || theme.colors.primary
      const label = ann.label
      const labelPos = ann.labelPosition || "right"
      const dasharray = ann.strokeDasharray || "6,4"

      // For horizontal ordinal charts, r maps to x — draw a vertical threshold line
      if (config.projection === "horizontal" && scales.r) {
        const px = scales.r(value)
        if (px == null) return null
        return (
          <g key={`ann-ythresh-${index}`}>
            <line x1={px} y1={0} x2={px} y2={layout.height}
              stroke={color} strokeWidth={1.5} strokeDasharray={dasharray} />
            {label && (
              <text x={px + 4} y={12} textAnchor="start"
                fontSize={theme.typography.tickSize} fill={color} fontFamily={theme.typography.fontFamily}>
                {label}
              </text>
            )}
          </g>
        )
      }

      // Default: horizontal line (vertical ordinal or XY)
      const py = scales.y ? scales.y(value) : scales.r ? scales.r(value) : null
      if (py == null) return null
      return (
        <g key={`ann-ythresh-${index}`}>
          <line
            x1={0} y1={py} x2={layout.width} y2={py}
            stroke={color} strokeWidth={1.5} strokeDasharray={dasharray}
          />
          {label && (
            <text
              x={labelPos === "left" ? 4 : labelPos === "center" ? layout.width / 2 : layout.width - 4}
              y={py - 6}
              textAnchor={labelPos === "left" ? "start" : labelPos === "center" ? "middle" : "end"}
              fontSize={theme.typography.tickSize}
              fill={color}
              fontFamily={theme.typography.fontFamily}
            >
              {label}
            </text>
          )}
        </g>
      )
    }

    case "x-threshold": {
      const value = ann.value
      if (value == null || !scales.x) return null
      const px = scales.x(value)
      if (px == null) return null
      const color = ann.color || theme.colors.primary
      const label = ann.label
      const labelPos = ann.labelPosition || "top"
      const dasharray = ann.strokeDasharray || "6,4"
      return (
        <g key={`ann-xthresh-${index}`}>
          <line
            x1={px} y1={0} x2={px} y2={layout.height}
            stroke={color} strokeWidth={1.5} strokeDasharray={dasharray}
          />
          {label && (
            <text
              x={px + 4}
              y={labelPos === "bottom" ? layout.height - 4 : labelPos === "center" ? layout.height / 2 : 12}
              textAnchor="start"
              fontSize={theme.typography.tickSize}
              fill={color}
              fontFamily={theme.typography.fontFamily}
            >
              {label}
            </text>
          )}
        </g>
      )
    }

    case "band": {
      const y0 = ann.y0 != null && scales.y ? scales.y(ann.y0) : null
      const y1 = ann.y1 != null && scales.y ? scales.y(ann.y1) : null
      if (y0 == null || y1 == null) return null
      const top = Math.min(y0, y1)
      const height = Math.abs(y1 - y0)
      const fill = ann.fill || ann.color || theme.colors.primary
      const opacity = ann.opacity ?? 0.1
      return (
        <g key={`ann-band-${index}`}>
          <rect
            x={0} y={top} width={layout.width} height={height}
            fill={fill} opacity={opacity}
          />
          {ann.label && (
            <text
              x={layout.width - 4} y={top + 12}
              textAnchor="end"
              fontSize={theme.typography.tickSize}
              fill={fill}
              fontFamily={theme.typography.fontFamily}
            >
              {ann.label}
            </text>
          )}
        </g>
      )
    }

    case "category-highlight": {
      if (!ann.category || !scales.o) return null
      const oVal = scales.o(ann.category)
      if (oVal == null) return null
      const bandwidth = scales.o.bandwidth ? scales.o.bandwidth() : 40
      const color = ann.color || theme.colors.primary
      const opacity = ann.opacity ?? 0.1
      // Horizontal ordinal: highlight across Y band
      if (config.projection === "horizontal") {
        return (
          <rect
            key={`ann-cathighlight-${index}`}
            x={0} y={oVal} width={layout.width} height={bandwidth}
            fill={color} opacity={opacity}
          />
        )
      }
      return (
        <rect
          key={`ann-cathighlight-${index}`}
          x={oVal} y={0} width={bandwidth} height={layout.height}
          fill={color} opacity={opacity}
        />
      )
    }

    case "label":
    case "text": {
      const px = resolveXPixel(ann, scales, xAccessor)
      const py = resolveYPixel(ann, scales, yAccessor)
      if (px == null || py == null) return null
      const dx = ann.dx || 0
      const dy = ann.dy || 0
      const color = ann.color || theme.colors.text
      return (
        <g key={`ann-label-${index}`}>
          {ann.type === "label" && (
            <line
              x1={px} y1={py} x2={px + dx} y2={py + dy}
              stroke={theme.colors.textSecondary}
              strokeWidth={1}
            />
          )}
          <text
            x={px + dx}
            y={py + dy}
            textAnchor={ann.textAnchor || "start"}
            fontSize={ann.fontSize || theme.typography.labelSize}
            fill={color}
            fontFamily={theme.typography.fontFamily}
            fontWeight={ann.fontWeight}
          >
            {ann.label || ann.title}
          </text>
        </g>
      )
    }

    case "highlight": {
      // Highlight matching data points — skip in static render (no data refs)
      return null
    }

    default:
      return null
  }
}
