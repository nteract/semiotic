"use client"
import type { Datum } from "../charts/shared/datumTypes"
import type { OnObservationCallback } from "../store/ObservationStore"
import {
  useAnnotationActivationOptions,
  type OnAnnotationActivateCallback
} from "../charts/shared/annotationActivation"
import * as React from "react"
import { useMemo, useRef } from "react"
import type { ReactNode } from "react"
import type { AnnotationContext } from "../realtime/types"
import type {
  GradientLegendConfig,
  LegendGroup,
  LegendLayout
} from "../types/legendTypes"
import {
  createDefaultAnnotationRules,
  renderAnnotationPass
} from "../charts/shared/annotationRules"
import {
  annotationLayout,
  type AutoPlaceAnnotations
} from "../recipes/annotationLayout"
import { filterAnnotationsByStatus } from "../ai/annotationProvenance"
import { renderLegendFromConfig } from "./legendRenderer"
import { TITLE_BASELINE } from "./titleLayout"

interface GeoSVGOverlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }

  /**
   * Geo has no Cartesian axis scale, but this remains part of the internal
   * contract because StreamGeoFrame historically used it to request an empty
   * accessible overlay shell.
   */
  showAxes?: boolean

  title?: string | ReactNode

  legend?: ReactNode | { legendGroups: LegendGroup[] } | { gradient: GradientLegendConfig }
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout

  foregroundGraphics?: ReactNode

  annotations?: Datum[]
  onAnnotationActivate?: OnAnnotationActivateCallback
  onObservation?: OnObservationCallback
  chartId?: string
  chartType?: string
  autoPlaceAnnotations?: AutoPlaceAnnotations
  /**
   * Custom SVG annotation renderer. Same contract as XY/ordinal
   * `svgAnnotationRules`. Runs after geographic `coordinates` are projected
   * to pixel `x`/`y`, so rules can use the shared pixel-scale context.
   */
  svgAnnotationRules?: (
    annotation: Datum,
    index: number,
    context: AnnotationContext
  ) => ReactNode
  pointNodes?: { pointId?: string; x: number; y: number; r: number }[]
  /** Project geographic `[longitude, latitude]` annotation coordinates. */
  geoProjection?: (longitude: number, latitude: number) => [number, number] | null
}

/**
 * The SVG chrome used by StreamGeoFrame.
 *
 * Geo previously imported the Cartesian SVGOverlay even though it never
 * supplies scales, marginal graphics, grids, or linked-crosshair state. Keep
 * the subset Geo actually exercises here so those XY-only dependencies do not
 * enter the Geo bundle.
 */
export function GeoSVGOverlay(props: GeoSVGOverlayProps) {
  const {
    width,
    height,
    totalWidth,
    totalHeight,
    margin,
    showAxes,
    title,
    legend,
    legendHoverBehavior,
    legendClickBehavior,
    legendHighlightedCategory,
    legendIsolatedCategories,
    legendPosition,
    legendLayout,
    foregroundGraphics,
    annotations,
    onAnnotationActivate,
    onObservation,
    chartId,
    chartType,
    autoPlaceAnnotations,
    svgAnnotationRules,
    pointNodes,
    geoProjection,
  } = props
  const annotationActivation = useAnnotationActivationOptions({
    onAnnotationActivate,
    onObservation,
    chartId,
    chartType
  })

  // Match SVGOverlay's sticky annotation lifetime: retain placements across
  // rerenders, but reset the index-keyed cache when the annotation count moves.
  const stickyStateRef = useRef<
    [number, Map<number, { x: number; y: number }>]
  >([annotations?.length ?? 0, new Map()])
  const currentLen = annotations?.length ?? 0
  if (stickyStateRef.current[0] !== currentLen) {
    stickyStateRef.current = [currentLen, new Map()]
  }

  const renderedAnnotations = useMemo(() => {
    if (!annotations || annotations.length === 0) return null
    const visibleAnnotations = filterAnnotationsByStatus(annotations)

    // Geo annotations use the public `coordinates: [lon, lat]` form. The
    // generic annotation rules deliberately only understand pixel x/y, so
    // project that form before handing annotations to them. SSR already did
    // this in staticAnnotations; this closes the client-only gap.
    const projectedAnnotations = geoProjection
      ? visibleAnnotations.map((annotation) => {
          if (!Array.isArray(annotation.coordinates) || annotation.coordinates.length < 2) return annotation
          const projected = geoProjection(Number(annotation.coordinates[0]), Number(annotation.coordinates[1]))
          return projected ? { ...annotation, x: projected[0], y: projected[1] } : annotation
        })
      : visibleAnnotations

    // These values deliberately mirror the context Geo received through the
    // Cartesian overlay. Geo x/y values here are already pixels (including
    // the projected `coordinates` form above), so identity scales let the
    // shared resolver consume them without treating them as data-space values.
    const context: AnnotationContext = {
      scales: {
        x: (value: unknown) => Number(value),
        y: (value: unknown) => Number(value),
      } as unknown as AnnotationContext["scales"],
      timeAxis: "x",
      width,
      height,
      frameType: "xy",
      pointNodes,
      stickyPositionCache: stickyStateRef.current[1]
    }
    const layoutAnnotations = autoPlaceAnnotations
      ? annotationLayout({
          annotations: projectedAnnotations,
          context,
          ...(typeof autoPlaceAnnotations === "object"
            ? autoPlaceAnnotations
            : {})
        })
      : projectedAnnotations

    return renderAnnotationPass(
      layoutAnnotations,
      createDefaultAnnotationRules("xy", annotationActivation),
      svgAnnotationRules,
      context
    )
  }, [annotations, autoPlaceAnnotations, svgAnnotationRules, width, height, pointNodes, annotationActivation, geoProjection])

  const hasContent =
    showAxes ||
    title ||
    legend ||
    foregroundGraphics ||
    (renderedAnnotations && renderedAnnotations.length > 0)

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
      <desc>
        {typeof title === "string"
          ? title + " (XY data visualization)"
          : "XY data visualization"}
      </desc>
      <g transform={"translate(" + margin.left + "," + margin.top + ")"}>
        {renderedAnnotations}
        {foregroundGraphics}
      </g>

      {title && typeof title === "string" ? (
        <text
          x={totalWidth / 2}
          y={TITLE_BASELINE}
          textAnchor="middle"
          fontWeight="bold"
          fill="var(--semiotic-text, #333)"
          className="semiotic-chart-title"
          style={{
            userSelect: "none",
            fontSize: "var(--semiotic-title-font-size, 14px)"
          }}
        >
          {title}
        </text>
      ) : title ? (
        <foreignObject x={0} y={0} width={totalWidth} height={margin.top}>
          {title}
        </foreignObject>
      ) : null}

      {renderLegendFromConfig({
        legend,
        totalWidth,
        totalHeight,
        margin,
        legendPosition,
        title,
        legendLayout,
        legendHoverBehavior,
        legendClickBehavior,
        legendHighlightedCategory,
        legendIsolatedCategories
      })}
    </svg>
  )
}
