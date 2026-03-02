"use client"
import * as React from "react"
import { useMemo } from "react"
import { areaLink, circularAreaLink } from "../svg/sankeyLinks"
import type { RealtimeNode, RealtimeEdge } from "./types"

interface RenderSankeySVGProps {
  nodes: RealtimeNode[]
  edges: RealtimeEdge[]
  width: number
  height: number
  nodeColorFn: (node: RealtimeNode) => string
  edgeColorFn: (edge: RealtimeEdge) => string
  edgeOpacity: number
  labelFn: ((node: RealtimeNode) => string) | null
  showLabels: boolean
  direction: string
  onNodeHover?: (node: RealtimeNode | null, event: React.MouseEvent) => void
  onEdgeHover?: (edge: RealtimeEdge | null, event: React.MouseEvent) => void
}

/**
 * React SVG component for rendering the static Sankey structure:
 * link bands, node rectangles, and labels.
 *
 * This layer sits underneath the canvas particle layer and handles
 * pointer events for hover interaction.
 */
export function RenderSankeySVG({
  nodes,
  edges,
  width,
  height,
  nodeColorFn,
  edgeColorFn,
  edgeOpacity,
  labelFn,
  showLabels,
  direction,
  onNodeHover,
  onEdgeHover
}: RenderSankeySVGProps) {
  // Sort edges so narrower ones render on top
  const sortedEdges = useMemo(() => {
    return [...edges].sort((a, b) => (b.sankeyWidth || 0) - (a.sankeyWidth || 0))
  }, [edges])

  return (
    <>
      {/* Edge bands */}
      <g className="realtime-sankey-edges">
        {sortedEdges.map((edge, i) => {
          const pathD = edge.circular
            ? circularAreaLink(edge)
            : areaLink(edge)

          if (!pathD) return null

          const color = edgeColorFn(edge)
          const sourceId = typeof edge.source === "string" ? edge.source : edge.source.id
          const targetId = typeof edge.target === "string" ? edge.target : edge.target.id

          return (
            <path
              key={`${sourceId}-${targetId}`}
              d={pathD}
              fill={color}
              fillOpacity={edgeOpacity}
              stroke={color}
              strokeOpacity={edgeOpacity * 0.5}
              strokeWidth={0.5}
              onMouseEnter={onEdgeHover ? (e) => onEdgeHover(edge, e) : undefined}
              onMouseLeave={onEdgeHover ? (e) => onEdgeHover(null, e) : undefined}
            />
          )
        })}
      </g>

      {/* Node rectangles */}
      <g className="realtime-sankey-nodes">
        {nodes.map((node) => {
          const color = nodeColorFn(node)
          const w = node.x1 - node.x0
          const h = node.y1 - node.y0
          if (w <= 0 || h <= 0) return null

          return (
            <rect
              key={node.id}
              x={node.x0}
              y={node.y0}
              width={w}
              height={h}
              fill={color}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth={0.5}
              onMouseEnter={onNodeHover ? (e) => onNodeHover(node, e) : undefined}
              onMouseLeave={onNodeHover ? (e) => onNodeHover(null, e) : undefined}
            />
          )
        })}
      </g>

      {/* Labels */}
      {showLabels && (
        <g className="realtime-sankey-labels">
          {nodes.map((node) => {
            const label = labelFn ? labelFn(node) : node.id
            if (!label) return null

            const nodeW = node.x1 - node.x0
            const nodeH = node.y1 - node.y0
            if (nodeW <= 0 || nodeH <= 0) return null

            // Position label to the right of the node (horizontal)
            // or below the node (vertical)
            let x: number, y: number
            let textAnchor: "start" | "middle" | "end"

            if (direction === "down") {
              x = node.x0 + nodeW / 2
              y = node.y1 + 12
              textAnchor = "middle"
            } else {
              // Horizontal: label to the right if node is in left half, else left
              const midX = width / 2
              if (node.x0 < midX) {
                x = node.x1 + 6
                textAnchor = "start"
              } else {
                x = node.x0 - 6
                textAnchor = "end"
              }
              y = node.y0 + nodeH / 2
            }

            return (
              <text
                key={`label-${node.id}`}
                x={x}
                y={y}
                textAnchor={textAnchor}
                dominantBaseline="central"
                fontSize={11}
                fill="currentColor"
                style={{ pointerEvents: "none" }}
              >
                {label}
              </text>
            )
          })}
        </g>
      )}
    </>
  )
}
