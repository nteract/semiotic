"use client"
import type { Datum } from "../charts/shared/datumTypes"
import * as React from "react"
import type { ReactNode } from "react"
import type { NetworkLabel } from "./networkTypes"
import type { LegendGroup, GradientLegendConfig, LegendLayout } from "../types/legendTypes"
import { renderLegendFromConfig } from "./legendRenderer"
import {
  ANNOTATION_DISCLOSURE_REVEAL_CSS,
  applyAnnotationEmphasis,
  type AnnotationRenderPair,
} from "../charts/shared/annotationHierarchy"
import { annotationLayout, type AutoPlaceAnnotations } from "../recipes/annotationLayout"
import type { AnnotationContext } from "../realtime/types"

type AnnotationAnchorNode = {
  type: string
  datum: Datum | null
  id?: string
  x?: number
  y?: number
  cx?: number
  cy?: number
  w?: number
  h?: number
  /** Circle nodes (NetworkCircleNode, force/tree/orbit marks) carry an explicit radius. */
  r?: number
  /** Arc nodes (chord, radial) carry an outer radius. */
  outerR?: number
}

type NetworkAnnotationContext = AnnotationContext & { sceneNodes?: AnnotationAnchorNode[] }

function nodeAnchorId(node: AnnotationAnchorNode): string | undefined {
  const id = node.id ?? node.datum?.id ?? node.datum?.data?.id ?? node.datum?.data?.name
  return id == null ? undefined : String(id)
}

function nodeCenter(node: AnnotationAnchorNode): { x: number; y: number; r: number } | null {
  const x = node.cx ?? (node.x != null && node.w != null ? node.x + node.w / 2 : node.x)
  const y = node.cy ?? (node.y != null && node.h != null ? node.y + node.h / 2 : node.y)
  if (typeof x !== "number" || typeof y !== "number") return null
  // Prefer the mark's own radius (circle nodes) or outer radius (arc nodes);
  // only rect nodes lack both, so fall back to half their largest dimension.
  const r =
    typeof node.r === "number"
      ? Math.max(1, node.r)
      : typeof node.outerR === "number"
        ? Math.max(1, node.outerR)
        : Math.max(1, node.w ?? 0, node.h ?? 0) / 2
  return { x, y, r }
}

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
  legend?: ReactNode | { legendGroups: LegendGroup[] } | { gradient: GradientLegendConfig }
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
    autoPlaceAnnotations,
    svgAnnotationRules,
    annotationFrame: _annotationFrame
  } = props

  const annotationContext = React.useMemo<NetworkAnnotationContext>(() => {
    const pointNodes = (sceneNodes || []).flatMap((node) => {
      const center = nodeCenter(node)
      const pointId = nodeAnchorId(node)
      return center ? [{ pointId, ...center }] : []
    })
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
    if (!annotations || !autoPlaceAnnotations) return annotations
    return annotationLayout({
      annotations,
      context: annotationContext,
      ...(typeof autoPlaceAnnotations === "object" ? autoPlaceAnnotations : {}),
    })
  }, [annotations, autoPlaceAnnotations, annotationContext])

  const renderedSvgAnnotations = layoutAnnotations
    ? applyAnnotationEmphasis(
        layoutAnnotations.reduce<AnnotationRenderPair[]>((acc, annotation, i) => {
          if (annotation.type === "widget" || !svgAnnotationRules) return acc
          const element = svgAnnotationRules(annotation, i, annotationContext)
          if (element) {
            acc.push({
              node: <React.Fragment key={`annotation-${i}`}>{element}</React.Fragment>,
              annotation,
            })
          }
          return acc
        }, [])
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
      <desc>{typeof title === "string" ? `${title} — network data visualization` : "Network data visualization"}</desc>
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
            fill={label.fill || "currentColor"}
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

      {/* Title */}
      {title && typeof title === "string" ? (
        <text
          x={totalWidth / 2}
          y={16}
          textAnchor="middle"
          fontWeight={600}
          fill="currentColor"
          className="semiotic-chart-title"
          style={{ fontSize: "var(--semiotic-title-font-size, 14px)" }}
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
    {/* Widget annotations — rendered as HTML divs so they can overflow the SVG. */}
    {layoutAnnotations?.filter(a => a.type === "widget" && a.nodeId && sceneNodes).map((annotation, i) => {
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
          className={annotation._annotationDeferred === true ? "annotation-deferred" : undefined}
          data-annotation-disclosure={annotation._annotationDeferred === true ? "deferred" : undefined}
          style={{
          position: "absolute",
          left: nx + dx - w / 2,
          top: ny + dy - h / 2,
          width: w,
          height: h,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "auto",
          zIndex: 5,
        }}>
          {content}
        </div>
      )
    })}
    </>
  )
}

NetworkSVGOverlay.displayName = "NetworkSVGOverlay"
