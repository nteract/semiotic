import { describe, expect, it } from "vitest"
import {
  CompositionalLayoutController,
  compositionalDagEngine
} from "./runtime"
import { prepareCompositionalGraph, patchCompositionalGraph } from "./prepare"
import { traceCompositionalGraph } from "./trace"
import { compositionalEndpointKey } from "./identity"
import { compositionalLayoutOptions, routeCompositionalGraph } from "./solve"
import { emitCompositionalScene } from "./scene"
import { compositionalPath } from "./routing"
import { projectCompositionalScroll } from "./scroll"
import { CompositionalMeasurementTransaction } from "./measurement"
import {
  createCompositionalWorkerEngine,
  installCompositionalWorker
} from "./worker"
import type {
  CompositionalWorkerMessage,
  CompositionalWorkerPort
} from "./worker"
import type {
  AsyncLayoutEngine,
  CompositionalGraph,
  LayoutRequest,
  OrderPolicy,
  SolvedCompositionalLayout
} from "./types"

const part = (partId: string) => ({ kind: "part" as const, partId })
const ref = (nodeId: string, partId: string) => ({
  nodeId,
  endpoint: part(partId)
})
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
const solve = (r = fixture()) => {
  const result = routeCompositionalGraph(r)
  expect(result.status, JSON.stringify(result.diagnostics)).not.toBe(
    "infeasible"
  )
  return result
}

describe("compositional identity, validation and transactions", () => {
  it("uses structured endpoint identity, independent of labels, order and payload", () => {
    expect(compositionalEndpointKey(ref("a|b", "c"))).not.toBe(
      compositionalEndpointKey(ref("a", "b|c"))
    )
    const r = fixture(),
      g = r.prepared.graph
    const shuffled = prepareCompositionalGraph({
      ...g,
      nodes: [...g.nodes]
        .reverse()
        .map((n) => ({ ...n, label: "different", data: { private: "value" } })),
      edges: [...g.edges].reverse()
    })
    expect(shuffled.semanticHash).toBe(r.prepared.semanticHash)
    expect(shuffled.semanticHash).not.toContain("private")
    expect(JSON.parse(JSON.stringify(shuffled))).toEqual(shuffled)
  })
  it("rejects duplicate IDs, invalid ports/directions and containment cycles without retargeting", () => {
    const g = fixture().prepared.graph
    expect(() =>
      prepareCompositionalGraph({ ...g, edges: [g.edges[0], g.edges[0]] })
    ).toThrow("IDENTITY_DUPLICATE")
    expect(() =>
      prepareCompositionalGraph({
        ...g,
        edges: [
          { ...g.edges[0], sourceEndpoint: { ...part("a"), portId: "missing" } }
        ]
      })
    ).toThrow("ENDPOINT_UNKNOWN_PORT")
    expect(() =>
      prepareCompositionalGraph({
        ...g,
        nodes: g.nodes.map((n) => ({ ...n, parentId: n.id }))
      })
    ).toThrow("CONTAINMENT_CYCLE")
    const withPorts = {
      ...g,
      nodes: g.nodes.map((n) => ({
        ...n,
        parts: n.parts?.map((p) => ({
          ...p,
          ports: [{ id: "in", direction: "in" as const }]
        }))
      }))
    }
    expect(() =>
      prepareCompositionalGraph({
        ...withPorts,
        edges: [
          { ...g.edges[0], sourceEndpoint: { ...part("a"), portId: "in" } }
        ]
      })
    ).toThrow("ENDPOINT_DIRECTION")
  })
  it("validates a patch atomically and rejects the wrong base revision", () => {
    const prepared = fixture().prepared
    const node = {
      ...prepared.graph.nodes[0],
      parts: [{ id: "b" }, { id: "c" }]
    }
    expect(() =>
      patchCompositionalGraph(prepared, {
        baseRevision: "1",
        revision: "2",
        upsertNodes: [node]
      })
    ).toThrow("UNKNOWN_PART")
    expect(prepared.graph.nodes[0].parts).toHaveLength(3)
    const patched = patchCompositionalGraph(prepared, {
      baseRevision: "1",
      revision: "2",
      upsertNodes: [node],
      removeEdgeIds: ["a"]
    })
    expect(patched.graph.edges.map((e) => e.id)).toEqual(["b", "c"])
    expect(() =>
      patchCompositionalGraph(patched, { baseRevision: "1", revision: "3" })
    ).toThrow("REVISION_PATCH_BASE")
  })
})

