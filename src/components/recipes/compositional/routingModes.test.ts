import { describe, expect, it } from "vitest"
import { fixture } from "./testFixtures"
import { routeCompositionalGraph } from "./solve"
import { prepareCompositionalGraph } from "./prepare"
import { validateCompositionalSolution } from "./acceptance"
import { compositionalPath } from "./routing"
import {
  compositionalDagEngine,
  layoutCompositionalGraph,
  CompositionalLayoutController
} from "./runtime"
import { traceCompositionalGraph } from "./trace"
import type { LayoutRequest } from "./types"

function solved(request: LayoutRequest) {
  const result = routeCompositionalGraph(request)
  expect(result.status, JSON.stringify(result.diagnostics)).not.toBe(
    "infeasible"
  )
  validateCompositionalSolution(request, result)
  return result
}

describe("direct compositional routes", () => {
  it.each(["composite", "exploded", "wires"] as const)(
    "preserves exact %s terminals without route commands or congestion",
    (mode) => {
      const r = fixture()
      r.view = { ...r.view, nodes: r.view.nodes.map((n) => ({ ...n, mode })) }
      const orthogonal = solved(r)
      const direct = solved({
        ...r,
        options: { ...r.options, routing: "terminals" }
      })
      expect(direct.edges.map((e) => [e.source, e.target])).toEqual(
        orthogonal.edges.map((e) => [e.source, e.target])
      )
      expect(direct.status).toBe("complete")
      expect(direct.metrics.channelCongestion).toBe(0)
      expect(direct.metrics.bendCount).toBe(0)
      for (const e of direct.edges) {
        expect(e.sections[0].commands).toBeUndefined()
        expect(e.sections[0].points).toEqual([
          e.source.anchor,
          e.source.escape,
          e.target.escape,
          e.target.anchor
        ])
        expect(compositionalPath(e.sections[0])).toContain("L")
      }
      expect(direct.diagnostics.map((d) => d.code)).not.toContain(
        "ROUTING_CONGESTION"
      )
    }
  )
  it("counts crossing chords and optimizes flexible rows with all owners pinned", () => {
    const r = fixture({ mode: "optimize", initialIds: ["c", "b", "a"] })
    r.prepared = prepareCompositionalGraph({
      ...r.prepared.graph,
      edges: r.prepared.graph.edges.filter((e) => e.id !== "b")
    })
    r.options = { ...r.options, routing: "terminals" }
    const initial = solved(r)
    expect(initial.metrics.crossings).toBe(1)
    const optimized = solved({
      ...r,
      options: { ...r.options, mode: "optimize" }
    })
    expect(optimized.metrics.crossings).toBe(0)
    expect(optimized.metrics.reorderedParts).toBeGreaterThan(0)
    expect(optimized.nodes.map((n) => n.rect)).toEqual(
      initial.nodes.map((n) => n.rect)
    )
  })
  it("returns current row geometry even when an unrelated obstacle makes routing impossible", async () => {
    const r = fixture()
    const controller = new CompositionalLayoutController()
    expect(await controller.solve(r)).toBe(true)
    const old = controller.solution
    r.prepared = prepareCompositionalGraph({
      ...r.prepared.graph,
      nodes: [...r.prepared.graph.nodes, { id: "blocker" }]
    })
    r.view = {
      ...r.view,
      constraints: [
        ...r.view.constraints!,
        { nodeId: "blocker", position: { x: 105, y: 0 }, pin: "both" }
      ]
    }
    r.geometry = {
      ...r.geometry,
      nodes: [
        ...r.geometry.nodes,
        { nodeId: "blocker", width: 20, height: 100, parts: [] }
      ]
    }
    expect(routeCompositionalGraph(r).diagnostics[0].code).toBe(
      "ROUTING_LANE_SPACE"
    )
    r.options = { ...r.options, routing: "terminals" }
    expect(await controller.solve(r)).toBe(true)
    expect(controller.solution).not.toBe(old)
    expect(controller.solution?.status).toBe("complete")
    expect(controller.solution?.edges).toHaveLength(3)
    expect(controller.solution?.edges[0].source.anchor).toEqual({
      x: 100,
      y: 20
    })
  })
  it("retains distinct duplicate lanes, while route:none has no lanes, metrics or bundles", () => {
    const r = fixture()
    const edge = r.prepared.graph.edges[0]
    r.prepared = prepareCompositionalGraph({
      ...r.prepared.graph,
      edges: [edge, { ...edge, id: "duplicate" }]
    })
    r.options = { ...r.options, routing: "terminals" }
    const direct = solved(r)
    expect(direct.edges[0].sections).not.toEqual(direct.edges[1].sections)
    expect(direct.edges[0].source.anchor).toEqual(direct.edges[1].source.anchor)
    r.options = { ...r.options, laneGap: 0, bundles: "parallel" }
    r.view = {
      ...r.view,
      edgeHints: r.prepared.graph.edges.map((e) => ({
        edgeId: e.id,
        route: "none"
      }))
    }
    const skipped = solved(r)
    expect(skipped.metrics).toMatchObject({
      crossings: 0,
      channelCongestion: 0,
      alignmentError: 0,
      totalRouteLength: 0,
      bendCount: 0,
      routedEdgeCount: 2
    })
    expect(skipped.bundles).toEqual([])
  })
  it("keeps chain connections traceable with exact anchors and no routing cost", () => {
    const r = fixture()
    const port = (partId: string, portId: string) => ({
      kind: "part" as const,
      partId,
      portId
    })
    r.prepared = prepareCompositionalGraph({
      ...r.prepared.graph,
      nodes: [
        {
          id: "A",
          parts: ["a", "b", "c"].map((id) => ({
            id,
            ports: [
              { id: "in", direction: "in" },
              { id: "out", direction: "out" }
            ]
          }))
        }
      ],
      edges: ["a", "b"].map((id, i) => ({
        id,
        source: "A",
        target: "A",
        sourceEndpoint: port(id, "out"),
        targetEndpoint: port(["b", "c"][i], "in")
      })),
      transfers: ["a", "b", "c"].map((id) => ({
        id,
        nodeId: "A",
        sources: [port(id, "in")],
        target: port(id, "out"),
        combination: "identity"
      }))
    })
    r.view = {
      ...r.view,
      nodes: [r.view.nodes[0]],
      constraints: [r.view.constraints![0]]
    }
    r.geometry = { ...r.geometry, nodes: [r.geometry.nodes[0]] }
    const result = solved(r)
    expect(result.status).toBe("complete")
    expect(
      result.edges.map((e) => [
        e.source.anchor.y,
        e.target.anchor.y,
        e.feedback
      ])
    ).toEqual([
      [20, 45, false],
      [45, 70, false]
    ])
    expect(
      result.edges.every(
        (e) => e.sections[0].points.length === 4 && !e.sections[0].commands
      )
    ).toBe(true)
    expect(result.metrics.totalRouteLength).toBe(0)
    const trace = traceCompositionalGraph(r.prepared, {
      start: { nodeId: "A", endpoint: port("c", "out") },
      direction: "upstream",
      maxVisited: 50,
      maxDepth: 50
    })
    expect(trace.completeness).toBe("complete")
    expect(trace.edgeIds).toEqual(["a", "b"])
    expect(trace.transferIds).toEqual(["a", "b", "c"])
    r.view = { ...r.view, edgeHints: [{ edgeId: "a", route: "auto" }] }
    expect(solved(r).metrics.totalRouteLength).toBeGreaterThan(0)
  })
  it.each(["LR", "RL", "TB", "BT"] as const)(
    "emits one bump cubic and square terminal stubs for %s",
    (direction) => {
      const r = fixture()
      r.view = { ...r.view, direction }
      r.options = { ...r.options, routing: "bump" }
      const result = solved(r)
      const e = result.edges[0],
        commands = e.sections[0].commands!
      expect(commands.map((c) => c.kind)).toEqual(["M", "L", "C", "L"])
      const horizontal = direction === "LR" || direction === "RL"
      const mid = horizontal
        ? (e.source.escape.x + e.target.escape.x) / 2
        : (e.source.escape.y + e.target.escape.y) / 2
      expect(commands[2]).toEqual({
        kind: "C",
        control1: horizontal
          ? { x: mid, y: e.source.escape.y }
          : { x: e.source.escape.x, y: mid },
        control2: horizontal
          ? { x: mid, y: e.target.escape.y }
          : { x: e.target.escape.x, y: mid },
        point: e.target.escape
      })
      expect(commands[0].point).toEqual(e.source.anchor)
      expect(commands[3].point).toEqual(e.target.anchor)
    }
  )
  it("checks additive engine capabilities before requesting new routing modes", async () => {
    const r = fixture()
    for (const routing of ["terminals", "bump"] as const) {
      r.options = { ...r.options, routing }
      await expect(
        layoutCompositionalGraph(r, {
          ...compositionalDagEngine,
          capabilities: {
            ...compositionalDagEngine.capabilities,
            terminalRouting: false,
            bumpRouting: false
          }
        })
      ).rejects.toThrow("CAPABILITY_ENGINE")
      expect(
        (await layoutCompositionalGraph(r, compositionalDagEngine)).edges
      ).toHaveLength(3)
    }
  })
})

