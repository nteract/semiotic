import { afterEach, describe, it, expect, vi } from "vitest"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { NetworkPipelineConfig, NetworkCircleNode, NetworkLineEdge } from "./networkTypes"
import type { NetworkLayoutContext, NetworkLayoutResult } from "./networkCustomLayout"

function baseConfig(extra: Partial<NetworkPipelineConfig> = {}): NetworkPipelineConfig {
  return {
    chartType: "force",
    nodeIDAccessor: "id",
    sourceAccessor: "source",
    targetAccessor: "target",
    ...extra,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("NetworkPipelineStore customNetworkLayout", () => {
  it("invokes customLayout instead of plugin dispatch", () => {
    let captured: NetworkLayoutContext | null = null
    const layout = (ctx: NetworkLayoutContext) => {
      captured = ctx
      return {
        sceneNodes: ctx.nodes.map<NetworkCircleNode>((n, i) => ({
          type: "circle",
          cx: i * 20,
          cy: 50,
          r: 5,
          style: { fill: ctx.resolveColor(n.id) },
          datum: n,
          id: n.id,
        })),
        sceneEdges: [],
        labels: [],
      }
    }

    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
      layoutConfig: { greeting: "hi" },
    }))
    store.ingestBounded(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [],
      [400, 200]
    )
    store.buildScene([400, 200])

    expect(store.sceneNodes).toHaveLength(3)
    expect(store.sceneNodes[0].type).toBe("circle")
    expect(captured).not.toBeNull()
    expect(captured!.config).toEqual({ greeting: "hi" })
    expect(captured!.dimensions.plot).toEqual({ x: 0, y: 0, width: 400, height: 200 })
    expect(typeof captured!.resolveColor).toBe("function")
  })

  it("resolveColor returns stable colors for the same key", () => {
    let resolveColor: ((k: string) => string) | null = null
    const layout = (ctx: NetworkLayoutContext) => {
      resolveColor = ctx.resolveColor
      return { sceneNodes: [], sceneEdges: [], labels: [] }
    }
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
      colorScheme: ["#ff0000", "#00ff00", "#0000ff"],
    }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])

    const c1 = resolveColor!("alpha")
    const c2 = resolveColor!("alpha")
    expect(c1).toBe(c2)
    expect(["#ff0000", "#00ff00", "#0000ff"]).toContain(c1)
  })

  it("resolveColor honors named d3 schemes (e.g. tableau10)", () => {
    // Regression: original implementation only handled array-form
    // colorScheme — a string like "tableau10" silently fell through to
    // the fallback palette.
    let resolveColor: ((k: string) => string) | null = null
    const layout = (ctx: NetworkLayoutContext) => {
      resolveColor = ctx.resolveColor
      return { sceneNodes: [], sceneEdges: [], labels: [] }
    }
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
      colorScheme: "tableau10",
    }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])

    const colors = ["alpha", "beta", "gamma"].map((k) => resolveColor!(k))
    // Tableau10's first color is #4e79a7 — at least one of three keys
    // should land on a Tableau10 entry, not the schemeCategory10 fallback.
    const tableau10 = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"]
    expect(colors.some((c) => tableau10.includes(c))).toBe(true)
  })

  it("runLayout bumps layoutVersion when customLayout is supplied", () => {
    // Regression: the customLayout escape hatch in runLayout used to
    // return early without incrementing layoutVersion, so push-mode
    // React subscribers never saw the change.
    const layout = () => ({ sceneNodes: [], sceneEdges: [], labels: [] })
    const store = new NetworkPipelineStore(baseConfig({ customNetworkLayout: layout }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    const before = store.layoutVersion
    store.runLayout([100, 100])
    expect(store.layoutVersion).toBeGreaterThan(before)
  })

  it("populates topology-diff sets when customLayout is supplied", () => {
    // Regression: the customLayout escape hatch used to skip topology-diff
    // bookkeeping, leaving addedNodes/removedNodes/addedEdges/removedEdges
    // stale and breaking getTopologyDiff() / built-in highlighting.
    // ingestBounded calls runLayout internally, so the diff is observed
    // at the moment ingestion completes.
    const layout = () => ({ sceneNodes: [], sceneEdges: [], labels: [] })
    const store = new NetworkPipelineStore(baseConfig({ customNetworkLayout: layout }))

    // First ingestion: a, b plus an edge. addedNodes should be {a, b}.
    store.ingestBounded(
      [{ id: "a" }, { id: "b" }],
      [{ source: "a", target: "b" }],
      [100, 100]
    )
    expect(store.addedNodes.size).toBe(2)
    expect(store.removedNodes.size).toBe(0)
    expect(store.addedEdges.size).toBe(1)
    expect(store.removedEdges.size).toBe(0)
    const firstChangeTime = store.lastTopologyChangeTime
    expect(firstChangeTime).toBeGreaterThan(0)

    // Second ingestion: drop b, add c. addedNodes should be {c}, removedNodes {b}.
    store.ingestBounded(
      [{ id: "a" }, { id: "c" }],
      [],
      [100, 100]
    )
    expect(Array.from(store.addedNodes)).toEqual(["c"])
    expect(Array.from(store.removedNodes)).toEqual(["b"])
    expect(store.removedEdges.size).toBe(1) // a→b gone
    expect(store.lastTopologyChangeTime).toBeGreaterThanOrEqual(firstChangeTime)
  })

  it("clears the topology pulse after its animation window", () => {
    const layout = (ctx: NetworkLayoutContext) => ({
      sceneNodes: ctx.nodes.map<NetworkCircleNode>((node) => ({
        type: "circle",
        cx: 10,
        cy: 10,
        r: 8,
        style: { fill: "rgba(0,0,0,0)", opacity: 0 },
        datum: node,
        id: node.id,
      })),
    })
    const store = new NetworkPipelineStore(baseConfig({ customNetworkLayout: layout }))
    store.ingestBounded([{ id: "hit-target" }], [], [100, 100])
    store.buildScene([100, 100])

    store.applyTopologyDiff(store.lastTopologyChangeTime + 1000)
    expect(store.sceneNodes[0]._pulseIntensity).toBeGreaterThan(0)

    store.applyTopologyDiff(store.lastTopologyChangeTime + 2001)
    expect(store.sceneNodes[0]._pulseIntensity).toBe(0)
    expect(store.sceneNodes[0]._pulseColor).toBeUndefined()
    expect(store.sceneNodes[0]._pulseGlowRadius).toBeUndefined()
  })

  it("captures overlays returned by customLayout", () => {
    const overlay = { _sentinel: true } as unknown as React.ReactNode
    const layout = () => ({
      sceneNodes: [],
      sceneEdges: [],
      labels: [],
      overlays: overlay,
    })
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
    }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])

    expect(store.customLayoutOverlays).toBe(overlay)
  })

  it("warns when customNetworkLayout returns overlays without scene nodes", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const overlay = { _sentinel: true } as unknown as React.ReactNode
    const layout = () => ({
      sceneNodes: [],
      sceneEdges: [],
      labels: [],
      overlays: overlay,
    })
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
    }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("returned overlays but no data-bearing scene nodes"))
  })

  it("clears overlays when customLayout is removed", () => {
    const layout = () => ({
      sceneNodes: [],
      sceneEdges: [],
      labels: [],
      overlays: { _sentinel: true } as unknown as React.ReactNode,
    })
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
    }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])
    expect(store.customLayoutOverlays).not.toBeNull()

    // Reconfigure to a built-in chart type without customLayout
    store.updateConfig({ ...baseConfig(), customNetworkLayout: undefined })
    store.buildScene([100, 100])
    expect(store.customLayoutOverlays).toBeNull()
  })

  it("captures htmlMarks returned by customLayout", () => {
    const content = { _sentinel: true } as unknown as React.ReactNode
    const layout = (ctx: NetworkLayoutContext) => ({
      sceneNodes: ctx.nodes.map<NetworkCircleNode>((n) => ({
        type: "circle", cx: 0, cy: 0, r: 4, style: {}, datum: n, id: n.id,
      })),
      htmlMarks: ctx.nodes.map((n, i) => ({
        id: n.id, x: i * 10, y: i * 20, width: 40, height: 24, content,
      })),
    })
    const store = new NetworkPipelineStore(baseConfig({ customNetworkLayout: layout }))
    store.ingestBounded([{ id: "a" }, { id: "b" }], [], [100, 100])
    store.buildScene([100, 100])

    expect(store.customLayoutHtmlMarks).toHaveLength(2)
    expect(store.customLayoutHtmlMarks[0]).toMatchObject({ id: "a", x: 0, y: 0, width: 40, height: 24 })
    expect(store.customLayoutHtmlMarks[1]).toMatchObject({ id: "b", x: 10, y: 20 })
    expect(store.customLayoutHtmlMarks[0].content).toBe(content)
  })

  it("defaults htmlMarks to an empty array when the layout omits them", () => {
    const layout = () => ({ sceneNodes: [], sceneEdges: [] })
    const store = new NetworkPipelineStore(baseConfig({ customNetworkLayout: layout }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])

    expect(store.customLayoutHtmlMarks).toEqual([])
  })

  it("clears htmlMarks when customLayout is removed", () => {
    const layout = () => ({
      sceneNodes: [],
      htmlMarks: [{ id: "a", x: 0, y: 0, width: 10, height: 10, content: null }],
    })
    const store = new NetworkPipelineStore(baseConfig({ customNetworkLayout: layout }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])
    expect(store.customLayoutHtmlMarks).toHaveLength(1)

    // Reconfigure to a built-in chart type without customLayout
    store.updateConfig({ ...baseConfig(), customNetworkLayout: undefined })
    store.buildScene([100, 100])
    expect(store.customLayoutHtmlMarks).toEqual([])
  })

  it("preserves the last good custom scene/result/overlays when a re-layout throws", () => {
    const overlay = { _sentinel: "last-good" } as unknown as React.ReactNode
    let shouldThrow = false
    let result: NetworkLayoutResult | null = null
    const onLayoutError = vi.fn()
    const layout = (ctx: NetworkLayoutContext): NetworkLayoutResult => {
      if (shouldThrow) throw new Error("network exploded")
      result = {
        sceneNodes: ctx.nodes.map<NetworkCircleNode>((node) => ({
          type: "circle",
          cx: 20,
          cy: 30,
          r: 6,
          style: { fill: "#123456", opacity: 1 },
          datum: node,
          id: node.id,
        })),
        overlays: overlay,
        htmlMarks: [{ id: "a", x: 1, y: 2, width: 20, height: 10, content: null }],
        restyle: () => ({ opacity: 0.5 }),
      }
      return result
    }
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
      onLayoutError,
    }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])
    const lastGoodNodes = store.sceneNodes
    const lastGoodEdges = store.sceneEdges

    vi.spyOn(console, "error").mockImplementation(() => undefined)
    shouldThrow = true
    store.buildScene([240, 160])

    expect(store.sceneNodes).toBe(lastGoodNodes)
    expect(store.sceneEdges).toBe(lastGoodEdges)
    expect(store.customLayoutOverlays).toBe(overlay)
    expect(store.customLayoutHtmlMarks).toEqual([{ id: "a", x: 1, y: 2, width: 20, height: 10, content: null }])
    expect(store.lastCustomLayoutResult).toBe(result)
    expect(store.hasCustomRestyle).toBe(true)
    expect(store.lastCustomLayoutFailure).toMatchObject({
      code: "CUSTOM_LAYOUT_ERROR",
      severity: "error",
      phase: "layout",
      component: "network",
      source: "customNetworkLayout",
      error: { name: "Error", message: "network exploded" },
      recovery: "preserved-last-good-scene",
      preservedLastGoodScene: true,
      affectedRevision: 1,
    })
    expect(onLayoutError).toHaveBeenCalledWith(store.lastCustomLayoutFailure)

    shouldThrow = false
    store.buildScene([240, 160])
    expect(store.lastCustomLayoutFailure).toBeNull()
  })

  it("reports an empty-scene recovery when the first custom layout attempt throws", () => {
    const layout = () => { throw new Error("boom") }
    const onLayoutError = vi.fn()
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
      onLayoutError,
    }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])

    expect(store.sceneNodes).toEqual([])
    expect(store.sceneEdges).toEqual([])
    expect(store.labels).toEqual([])
    expect(store.customLayoutHtmlMarks).toEqual([])
    expect(store.lastCustomLayoutResult).toBeNull()
    expect(store.lastCustomLayoutFailure).toMatchObject({
      recovery: "empty-scene",
      preservedLastGoodScene: false,
      error: { name: "Error", message: "boom" },
    })
    expect(onLayoutError).toHaveBeenCalledWith(store.lastCustomLayoutFailure)
  })

  it("wraps raw nodes in RealtimeNode with user data on `node.data`", () => {
    // Regression: recipes (flextree, dagre) initially read `node.x`/`node.y`
    // directly, but `ingestBounded` produces `{ ...createNode(id), data: raw }`
    // — so user-supplied positions live on `node.data`, not the wrapper.
    let captured: NetworkLayoutContext | null = null
    const layout = (ctx: NetworkLayoutContext) => {
      captured = ctx
      return { sceneNodes: [], sceneEdges: [], labels: [] }
    }
    const store = new NetworkPipelineStore(baseConfig({ customNetworkLayout: layout }))
    store.ingestBounded(
      [{ id: "a", x: 100, y: 50, label: "Alpha" }],
      [],
      [400, 200]
    )
    store.buildScene([400, 200])

    const node = captured!.nodes[0]
    // The wrapper itself defaults to 0 — user fields live on `node.data`.
    expect(node.x).toBe(0)
    expect(node.y).toBe(0)
    expect(node.data).toMatchObject({ id: "a", x: 100, y: 50, label: "Alpha" })
  })

  it("supports user-emitted line edges", () => {
    const layout = (ctx: NetworkLayoutContext) => {
      const positions = new Map<string, { x: number; y: number }>()
      ctx.nodes.forEach((n, i) => positions.set(n.id, { x: i * 50, y: 100 }))
      const sceneNodes: NetworkCircleNode[] = ctx.nodes.map((n) => ({
        type: "circle",
        cx: positions.get(n.id)!.x,
        cy: positions.get(n.id)!.y,
        r: 4,
        style: { fill: ctx.resolveColor(n.id) },
        datum: n,
        id: n.id,
      }))
      const sceneEdges: NetworkLineEdge[] = ctx.edges.map((e) => {
        const s = typeof e.source === "string" ? e.source : e.source.id
        const t = typeof e.target === "string" ? e.target : e.target.id
        return {
          type: "line",
          x1: positions.get(s)!.x,
          y1: positions.get(s)!.y,
          x2: positions.get(t)!.x,
          y2: positions.get(t)!.y,
          style: { stroke: "#999" },
          datum: e,
          source: s,
          target: t,
        }
      })
      return { sceneNodes, sceneEdges, labels: [] }
    }
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
    }))
    store.ingestBounded(
      [{ id: "a" }, { id: "b" }],
      [{ source: "a", target: "b" }],
      [400, 200]
    )
    store.buildScene([400, 200])

    expect(store.sceneNodes).toHaveLength(2)
    expect(store.sceneEdges).toHaveLength(1)
    expect(store.sceneEdges[0].type).toBe("line")
  })

  it("drops malformed bezier values rather than passing them to the particle pipeline", () => {
    // Truthiness-only checks let `bezier: true` or partial objects
    // through, and the canvas particle code reads
    // `edge.bezier.points[0].x` unguarded — those would crash. The
    // validator should silently drop anything that isn't a real
    // BezierCache shape.
    const layout = () => ({ sceneNodes: [], sceneEdges: [], labels: [] })
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
      showParticles: true,
    }))
    const malformed: unknown[] = [
      true,
      "string",
      42,
      { circular: false },                          // missing points
      { circular: false, points: [{ x: 0, y: 0 }] }, // too few points
      { circular: false, points: [
        { x: NaN, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
      ], halfWidth: 2 },                            // non-finite x
      { circular: true, halfWidth: 1 },             // circular missing segments
      { circular: true, segments: [], halfWidth: 1 }, // empty segments
    ]
    store.ingestBounded(
      [{ id: "a" }, { id: "b" }],
      malformed.map((bezier, i) => ({
        source: "a", target: "b", value: 1, bezier, _i: i,
      })),
      [400, 200],
    )
    const edges = Array.from(store.edges.values())
    expect(edges).toHaveLength(malformed.length)
    for (const e of edges) {
      expect(e.bezier).toBeUndefined()
    }
  })

  it("carries pre-computed bezier through ingestBounded for customNetworkLayout particles", () => {
    // ProcessSankey writes bezier control points onto each edge before
    // pushing to the frame; without this, `runLayout`'s customLayout
    // short-circuit skips `finalizeLayout` and the particle pool's
    // `if (!edge.bezier) continue` gates spawn off every edge. Pin the
    // ingest-side carry-through here so the unification stays wired.
    const layout = () => ({ sceneNodes: [], sceneEdges: [], labels: [] })
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
      showParticles: true,
    }))
    const bezier = {
      circular: false as const,
      points: [
        { x: 0, y: 50 }, { x: 50, y: 50 },
        { x: 50, y: 100 }, { x: 100, y: 100 },
      ] as [
        { x: number; y: number }, { x: number; y: number },
        { x: number; y: number }, { x: number; y: number },
      ],
      halfWidth: 4,
    }
    store.ingestBounded(
      [{ id: "a" }, { id: "b" }],
      [{ source: "a", target: "b", value: 5, bezier }],
      [400, 200],
    )
    const edges = Array.from(store.edges.values())
    expect(edges).toHaveLength(1)
    expect(edges[0].bezier).toBe(bezier)
    // Particle pool gate (sankey OR customNetworkLayout) also fires.
    expect(store.particlePool).not.toBeNull()
  })
})
