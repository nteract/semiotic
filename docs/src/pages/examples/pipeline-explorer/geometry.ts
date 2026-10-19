import {
  compositionalLayoutOptions,
  prepareCompositionalGraph,
  routeCompositionalGraph,
} from "semiotic/recipes/core"
import type {
  CompositionalGraph,
  CompositionalLayoutRequest,
  CompositionalNodePresentation,
} from "semiotic/recipes/core"
import { nodes, edges, cardWidth, cardHeight } from "./data"

export const partIds = ["rows", "latency", "fields"]
export const partLabels: Record<string, string> = {
  rows: "Output rows",
  latency: "Batch latency",
  fields: "Fields",
}
export const cardBorder = { top: 5, left: 1 }
export const rowLayout = {
  kind: "rows" as const,
  headerHeight: 86,
  padding: { top: 0, right: 14, bottom: 0, left: 14 },
  rowGap: 0,
  defaultRowHeight: 22,
  rowHeights: [
    { partId: "rows", height: 24 },
    { partId: "latency", height: 20 },
    { partId: "fields", height: 24 },
  ],
}
const endpoint = (partId: string, portId: string) => ({ kind: "part" as const, partId, portId })
export const illustrativeGraph: CompositionalGraph = {
  schemaVersion: "semiotic.compositional-graph.v0.1",
  graphId: "pipeline-illustrative-metrics",
  revision: "1",
  nodes: nodes.map((n) => ({
    id: n.id,
    label: n.label,
    parts: partIds.map((id) => ({
      id,
      label: partLabels[id],
      kind: "metric",
      ports: [
        { id: "in", direction: "in" },
        { id: "out", direction: "out" },
      ],
    })),
  })),
  edges,
  transfers: nodes.flatMap((n) =>
    partIds.map((id) => ({
      id: `${n.id}:${id}:transfer`,
      nodeId: n.id,
      sources: [endpoint(id, "in")],
      target: endpoint(id, "out"),
      combination: "identity" as const,
      kind: "illustrative",
      evidence: { basis: "illustrative" as const, precision: "unknown" as const },
    })),
  ),
}
export const preparedPipeline = prepareCompositionalGraph(illustrativeGraph)
export let pipelineSolveCalls = 0

/** Explicit view transaction. Camera, notes, selection and glyph visibility never call this. */
export function solvePipeline(
  optimized = false,
  representation: "composite" | "exploded" | "summary" = "composite",
  prepared = preparedPipeline,
) {
  pipelineSolveCalls++
  const presentations: CompositionalNodePresentation[] = nodes.map((n) => ({
    nodeId: n.id,
    mode: representation,
    footprint: "stable",
    partLayout: {
      ...rowLayout,
      order: optimized
        ? { mode: "optimize", initialIds: n.stageIndex % 2 ? [...partIds].reverse() : partIds }
        : { mode: "fixed", ids: n.stageIndex % 2 ? [...partIds].reverse() : partIds },
    },
  }))
  const request: CompositionalLayoutRequest = {
    requestId: `pipeline:${optimized}:${representation}`,
    prepared,
    view: {
      revision: `${optimized}:${representation}`,
      direction: "LR",
      nodes: presentations,
      constraints: nodes.map((n) => ({ nodeId: n.id, position: { x: n.x, y: n.y }, pin: "both" })),
      boundaryExposures:
        representation === "summary"
          ? nodes.flatMap((n) =>
              partIds.flatMap((id, i) =>
                (["source", "target"] as const).map((use) => ({
                  id: `${n.id}:${id}:${use}`,
                  containerNodeId: n.id,
                  inner: { nodeId: n.id, endpoint: endpoint(id, use === "source" ? "out" : "in") },
                  use,
                  binding: {
                    kind: "node-side" as const,
                    side: use === "source" ? ("east" as const) : ("west" as const),
                    fraction: (98 + i * 24) / cardHeight,
                  },
                })),
              ),
            )
          : undefined,
    },
    geometry: {
      revision: "card-v1",
      basis: "authored",
      nodes: nodes.map((n) => ({ nodeId: n.id, width: cardWidth, height: cardHeight, parts: [] })),
    },
    options: compositionalLayoutOptions({
      mode: optimized ? "optimize" : "route-only",
      weights: { reorder: 0 },
    }),
  }
  const solution = routeCompositionalGraph(request)
  if (solution.status === "infeasible")
    throw new Error(solution.diagnostics.map((d) => `${d.code}: ${d.message}`).join("; "))
  return solution
}
export const initialPipelineSolution = solvePipeline()

/** Existing row-as-node identities need no nested-field conversion. */
export const rowNodeGraph = prepareCompositionalGraph({
  schemaVersion: "semiotic.compositional-graph.v0.1",
  graphId: "existing-records",
  revision: "1",
  nodes: [{ id: "orders:row:42" }, { id: "orders:row:43" }],
  edges: [
    {
      id: "record-copy",
      source: "orders:row:42",
      target: "orders:row:43",
      evidence: { basis: "illustrative", precision: "unknown" },
    },
  ],
})
