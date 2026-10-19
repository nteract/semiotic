import { compositionalLayoutOptions, prepareCompositionalGraph, routeCompositionalGraph,
  compositionalRowGeometry, traceCompositionalGraph, emitCompositionalScene } from "../src/components/recipes/compositional"
import type { CompositionalGraph, LayoutRequest, PartLayout } from "../src/components/recipes/compositional/types"

/** Focused, materialized parallel interfaces. No domain or payload data. */
function fixture(ownerCount: number, edgeCount: number): Omit<LayoutRequest, "prepared"> & { graph: CompositionalGraph } {
  const perPair = Math.ceil(edgeCount / (ownerCount / 2))
  const ids = Array.from({ length: perPair }, (_, i) => `part-${i}`)
  const layout: PartLayout = { kind: "rows", order: { mode: "fixed", ids }, headerHeight: 10,
    padding: { top: 0, right: 0, bottom: 0, left: 0 }, rowGap: 2, defaultRowHeight: 18 }
  const height = 20 + perPair * 20
  const nodes = Array.from({ length: ownerCount }, (_, i) => ({ id: `owner-${String(i).padStart(4, "0")}`, parts: ids.map(id => ({ id })) }))
  const edges = Array.from({ length: edgeCount }, (_, i) => {
    const pair = Math.floor(i / perPair), partId = ids[i % perPair]
    return { id: `edge-${i}`, source: nodes[pair * 2].id, target: nodes[pair * 2 + 1].id,
      sourceEndpoint: { kind: "part" as const, partId }, targetEndpoint: { kind: "part" as const, partId } }
  })
  return { requestId: "benchmark", graph: { schemaVersion: "semiotic.compositional-graph.v0.1", graphId: "benchmark", revision: "1", nodes, edges },
    view: { revision: "1", direction: "LR", nodes: nodes.map(n => ({ nodeId: n.id, mode: "composite", footprint: "stable", partLayout: layout })),
      constraints: nodes.map((n, i) => ({ nodeId: n.id, position: { x: (i % 2) * (240 + perPair * 6), y: Math.floor(i / 2) * (height + 60) }, pin: "both" })) },
    geometry: { revision: "1", basis: "authored", nodes: nodes.map(n => ({ nodeId: n.id, width: 120, height, parts: [] })) },
    options: compositionalLayoutOptions({ mode: "route-only" }) }
}

export function runCompositionalBenchmark(ownerCount: number, edgeCount: number) {
  const input = fixture(ownerCount, edgeCount)
  const start = performance.now()
  const prepared = prepareCompositionalGraph(input.graph)
  const preparationMs = performance.now() - start
  const localStart = performance.now()
  for (let i = 0; i < input.geometry.nodes.length; i++) compositionalRowGeometry(input.geometry.nodes[i], input.view.nodes[i].partLayout as Extract<PartLayout, { kind: "rows" }>, "LR")
  const localGeometryMs = performance.now() - localStart
  const solveStart = performance.now()
  const solved = routeCompositionalGraph({ ...input, prepared })
  const routeOnlyTransactionMs = performance.now() - solveStart
  if (solved.status === "infeasible") throw new Error(JSON.stringify(solved.diagnostics))
  const sceneStart = performance.now()
  const scene = emitCompositionalScene({ prepared, solved })
  const sceneEmissionMs = performance.now() - sceneStart
  const traceStart = performance.now()
  traceCompositionalGraph(prepared, { start: { nodeId: input.graph.edges[0].target, endpoint: input.graph.edges[0].targetEndpoint! }, direction: "upstream", maxVisited: 1000, maxDepth: 100 })
  const traceMs = performance.now() - traceStart
  return { ownerCount, edgeCount, preparationMs, localGeometryMs, routeOnlyTransactionMs, sceneEmissionMs, traceMs,
    routedEdges: solved.edges.length, sceneEdges: scene.sceneEdges!.length, status: solved.status,
    metrics: solved.metrics, diagnostics: solved.diagnostics.map(d => d.code) }
}
