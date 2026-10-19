import { describe, expect, it } from "vitest"
import { prepareCompositionalGraph } from "./prepare"
import { routeCompositionalGraph, compositionalLayoutOptions } from "./solve"
import { traceCompositionalGraph } from "./trace"
import {
  layoutCompositionalGraph,
  compositionalDagEngine,
  CompositionalLayoutController
} from "./runtime"
import { validateCompositionalSolution } from "./acceptance"
import { CompositionalMeasurementTransaction } from "./measurement"
import { compositionalPath, flattened } from "./routing"
import { emitCompositionalScene } from "./scene"
import type { CompositionalGraph, LayoutRequest, NodeConstraint } from "./types"

const local = { kind: "node" as const }
function request(
  graph: CompositionalGraph,
  constraints?: NodeConstraint[]
): { -readonly [K in keyof LayoutRequest]: LayoutRequest[K] } {
  return {
    requestId: "r",
    prepared: prepareCompositionalGraph(graph),
    view: {
      revision: "1",
      direction: "LR",
      nodes: [],
      constraints:
        constraints ??
        graph.nodes.map((n, i) => ({
          nodeId: n.id,
          position: { x: i * 200, y: 0 }
        }))
    },
    geometry: {
      revision: "1",
      basis: "authored",
      nodes: graph.nodes.map((n) => ({
        nodeId: n.id,
        width: 100,
        height: 100,
        parts:
          n.parts?.map((p, i) => ({
            partId: p.id,
            rect: { x: 0, y: 10 + i * 30, width: 100, height: 20 }
          })) ?? []
      }))
    },
    options: compositionalLayoutOptions({ mode: "route-only" })
  }
}
const base = {
  schemaVersion: "semiotic.compositional-graph.v0.1" as const,
  graphId: "g",
  revision: "1"
}