it("bypasses an actual no-path failure on the first solve", () => {
  const r = fixture()
  const walls = [
    { id: "top", x: -20, y: -20, width: 150, height: 10 },
    { id: "bottom", x: -20, y: 110, width: 150, height: 10 },
    { id: "left", x: -30, y: -20, width: 10, height: 140 },
    { id: "right", x: 130, y: -20, width: 10, height: 140 }
  ]
  r.prepared = prepareCompositionalGraph({
    ...r.prepared.graph,
    nodes: [...r.prepared.graph.nodes, ...walls.map((w) => ({ id: w.id }))]
  })
  r.geometry = {
    ...r.geometry,
    nodes: [
      ...r.geometry.nodes,
      ...walls.map((w) => ({
        nodeId: w.id,
        width: w.width,
        height: w.height,
        parts: []
      }))
    ]
  }
  r.view = {
    ...r.view,
    constraints: [
      ...r.view.constraints!,
      ...walls.map((w) => ({
        nodeId: w.id,
        pin: "both" as const,
        position: { x: w.x, y: w.y }
      }))
    ]
  }
  expect(routeCompositionalGraph(r).diagnostics[0].code).toBe("ROUTING_NO_PATH")
  const direct = solved({
    ...r,
    options: { ...r.options, routing: "terminals" }
  })
  expect(direct.status).toBe("complete")
  expect(direct.edges.map((e) => e.edgeId)).toEqual(["a", "b", "c"])
})

