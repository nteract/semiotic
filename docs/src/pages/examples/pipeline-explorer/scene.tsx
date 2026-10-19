import * as React from "react"
import { networkHitTarget, networkEdgeHitTarget, TooltipRoot } from "semiotic/network"
import type { NetworkCustomLayout } from "semiotic/network"
import { compositionalPath } from "semiotic/recipes/core"
import type { SolvedCompositionalLayout } from "semiotic/recipes/core"
import { initialPipelineSolution, partLabels } from "./geometry"
import { useNetworkZoom } from "semiotic/network/zoom"
import { PipelineCard, ExplorerContext } from "./PipelineCard"
import { nodes, edges, byId, bounds, cardWidth, cardHeight, formatRows } from "./data"

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
      <div>
        {typeof datum.sourceEndpoint === "object" && datum.sourceEndpoint
          ? partLabels[(datum.sourceEndpoint as { partId: string }).partId]
          : "Connection"}{" "}
        · {String(datum.id)}
      </div>
      <div>Illustrative wiring · precision unknown</div>
    </TooltipRoot>
  )
}

function Connections({ solved }: { solved: SolvedCompositionalLayout }) {
  const { visibleRect } = useNetworkZoom()
  const { selected, selectedEdge, traceEdges } = React.useContext(ExplorerContext)
  return (
    <g data-testid="zoom-connections" fill="none">
      {solved.edges
        .filter(
          (edge) =>
            !visibleRect ||
            (edge.bounds.y + edge.bounds.height + 3 >= visibleRect.y &&
              edge.bounds.y - 3 <= visibleRect.y + visibleRect.height &&
              edge.bounds.x + edge.bounds.width + 3 >= visibleRect.x &&
              edge.bounds.x - 3 <= visibleRect.x + visibleRect.width),
        )
        .map((edge) => (
          <path
            key={edge.edgeId}
            data-edge-id={edge.edgeId}
            d={edge.sections.map(compositionalPath).join(" ")}
            className="pipeline-connection"
            data-active={
              selectedEdge || traceEdges.length > 0
                ? traceEdges.includes(edge.edgeId) || selectedEdge === edge.edgeId
                : edge.source.semantic.nodeId === selected ||
                  edge.target.semantic.nodeId === selected
            }
            strokeDasharray={
              edge.source.precision === "proxy" || edge.target.precision === "proxy"
                ? "4 3"
                : undefined
            }
            strokeWidth={selectedEdge === edge.edgeId ? 3 : 2}
          />
        ))}
    </g>
  )
}

export let networkZoomDemoLayoutCalls = 0
// Layout identity and input arrays stay stable through notes, selection and camera changes.
export const layout: NetworkCustomLayout<{ solved?: SolvedCompositionalLayout }> = (context) => {
  const solved = context.config.solved ?? initialPipelineSolution
  networkZoomDemoLayoutCalls++
  return {
    sceneNodes: nodes.map((node) =>
      networkHitTarget({
        id: node.id,
        datum: node,
        x: node.x,
        y: node.y,
        width: cardWidth,
        height: cardHeight,
      }),
    ),
    sceneEdges: solved.edges.map((route) =>
      networkEdgeHitTarget({
        id: route.edgeId,
        datum: context.edges.find(e => e.data?.id === route.edgeId)?.data ?? edges.find((e) => e.id === route.edgeId)!,
        pathD: route.sections.map(compositionalPath).join(" "),
      }),
    ),
    htmlMarks: solved.nodes.map((placed) => {
      const node = byId.get(placed.semantic.nodeId)!
      return {
        id: placed.id,
        x: placed.rect.x,
        y: placed.rect.y,
        width: placed.rect.width,
        height: placed.rect.height,
        content:
          placed.semantic.endpoint.kind === "part" ? (
            <div className="pipeline-part-box">{partLabels[placed.semantic.endpoint.partId]}</div>
          ) : (
            <PipelineCard node={node} />
          ),
      }
    }),
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
    overlays: <Connections solved={solved} />,
  }
}