describe("compositional boundaries and engine contracts", () => {
  it("rejects an empty engine response for an isolated node and retains the accepted scene", async () => {
    const r = request({ ...base, nodes: [{ id: "isolated" }], edges: [] })
    const controller = new CompositionalLayoutController()
    expect(await controller.solve(r)).toBe(true)
    const accepted = controller.solution
    expect(
      await controller.solve(
        { ...r, requestId: "next" },
        {
          ...compositionalDagEngine,
          layout: async (req) => ({
            ...routeCompositionalGraph(req),
            nodes: [],
            edges: []
          })
        }
      )
    ).toBe(false)
    expect(controller.solution).toBe(accepted)
    expect(controller.diagnostics[0].message).toContain("IDENTITY_SOLVED_NODE")
    expect(controller.updating).toBe(false)
  })
  it("checks collapsed and exploded coverage while permitting engine-owned display IDs", async () => {
    const r = request({
      ...base,
      nodes: [
        { id: "group" },
        { id: "hidden", parentId: "group" },
        { id: "outside", parts: [{ id: "p" }] }
      ],
      edges: []
    })
    r.view = {
      ...r.view,
      nodes: [
        { nodeId: "group", mode: "summary", footprint: "stable" },
        { nodeId: "outside", mode: "exploded", footprint: "stable" }
      ]
    }
    const solved = await layoutCompositionalGraph(r, compositionalDagEngine)
    expect(solved.nodes).toHaveLength(3)
    expect(() =>
      validateCompositionalSolution(r, {
        ...solved,
        nodes: solved.nodes.map((n, i) => ({ ...n, id: `engine-${i}` }))
      })
    ).not.toThrow()
    const proxy = solved.nodes.find((n) => n.semantic.endpoint.kind === "part")!
    expect(() =>
      validateCompositionalSolution(r, {
        ...solved,
        nodes: solved.nodes.filter((n) => n !== proxy)
      })
    ).toThrow("IDENTITY_SOLVED_NODE")
    for (const semantic of [
      { nodeId: "missing", endpoint: local },
      { nodeId: "hidden", endpoint: local },
      {
        nodeId: "outside",
        endpoint: { kind: "part" as const, partId: "missing" }
      },
      { nodeId: "outside", endpoint: { kind: "node" as const, portId: "port" } }
    ]) {
      expect(() =>
        validateCompositionalSolution(r, {
          ...solved,
          nodes: solved.nodes.map((n) => (n === proxy ? { ...n, semantic } : n))
        })
      ).toThrow("IDENTITY_SOLVED_NODE")
    }
    const owner = solved.nodes.find((n) => n.id === "outside")!
    for (const parts of [
      [],
      [...owner.parts!, ...owner.parts!],
      owner.parts!.map((p) => ({
        ...p,
        semantic: { nodeId: "group", endpoint: p.semantic.endpoint }
      }))
    ]) {
      expect(() =>
        validateCompositionalSolution(r, {
          ...solved,
          nodes: solved.nodes.map((n) => (n === owner ? { ...n, parts } : n))
        })
      ).toThrow("IDENTITY_SOLVED_PART")
    }
  })
  it("confirms estimated geometry even when measured rectangles are identical", () => {
    const r = request({ ...base, nodes: [{ id: "a" }], edges: [] })
    r.geometry = { ...r.geometry, basis: "estimated" }
    const initial = routeCompositionalGraph(r)
    expect(
      initial.diagnostics.some((d) => d.code === "GEOMETRY_ESTIMATED")
    ).toBe(true)
    const transaction = new CompositionalMeasurementTransaction(r, initial)
    const measured = {
      ...r.geometry,
      revision: "measured",
      basis: "measured" as const
    }
    const accepted = transaction.update(measured)
    expect(accepted.geometryRevision).toBe("measured")
    expect(accepted.status).toBe("complete")
    expect(
      accepted.diagnostics.some((d) => d.code === "GEOMETRY_ESTIMATED")
    ).toBe(false)
    expect(transaction.solution).toBe(accepted)
    expect(
      transaction.update({ ...measured, revision: "same-measurement" })
    ).toBe(accepted)
  })
  it("rejects a basis change without a new revision", () => {
    const r = request({ ...base, nodes: [{ id: "a" }], edges: [] })
    r.geometry = { ...r.geometry, basis: "estimated" }
    const initial = routeCompositionalGraph(r)
    const transaction = new CompositionalMeasurementTransaction(r, initial)
    expect(
      transaction
        .update({ ...r.geometry, basis: "measured" })
        .diagnostics.at(-1)?.code
    ).toBe("REVISION_GEOMETRY")
    expect(transaction.solution).toBe(initial)
  })
  it("paints the same skeleton it measures when an engine supplies empty commands", async () => {
    const r = request({
      ...base,
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ id: "ab", source: "a", target: "b" }]
    })
    const solved = await layoutCompositionalGraph(r, {
      ...compositionalDagEngine,
      layout: async (req) => {
        const routed = routeCompositionalGraph(req)
        return {
          ...routed,
          edges: routed.edges.map((e) => ({
            ...e,
            sections: e.sections.map((s) => ({ ...s, commands: [] }))
          }))
        }
      }
    })
    const section = solved.edges[0].sections[0]
    const expected = section.points
      .map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`)
      .join(" ")
    expect(compositionalPath(section)).toBe(expected)
    expect(flattened(section)).toEqual(section.points)
    const scene = emitCompositionalScene({ prepared: r.prepared, solved })
    expect(scene.sceneEdges![0]).toMatchObject({ pathD: expected })
  })
  it("preserves sparse collapsed interfaces without creating an internal trace", () => {
    const r = request({
      ...base,
      nodes: [
        { id: "left" },
        { id: "group" },
        { id: "right" },
        { id: "a", parentId: "group" },
        { id: "b", parentId: "group" }
      ],
      edges: [
        { id: "in", source: "left", target: "a" },
        { id: "out", source: "b", target: "right" }
      ]
    })
    r.view = {
      ...r.view,
      nodes: [{ nodeId: "group", mode: "summary", footprint: "stable" }],
      boundaryExposures: [
        {
          id: "a-in",
          containerNodeId: "group",
          inner: { nodeId: "a", endpoint: local },
          use: "target",
          binding: { kind: "node-side", side: "west", fraction: 0.3 }
        },
        {
          id: "b-out",
          containerNodeId: "group",
          inner: { nodeId: "b", endpoint: local },
          use: "source",
          binding: { kind: "node-side", side: "east", fraction: 0.7 }
        }
      ]
    }
    const solved = routeCompositionalGraph(r)
    expect(solved.status, JSON.stringify(solved.diagnostics)).toBe("complete")
    expect(solved.nodes.map((n) => n.id)).toEqual(["group", "left", "right"])
    expect(solved.edges.find((e) => e.edgeId === "in")!.target).toMatchObject({
      semantic: { nodeId: "a" },
      precision: "proxy",
      exposureId: "a-in"
    })
    expect(
      traceCompositionalGraph(r.prepared, {
        start: { nodeId: "right", endpoint: local },
        direction: "upstream",
        maxDepth: 10,
        maxVisited: 100
      }).edgeIds
    ).toEqual(["out"])
    r.view = { ...r.view, boundaryExposures: [] }
    expect(routeCompositionalGraph(r).diagnostics[0].code).toBe(
      "ENDPOINT_MISSING_EXPOSURE"
    )
  })
  it("distinguishes a cyclic display quotient from a semantic cycle", () => {
    const r = request({
      ...base,
      nodes: [
        { id: "group" },
        { id: "middle" },
        { id: "first", parentId: "group" },
        { id: "last", parentId: "group" }
      ],
      edges: [
        { id: "a", source: "first", target: "middle" },
        { id: "b", source: "middle", target: "last" }
      ]
    })
    r.view = {
      ...r.view,
      nodes: [{ nodeId: "group", mode: "summary", footprint: "stable" }]
    }
    expect(routeCompositionalGraph(r).diagnostics[0].code).toBe(
      "TOPOLOGY_PROJECTION_CYCLE"
    )
    r.prepared = prepareCompositionalGraph({
      ...r.prepared.graph,
      edges: [
        ...r.prepared.graph.edges,
        { id: "c", source: "last", target: "first" }
      ]
    })
    expect(routeCompositionalGraph(r).diagnostics[0].code).toBe(
      "TOPOLOGY_SEMANTIC_CYCLE"
    )
  })
  it("routes internal same-owner parts without treating the owner projection as a cycle", () => {
    const r = request({
      ...base,
      nodes: [
        { id: "op", parts: [{ id: "a" }, { id: "b", parentPartId: "a" }] }
      ],
      edges: [
        {
          id: "internal",
          source: "op",
          target: "op",
          sourceEndpoint: { kind: "part", partId: "a" },
          targetEndpoint: { kind: "part", partId: "b" }
        }
      ]
    })
    const solved = routeCompositionalGraph(r)
    expect(solved.status, JSON.stringify(solved.diagnostics)).toBe("complete")
    expect(solved.edges[0].source.anchor.y).toBe(20)
    expect(solved.edges[0].target.anchor.y).toBe(50)
  })
  it("requires a legal named-mark escape and rejects obstructed corridors", () => {
    const r = request({
      ...base,
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [{ id: "ab", source: "a", target: "b" }]
    })
    r.view = {
      ...r.view,
      anchors: [
        {
          ref: { nodeId: "a", endpoint: local },
          use: "source",
          binding: { kind: "named-mark", markId: "spark", anchorName: "out" },
          constraint: "fixed-position"
        }
      ]
    }
    const a = {
      ...r.geometry.nodes[0],
      markAnchors: [
        {
          markId: "spark",
          anchorName: "out",
          point: { x: 40, y: 50 },
          normal: { x: 1, y: 0 }
        }
      ]
    }
    r.geometry = { ...r.geometry, nodes: [a, r.geometry.nodes[1]] }
    expect(routeCompositionalGraph(r).diagnostics[0].code).toBe(
      "CONSTRAINT_INTERIOR_ESCAPE"
    )
    r.geometry = {
      ...r.geometry,
      nodes: [
        { ...a, routingChannels: [{ x: 40, y: 45, width: 60, height: 10 }] },
        r.geometry.nodes[1]
      ]
    }
    expect(routeCompositionalGraph(r).status).toBe("complete")
    r.geometry = {
      ...r.geometry,
      nodes: [
        {
          ...r.geometry.nodes[0],
          obstacleRects: [{ x: 60, y: 40, width: 10, height: 20 }]
        },
        r.geometry.nodes[1]
      ]
    }
    expect(routeCompositionalGraph(r).diagnostics[0].code).toBe(
      "CONSTRAINT_INTERIOR_ESCAPE"
    )
  })
  it("routes around unrelated obstacles without dropping offscreen terminal edges", () => {
    const r = request({
      ...base,
      nodes: [{ id: "a" }, { id: "block" }, { id: "b" }],
      edges: [{ id: "ab", source: "a", target: "b" }]
    })
    const result = routeCompositionalGraph(r)
    expect(result.status).toBe("complete")
    expect(result.edges[0].bounds.width).toBeGreaterThan(200)
    expect(
      result.edges[0].sections[0].points.some((p) => p.y < 0 || p.y > 100)
    ).toBe(true)
  })
  it("bundles only compatible roles and retains each exact member", () => {
    const r = request({
      ...base,
      nodes: [{ id: "a" }, { id: "b" }],
      edges: ["one", "two", "three"].map((id, i) => ({
        id,
        source: "a",
        target: "b",
        kind: i === 2 ? "membership" : "value"
      }))
    })
    r.options = { ...r.options, bundles: "overview" }
    const result = routeCompositionalGraph(r)
    expect(result.bundles).toHaveLength(1)
    expect(result.bundles[0]).toMatchObject({
      memberEdgeIds: ["one", "two"],
      semanticKind: "value",
      count: 2
    })
    expect(result.edges).toHaveLength(3)
  })
  it("refuses incapable engines and mismatched response revisions", async () => {
    const r = request({ ...base, nodes: [{ id: "a" }], edges: [] })
    await expect(
      layoutCompositionalGraph(r, {
        ...compositionalDagEngine,
        capabilities: {
          ...compositionalDagEngine.capabilities,
          fixedPositions: false
        }
      })
    ).rejects.toThrow("CAPABILITY_ENGINE")
    await expect(
      layoutCompositionalGraph(r, {
        ...compositionalDagEngine,
        layout: async (req) => ({
          ...routeCompositionalGraph(req),
          geometryRevision: "stale"
        })
      })
    ).rejects.toThrow("REVISION_RESPONSE")
  })
  it("handles empty graphs and zero-size owner geometry without NaNs", () => {
    expect(
      routeCompositionalGraph(request({ ...base, nodes: [], edges: [] })).bounds
    ).toEqual({ x: 0, y: 0, width: 0, height: 0 })
    const r = request({ ...base, nodes: [{ id: "a" }], edges: [] })
    r.geometry = {
      ...r.geometry,
      nodes: [{ nodeId: "a", width: 0, height: 0, parts: [] }]
    }
    expect(routeCompositionalGraph(r).status).toBe("complete")
  })
})
