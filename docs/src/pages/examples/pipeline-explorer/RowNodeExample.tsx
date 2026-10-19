import * as React from "react"
import { NetworkCustomChart, TooltipRoot } from "semiotic/network"
import {
  compositionalDagLayout,
  compositionalLayoutOptions,
  routeCompositionalGraph,
} from "semiotic/recipes/core"
import { rowNodeGraph } from "./geometry"

const solved = routeCompositionalGraph({
  requestId: "row-nodes",
  prepared: rowNodeGraph,
  view: {
    revision: "1",
    direction: "LR",
    nodes: [],
    constraints: rowNodeGraph.graph.nodes.map((n, i) => ({
      nodeId: n.id,
      position: { x: 10 + i * 210, y: 20 },
    })),
  },
  geometry: {
    revision: "1",
    basis: "authored",
    nodes: rowNodeGraph.graph.nodes.map((n) => ({
      nodeId: n.id,
      width: 160,
      height: 40,
      parts: [],
    })),
  },
  options: compositionalLayoutOptions({ mode: "route-only" }),
})
const config = { prepared: rowNodeGraph, solved }
const data = { nodes: [...rowNodeGraph.graph.nodes], edges: [...rowNodeGraph.graph.edges] }

export function RowNodeExample() {
  const [open, setOpen] = React.useState(false)
  return (
    <details
      className="pipeline-row-example"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Existing record nodes</summary>
      <p>
        These illustrative records keep their original node IDs. They need no synthetic field or
        port conversion.
      </p>
      {open && (
        <NetworkCustomChart
          nodes={data.nodes}
          edges={data.edges}
          width={420}
          height={110}
          margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
          layout={compositionalDagLayout}
          layoutConfig={config}
          animate={false}
          title="Existing row-node identities"
          description="Two illustrative record nodes with one declared connection."
          summary="orders:row:42 connects to orders:row:43 without identity conversion."
          accessibleTable
          tooltip={(datum) => (
            <TooltipRoot role="tooltip">
              <strong>{String(datum.id)}</strong>
              <div>Illustrative record identity</div>
            </TooltipRoot>
          )}
        />
      )}
    </details>
  )
}
