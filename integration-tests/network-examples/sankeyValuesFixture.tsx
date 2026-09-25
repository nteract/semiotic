import React, { useState } from "react"
import { SankeyDiagram } from "../../dist/network.module.min.js"

declare global {
  interface Window {
    sankeyTargets: Record<string, { x: number; y: number }>
  }
}
const edges = [
  { source: "A", target: "B", value: 100 },
  { source: "B", target: "C", value: 50 },
  { source: "B", target: "D", value: 50 },
  { source: "C", target: "A", value: 25 }
]
window.sankeyTargets = {}

export function SankeyValuesFixture() {
  const [small, setSmall] = useState(false)
  const [moved, setMoved] = useState(false)
  const params = new URLSearchParams(location.search)
  const vertical = params.has("vertical")
  const capture = (key: string, x: number, y: number) => {
    window.sankeyTargets[key] = vertical ? { x: y, y: x } : { x, y }
  }
  return (
    <div>
      <button onClick={() => setSmall(true)}>Resize Sankey</button>
      <button onClick={() => setMoved(true)}>Zoom and pan Sankey</button>
      <SankeyDiagram
        edges={edges}
        width={small ? 400 : 600}
        height={400}
        orientation={vertical ? "vertical" : "horizontal"}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        showLabels={false}
        frameProps={{
          transition: { duration: 0 },
          viewTransform: moved ? { x: 5, y: 5, k: 0.9 } : undefined,
          nodeStyle: (node) => {
            capture(node.id, node.x, node.y)
            return { fill: "steelblue" }
          },
          edgeStyle: (edge) => {
            const path = edge.circularPathData
            const source = edge.source
            const target = edge.target
            if (typeof source === "object" && typeof target === "object") {
              capture(
                `${source.id}-${target.id}`,
                path
                  ? (path.leftInnerExtent + path.rightInnerExtent) / 2
                  : (source.x1 + target.x0) / 2,
                path ? path.verticalFullExtent : (edge.y0 + edge.y1) / 2
              )
            }
            return { fill: "steelblue" }
          }
        }}
      />
    </div>
  )
}
