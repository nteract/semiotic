import { describe, it, expect } from "vitest"
import {
  buildAdjacency,
  buildDirectedAdjacency,
  reachableFrom,
  degree,
  bfsDistances,
  shortestPath,
  egoNetwork,
  betweenness,
  closeness,
  clustering,
  normalizeScores,
  proximityProblem,
} from "./networkAnalysis"
import { forceLayout } from "./forceLayout"
import {
  orderByGroupDegree,
  arcLayout,
  arcPath,
  circularLayout,
  adjacencyMatrix,
} from "./networkLayouts"

// Triangle A-B-C, pendant chain C-D-E.
const NODES = [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }]
const EDGES = [
  { source: "A", target: "B" },
  { source: "B", target: "C" },
  { source: "C", target: "A" },
  { source: "C", target: "D" },
  { source: "D", target: "E" },
]

describe("networkAnalysis", () => {
  it("builds adjacency + degree", () => {
    const adj = buildAdjacency(NODES, EDGES)
    expect([...adj.get("C")!].sort()).toEqual(["A", "B", "D"])
    const deg = degree(NODES, EDGES)
    expect(deg).toMatchObject({ A: 2, B: 2, C: 3, D: 2, E: 1 })
  })

  it("bfs + shortest path", () => {
    const adj = buildAdjacency(NODES, EDGES)
    expect(bfsDistances(adj, "A").E).toBe(3)
    expect(shortestPath(NODES, EDGES, "A", "E")).toEqual(["A", "C", "D", "E"])
    expect(shortestPath(NODES, EDGES, "A", "A")).toEqual(["A"])
    expect(shortestPath(NODES, EDGES, "A", "Z")).toEqual([])
  })

  it("ego network", () => {
    expect([...egoNetwork(NODES, EDGES, "C", 1)].sort()).toEqual(["A", "B", "C", "D"])
  })

  it("centrality: leaves score 0 betweenness, hubs score higher", () => {
    const bw = betweenness(NODES, EDGES)
    expect(bw.E).toBe(0)
    expect(bw.C).toBeGreaterThan(bw.A)
    expect(bw.D).toBeGreaterThan(0)
    const cl = closeness(NODES, EDGES)
    expect(cl.C).toBeGreaterThan(cl.E)
    // Triangle node C has all its neighbors interconnected? A-B connected, A-D no,
    // B-D no → 1 of 3 pairs.
    expect(clustering(NODES, EDGES).C).toBeCloseTo(1 / 3, 5)
    expect(clustering(NODES, EDGES).E).toBe(0)
  })

  it("normalizeScores → 0..1 with max at 1", () => {
    const n = normalizeScores({ a: 2, b: 4, c: 0 })
    expect(n).toMatchObject({ a: 0.5, b: 1, c: 0 })
  })

  it("proximityProblem flags far nodes drawn close", () => {
    const positions = {
      A: { x: 0.5, y: 0.5 },
      B: { x: 0.1, y: 0.1 },
      C: { x: 0.15, y: 0.12 },
      D: { x: 0.9, y: 0.9 },
      E: { x: 0.51, y: 0.5 }, // right next to A, but 3 hops away
    }
    const res = proximityProblem(NODES, EDGES, positions)
    expect(res.problemIds.has("A")).toBe(true)
    expect(res.problemIds.has("E")).toBe(true)
  })

  it("treats prototype-named node ids as ordinary own keys across algorithms", () => {
    const nodes = ["__proto__", "constructor", "toString", "leaf"].map((id) => ({ id }))
    const edges = [
      { source: "__proto__", target: "constructor" },
      { source: "constructor", target: "toString" },
      { source: "toString", target: "leaf" },
    ]

    const degrees = degree(nodes, edges)
    expect(Object.getPrototypeOf(degrees)).toBe(Object.prototype)
    expect(Object.keys(degrees)).toEqual(nodes.map((node) => node.id))
    expect(degrees["__proto__"]).toBe(1)
    expect(degrees.constructor).toBe(2)
    expect(degrees.toString).toBe(2)

    const distances = bfsDistances(buildAdjacency(nodes, edges), "__proto__")
    expect(distances.leaf).toBe(3)
    expect(shortestPath(nodes, edges, "__proto__", "leaf")).toEqual([
      "__proto__",
      "constructor",
      "toString",
      "leaf",
    ])
    expect([...egoNetwork(nodes, edges, "constructor", 1)].sort()).toEqual([
      "__proto__",
      "constructor",
      "toString",
    ].sort())

    const between = betweenness(nodes, edges)
    expect(between["__proto__"]).toBe(0)
    expect(between.constructor).toBeGreaterThan(0)
    expect(between.toString).toBeGreaterThan(0)
    expect(closeness(nodes, edges).constructor).toBeGreaterThan(
      closeness(nodes, edges)["__proto__"]
    )
    expect(clustering(nodes, edges)["__proto__"]).toBe(0)

    const scores = Object.fromEntries([
      ["__proto__", 2],
      ["constructor", 4],
      ["toString", 1],
    ])
    const normalized = normalizeScores(scores)
    expect(Object.getPrototypeOf(normalized)).toBe(Object.prototype)
    expect(normalized["__proto__"]).toBe(0.5)
    expect(normalized.constructor).toBe(1)

    const positions = Object.fromEntries([
      ["__proto__", { x: 0.5, y: 0.5 }],
      ["constructor", { x: 0.1, y: 0.1 }],
      ["toString", { x: 0.9, y: 0.9 }],
      ["leaf", { x: 0.51, y: 0.5 }],
    ])
    const proximity = proximityProblem(nodes, edges, positions, { minHops: 3 })
    expect(proximity.problemIds.has("__proto__")).toBe(true)
    expect(proximity.problemIds.has("leaf")).toBe(true)

    const force = forceLayout(nodes, edges, { seed: 2, iterations: 10 })
    expect(Object.getPrototypeOf(force)).toBe(Object.prototype)
    expect(Object.keys(force)).toEqual(nodes.map((node) => node.id))
    for (const { id } of nodes) expect(force[id]).toBeDefined()

    for (const positions of [
      arcLayout(nodes.map((node) => node.id)),
      circularLayout(nodes.map((node) => node.id)),
    ]) {
      expect(Object.getPrototypeOf(positions)).toBe(Object.prototype)
      expect(Object.keys(positions)).toEqual(nodes.map((node) => node.id))
      expect(positions["__proto__"]).toBeDefined()
    }
  })
})

