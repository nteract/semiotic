import { describe, expect, it } from "vitest"
import { fixture } from "./testFixtures"
import { prepareCompositionalGraph } from "./prepare"
import { routeCompositionalGraph } from "./solve"
import { project } from "./projection"
import type { Projection } from "./projection"
import { createEdgeRouter } from "./edgeRouting"
import { initialPositions, projectedRanks } from "./topology"
import { validateGeometry } from "./geometry"

it("optimizes cyclic owner projections only when pinned, while still rejecting semantic cycles", () => {
  const r = fixture({ mode: "optimize", initialIds: ["c", "b", "a"] })
  r.options = { ...r.options, routing: "terminals", mode: "optimize" }
  r.prepared = prepareCompositionalGraph({
    ...r.prepared.graph,
    edges: [
      {
        id: "out",
        source: "A",
        target: "B",
        sourceEndpoint: { kind: "part", partId: "a" },
        targetEndpoint: { kind: "part", partId: "a" }
      },
      {
        id: "back",
        source: "B",
        target: "A",
        sourceEndpoint: { kind: "part", partId: "b" },
        targetEndpoint: { kind: "part", partId: "b" }
      }
    ]
  })
  const result = routeCompositionalGraph(r)
  expect(result.status).toBe("complete")
  expect(result.nodes.map((n) => [n.rect.x, n.rect.y])).toEqual([
    [0, 0],
    [200, 0]
  ])
  expect(
    routeCompositionalGraph({
      ...r,
      view: {
        ...r.view,
        constraints: r.view.constraints!.map((c) => ({ ...c, pin: undefined }))
      }
    }).diagnostics[0].code
  ).toBe("TOPOLOGY_PROJECTION_CYCLE")
  r.prepared = prepareCompositionalGraph({
    ...r.prepared.graph,
    edges: [
      ...r.prepared.graph.edges,
      {
        id: "cycle",
        source: "B",
        target: "A",
        sourceEndpoint: { kind: "part", partId: "a" },
        targetEndpoint: { kind: "part", partId: "a" }
      }
    ]
  })
  expect(routeCompositionalGraph(r).diagnostics[0].code).toBe(
    "TOPOLOGY_SEMANTIC_CYCLE"
  )
})

it("keeps authored compound positions while optimizing row geometry", () => {
  const r = fixture({ mode: "optimize", initialIds: ["c", "b", "a"] })
  r.options = { ...r.options, routing: "terminals", mode: "optimize" }
  r.prepared = prepareCompositionalGraph({
    ...r.prepared.graph,
    nodes: [
      { id: "parent" },
      ...r.prepared.graph.nodes.map((n) => ({ ...n, parentId: "parent" }))
    ]
  })
  r.geometry = {
    ...r.geometry,
    nodes: [
      ...r.geometry.nodes,
      { nodeId: "parent", width: 340, height: 140, parts: [] }
    ]
  }
  r.view = {
    ...r.view,
    constraints: [
      ...r.view.constraints!,
      { nodeId: "parent", pin: "both", position: { x: -20, y: -20 } }
    ]
  }
  const result = routeCompositionalGraph(r)
  expect(result.status).toBe("complete")
  expect(result.metrics.reorderedParts).toBeGreaterThan(0)
  expect(result.nodes.find((n) => n.id === "parent")!.rect).toEqual({
    x: -20,
    y: -20,
    width: 340,
    height: 140
  })
})

describe.each(["composite", "exploded", "wires"] as const)(
  "incremental candidate parity: %s",
  (mode) => {
    it("matches full recomputation through swaps, rollbacks and owner movement", () => {
      const r = fixture({ mode: "optimize", initialIds: ["c", "b", "a"] })
      r.options = { ...r.options, routing: "terminals" }
      r.view = { ...r.view, nodes: r.view.nodes.map((n) => ({ ...n, mode })) }
      const measures = validateGeometry(r.geometry),
        positions = initialPositions(r)
      const orders = new Map([
        ["A", ["a", "b", "c"]],
        ["B", ["c", "b", "a"]]
      ])
      const cachedRoute = createEdgeRouter(r)
      let cached: Projection | undefined
      for (const ids of [
        ["c", "b", "a"],
        ["a", "b", "c"],
        ["c", "b", "a"],
        ["b", "c", "a"]
      ]) {
        orders.set("B", ids)
        cached = project(r, measures, positions, orders, cached)
        const full = project(r, measures, positions, orders)
        expect(cached.nodes).toEqual(full.nodes)
        expect(cachedRoute(cached, projectedRanks(r, cached)).edges).toEqual(
          createEdgeRouter(r)(full, projectedRanks(r, full)).edges
        )
      }
      positions.set("A", { x: 0, y: 25 })
      cached = project(r, measures, positions, orders, cached)
      const full = project(r, measures, positions, orders)
      expect(cached.nodes).toEqual(full.nodes)
      expect(cachedRoute(cached, projectedRanks(r, cached)).edges).toEqual(
        createEdgeRouter(r)(full, projectedRanks(r, full)).edges
      )
    })
  }
)
