import type { Datum } from "../charts/shared/datumTypes"
/**
 * Static annotation rendering for server-side SVG.
 *
 * Supports common annotation types without DOM or React hooks.
 * Converts data coordinates to pixels using provided scales.
 */

import * as React from "react"
import Annotation from "../Annotation"
import type { SemioticTheme } from "../store/ThemeStore"
import { applyAnnotationEmphasis, type AnnotationRenderPair } from "../charts/shared/annotationHierarchy"
import type { AnnotationContext } from "../realtime/types"
import { annotationLayout, type AutoPlaceAnnotations } from "../recipes/annotationLayout"

/** Resolve annotation color: explicit > theme annotation > theme text */
function resolveAnnotationColor(ann: Datum, theme: SemioticTheme): string {
  return ann.color || theme.colors.annotation || theme.colors.text
}

interface AnnotationScales {
  x?: (v: any) => number
  y?: (v: any) => number
  /** For ordinal charts: band scale */
  o?: { (v: string): number | undefined; bandwidth?: () => number }
  /** For ordinal charts: value scale */
  r?: (v: number) => number
  /**
   * For geo charts: projects [lon, lat] → [x, y] pixel coords. Set by
   * `renderGeoFrame` from the resolved `GeoPipelineStore` projection.
   * Annotations that carry `coordinates: [lon, lat]` resolve through this.
   */
  geoProjection?: (coords: [number, number]) => [number, number] | null
}

interface AnnotationLayout {
  width: number
  height: number
}

export interface StaticAnnotationConfig {
  annotations?: Datum[]
  autoPlaceAnnotations?: AutoPlaceAnnotations
  scales: AnnotationScales
  layout: AnnotationLayout
  theme: SemioticTheme
  /** ID prefix for multi-chart documents */
  idPrefix?: string
  xAccessor?: string
  yAccessor?: string
  /** Ordinal projection — determines whether r maps to x or y */
  projection?: "vertical" | "horizontal" | "radial"
}

/**
 * Resolve the (x, y) pixel for an annotation. Order:
 *   1. `coordinates: [lon, lat]` + `geoProjection` (geo frame)
 *   2. `x`/`y` data values + `scales.x`/`scales.y` (XY/ordinal frames)
 *   3. accessor lookup on the annotation
 *   4. raw `x`/`y` numbers as pixel passthrough (network frame, or any
 *      annotation pre-projected to pixel coords by the caller)
 */
function resolveCoords(
  ann: Datum,
  scales: AnnotationScales,
  xAccessor?: string,
  yAccessor?: string
): { x: number | null; y: number | null } {
  // Geo projection first — coordinates is the documented field for geo
  // annotations and bypasses the x/y scale entirely.
  if (Array.isArray(ann.coordinates) && ann.coordinates.length >= 2 && scales.geoProjection) {
    const projected = scales.geoProjection([ann.coordinates[0], ann.coordinates[1]])
    if (projected) return { x: projected[0], y: projected[1] }
  }

  return { x: resolveXPixel(ann, scales, xAccessor), y: resolveYPixel(ann, scales, yAccessor) }
}

function resolveXPixel(
  ann: Datum,
  scales: AnnotationScales,
  xAccessor?: string
): number | null {
  if (ann.x != null && scales.x) return scales.x(ann.x)
  if (xAccessor && ann[xAccessor] != null && scales.x) return scales.x(ann[xAccessor])
  // Pixel passthrough for frames without a continuous x scale (e.g. network)
  // or annotations that have already been projected by the caller.
  if (typeof ann.x === "number") return ann.x
  return null
}

function resolveYPixel(
  ann: Datum,
  scales: AnnotationScales,
  yAccessor?: string
): number | null {
  if (ann.y != null && scales.y) return scales.y(ann.y)
  if (yAccessor && ann[yAccessor] != null && scales.y) return scales.y(ann[yAccessor])
  if (typeof ann.y === "number") return ann.y
  return null
}

/**
 * Render annotations as static SVG elements.
 */