describe("endpoint-aware geometry and routing", () => {
  it("matches exhaustive legal permutations on small variable-height interfaces", () => {
    const permutations = [
      ["a", "b", "c"],
      ["a", "c", "b"],
      ["b", "a", "c"],
      ["b", "c", "a"],
      ["c", "a", "b"],
      ["c", "b", "a"]
    ]
    const minimum = Math.min(
      ...permutations.map(
        (ids) => solve(fixture({ mode: "fixed", ids })).metrics.crossings
      )
    )
    for (const initialIds of permutations) {
      const request = fixture({ mode: "optimize", initialIds })
      request.options = compositionalLayoutOptions({
        mode: "optimize",
        weights: { reorder: 0 }
      })
      expect(solve(request).metrics.crossings).toBe(minimum)
    }
  })
  it("preserves identities under seeded permutations and transactional patch sequences", () => {
    let seed = 17
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 2 ** 32
    }
    const shuffled = <T>(values: readonly T[]) => {
      const items = [...values]
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[items[i], items[j]] = [items[j], items[i]]
      }
      return items
    }
    const request = fixture(),
      original = solve(request),
      graph = request.prepared.graph
    for (let i = 0; i < 30; i++) {
      request.prepared = prepareCompositionalGraph({
        ...graph,
        nodes: shuffled(graph.nodes).map((n) => ({
          ...n,
          parts: shuffled(n.parts ?? [])
        })),
        edges: shuffled(graph.edges)
      })
      expect(solve(request).edges).toEqual(original.edges)
      const id = graph.edges[Math.floor(random() * graph.edges.length)].id
      const removed = patchCompositionalGraph(request.prepared, {
        baseRevision: "1",
        revision: "2",
        removeEdgeIds: [id]
      })
      expect(removed.graph.edges.some((e) => e.id === id)).toBe(false)
      const restored = patchCompositionalGraph(removed, {
        baseRevision: "2",
        revision: "3",
        upsertEdges: [graph.edges.find((e) => e.id === id)!]
      })
      expect(restored.semanticHash).toBe(request.prepared.semanticHash)
    }
  })
  it("retains three independently selectable wires, row centers and exact duplicates", () => {
    const request = fixture()
    request.prepared = prepareCompositionalGraph({
      ...request.prepared.graph,
      edges: [
        ...request.prepared.graph.edges,
        { ...request.prepared.graph.edges[0], id: "duplicate" }
      ]
    })
    const result = solve(request)
    expect(result.edges.map((e) => e.edgeId).sort()).toEqual([
      "a",
      "b",
      "c",
      "duplicate"
    ])
    for (const e of result.edges) {
      const source = result.nodes.find((n) => n.id === "A")!
      const p = source.parts!.find(
        (p) =>
          p.partId === (e.source.semantic.endpoint as { partId: string }).partId
      )!
      expect(e.source.anchor.y).toBe(
        source.rect.y + p.rect.y + p.rect.height / 2
      )
      expect(e.sections[0].points[0]).toEqual(e.source.anchor)
      expect(e.sections[0].points.at(-1)).toEqual(e.target.anchor)
    }
    const [a, duplicate] = [
      result.edges.find((e) => e.edgeId === "a")!,
      result.edges.find((e) => e.edgeId === "duplicate")!
    ]
    expect(a.source.anchor).toEqual(duplicate.source.anchor)
    expect(compositionalPath(a.sections[0])).not.toEqual(
      compositionalPath(duplicate.sections[0])
    )
    const scene = emitCompositionalScene({
      prepared: request.prepared,
      solved: result,
      showParts: true
    })
    expect(scene.sceneEdges).toHaveLength(4)
    expect(scene.sceneEdges!.map((e) => e.id)).toContain("duplicate")
    expect(JSON.parse(JSON.stringify(result)).edges).toHaveLength(4)
  })
  it("preserves fixed reversed order and improves actual wiring with legal permutations", () => {
    const fixed = solve()
    expect(fixed.metrics.crossings).toBeGreaterThan(0)
    expect(fixed.nodes.find((n) => n.id === "B")!.partOrder).toEqual([
      "c",
      "b",
      "a"
    ])
    const request = fixture({ mode: "optimize", initialIds: ["c", "b", "a"] })
    request.options = compositionalLayoutOptions({
      mode: "optimize",
      weights: { reorder: 0 }
    })
    const optimized = solve(request)
    expect(optimized.metrics.crossings).toBeLessThan(fixed.metrics.crossings)
    expect(optimized.metrics.alignmentError).toBeLessThan(
      fixed.metrics.alignmentError
    )
    expect(optimized.nodes.find((n) => n.id === "B")!.partOrder).toEqual([
      "a",
      "b",
      "c"
    ])
    expect(optimized.metrics.completedSweeps).toBeGreaterThan(0)
  })
  it("only permutes flexible groups; rejects malformed complete orders", () => {
    const request = fixture({
      mode: "within-groups",
      groups: [
        { id: "first", ids: ["c"], fixed: true },
        { id: "rest", ids: ["b", "a"] }
      ]
    })
    request.options = compositionalLayoutOptions({ mode: "optimize" })
    expect(solve(request).nodes.find((n) => n.id === "B")!.partOrder![0]).toBe(
      "c"
    )
    expect(
      routeCompositionalGraph(fixture({ mode: "fixed", ids: ["a", "a", "c"] }))
        .diagnostics[0].code
    ).toBe("ORDER_MEMBERS")
  })
  it("visibility and exploded projections retain semantic identities and geometry", () => {
    const request = fixture(),
      initial = solve(request)
    request.view = {
      ...request.view,
      nodes: request.view.nodes.map((n) => ({ ...n, mode: "wires" }))
    }
    expect(solve(request).edges).toEqual(initial.edges)
    request.view = {
      ...request.view,
      nodes: request.view.nodes.map((n) => ({ ...n, mode: "exploded" }))
    }
    const exploded = solve(request)
    expect(
      exploded.nodes.filter((n) => n.semantic.endpoint.kind === "part")
    ).toHaveLength(6)
    expect(exploded.edges.map((e) => e.source.semantic)).toEqual(
      initial.edges.map((e) => e.source.semantic)
    )
    expect(request.prepared.graph.nodes).toHaveLength(2)
  })
  it.each(["LR", "RL", "TB", "BT"] as const)(
    "optimizes exploded %s rows without moving proxies independently",
    (direction) => {
      for (const pinned of [true, false]) {
        const request = fixture({
          mode: "optimize",
          initialIds: ["c", "b", "a"]
        })
        request.view = {
          ...request.view,
          direction,
          constraints: pinned ? request.view.constraints : undefined,
          nodes: request.view.nodes.map((n) => ({ ...n, mode: "exploded" }))
        }
        request.options = compositionalLayoutOptions({ mode: "optimize" })
        const result = solve(request)
        expect(result.edges).toHaveLength(3)
        expect(result.metrics.completedSweeps).toBeGreaterThan(0)
        for (const proxy of result.nodes.filter(
          (n) => n.semantic.endpoint.kind === "part"
        )) {
          const owner = result.nodes.find(
            (n) => n.id === proxy.semantic.nodeId
          )!
          const endpoint = proxy.semantic.endpoint
          if (endpoint.kind !== "part") throw new Error("Expected a part")
          const row = owner.parts!.find((p) => p.partId === endpoint.partId)!
          expect(proxy.rect).toEqual({
            ...row.rect,
            x: owner.rect.x + row.rect.x,
            y: owner.rect.y + row.rect.y
          })
          if (pinned)
            expect(owner.rect).toMatchObject(
              request.view.constraints!.find((c) => c.nodeId === owner.id)!
                .position!
            )
        }
        request.previous = result
        const next = solve(request)
        const ownerDisplacement = next.nodes
          .filter((n) => n.semantic.endpoint.kind === "node")
          .reduce((sum, n) => {
            const prior = result.nodes.find((p) => p.id === n.id)!
            return (
              sum + Math.hypot(n.rect.x - prior.rect.x, n.rect.y - prior.rect.y)
            )
          }, 0)
        expect(next.metrics.nodeDisplacement).toBeCloseTo(ownerDisplacement)
      }
    }
  )
  it.each(["LR", "RL", "TB", "BT"] as const)(
    "honors %s direction and transforms once",
    (direction) => {
      const request = fixture({ mode: "fixed", ids: ["a", "b", "c"] })
      request.view = { ...request.view, direction, constraints: undefined }
      request.options = compositionalLayoutOptions({ mode: "optimize" })
      const result = solve(request),
        e = result.edges[0]
      const horizontal = direction === "LR" || direction === "RL",
        sign = direction === "LR" || direction === "TB" ? 1 : -1
      expect(horizontal ? e.source.normal.x : e.source.normal.y).toBe(sign)
      expect(horizontal ? e.target.normal.x : e.target.normal.y).toBe(-sign)
    }
  )
  it("uses final smooth geometry for paint, hit paths, exported bounds", () => {
    const request = fixture()
    request.options = { ...request.options, routing: "smooth" }
    const result = solve(request),
      scene = emitCompositionalScene({
        prepared: request.prepared,
        solved: result
      })
    for (const e of result.edges) {
      expect(scene.sceneEdges!.find((s) => s.id === e.edgeId)).toMatchObject({
        pathD: e.sections.map(compositionalPath).join(" ")
      })
      for (const c of e.sections.flatMap((s) => s.commands ?? []))
        for (const p of c.kind === "C"
          ? [c.point, c.control1, c.control2]
          : [c.point]) {
          expect(p.x).toBeGreaterThanOrEqual(e.bounds.x)
          expect(p.x).toBeLessThanOrEqual(e.bounds.x + e.bounds.width)
          expect(p.y).toBeGreaterThanOrEqual(e.bounds.y)
          expect(p.y).toBeLessThanOrEqual(e.bounds.y + e.bounds.height)
        }
    }
  })
  it("reports invalid geometry, overlapping pins and unsupported combinations", () => {
    const request = fixture()
    request.geometry = {
      ...request.geometry,
      nodes: [
        { ...request.geometry.nodes[0], width: NaN },
        request.geometry.nodes[1]
      ]
    }
    expect(routeCompositionalGraph(request)).toMatchObject({
      status: "infeasible",
      diagnostics: [{ code: "GEOMETRY_NUMBER" }]
    })
    const overlap = fixture()
    overlap.view = {
      ...overlap.view,
      constraints: overlap.view.constraints!.map((c) => ({
        ...c,
        position: { x: 0, y: 0 }
      }))
    }
    expect(routeCompositionalGraph(overlap).diagnostics[0].code).toBe(
      "CONSTRAINT_OVERLAP"
    )
  })
  it("is deterministic under repeated shuffled input and preserves pre-existing row IDs", () => {
    const request = fixture(),
      expected = solve(request)
    for (let i = 0; i < 12; i++) {
      const g = request.prepared.graph
      request.prepared = prepareCompositionalGraph({
        ...g,
        nodes: [...g.nodes].reverse(),
        edges: [...g.edges.slice(1), g.edges[0]]
      })
      expect(solve(request).edges).toEqual(expected.edges)
    }
    const rows = fixture()
    rows.prepared = prepareCompositionalGraph({
      schemaVersion: "semiotic.compositional-graph.v0.1",
      graphId: "rows",
      revision: "1",
      nodes: [{ id: "orders:row:42" }, { id: "orders:row:43" }],
      edges: [
        { id: "original", source: "orders:row:42", target: "orders:row:43" }
      ]
    })
    rows.view = { revision: "1", direction: "LR", nodes: [] }
    rows.geometry = {
      ...rows.geometry,
      nodes: rows.prepared.graph.nodes.map((n) => ({
        nodeId: n.id,
        width: 100,
        height: 30,
        parts: []
      }))
    }
    rows.options = compositionalLayoutOptions({ mode: "optimize" })
    expect(solve(rows).nodes.map((n) => n.id)).toEqual([
      "orders:row:42",
      "orders:row:43"
    ])
  })
})

