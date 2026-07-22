import { describe, it, expect } from "vitest"
import { netEnsembleLayout, analyzeNetEnsemble } from "./netEnsembleLayout"
import type { NetEnsembleConfig } from "./netEnsembleLayout"
import type { NetworkLayoutContext, NetworkLayoutSelection } from "../stream/networkCustomLayout"
import type { RealtimeNode, RealtimeEdge, NetworkSymbolNode } from "../stream/networkTypes"
import type { Datum } from "../charts/shared/datumTypes"

// ── Fixtures ───────────────────────────────────────────────────────────────────
// A "diamond" DAG: one source, one sink, two middle nodes. Directed (1 sink).
const diamond = (p: string) => [
  { source: `${p}a`, target: `${p}b` },
  { source: `${p}a`, target: `${p}c` },
  { source: `${p}b`, target: `${p}d` },
  { source: `${p}c`, target: `${p}d` },
]
const diamondNodes = (p: string) => [`${p}a`, `${p}b`, `${p}c`, `${p}d`].map((id) => ({ id }))

// A "cherry": one source, two sinks. NOT directed (2 sinks).
const cherry = (p: string) => [
  { source: `${p}x`, target: `${p}y` },
  { source: `${p}x`, target: `${p}z` },
]
const cherryNodes = (p: string) => [`${p}x`, `${p}y`, `${p}z`].map((id) => ({ id }))

// A "chain" a→b→c. Directed (1 sink).
const chain = (p: string) => [
  { source: `${p}1`, target: `${p}2` },
  { source: `${p}2`, target: `${p}3` },
]
const chainNodes = (p: string) => [`${p}1`, `${p}2`, `${p}3`].map((id) => ({ id }))

describe("analyzeNetEnsemble — the net diagnostics", () => {
  it("directedness = single sink (a net converging to a limit)", () => {
    const a = analyzeNetEnsemble(diamondNodes("d"), diamond("d"))
    expect(a.components).toHaveLength(1)
    const c = a.components[0]
    expect(c.sinkCount).toBe(1)
    expect(c.directed).toBe(true)
    expect(c.sourceCount).toBe(1)
    expect(a.directedCount).toBe(1)
    expect(a.branchingCount).toBe(0)
  })

  it("two sinks ⟹ not directed (some pair has no common descendant)", () => {
    const a = analyzeNetEnsemble(cherryNodes("c"), cherry("c"))
    const c = a.components[0]
    expect(c.sinkCount).toBe(2)
    expect(c.directed).toBe(false)
    expect(a.branchingCount).toBe(1)
  })

  it("splits a disconnected graph into weakly-connected components", () => {
    const nodes = [...diamondNodes("d"), ...chainNodes("k"), ...cherryNodes("c")]
    const edges = [...diamond("d"), ...chain("k"), ...cherry("c")]
    const a = analyzeNetEnsemble(nodes, edges)
    expect(a.components).toHaveLength(3)
    expect(a.directedCount).toBe(2) // diamond + chain
    expect(a.branchingCount).toBe(1) // cherry
  })

  it("groups order-isomorphic components into one motif (WL fingerprint)", () => {
    // Three diamonds with different ids but identical structure.
    const nodes = [...diamondNodes("p"), ...diamondNodes("q"), ...diamondNodes("r")]
    const edges = [...diamond("p"), ...diamond("q"), ...diamond("r")]
    const a = analyzeNetEnsemble(nodes, edges)
    expect(a.components).toHaveLength(3)
    expect(a.motifs).toHaveLength(1) // all one motif class
    expect(a.motifs[0].count).toBe(3)
    expect(a.motifs[0].directed).toBe(true)
  })

  it("distinguishes structurally different motifs", () => {
    const nodes = [...diamondNodes("d"), ...cherryNodes("c"), ...chainNodes("k")]
    const edges = [...diamond("d"), ...cherry("c"), ...chain("k")]
    const a = analyzeNetEnsemble(nodes, edges)
    expect(a.motifs).toHaveLength(3) // diamond ≠ cherry ≠ chain
    // Motifs are sorted most-frequent first; all singletons here.
    expect(a.motifs.map((m) => m.count)).toEqual([1, 1, 1])
  })

  it("descriptor names common shapes", () => {
    expect(analyzeNetEnsemble(chainNodes("k"), chain("k")).components[0].descriptor).toBe("chain of 3")
    expect(analyzeNetEnsemble([{ id: "solo" }], []).components[0].descriptor).toBe("isolate")
    expect(analyzeNetEnsemble(diamondNodes("d"), diamond("d")).components[0].descriptor).toBe(
      "diamond / mesh"
    )
  })
})

