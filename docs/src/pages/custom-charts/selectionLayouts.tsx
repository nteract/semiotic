import React from "react"
import { useCustomLayoutSelection } from "semiotic/network"
import type { NetworkCustomLayout } from "semiotic/network"
import type { OrdinalCustomLayout } from "semiotic/ordinal"
import { parallelCoordinatesLayout } from "semiotic/recipes"
import type { ParallelCoordinatesConfig } from "semiotic/recipes"

function NodeCard({ datum }: { datum: { id: string; title?: unknown; meta?: unknown } }) {
  const selection = useCustomLayoutSelection()
  const dim = selection.isActive && !selection.predicate(datum)
  return (
    <div
      data-service-card={String(datum.id)}
      style={{
        boxSizing: "border-box",
        width: "100%",
        height: "100%",
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid var(--semiotic-border, #cbd5e1)",
        background: "var(--semiotic-bg, #ffffff)",
        color: "var(--semiotic-text, #111827)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
        opacity: dim ? 0.25 : 1,
        transition: "opacity 140ms ease",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14 }}>{String(datum.title)}</div>
      <div style={{ fontSize: 12 }}>{String(datum.meta)}</div>
    </div>
  )
}

export const htmlCardLayout: NetworkCustomLayout = (ctx) => {
  const { plot } = ctx.dimensions
  const width = Math.min(150, plot.width / ctx.nodes.length - 12)
  const height = 58
  const positions = new Map(
    ctx.nodes.map((node, i) => [
      node.id,
      { x: (plot.width / ctx.nodes.length) * (i + 0.5), y: plot.height / 2 },
    ]),
  )

  return {
    // Transparent scene marks retain canvas hit testing for the HTML cards.
    sceneNodes: ctx.nodes.map((node) => {
      const p = positions.get(node.id)!
      return {
        type: "rect",
        x: p.x - width / 2,
        y: p.y - height / 2,
        w: width,
        h: height,
        id: node.id,
        datum: node.data ?? node,
        style: { fill: "rgba(0,0,0,0)", stroke: "none" },
      }
    }),
    sceneEdges: ctx.edges.map((edge) => {
      const source = positions.get(typeof edge.source === "string" ? edge.source : edge.source.id)!
      const target = positions.get(typeof edge.target === "string" ? edge.target : edge.target.id)!
      return {
        type: "line",
        x1: source.x + width / 2,
        y1: source.y,
        x2: target.x - width / 2,
        y2: target.y,
        datum: edge,
        style: { stroke: "#64748b", strokeWidth: 1.5, opacity: 0.8 },
      }
    }),
    htmlMarks: ctx.nodes.map((node) => {
      const p = positions.get(node.id)!
      return {
        id: node.id,
        x: p.x - width / 2,
        y: p.y - height / 2,
        width,
        height,
        content: <NodeCard datum={{ ...node.data, id: node.id }} />,
      }
    }),
    // Opt into selection restyling even though these hit rectangles are invisible.
    restyle: () => ({}),
    restyleEdge: (_edge, selection) => ({ opacity: selection?.isActive ? 0.25 : 0.8 }),
  }
}

export const selectableParallelLayout: OrdinalCustomLayout<ParallelCoordinatesConfig> = (ctx) => ({
  ...parallelCoordinatesLayout(ctx),
  // Merge a style patch onto retained marks; the axes and geometry stay fixed.
  restyle: (node, selection) => ({
    ...(selection?.isActive && {
      opacity: node.datum && selection.predicate(node.datum) ? 1 : 0.08,
    }),
  }),
})
