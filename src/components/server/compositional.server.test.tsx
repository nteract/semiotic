import { describe, expect, it } from "vitest"
import { renderChartWithEvidence } from "semiotic/server"
import {
  compositionalLayoutOptions,
  prepareCompositionalGraph,
  routeCompositionalGraph,
  emitCompositionalScene,
  compositionalPath
} from "../recipes/compositional"
import type { NetworkCustomLayout } from "../stream/networkCustomLayout"

describe("compositional SSR and export", () => {
  it("keeps explicit duplicate IDs and emits the accepted route commands", () => {
    const nodes = [{ id: "a" }, { id: "b" }]
    const edges = ["one", "two"].map((id) => ({ id, source: "a", target: "b" }))
    const prepared = prepareCompositionalGraph({
      schemaVersion: "semiotic.compositional-graph.v0.1",
      graphId: "ssr",
      revision: "1",
      nodes,
      edges
    })
    const solved = routeCompositionalGraph({
      requestId: "ssr",
      prepared,
      view: {
        revision: "1",
        direction: "LR",
        nodes: [],
        constraints: nodes.map((n, i) => ({
          nodeId: n.id,
          position: { x: 20 + i * 200, y: 20 }
        }))
      },
      geometry: {
        revision: "1",
        basis: "authored",
        nodes: nodes.map((n) => ({
          nodeId: n.id,
          width: 80,
          height: 40,
          parts: []
        }))
      },
      options: compositionalLayoutOptions({ mode: "route-only" })
    })
    const keys: string[] = []
    const layout: NetworkCustomLayout = (context) => {
      keys.push(...context.edges.map((e) => e._edgeKey!))
      return emitCompositionalScene({ prepared, solved })
    }
    const result = renderChartWithEvidence("NetworkCustomChart", {
      nodes,
      edges,
      layout,
      width: 400,
      height: 160,
      title: "Parallel identities",
      description: "Two distinct declared connections",
      frameProps: { edgeIdentity: "id" }
    })
    expect(keys).toEqual([
      JSON.stringify(["id", "one"]),
      JSON.stringify(["id", "two"])
    ])
    expect(result.svg.match(/<path\b/g)).toHaveLength(2)
    for (const edge of solved.edges)
      expect(result.svg).toContain(compositionalPath(edge.sections[0]))
    expect(result.evidence.markCount).toBeGreaterThanOrEqual(2)
  })
})
