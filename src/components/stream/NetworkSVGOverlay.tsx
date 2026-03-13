"use client"
import * as React from "react"
import type { ReactNode } from "react"
import type { NetworkLabel } from "./networkTypes"
import Legend from "../Legend"
import type { LegendGroup } from "../types/legendTypes"

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
  legend?: ReactNode | { legendGroups: LegendGroup[] }
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>

  /** User-provided SVG elements on top */
  foregroundGraphics?: ReactNode

  /** Scene nodes for annotation positioning */
  sceneNodes?: Array<{ type: string; datum: any; id?: string; x?: number; y?: number; cx?: number; cy?: number; w?: number; h?: number }>

  /** Annotations */
  annotations?: Record<string, any>[]
  svgAnnotationRules?: (
    annotation: Record<string, any>,
    index: number,
    context: any
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
    foregroundGraphics,
    sceneNodes,
    annotations,
    svgAnnotationRules,
    annotationFrame
  } = props

  return (
    <>
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
        {/* Labels */}
        {labels.map((label, i) => (
          <text
            key={`label-${i}`}
            x={label.x}
            y={label.y}
            textAnchor={label.anchor || "start"}
            dominantBaseline={(label.baseline || "middle") as any}
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
        {annotations &&
          annotations.filter(a => a.type !== "widget").map((annotation, i) => {
            if (svgAnnotationRules) {
              const element = svgAnnotationRules(annotation, i, {
                width, height, sceneNodes
              })
              if (element) return (
                <React.Fragment key={`annotation-${i}`}>{element}</React.Fragment>
              )
            }
            return null
          })}

        {/* Foreground graphics */}
        {foregroundGraphics}
      </g>

      {/* Title */}
      {title && typeof title === "string" ? (
        <text
          x={totalWidth / 2}
          y={16}
          textAnchor="middle"
          fontSize={14}
          fontWeight={600}
          fill="currentColor"
        >
          {title}
        </text>
      ) : title ? (
        <foreignObject x={0} y={0} width={totalWidth} height={margin.top}>
          {title}
        </foreignObject>
      ) : null}

      {/* Legend */}
      {legend && (
        <g transform={`translate(${totalWidth - margin.right + 10},${margin.top})`}>
          {typeof legend === "object" && !React.isValidElement(legend) && "legendGroups" in (legend as any)
            ? <Legend
                legendGroups={(legend as any).legendGroups}
                title=""
                width={100}
                customHoverBehavior={legendHoverBehavior}
                customClickBehavior={legendClickBehavior}
                highlightedCategory={legendHighlightedCategory}
                isolatedCategories={legendIsolatedCategories}
              />
            : (legend as React.ReactNode)}
        </g>
      )}
    </svg>
    {/* Widget annotations — rendered as HTML divs so they can overflow the SVG */}
    {annotations?.filter(a => a.type === "widget" && a.nodeId && sceneNodes).map((annotation, i) => {
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
        <div key={`widget-${i}`} style={{
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
