import * as React from "react"
import { networkHitTarget, networkEdgeHitTarget, TooltipRoot } from "semiotic/network"
import type { NetworkCustomLayout } from "semiotic/network"
import { useNetworkZoom } from "semiotic/network/zoom"
import { PipelineCard, ExplorerContext } from "./PipelineCard"
import {
  nodes,
  edges,
  byId,
  bounds,
  cardWidth,
  cardHeight,
  connectionPath,
  formatRows,
} from "./data"

// Chart-level callbacks receive the authored node/edge, not a frame wrapper.
export function pipelineTooltip(datum: Record<string, unknown>) {
  const node = typeof datum.id === "string" ? byId.get(datum.id) : undefined
  if (node)
    return (
      <TooltipRoot role="tooltip" style={{ maxWidth: 240 }}>
        <strong>{node.label}</strong>
        <div>
          {node.status} · {formatRows(node.rows)} output rows
        </div>
        <div>
          {node.latency} ms · {node.fields} fields
        </div>
        <div style={{ marginTop: 6 }}>{node.detail}</div>
      </TooltipRoot>
    )
  const source = typeof datum.source === "string" ? byId.get(datum.source) : undefined
  const target = typeof datum.target === "string" ? byId.get(datum.target) : undefined
  if (!source || !target) return null
  return (
    <TooltipRoot role="tooltip" style={{ maxWidth: 240 }}>
      <strong>
        {source.pipeline}: {source.stage} → {target.stage}
      </strong>
      <div>
        {formatRows(source.rows)} rows sent to {target.stage.toLowerCase()}
      </div>
    </TooltipRoot>
  )
}

function Connections() {
  const { visibleRect } = useNetworkZoom()
  const { selected } = React.useContext(ExplorerContext)
  return (
    <g data-testid="zoom-connections" fill="none">
      {edges
        .filter((edge) => {
          if (!visibleRect) return true
          const node = byId.get(edge.source)!
          const y = node.y + 54
          // Test the complete curve bounds, not just its endpoints.
          return (
            y + 3 >= visibleRect.y &&
            y - 3 <= visibleRect.y + visibleRect.height &&
            node.x + cardWidth + 80 >= visibleRect.x &&
            node.x + cardWidth <= visibleRect.x + visibleRect.width
          )
        })
        .map((edge) => (
          <path
            key={edge.id}
            d={connectionPath(edge.source)}
            className="pipeline-connection"
            data-active={edge.source === selected || edge.target === selected}
            strokeWidth={edge.source === selected || edge.target === selected ? 3 : 2}
          />
        ))}
    </g>
  )
}

export let networkZoomDemoLayoutCalls = 0
// Layout identity and input arrays stay stable through notes, selection and camera changes.
export const layout: NetworkCustomLayout = () => {
  networkZoomDemoLayoutCalls++
  return {
    sceneNodes: nodes.flatMap((node) => [
      networkHitTarget({
        id: node.id,
        datum: node,
        x: node.x,
        y: node.y,
        width: cardWidth,
        height: cardHeight,
      }),
      {
        type: "circle" as const,
        cx: node.x - 8,
        cy: node.y + 54,
        r: 4,
        style: { fill: node.color },
        datum: node,
        interactive: false,
      },
    ]),
    sceneEdges: edges.map((edge) =>
      networkEdgeHitTarget({
        id: edge.id,
        datum: edge,
        pathD: connectionPath(edge.source),
      }),
    ),
    htmlMarks: nodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      width: cardWidth,
      height: cardHeight,
      content: <PipelineCard node={node} />,
    })),
    backgrounds: (
      <rect
        data-testid="zoom-background"
        className="pipeline-world"
        x={0}
        y={0}
        width={bounds.width}
        height={bounds.height}
        rx={20}
      />
    ),
    overlays: <Connections />,
  }
}
