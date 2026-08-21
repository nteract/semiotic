"use client"
import type { Datum } from "../charts/shared/datumTypes"
import * as React from "react"
import type { ReactNode } from "react"
import type { NetworkLabel } from "./networkTypes"
import type { LegendLayout, LegendValue } from "../types/legendTypes"
import { renderLegendFromConfig } from "./legendRenderer"
import { ANNOTATION_DISCLOSURE_REVEAL_CSS } from "../charts/shared/annotationHierarchy"
import {
  createDefaultAnnotationRules,
  renderAnnotationPass,
} from "../charts/shared/annotationRules"
import { annotationLayout, type AutoPlaceAnnotations } from "../recipes/annotationLayout"
import { filterAnnotationsByStatus } from "../charts/shared/annotationStatusFilter"
import type { AnnotationContext } from "../realtime/types"
import { SVGChartTitle } from "./SVGChartTitle"
import {
  collectNetworkAnnotationAnchors,
  type NetworkAnnotationAnchorNode,
} from "./networkAnnotationAnchors"
import type { OnObservationCallback } from "../store/ObservationStore"
import {
  annotationActivationProps,
  useAnnotationActivationOptions,
  type OnAnnotationActivateCallback
} from "../charts/shared/annotationActivation"

type AnnotationAnchorNode = NetworkAnnotationAnchorNode

type NetworkAnnotationContext = AnnotationContext & { sceneNodes?: AnnotationAnchorNode[] }

export { nodeAnchorId, nodeCenter } from "./networkAnnotationAnchors"

export interface NetworkSVGOverlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }

  /** Labels from the layout plugin */
  labels: NetworkLabel[]

  /** Chart title */
  title?: string | ReactNode

  /** Legend configuration */
  legend?: LegendValue
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout

  /** User-provided SVG elements on top */
  foregroundGraphics?: ReactNode

  /** Scene nodes for annotation positioning */
  sceneNodes?: AnnotationAnchorNode[]

  /** Annotations */
  annotations?: Datum[]
  onAnnotationActivate?: OnAnnotationActivateCallback
  onObservation?: OnObservationCallback
  chartId?: string
  chartType?: string
  autoPlaceAnnotations?: AutoPlaceAnnotations
  svgAnnotationRules?: (
    annotation: Datum,
    index: number,
    context: NetworkAnnotationContext
  ) => ReactNode
  annotationFrame?: number
}

/**
 * SVG overlay for network charts — renders labels, title, legend, annotations.
 *
 * Unlike XY/ordinal overlays, network charts don't have axes or grid lines.
 * The overlay is positioned absolutely over the canvas.
 */