it("counts bump crossings like chords across a shared column pair", () => {
  const r = fixture()
  const chord = solved({
    ...r,
    options: { ...r.options, routing: "terminals" }
  })
  const bump = solved({ ...r, options: { ...r.options, routing: "bump" } })
  expect(bump.metrics.crossings).toBe(chord.metrics.crossings)
  expect(bump.metrics.crossings).toBeGreaterThan(0)
})

it("includes terminal stubs in chord route length without counting them as bends", () => {
  const r = fixture({ mode: "fixed", ids: ["a", "b", "c"] })
  const result = solved({
    ...r,
    options: { ...r.options, routing: "terminals" }
  })
  expect(result.metrics.totalRouteLength).toBe(300)
  expect(result.metrics.bendCount).toBe(0)
})

it.each(["terminals", "bump"] as const)(
  "preserves %s geometry and route opt-out across row scrolling",
  async (routing) => {
    const { projectCompositionalScroll } = await import("./scroll")
    const r = fixture()
    r.options = { ...r.options, routing }
    r.view = { ...r.view, edgeHints: [{ edgeId: "b", route: "none" }] }
    const result = projectCompositionalScroll(solved(r), {
      nodeId: "A",
      viewport: { x: 0, y: 10, width: 100, height: 70 },
      offsetY: 10,
      viewRevision: "scrolled"
    })
    expect(result.edges[0].source.anchor.y).toBe(10)
    expect(result.edges[0].routing).toBe(routing)
    expect(
      result.edges[0].sections[0].commands?.filter((c) => c.kind === "C")
        .length ?? 0
    ).toBe(routing === "bump" ? 1 : 0)
    expect(result.edges[1].routing).toBe("none")
    expect(result.edges[1].sections[0].commands).toBeUndefined()
    expect(result.edges[1].sections[0].points).toHaveLength(4)
    if (routing === "terminals") {
      expect(result.metrics.channelCongestion).toBe(0)
      expect(result.metrics.bendCount).toBe(0)
    }
  }
)