export function renderStaticAnnotations(config: StaticAnnotationConfig): React.ReactNode {
  const { annotations } = config
  if (!annotations || annotations.length === 0) return null

  const layoutAnnotations = config.autoPlaceAnnotations
    ? annotationLayout({
        annotations,
        context: {
          scales: {
            x: config.scales.x,
            y: config.scales.y,
            time: config.scales.x,
            value: config.scales.y,
            o: config.scales.o,
            geoProjection: config.scales.geoProjection,
          } as unknown as AnnotationContext["scales"],
          width: config.layout.width,
          height: config.layout.height,
          xAccessor: config.xAccessor,
          yAccessor: config.yAccessor,
          frameType: config.projection ? "ordinal" : "xy",
          projection: config.projection === "horizontal" ? "horizontal" : "vertical",
        },
        ...(typeof config.autoPlaceAnnotations === "object" ? config.autoPlaceAnnotations : {}),
      })
    : annotations

  const pairs: AnnotationRenderPair[] = []

  for (let i = 0; i < layoutAnnotations.length; i++) {
    const node = renderAnnotation(layoutAnnotations[i], i, config)
    if (node) pairs.push({ node, annotation: layoutAnnotations[i] })
  }

  const elements = applyAnnotationEmphasis(pairs)
  const pfx = config.idPrefix ? `${config.idPrefix}-` : ""
  return elements.length > 0 ? <g id={`${pfx}annotations`} className="semiotic-annotations">{elements}</g> : null
}

function renderAnnotation(
  ann: Datum,
  index: number,
  config: StaticAnnotationConfig,
): React.ReactNode | null {
  const { scales, layout, theme, xAccessor, yAccessor } = config
  switch (ann.type) {
    case "y-threshold": {
      const value = ann.value
      if (value == null) return null
      const color = resolveAnnotationColor(ann, theme)
      const label = ann.label
      const labelPos = ann.labelPosition || "right"
      const dasharray = ann.strokeDasharray || "6,4"
      const lineWidth = ann.strokeWidth ?? 1.5

      // For horizontal ordinal charts, r maps to x — draw a vertical threshold line
      if (config.projection === "horizontal" && scales.r) {
        const px = scales.r(value)
        if (px == null) return null
        return (
          <g key={`ann-ythresh-${index}`}>
            <line x1={px} y1={0} x2={px} y2={layout.height}
              stroke={color} strokeWidth={lineWidth} strokeDasharray={dasharray} />
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
            stroke={color} strokeWidth={lineWidth} strokeDasharray={dasharray}
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
      const color = resolveAnnotationColor(ann, theme)
      const label = ann.label
      const labelPos = ann.labelPosition || "top"
      const dasharray = ann.strokeDasharray || "6,4"
      const lineWidth = ann.strokeWidth ?? 1.5
      return (
        <g key={`ann-xthresh-${index}`}>
          <line
            x1={px} y1={0} x2={px} y2={layout.height}
            stroke={color} strokeWidth={lineWidth} strokeDasharray={dasharray}
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
      const fill = ann.fill || resolveAnnotationColor(ann, theme)
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
      const color = resolveAnnotationColor(ann, theme)
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
    case "callout":
    case "callout-circle":
    case "callout-rect":
    case "text": {
      // Use resolveCoords so geo annotations with `coordinates: [lon, lat]`
      // and network annotations with raw pixel x/y both flow through.
      const { x: px, y: py } = resolveCoords(ann, scales, xAccessor, yAccessor)
      if (px == null || py == null) return null
      const isText = ann.type === "text"
      const dx = ann.dx ?? (isText ? 0 : 30)
      const dy = ann.dy ?? (isText ? 0 : -30)
      const color = ann.color || theme.colors.text
      if (!isText) {
        const renderedType = ann.type === "callout" ? "callout-circle" : ann.type
        const subject =
          renderedType === "callout-circle"
            ? { radius: ann.radius ?? 12, radiusPadding: ann.radiusPadding }
            : renderedType === "callout-rect"
              ? { width: ann.width, height: ann.height }
              : undefined
        return (
          <Annotation
            key={`ann-label-${index}`}
            noteData={{
              x: px,
              y: py,
              dx,
              dy,
              note: {
                label: ann.label,
                title: ann.title,
                wrap: ann.wrap || 120,
              },
              type: renderedType,
              ...(subject ? { subject } : {}),
              connector: ann.connector || { end: "arrow" },
              color,
              disable: ann.disable,
              opacity: ann.opacity,
              strokeDasharray: ann.strokeDasharray,
              className: ann.className,
            }}
          />
        )
      }
      return (
        <g key={`ann-label-${index}`}>
          <text
            x={px + dx}
            y={py + dy}
            textAnchor={ann.textAnchor || "start"}
            fontSize={ann.fontSize || theme.typography.labelSize}
            fill={color}
            fontFamily={theme.typography.fontFamily}
            fontWeight={ann.fontWeight}
            opacity={ann.opacity}
            strokeDasharray={ann.strokeDasharray}
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
