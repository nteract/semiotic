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
  pointNodes?: { pointId?: string; x: number; y: number; r: number }[]
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
    pointNodes
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

    // These values deliberately mirror the context Geo received through the
    // Cartesian overlay. Changing frameType or the accessibility strings would
    // alter existing annotation and SSR/CSR markup behavior.
    const context: AnnotationContext = {
      scales: null,
      timeAxis: "x",
      width,
      height,
      frameType: "xy",
      pointNodes,
      stickyPositionCache: stickyStateRef.current[1]
    }
    const layoutAnnotations = autoPlaceAnnotations
      ? annotationLayout({
          annotations,
          context,
          ...(typeof autoPlaceAnnotations === "object"
            ? autoPlaceAnnotations
            : {})
        })
      : annotations

    return renderAnnotationPass(
      layoutAnnotations,
      createDefaultAnnotationRules("xy", annotationActivation),
      undefined,
      context
    )
  }, [annotations, autoPlaceAnnotations, width, height, pointNodes, annotationActivation])

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
          ? title + " — XY data visualization"
          : "XY data visualization"}
      </desc>
      <g transform={"translate(" + margin.left + "," + margin.top + ")"}>
        {renderedAnnotations}
        {foregroundGraphics}
      </g>

      {title && (
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
          {typeof title === "string" ? title : null}
        </text>
      )}

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
