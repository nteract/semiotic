// @vitest-environment node
import { describe, expect, it } from "vitest"
import { sankeyCircular } from "./index.js"
import { feedbackOrder } from "./feedbackOrder"
import { ColumnOccupancy } from "./columnOccupancy"

const cycle = [
  { source: "Visit", target: "Signup", value: 1000 },
  { source: "Signup", target: "Buy", value: 400 },
  { source: "Buy", target: "Visit", value: 5 }
]

function layout(ids: string[], edges = cycle) {
  return sankeyCircular()
    .nodeId((d) => d.id)
    .size([600, 400])
    .nodes(ids.map((id) => ({ id })))
    .links(edges.map((d) => ({ ...d })))()
}

function circularIds(graph: ReturnType<typeof layout>) {
  return graph.links
    .filter((link) => link.circular)
    .map((link) => {
      if (typeof link.source !== "object" || typeof link.target !== "object") {
        throw new Error("Unresolved endpoints")
      }
      return `${link.source.id}-${link.target.id}`
    })
    .sort()
}

describe("bounded, weighted Sankey cycle handling", () => {
  it("routes the small return flow for every node and edge permutation", () => {
    const permutations = <T>(items: T[]): T[][] =>
      items.length === 0
        ? [[]]
        : items.flatMap((item, i) =>
            permutations(items.filter((_, j) => i !== j)).map((rest) => [
              item,
              ...rest
            ])
          )
    for (const nodes of permutations(["Visit", "Signup", "Buy"])) {
      for (const edges of permutations(cycle)) {
        const result = layout(nodes, edges)
        expect(circularIds(result)).toEqual(["Buy-Visit"])
        expect(result.nodes.find((node) => node.id === "Visit")?.depth).toBe(0)
        expect(result.nodes.find((node) => node.id === "Buy")?.depth).toBe(2)
      }
    }
  })

  it("includes parallel flow weights and retains self-links", () => {
    const graph = layout(
      ["A", "B"],
      [
        { source: "A", target: "B", value: 3 },
        { source: "A", target: "B", value: 3 },
        { source: "B", target: "A", value: 5 },
        { source: "A", target: "A", value: 100 }
      ]
    )
    expect(circularIds(graph)).toEqual(["A-A", "B-A"])
    expect(graph.links).toHaveLength(4)
    for (const link of graph.links)
      expect(link.path).not.toMatch(/NaN|Infinity/)
  })

  it("lays out a complete 12-node digraph without enumerating its circuits", () => {
    const nodes = Array.from({ length: 12 }, (_, i) => `N${i}`)
    const edges = nodes.flatMap((source) =>
      nodes
        .filter((target) => target !== source)
        .map((target) => ({ source, target, value: 1 }))
    )
    const started = performance.now()
    const graph = layout(nodes, edges)
    expect(performance.now() - started).toBeLessThan(200)
    expect(graph.links).toHaveLength(132)
    expect(circularIds(graph)).toHaveLength(66)
    expect(circularIds(layout([...nodes].reverse(), edges))).toEqual(
      circularIds(graph)
    )
    for (const link of graph.links) {
      expect(link.path).not.toMatch(/NaN|Infinity/)
      expect(link.width).toBeGreaterThan(0)
      if (
        !link.circular &&
        typeof link.source === "object" &&
        typeof link.target === "object"
      ) {
        expect(link.target.depth).toBeGreaterThan(link.source.depth)
      }
    }
  })

  it("computes longest-path layers iteratively for a 20,000-node chain", () => {
    const nodes = Array.from({ length: 20_000 }, (_, i) => `N${i}`)
    const edges = nodes
      .slice(1)
      .map((target, i) => ({ source: nodes[i], target, value: 1 }))
    const graph = sankeyCircular()
      .nodeId((d) => d.id)
      .size([600, 400])
      .iterations(0)
      .nodes(nodes.map((id) => ({ id })))
      .links(edges)()
    expect(graph.nodes[0].height).toBe(19_999)
    expect(graph.nodes[19_999].depth).toBe(19_999)
    expect(graph.links.every((link) => !link.circular)).toBe(true)
  })

  it("clears stale circular metadata when a reused graph becomes acyclic", () => {
    const graph = layout(["Visit", "Signup", "Buy"])
    const back = graph.links.find((link) => link.circular)!
    const sankey = sankeyCircular()
      .nodeId((d) => d.id)
      .size([600, 400])
      .nodes(graph.nodes)
      .links([back])
    const result = sankey()
    expect(back.circular).toBe(false)
    expect(back.circularPathData).toBeUndefined()
    expect(back.circularLinkType).toBeUndefined()
    expect(result.links[0].path).not.toMatch(/NaN|Infinity/)
  })

  it("leaves caller adjacency and weights unchanged during ordering", () => {
    const nodes = ["__proto__", "constructor", "sink"].map((id, index) =>
      Object.freeze({ id, index })
    )
    const links = Object.freeze([
      Object.freeze({ source: nodes[0], target: nodes[1], value: 10 }),
      Object.freeze({ source: nodes[1], target: nodes[0], value: 1 }),
      Object.freeze({ source: nodes[1], target: nodes[2], value: 5 })
    ])
    const order = feedbackOrder(nodes, [...links], (node) => node.id)
    expect(order[0]).toBeLessThan(order[1])
    expect(order[1]).toBeLessThan(order[2])
    expect(links.map((link) => link.value)).toEqual([10, 1, 5])
  })

  it("does not let a large self-link erase the weights of small inter-node flows", () => {
    const nodes = [
      { id: "Z", index: 0 },
      { id: "A", index: 1 }
    ]
    const order = feedbackOrder(
      nodes,
      [
        { source: nodes[0], target: nodes[1], value: 3e-200 },
        { source: nodes[0], target: nodes[1], value: 3e-200 },
        { source: nodes[1], target: nodes[0], value: 5e-200 },
        { source: nodes[0], target: nodes[0], value: 1e308 }
      ],
      (node) => node.id
    )
    expect(order[0]).toBeLessThan(order[1])
  })

  it("keeps fractional-flow feedback choices stable when nodes and edges are reordered", () => {
    let seed = 42
    const random = () =>
      ((seed = (Math.imul(seed, 1664525) + 1013904223) | 0) >>> 0) / 4294967296
    for (let trial = 0; trial < 100; trial++) {
      const ids = Array.from({ length: 8 }, (_, i) => `N${i}`)
      const edges = ids.flatMap((source) =>
        ids
          .filter((target) => target !== source && random() < 0.5)
          .map((target) => ({
            source,
            target,
            value: (1 + Math.floor(random() * 3)) / 10
          }))
      )
      const order = (ids: string[], data: typeof edges) => {
        const nodes = ids.map((id, index) => ({ id, index }))
        const byId = new Map(nodes.map((node) => [node.id, node]))
        const links = data.map((edge) => ({
          source: byId.get(edge.source)!,
          target: byId.get(edge.target)!,
          value: edge.value
        }))
        const ranks = feedbackOrder(nodes, links, (node) => node.id)
        return Object.fromEntries(
          nodes.map((node) => [node.id, ranks[node.index]])
        )
      }
      expect(order([...ids].reverse(), [...edges].reverse())).toEqual(
        order(ids, edges)
      )
    }
  })
})

it("stacks overlapping column intervals like an independent dense occupancy model", () => {
  const occupancy = new ColumnOccupancy(31)
  const expected = new Array<number>(31).fill(0)
  for (let i = 0; i < 500; i++) {
    const a = (i * 7) % 31
    const b = (i * 13) % 31
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    expect(occupancy.query(lo, hi)).toBe(
      Math.max(...expected.slice(lo, hi + 1))
    )
    const value = occupancy.query(lo, hi) + (i % 5) + 1
    occupancy.reserve(lo, hi, value)
    for (let column = lo; column <= hi; column++)
      expected[column] = Math.max(expected[column], value)
  }
  for (let lo = 0; lo < 31; lo++)
    for (let hi = lo; hi < 31; hi++) {
      expect(occupancy.query(lo, hi)).toBe(
        Math.max(...expected.slice(lo, hi + 1))
      )
    }
})
