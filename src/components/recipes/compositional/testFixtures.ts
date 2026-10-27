import { prepareCompositionalGraph } from "./prepare"
import { compositionalLayoutOptions } from "./solve"
import type { CompositionalGraph, LayoutRequest, OrderPolicy } from "./types"
const part = (partId: string) => ({ kind: "part" as const, partId })
export function fixture(
  order: OrderPolicy = { mode: "fixed", ids: ["c", "b", "a"] }
): { -readonly [K in keyof LayoutRequest]: LayoutRequest[K] } {
  const graph: CompositionalGraph = {
    schemaVersion: "semiotic.compositional-graph.v0.1",
    graphId: "test",
    revision: "1",
    nodes: ["A", "B"].map((id) => ({
      id,
      parts: ["a", "b", "c"].map((id) => ({ id }))
    })),
    edges: ["a", "b", "c"].map((id) => ({
      id,
      source: "A",
      target: "B",
      sourceEndpoint: part(id),
      targetEndpoint: part(id)
    }))
  }
  return {
    requestId: "1",
    prepared: prepareCompositionalGraph(graph),
    view: {
      revision: "1",
      direction: "LR",
      nodes: ["A", "B"].map((nodeId) => ({
        nodeId,
        mode: "composite",
        footprint: "stable",
        partLayout: {
          kind: "rows",
          order:
            nodeId === "A" ? { mode: "fixed", ids: ["a", "b", "c"] } : order,
          headerHeight: 10,
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          rowGap: 0,
          defaultRowHeight: 20,
          rowHeights: [{ partId: "b", height: 30 }]
        }
      })),
      constraints: [
        { nodeId: "A", position: { x: 0, y: 0 }, pin: "both" },
        { nodeId: "B", position: { x: 200, y: 0 }, pin: "both" }
      ]
    },
    geometry: {
      revision: "1",
      basis: "authored",
      nodes: ["A", "B"].map((nodeId) => ({
        nodeId,
        width: 100,
        height: 100,
        parts: []
      }))
    },
    options: compositionalLayoutOptions({ mode: "route-only" })
  }
}