describe("forceLayout", () => {
  it("is deterministic per seed and stays in [0,1]", () => {
    const a = forceLayout(NODES, EDGES, { seed: 1, iterations: 60 })
    const b = forceLayout(NODES, EDGES, { seed: 1, iterations: 60 })
    expect(a).toEqual(b)
    for (const id of Object.keys(a)) {
      expect(a[id].x).toBeGreaterThanOrEqual(0)
      expect(a[id].x).toBeLessThanOrEqual(1)
      expect(a[id].y).toBeGreaterThanOrEqual(0)
      expect(a[id].y).toBeLessThanOrEqual(1)
    }
    const c = forceLayout(NODES, EDGES, { seed: 2, iterations: 60 })
    expect(c).not.toEqual(a)
  })

  it("centers a graph with a single node", () => {
    expect(forceLayout([{ id: "only" }], [], { seed: 1 }).only).toEqual({
      x: 0.5,
      y: 0.5,
    })
  })
})

describe("static network layouts", () => {
  it("orderByGroupDegree groups then sorts by degree", () => {
    const grouped = [
      { id: "A", group: 0 },
      { id: "B", group: 0 },
      { id: "C", group: 1 },
      { id: "D", group: 1 },
      { id: "E", group: 1 },
    ]
    const order = orderByGroupDegree(grouped, EDGES)
    // group 0 first, then group 1; within a group, higher degree leads
    expect(order.slice(0, 2).sort()).toEqual(["A", "B"])
    expect(order.slice(2).sort()).toEqual(["C", "D", "E"])
    expect(order[2]).toBe("C") // C has the highest degree in group 1
  })

  it("arcLayout spreads along a baseline; arcPath is a valid path", () => {
    const pos = arcLayout(["A", "B", "C"])
    expect(pos.A.y).toBeCloseTo(pos.C.y, 5) // shared baseline
    expect(pos.A.x).toBeLessThan(pos.C.x)
    expect(arcPath({ x: 0, y: 10 }, { x: 20, y: 10 })).toMatch(/^M0,10 Q10,/)
  })

  it("circularLayout places all ids within the unit box", () => {
    const pos = circularLayout(["A", "B", "C", "D"])
    expect(Object.keys(pos)).toHaveLength(4)
    for (const id of Object.keys(pos)) {
      expect(pos[id].x).toBeGreaterThanOrEqual(0)
      expect(pos[id].x).toBeLessThanOrEqual(1)
    }
  })

  it("adjacencyMatrix is symmetric with correct max", () => {
    const m = adjacencyMatrix(NODES, EDGES)
    expect(m.size).toBe(5)
    // each pair contributes two cells (both triangles)
    expect(m.cells.length).toBe(EDGES.length * 2)
    for (const cell of m.cells) {
      expect(m.cells.some((c) => c.row === cell.col && c.col === cell.row)).toBe(true)
    }
    expect(m.maxValue).toBe(1)
  })
})

describe("directed reachability", () => {
  const nodes = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }]
  // a → b → d ; a → c (d has no successors)
  const edges = [
    { source: "a", target: "b" },
    { source: "b", target: "d" },
    { source: "a", target: "c" },
  ]

  it("buildDirectedAdjacency follows source→target only", () => {
    const adj = buildDirectedAdjacency(nodes, edges)
    expect([...adj.get("a")!].sort()).toEqual(["b", "c"])
    expect([...adj.get("b")!]).toEqual(["d"])
    expect([...adj.get("d")!]).toEqual([]) // no back-edge from the undirected version
  })

  it("reachableFrom returns the descendant set on a DAG (excludes start)", () => {
    const adj = buildDirectedAdjacency(nodes, edges)
    expect([...reachableFrom(adj, "a")].sort()).toEqual(["b", "c", "d"])
    expect([...reachableFrom(adj, "b")]).toEqual(["d"])
    expect([...reachableFrom(adj, "d")]).toEqual([])
    expect([...reachableFrom(adj, "a", { includeStart: true })].sort()).toEqual([
      "a",
      "b",
      "c",
      "d",
    ])
  })

  it("reachableFrom reports a node that can reach itself through a cycle", () => {
    const cyclic = buildDirectedAdjacency(nodes, [
      { source: "a", target: "b" },
      { source: "b", target: "a" },
    ])
    // a → b → a: a is reachable from itself, so it appears without includeStart.
    expect([...reachableFrom(cyclic, "a")].sort()).toEqual(["a", "b"])
  })
})