describe("declared trace semantics and revision boundaries", () => {
  it("repairs scrolled row terminals to disclosed proxies, preserving the hidden row's identity", () => {
    const initial = solve(fixture({ mode: "fixed", ids: ["a", "b", "c"] }))
    const scrolled = projectCompositionalScroll(initial, {
      nodeId: "A",
      viewport: { x: 0, y: 10, width: 100, height: 60 },
      offsetY: 30,
      viewRevision: "scroll-1"
    })
    const a = scrolled.edges.find((e) => e.edgeId === "a")!
    expect(a.source).toMatchObject({
      precision: "proxy",
      semantic: ref("A", "a"),
      anchor: { x: 100, y: 10 }
    })
    expect(scrolled.edges.find((e) => e.edgeId === "b")!.source).toMatchObject({
      precision: "exact",
      semantic: ref("A", "b")
    })
    expect(scrolled.metrics.completedSweeps).toBe(0)
    expect(initial.edges.find((e) => e.edgeId === "a")!.source.anchor.y).toBe(
      20
    )
    expect(
      scrolled.edges.every(
        (e) => e.sections[0].points[0].y === e.source.anchor.y
      )
    ).toBe(true)
  })
  it("caps measurement corrections and preserves the last valid geometry", () => {
    const request = fixture(),
      transaction = new CompositionalMeasurementTransaction(
        request,
        solve(request)
      )
    for (let i = 1; i <= 2; i++) {
      const result = transaction.update({
        ...request.geometry,
        revision: `measure-${i}`,
        nodes: request.geometry.nodes.map((n) => ({ ...n, height: 100 + i }))
      })
      expect(result.geometryRevision).toBe(`measure-${i}`)
    }
    const unstable = transaction.update({
      ...request.geometry,
      revision: "measure-3",
      nodes: request.geometry.nodes.map((n) => ({ ...n, height: 103 }))
    })
    expect(unstable.geometryRevision).toBe("measure-2")
    expect(unstable.diagnostics.at(-1)!.code).toBe(
      "GEOMETRY_UNSTABLE_MEASUREMENT"
    )
  })
  it("round-trips worker DTOs, cancels pending work and releases listeners", async () => {
    type Listener = (event: MessageEvent<CompositionalWorkerMessage>) => void
    const listeners = [new Set<Listener>(), new Set<Listener>()]
    const ports: CompositionalWorkerPort[] = [0, 1].map((i) => ({
      addEventListener: (_type, listener) => {
        listeners[i].add(listener)
      },
      removeEventListener: (_type, listener) => {
        listeners[i].delete(listener)
      },
      postMessage: (message) => {
        const data = JSON.parse(JSON.stringify(message))
        queueMicrotask(() =>
          listeners[1 - i].forEach((listener) =>
            listener({ data } as MessageEvent<CompositionalWorkerMessage>)
          )
        )
      }
    }))
    const uninstall = installCompositionalWorker(ports[1]),
      engine = createCompositionalWorkerEngine(ports[0])
    const controller = new CompositionalLayoutController()
    expect(await controller.solve(fixture(), engine)).toBe(true)
    expect(controller.solution!.edges).toHaveLength(3)
    const abort = new AbortController(),
      pending = engine.layout(
        { ...fixture(), requestId: "cancel" },
        abort.signal
      )
    abort.abort()
    await expect(pending).rejects.toThrow("REVISION_CANCELLED")
    engine.dispose()
    uninstall()
    expect(listeners.map((s) => s.size)).toEqual([0, 0])
  })
  it("traverses multi-input transfers without joining unrelated parts", () => {
    const request = fixture(),
      g = request.prepared.graph
    const prepared = prepareCompositionalGraph({
      ...g,
      nodes: [...g.nodes, { id: "C" }],
      transfers: [
        {
          id: "combine",
          nodeId: "B",
          sources: [part("a"), part("b")],
          target: part("c"),
          combination: "all"
        }
      ],
      edges: [
        ...g.edges,
        { id: "output", source: "B", sourceEndpoint: part("c"), target: "C" }
      ]
    })
    const traced = traceCompositionalGraph(prepared, {
      start: { nodeId: "C", endpoint: { kind: "node" } },
      direction: "upstream",
      maxDepth: 10,
      maxVisited: 100
    })
    expect(traced.transferIds).toEqual(["combine"])
    expect(traced.edgeIds).toContain("a")
    expect(traced.edgeIds).toContain("b")
    expect(prepared.graph.transfers![0].combination).toBe("all")
    const isolated = traceCompositionalGraph(request.prepared, {
      start: ref("B", "a"),
      direction: "upstream",
      maxDepth: 10,
      maxVisited: 100
    })
    expect(isolated.edgeIds).toEqual(["a"])
    expect(
      isolated.endpoints.every(
        (e) => e.endpoint.kind === "part" && e.endpoint.partId === "a"
      )
    ).toBe(true)
  })
  it("discloses coarse boundaries and budget exhaustion without payload leakage", () => {
    const prepared = prepareCompositionalGraph({
      schemaVersion: "semiotic.compositional-graph.v0.1",
      graphId: "opaque",
      revision: "1",
      nodes: [
        { id: "A" },
        { id: "B", tracePolicy: "opaque", data: { secret: "hidden" } },
        { id: "C" }
      ],
      edges: [
        { id: "ab", source: "A", target: "B" },
        { id: "bc", source: "B", target: "C" }
      ]
    })
    const request = {
      start: { nodeId: "C", endpoint: { kind: "node" as const } },
      direction: "upstream" as const,
      maxDepth: 10,
      maxVisited: 100
    }
    const trace = traceCompositionalGraph(prepared, request)
    expect(trace.edgeIds).toEqual(["bc"])
    expect(trace.completeness).toBe("unknown")
    expect(JSON.stringify(trace)).not.toContain("secret")
    expect(
      traceCompositionalGraph(prepared, { ...request, maxVisited: 1 })
        .completeness
    ).toBe("partial")
    expect(
      traceCompositionalGraph(prepared, {
        ...request,
        boundaryPolicy: "conservative-node"
      }).edgeIds
    ).toEqual(["ab", "bc"])
  })
  it("rejects stale async completion and retains the last accepted transaction after failure", async () => {
    const controller = new CompositionalLayoutController(),
      request = fixture()
    expect(await controller.solve(request)).toBe(true)
    const accepted = controller.solution
    let finish!: (result: SolvedCompositionalLayout) => void
    const engine: AsyncLayoutEngine = {
      ...compositionalDagEngine,
      layout: () =>
        new Promise((resolve) => {
          finish = resolve
        })
    }
    const stale = controller.solve({ ...request, requestId: "old" }, engine)
    expect(await controller.solve({ ...request, requestId: "new" })).toBe(true)
    finish({ ...accepted!, requestId: "old" })
    expect(await stale).toBe(false)
    expect(controller.solution!.requestId).toBe("new")
    const bad = fixture()
    bad.geometry = { ...bad.geometry, nodes: [] }
    expect(await controller.solve(bad)).toBe(false)
    expect(controller.solution!.requestId).toBe("new")
    expect(controller.updating).toBe(false)
  })
})

