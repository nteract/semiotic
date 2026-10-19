import {
  compositionalLayoutOptions,
  prepareCompositionalGraph,
  routeCompositionalGraph,
} from "semiotic/recipes/core"
import type { CompositionalGraph, CompositionalNodePresentation } from "semiotic/recipes/core"

export const fields = ["customer", "quantity", "price"]
export const fieldLabels: Record<string, string> = {
  customer: "Customer",
  quantity: "Quantity",
  price: "Unit price",
}
export const colors: Record<string, string> = {
  customer: "#087f8c",
  quantity: "#a25a13",
  price: "#8858b8",
}
const endpoint = (partId: string, portId: string) => ({ kind: "part" as const, partId, portId })
const evidence = { basis: "illustrative", precision: "unknown" } as const

export const graph: CompositionalGraph = {
  schemaVersion: "semiotic.compositional-graph.v0.1",
  graphId: "compositional-docs",
  revision: "1",
  nodes: [
    { id: "orders", label: "Order input" },
    { id: "copy", label: "Copy fields" },
    { id: "invoice", label: "Invoice output" },
  ].map((node) => ({
    ...node,
    parts: fields.map((id) => ({
      id,
      label: fieldLabels[id],
      kind: "field",
      ports: [
        { id: "in", direction: "in" },
        { id: "out", direction: "out" },
      ],
    })),
  })),
  edges: [
    ...fields.map((id) => ({
      id: `input-${id}`,
      source: "orders",
      target: "copy",
      sourceEndpoint: endpoint(id, "out"),
      targetEndpoint: endpoint(id, "in"),
      kind: "value",
      evidence,
    })),
    {
      id: "input-customer-audit",
      source: "orders",
      target: "copy",
      sourceEndpoint: endpoint("customer", "out"),
      targetEndpoint: endpoint("customer", "in"),
      kind: "value",
      evidence,
    },
    ...fields.map((id) => ({
      id: `output-${id}`,
      source: "copy",
      target: "invoice",
      sourceEndpoint: endpoint(id, "out"),
      targetEndpoint: endpoint(id, "in"),
      kind: "value",
      evidence,
    })),
  ],
  transfers: fields.map((id) => ({
    id: `copy-${id}`,
    nodeId: "copy",
    sources: [endpoint(id, "in")],
    target: endpoint(id, "out"),
    combination: "identity",
    kind: "value",
    evidence,
  })),
}
export const prepared = prepareCompositionalGraph(graph)
export const nodes = [...graph.nodes]
export const edges = [...graph.edges]
export const ownerLabels = Object.fromEntries(nodes.map((n) => [n.id, n.label!]))
export type Representation = "composite" | "wires" | "exploded" | "summary"
export let solveCount = 0

/** Solve on an explicit geometry change, never on camera, hover or selection. */
export function solve(optimized: boolean, mode: Exclude<Representation, "wires">) {
  solveCount++
  const presentations: CompositionalNodePresentation[] = nodes.map((node, i) => ({
    nodeId: node.id,
    mode,
    footprint: "stable",
    partLayout: {
      kind: "rows",
      headerHeight: 42,
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
      rowGap: 6,
      defaultRowHeight: 30,
      rowHeights: [{ partId: "quantity", height: 42 }],
      order: optimized
        ? { mode: "optimize", initialIds: i === 1 ? [...fields].reverse() : fields }
        : { mode: "fixed", ids: i === 1 ? [...fields].reverse() : fields },
    },
  }))
  const solved = routeCompositionalGraph({
    requestId: `docs:${optimized}:${mode}`,
    prepared,
    view: {
      revision: `${optimized}:${mode}`,
      direction: "LR",
      nodes: presentations,
      constraints: nodes.map((n, i) => ({
        nodeId: n.id,
        position: { x: 16 + i * 300, y: 20 },
        pin: "both",
      })),
      boundaryExposures:
        mode === "summary"
          ? nodes.flatMap((n) =>
              fields.flatMap((id, i) =>
                (["source", "target"] as const).map((use) => ({
                  id: `${n.id}:${id}:${use}`,
                  containerNodeId: n.id,
                  inner: { nodeId: n.id, endpoint: endpoint(id, use === "source" ? "out" : "in") },
                  use,
                  binding: {
                    kind: "node-side" as const,
                    side: use === "source" ? ("east" as const) : ("west" as const),
                    fraction: (65 + i * 38) / 180,
                  },
                })),
              ),
            )
          : undefined,
    },
    geometry: {
      revision: "rows-v1",
      basis: "authored",
      nodes: nodes.map((n) => ({ nodeId: n.id, width: 194, height: 180, parts: [] })),
    },
    options: compositionalLayoutOptions({
      mode: optimized ? "optimize" : "route-only",
      weights: { reorder: 0 },
    }),
  })
  if (solved.status === "infeasible")
    throw new Error(solved.diagnostics.map((d) => d.message).join("; "))
  return solved
}

export function describeEndpoint(owner: string, partId?: string, portId?: string) {
  return [ownerLabels[owner] ?? owner, partId ? (fieldLabels[partId] ?? partId) : undefined, portId]
    .filter(Boolean)
    .join(" / ")
}
