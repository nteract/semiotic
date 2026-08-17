"use client"

/**
 * SVG chrome layer for StreamPhysicsFrame — title, legend, and annotations.
 * Mirrors NetworkSVGOverlay: no axes/grid (physics is pixel-space), but
 * honors the same annotation + auto-place + legend contracts as other frames.
 */
import type { Datum } from "../../charts/shared/datumTypes"
import * as React from "react"
import type { ReactNode } from "react"
import type { LegendLayout, LegendValue } from "../../types/legendTypes"
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
import type { OnObservationCallback } from "../../store/ObservationStore"
import {
  useAnnotationActivationOptions,
  type OnAnnotationActivateCallback
} from "../../charts/shared/annotationActivation"
import { SVGChartTitle } from "../SVGChartTitle"
import {
  buildPhysicsAnnotationContext,
  normalizePhysicsAnnotations,
  type PhysicsAnnotationAnchorNode,
} from "./physicsAnnotationContext"

export {
  bodiesToAnnotationAnchors,
  buildPhysicsAnnotationContext,
  normalizePhysicsAnnotations,
} from "./physicsAnnotationContext"
export type { PhysicsAnnotationAnchorNode } from "./physicsAnnotationContext"

export interface PhysicsSVGOverlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  title?: string | ReactNode
  legend?: LegendValue
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout
  /** Live body anchors for pointId / bodyId annotations. */
  pointNodes?: PhysicsAnnotationAnchorNode[]
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
  /** Optional foreground SVG already composed into the frame stack. */
  children?: ReactNode
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
    onAnnotationActivate,
    onObservation,
    chartId,
    chartType,
    autoPlaceAnnotations,
    svgAnnotationRules,
    children
  } = props
  const annotationActivation = useAnnotationActivationOptions({
    onAnnotationActivate,
    onObservation,
    chartId,
    chartType
  })

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
    () => createDefaultAnnotationRules("network", annotationActivation),
    [annotationActivation]
  )

  const renderedSvgAnnotations = layoutAnnotations
    ? renderAnnotationPass(
        layoutAnnotations,
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

        <SVGChartTitle
          title={title}
          totalWidth={totalWidth}
          marginTop={Math.max(margin.top, 28)}
        />

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
