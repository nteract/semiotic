"use client"

/**
 * SVG chrome layer for StreamPhysicsFrame — title, legend, and annotations.
 * Mirrors NetworkSVGOverlay: no axes/grid (physics is pixel-space), but
 * honors the same annotation + auto-place + legend contracts as other frames.
 */
import type { Datum } from "../../charts/shared/datumTypes"
import * as React from "react"
import type { ReactNode } from "react"
import { scaleLinear } from "d3-scale"
import type { LegendGroup, GradientLegendConfig, LegendLayout } from "../../types/legendTypes"
import { renderLegendFromConfig } from "../legendRenderer"
import { ANNOTATION_DISCLOSURE_REVEAL_CSS } from "../../charts/shared/annotationHierarchy"
import {
  createDefaultAnnotationRules,
  renderAnnotationPass
} from "../../charts/shared/annotationRules"
import {
  annotationLayout,
  type AutoPlaceAnnotations
} from "../../recipes/annotationLayout"
import type { AnnotationContext } from "../../realtime/types"
import type { PhysicsBodyState } from "./PhysicsKernel"

export type PhysicsAnnotationAnchorNode = {
  pointId?: string
  x: number
  y: number
  r: number
}

function bodyRadius(body: PhysicsBodyState): number {
  if (body.shape.type === "circle") return body.shape.radius
  return Math.max(body.shape.width, body.shape.height) / 2
}

export function bodiesToAnnotationAnchors(
  bodies: readonly PhysicsBodyState[]
): PhysicsAnnotationAnchorNode[] {
  return bodies.map((body) => ({
    pointId: body.id,
    x: body.x,
    y: body.y,
    r: Math.max(1, bodyRadius(body))
  }))
}

export interface PhysicsSVGOverlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  title?: string | ReactNode
  legend?:
    | ReactNode
    | { legendGroups: LegendGroup[] }
    | { gradient: GradientLegendConfig }
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout
  /** Live body anchors for pointId / bodyId annotations. */
  pointNodes?: PhysicsAnnotationAnchorNode[]
  annotations?: Datum[]
  autoPlaceAnnotations?: AutoPlaceAnnotations
  svgAnnotationRules?: (
    annotation: Datum,
    index: number,
    context: AnnotationContext
  ) => ReactNode
  /** Optional foreground SVG already composed into the frame stack. */
  children?: ReactNode
}

/**
 * Pixel-space annotation context: identity scales so raw `x`/`y` on notes
 * read as canvas coordinates (physics has no data→pixel scale).
 */
export function buildPhysicsAnnotationContext(options: {
  width: number
  height: number
  pointNodes?: PhysicsAnnotationAnchorNode[]
  data?: Datum[]
}): AnnotationContext {
  const { width, height, pointNodes = [], data } = options
  const x = scaleLinear().domain([0, Math.max(1, width)]).range([0, Math.max(1, width)])
  const y = scaleLinear().domain([0, Math.max(1, height)]).range([0, Math.max(1, height)])
  return {
    scales: { x, y },
    width,
    height,
    frameType: "network",
    pointNodes,
    data,
    xAccessor: "x",
    yAccessor: "y"
  }
}

/**
 * Normalize common physics annotation aliases onto Semiotic annotation shapes.
 * - `bodyId` → `pointId` (anchor to a live body)
 * - physics barrier/sensor notes still paint as x/y-threshold when typed that way
 */
export function normalizePhysicsAnnotations(
  annotations: Datum[] | undefined
): Datum[] | undefined {
  if (!annotations?.length) return annotations
  return annotations.map((ann) => {
    if (ann.pointId != null || ann.bodyId == null) return ann
    return { ...ann, pointId: String(ann.bodyId) }
  })
}

export function PhysicsSVGOverlay(props: PhysicsSVGOverlayProps) {
  const {
    width,
    height,
    totalWidth,
    totalHeight,
    margin,
    title,
    legend,
    legendHoverBehavior,
    legendClickBehavior,
    legendHighlightedCategory,
    legendIsolatedCategories,
    legendPosition = "right",
    legendLayout,
    pointNodes = [],
    annotations,
    autoPlaceAnnotations,
    svgAnnotationRules,
    children
  } = props

  const normalized = React.useMemo(
    () => normalizePhysicsAnnotations(annotations),
    [annotations]
  )

  const annotationContext = React.useMemo(
    () =>
      buildPhysicsAnnotationContext({
        width,
        height,
        pointNodes
      }),
    [height, pointNodes, width]
  )

  const layoutAnnotations = React.useMemo(() => {
    if (!normalized || !autoPlaceAnnotations) return normalized
    return annotationLayout({
      annotations: normalized,
      context: annotationContext,
      ...(typeof autoPlaceAnnotations === "object" ? autoPlaceAnnotations : {})
    })
  }, [annotationContext, autoPlaceAnnotations, normalized])

  const defaultAnnotationRules = React.useMemo(
    () => createDefaultAnnotationRules("network"),
    []
  )

  const renderedSvgAnnotations = layoutAnnotations
    ? renderAnnotationPass(
        layoutAnnotations.filter((annotation) => annotation.type !== "widget"),
        defaultAnnotationRules,
        svgAnnotationRules,
        annotationContext
      )
    : null

  const hasDeferredWidget =
    layoutAnnotations?.some(
      (annotation) =>
        annotation.type === "widget" && annotation._annotationDeferred === true
    ) === true

  // Always paint an SVG shell so ChartContainer exportChart can find an
  // svg + canvas pair (PNG composites canvas under this overlay).
  return (
    <>
      {hasDeferredWidget ? (
        <style key="physics-annotation-disclosure-style">
          {ANNOTATION_DISCLOSURE_REVEAL_CSS}
        </style>
      ) : null}
      <svg
        className="stream-physics-frame__overlay"
        data-testid="stream-physics-overlay"
        role="presentation"
        width={totalWidth}
        height={totalHeight}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          overflow: "visible"
        }}
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {renderedSvgAnnotations}
          {children}
        </g>

        {title && typeof title === "string" ? (
          <text
            x={totalWidth / 2}
            y={16}
            textAnchor="middle"
            fontWeight={600}
            fill="var(--semiotic-text, #333)"
            className="semiotic-chart-title"
            style={{ fontSize: "var(--semiotic-title-font-size, 14px)" }}
          >
            {title}
          </text>
        ) : title ? (
          <foreignObject x={0} y={0} width={totalWidth} height={Math.max(margin.top, 28)}>
            {title}
          </foreignObject>
        ) : null}

        {legend
          ? renderLegendFromConfig({
              legend,
              totalWidth,
              totalHeight,
              margin,
              legendPosition,
              legendLayout,
              title,
              legendHoverBehavior,
              legendClickBehavior,
              legendHighlightedCategory,
              legendIsolatedCategories
            })
          : null}
      </svg>
    </>
  )
}

export default PhysicsSVGOverlay
