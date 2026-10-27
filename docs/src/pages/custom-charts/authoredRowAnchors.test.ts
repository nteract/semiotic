import { expect, it } from "vitest"
import { authoredRowAnchors } from "./authoredRowAnchors"
import { fixture } from "../../../../src/components/recipes/compositional/testFixtures"
import { routeCompositionalGraph } from "../../../../src/components/recipes/compositional/solve"
import { prepareCompositionalGraph } from "../../../../src/components/recipes/compositional/prepare"

it("recomputes every current row edge on a router failure without reusing prior geometry", () => {
  const r = fixture()
  r.prepared = prepareCompositionalGraph({
    ...r.prepared.graph,
    nodes: [...r.prepared.graph.nodes, { id: "block" }],
  })
  r.geometry = {
    ...r.geometry,
    nodes: [...r.geometry.nodes, { nodeId: "block", width: 20, height: 100, parts: [] }],
  }
  r.view = {
    ...r.view,
    constraints: [...r.view.constraints!, { nodeId: "block", position: { x: 105, y: 0 } }],
  }
  expect(routeCompositionalGraph(r).status).toBe("infeasible")
  const rows = new Map([
    ["a", { y: 10, height: 20 }],
    ["b", { y: 30, height: 30 }],
    ["c", { y: 60, height: 20 }],
  ])
  const cards = new Map([
    ["A", { x: 0, y: 80, width: 100, height: 100, rows }],
    ["B", { x: 200, y: 40, width: 100, height: 100, rows }],
  ])
  const edges = [
    { id: "first", source: "A", sourceRow: "b", target: "B", targetRow: "c" },
    { id: "duplicate", source: "A", sourceRow: "b", target: "B", targetRow: "c" },
    { id: "whole", source: "A", target: "B" },
  ]
  expect(authoredRowAnchors(cards, edges)).toEqual([
    { edgeId: "first", source: { x: 100, y: 125 }, target: { x: 200, y: 110 } },
    { edgeId: "duplicate", source: { x: 100, y: 125 }, target: { x: 200, y: 110 } },
    { edgeId: "whole", source: { x: 100, y: 130 }, target: { x: 200, y: 90 } },
  ])
  cards.set("A", { ...cards.get("A")!, y: 180 })
  expect(authoredRowAnchors(cards, edges)[0].source.y).toBe(225)
  expect(() => authoredRowAnchors(cards, [{ ...edges[0], sourceRow: "missing" }])).toThrow(
    "Missing authored row",
  )
})