export function NetworkSVGOverlay(props: NetworkSVGOverlayProps) {
  const {
    width,
    height,
    totalWidth,
    totalHeight,
    margin,
    labels,
    title,
    legend,
    legendHoverBehavior,
    legendClickBehavior,
    legendHighlightedCategory,
    legendIsolatedCategories,
    legendPosition = "right",
    legendLayout,
    foregroundGraphics,
    sceneNodes,
    annotations,
    onAnnotationActivate,
    onObservation,
    chartId,
    chartType,
    autoPlaceAnnotations,
    svgAnnotationRules,
    annotationFrame: _annotationFrame
  } = props
  const annotationActivation = useAnnotationActivationOptions({
    onAnnotationActivate,
    onObservation,
    chartId,
    chartType
  })

  const annotationContext = React.useMemo<NetworkAnnotationContext>(() => {
    const pointNodes = collectNetworkAnnotationAnchors(sceneNodes) ?? []
    return {
      scales: null,
      width,
      height,
      frameType: "network",
      pointNodes,
      sceneNodes,
    }
  }, [height, sceneNodes, width])

  const layoutAnnotations = React.useMemo(() => {
    if (!annotations) return annotations
    const visible = filterAnnotationsByStatus(annotations)
    if (!autoPlaceAnnotations) return visible
    return annotationLayout({
      annotations: visible,
      context: annotationContext,
      ...(typeof autoPlaceAnnotations === "object" ? autoPlaceAnnotations : {}),
    })
  }, [annotations, autoPlaceAnnotations, annotationContext])

  // Build the default network annotation rules once, then run the shared
  // dispatch/filter/emphasis pass — the same path the XY and ordinal overlays
  // use. This is what makes `pointId`-anchored annotations (callout, label,
  // text, enclose, …) render out of the box on every network chart, including
  // custom layouts; a user `svgAnnotationRules` still overrides per annotation.
  const defaultAnnotationRules = React.useMemo(
    () => createDefaultAnnotationRules("network"),
    []
  )
  const renderedSvgAnnotations = layoutAnnotations
    ? renderAnnotationPass(
        // Widget annotations render as HTML divs below (so they can overflow the
        // SVG), so they're excluded from the SVG pass.
        layoutAnnotations.filter((annotation) => annotation.type !== "widget"),
        defaultAnnotationRules,
        svgAnnotationRules,
        annotationContext
      )
    : null
  const hasDeferredWidget = layoutAnnotations?.some(
    (annotation) => annotation.type === "widget" && annotation._annotationDeferred === true
  ) === true

  return (
    <>
    {hasDeferredWidget && (
      <style key="annotation-widget-disclosure-style">{ANNOTATION_DISCLOSURE_REVEAL_CSS}</style>
    )}
    <svg
      role="img"
      width={totalWidth}
      height={totalHeight}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none"
      }}
    >
      <title>{typeof title === "string" ? title : "Network Chart"}</title>
      <desc>
        {typeof title === "string"
          ? `${title} (network data visualization)`
          : "Network data visualization"}
      </desc>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* Labels */}
        {labels.map((label, i) => (
          <text
            key={`label-${i}`}
            x={label.x}
            y={label.y}
            textAnchor={label.anchor || "start"}
            dominantBaseline={(label.baseline || "middle") as React.SVGAttributes<SVGTextElement>["dominantBaseline"]}
            fontSize={label.fontSize || 11}
            fontWeight={label.fontWeight}
            fill={label.fill || "var(--semiotic-text, #333)"}
            stroke={label.stroke}
            strokeWidth={label.strokeWidth}
            paintOrder={label.paintOrder}
            style={{ pointerEvents: "none" }}
          >
            {label.text}
          </text>
        ))}

        {/* Non-widget annotations (rendered in SVG) */}
        {renderedSvgAnnotations}

        {/* Foreground graphics */}
        {foregroundGraphics}
      </g>

      <SVGChartTitle title={title} totalWidth={totalWidth} marginTop={margin.top} />

      {/* Legend */}
      {renderLegendFromConfig({
        legend, totalWidth, totalHeight, margin, legendPosition, title,
        legendLayout,
        legendHoverBehavior, legendClickBehavior, legendHighlightedCategory, legendIsolatedCategories,
      })}
    </svg>
    {/* Widget annotations — rendered as HTML divs so they can overflow the SVG. */}
    {layoutAnnotations?.filter(a => a.type === "widget" && a.nodeId && sceneNodes).map((annotation, i) => {
      const isDeferred = annotation._annotationDeferred === true
      const node = sceneNodes!.find(n =>
        n.id === annotation.nodeId ||
        (n.datum?.id === annotation.nodeId) ||
        (n.datum?.data?.id === annotation.nodeId) ||
        (n.datum?.data?.name === annotation.nodeId)
      )
      if (!node) return null
      const nx = margin.left + (node.cx ?? (node.x != null && node.w != null ? node.x + node.w / 2 : node.x ?? 0))
      const ny = margin.top + (node.cy ?? (node.y != null && node.h != null ? node.y + node.h / 2 : node.y ?? 0))
      const dx = annotation.dx ?? 0
      const dy = annotation.dy ?? -16
      const w = annotation.width ?? 32
      const h = annotation.height ?? 32
      const content = annotation.content ?? (
        <span style={{ fontSize: 18, cursor: "default" }}>{"ℹ️"}</span>
      )
      return (
        <div
          key={`widget-${i}`}
          {...annotationActivationProps(annotation, annotationActivation)}
          className={isDeferred ? "annotation-deferred" : undefined}
          data-annotation-disclosure={isDeferred ? "deferred" : undefined}
          style={{
            position: "absolute",
            left: nx + dx - w / 2,
            top: ny + dy - h / 2,
            width: w,
            height: h,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 5,
          }}
        >
          {content}
        </div>
      )
    })}
    </>
  )
}

NetworkSVGOverlay.displayName = "NetworkSVGOverlay"