describe("compositional caller ownership", () => {
  const frozenPaths = (value: unknown, path = "$", out: string[] = []) => {
    if (value && typeof value === "object") {
      if (Object.isFrozen(value)) out.push(path)
      for (const [key, child] of Object.entries(value))
        frozenPaths(child, `${path}.${key}`, out)
    }
    return out
  }
  it("freezes the solved layout without freezing caller-owned view or geometry objects", () => {
    const request = fixture()
    const markAnchor = {
      markId: "m",
      anchorName: "out",
      point: { x: 50, y: 50 },
      normal: { x: 1, y: 0 }
    }
    const parts = ["a", "b", "c"].map((partId, i) => ({
      partId,
      rect: { x: 0, y: 10 + i * 30, width: 100, height: 20 }
    }))
    // Node A supplies its own owner-local geometry; B keeps the row layout.
    request.view = {
      ...request.view,
      nodes: request.view.nodes.map((node) =>
        node.nodeId === "A"
          ? { nodeId: "A", mode: "composite", footprint: "stable" }
          : node
      ),
      anchors: [
        {
          ref: ref("A", "a"),
          use: "source",
          binding: { kind: "point", point: { x: 100, y: 20 }, normal: { x: 1, y: 0 } },
          constraint: "fixed-position"
        }
      ]
    }
    request.geometry = {
      ...request.geometry,
      nodes: request.geometry.nodes.map((node) =>
        node.nodeId === "A"
          ? {
              ...node,
              parts,
              actualPartOrder: ["a", "b", "c"],
              markAnchors: [markAnchor]
            }
          : node
      )
    }
    const solved = solve(request)
    expect(frozenPaths(solved)).toContain("$")
    expect(frozenPaths(request.view)).toEqual([])
    expect(frozenPaths(request.geometry)).toEqual([])
    // The caller can keep editing its own objects for the next revision.
    markAnchor.point.x = 60
    parts[0].rect.height = 24
    expect(solved.nodes.find((n) => n.id === "A")?.parts?.[0].rect.height).toBe(20)
  })
})

describe("compositional acceptance and scale", () => {
  it("rejects an unknown status and a terminal attached to another node", async () => {
    const { validateCompositionalSolution } = await import("./acceptance")
    const request = fixture()
    const solved = structuredClone(solve(request)) as SolvedCompositionalLayout
    expect(() => validateCompositionalSolution(request, solved)).not.toThrow()
    expect(() =>
      validateCompositionalSolution(request, { ...solved, status: "done" as never })
    ).toThrow("REVISION_STATUS")
    const [edge, ...rest] = solved.edges
    const misattached = {
      ...solved,
      edges: [{ ...edge, source: { ...edge.source, displayNodeId: edge.target.displayNodeId } }, ...rest]
    }
    expect(() => validateCompositionalSolution(request, misattached)).toThrow(
      "GEOMETRY_TERMINAL_OWNER"
    )
  })

  it("bounds very large rectangle sets without exceeding the argument limit", async () => {
    const { boundRects } = await import("./geometry")
    const rects = Array.from({ length: 200_000 }, (_, i) => ({
      x: i,
      y: -i,
      width: 1,
      height: 2
    }))
    expect(boundRects(rects)).toEqual({ x: 0, y: -199_999, width: 200_000, height: 200_001 })
  })
})

