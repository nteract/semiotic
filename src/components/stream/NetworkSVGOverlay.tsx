"use client"
import * as React from "react"
import type { ReactNode } from "react"
import type { NetworkLabel } from "./networkTypes"
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

  /** User-provided SVG elements on top */
  foregroundGraphics?: ReactNode

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
    foregroundGraphics,
    annotations,
    svgAnnotationRules,
    annotationFrame
  } = props

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

        {/* Annotations */}
        {annotations &&
          svgAnnotationRules &&
          annotations.map((annotation, i) => {
            const element = svgAnnotationRules(annotation, i, {
              width,
              height
            })
            return element ? (
              <React.Fragment key={`annotation-${i}`}>
                {element}
              </React.Fragment>
            ) : null
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
      {legend && typeof legend === "object" && "legendGroups" in (legend as any) ? (
        <g transform={`translate(${totalWidth - margin.right + 10},${margin.top})`}>
          {((legend as any).legendGroups as LegendGroup[]).map(
            (group, gi) => (
              <g key={`legend-group-${gi}`}>
                {group.items?.map((item: any, ii: number) => (
                  <g key={`legend-item-${ii}`} transform={`translate(0,${ii * 20})`}>
                    <rect
                      x={0}
                      y={0}
                      width={12}
                      height={12}
                      fill={item.color}
                      rx={2}
                    />
                    <text
                      x={18}
                      y={10}
                      fontSize={11}
                      fill="currentColor"
                    >
                      {item.label}
                    </text>
                  </g>
                ))}
              </g>
            )
          )}
        </g>
      ) : legend ? (
        <g transform={`translate(${totalWidth - margin.right + 10},${margin.top})`}>
          {legend as React.ReactNode}
        </g>
      ) : null}
    </svg>
  )
}

NetworkSVGOverlay.displayName = "NetworkSVGOverlay"