// ── Layout scene output ──────────────────────────────────────────────────────

function nodesFrom(ids: Array<{ id: string; label?: string; category?: string }>): RealtimeNode[] {
  return ids.map((r) => ({ id: r.id, data: r as unknown as Datum })) as unknown as RealtimeNode[]
}
function edgesFrom(es: Array<{ source: string; target: string }>): RealtimeEdge[] {
  return es as unknown as RealtimeEdge[]
}

function makeCtx(
  config: NetEnsembleConfig,
  nodes: RealtimeNode[],
  edges: RealtimeEdge[],
  selection: NetworkLayoutSelection | null = null
): NetworkLayoutContext<NetEnsembleConfig> {
  return {
    nodes,
    edges,
    dimensions: { width: 800, height: 600, plot: { x: 0, y: 0, width: 800, height: 600 } },
    theme: { semantic: { info: "#4c78a8", warning: "#e8853a", border: "#999" }, categorical: ["#4c78a8"] },
    resolveColor: (key: string) => "#" + (Math.abs([...key].reduce((h, c) => h * 31 + c.charCodeAt(0), 0)) % 999999).toString(16).padStart(6, "0"),
    config,
    selection,
  }
}

describe("netEnsembleLayout — scene output", () => {
  const nodes = nodesFrom([...diamondNodes("d"), ...chainNodes("k"), ...cherryNodes("c")])
  const edges = edgesFrom([...diamond("d"), ...chain("k"), ...cherry("c")])

  it("emits one hit-testable symbol per node at full detail, plus edges", () => {
    const res = netEnsembleLayout(makeCtx({}, nodes, edges))
    const symbols = (res.sceneNodes ?? []) as NetworkSymbolNode[]
    // 4 (diamond) + 3 (chain) + 3 (cherry) = 10 nodes.
    expect(symbols.filter((s) => s.type === "symbol")).toHaveLength(10)
    // Each carries a stable id + datum for nav / annotation anchoring.
    expect(symbols.every((s) => typeof s.id === "string" && s.datum != null)).toBe(true)
    // Diamond has 4 edges, chain 2, cherry 2 = 8 line edges.
    expect(res.sceneEdges).toHaveLength(8)
  })

  it("colors converging components differently from branching ones", () => {
    const res = netEnsembleLayout(makeCtx({ colorMode: "directedness" }, nodes, edges))
    const symbols = (res.sceneNodes ?? []) as NetworkSymbolNode[]
    const fills = new Set(symbols.map((s) => s.style.fill))
    // converge (info) + branch (warning) both present.
    expect(fills.has("#4c78a8")).toBe(true)
    expect(fills.has("#e8853a")).toBe(true)
  })

  it("collapses to one glyph per component when cells are tiny (census view)", () => {
    // Many components + small plot ⟹ sub-minCellForFull cells.
    const many = Array.from({ length: 60 }, (_, i) => diamondNodes(`m${i}`)).flat()
    const manyEdges = Array.from({ length: 60 }, (_, i) => diamond(`m${i}`)).flat()
    const ctx = makeCtx({}, nodesFrom(many), edgesFrom(manyEdges))
    ctx.dimensions.plot = { x: 0, y: 0, width: 300, height: 220 }
    const res = netEnsembleLayout(ctx)
    const symbols = (res.sceneNodes ?? []) as NetworkSymbolNode[]
    // One symbol per component (60), not per node (240).
    expect(symbols).toHaveLength(60)
    // Collapsed glyph datum describes the whole component.
    expect(symbols[0].datum).toMatchObject({ directedness: "converging", nodes: 4 })
  })

  it("dims non-selected marks via the shared-selection predicate", () => {
    const selection: NetworkLayoutSelection = {
      isActive: true,
      predicate: (d) => (d as { id?: string }).id === "da",
    }
    const res = netEnsembleLayout(makeCtx({}, nodes, edges, selection))
    const symbols = (res.sceneNodes ?? []) as NetworkSymbolNode[]
    const lit = symbols.filter((s) => (s.style.opacity ?? 1) > 0.5)
    const dimmed = symbols.filter((s) => (s.style.opacity ?? 1) <= 0.2)
    expect(lit).toHaveLength(1)
    expect(dimmed.length).toBeGreaterThan(0)
  })

  it("returns an empty scene for no nodes", () => {
    const res = netEnsembleLayout(makeCtx({}, [], []))
    expect(res.sceneNodes).toEqual([])
  })
})
