import { describe, expect, it } from "vitest"
import { bfsDistances, buildAdjacency, proximityProblem } from "./networkAnalysis"
import { findProximityProblems } from "./networkProximity"

describe("proximity candidate search", () => {
  it.each(["paired leaves", "coincident star", "coincident clique"])(
    "bounds adjacency work for %s with no misleading pairs",
    (shape) => {
      const size = shape === "coincident clique" ? 160 : 1600
      const nodes = Array.from({ length: size }, (_, i) => ({ id: String(i) }))
      let inspections = 0
      class Neighbors extends Set<string> {
        override has(id: string) {
          inspections++
          return super.has(id)
        }
        override [Symbol.iterator]() {
          inspections += this.size
          return super[Symbol.iterator]()
        }
      }
      const adjacency = new Map(nodes.map(({ id }) => [id, new Neighbors()]))
      adjacency.set("outside", new Neighbors())
      for (let i = 1; i < size; i++) {
        const peers = shape === "coincident clique" ? i : 1
        for (let j = 0; j < peers; j++) {
          adjacency.get(String(i))!.add(String(j))
          adjacency.get(String(j))!.add(String(i))
        }
      }
      const positions = Object.fromEntries(nodes.map(({ id }, i) => [id, {
        x: shape === "paired leaves" ? Math.floor(i / 2) * 10 + (i % 2) * 0.02 : 0,
        y: 0
      }]))
      const { problemIds } = findProximityProblems(nodes, adjacency, positions, { startThreshold: 0.1 })
      expect([...problemIds]).toEqual([])
      expect(inspections).toBeLessThan(size * 5)
    }
  )

  it("matches full graph distances for mixed coincident groups and hop limits", () => {
    const nodes = ["a", "b", "c", "d", "e", "f", "isolated"].map(id => ({ id }))
    const edges = ["ab", "bc", "cd", "de", "cf"].map(pair => ({ source: pair[0], target: pair[1] }))
    const positions = Object.fromEntries(nodes.map(({ id }, i) => [id, { x: i % 3, y: 0 }]))
    const adjacency = buildAdjacency(nodes, edges)
    for (const minHops of [1, 2, 2.5, 3, 4, 6]) {
      for (const startThreshold of [0, 1.5]) {
        const expected = new Set<string>()
        for (const { id } of nodes) {
          const hops = bfsDistances(adjacency, id)
          for (const { id: other } of nodes) {
            const distance = Math.abs(positions[id].x - positions[other].x)
            if (other !== id && (hops[other] ?? Infinity) >= minHops && (distance === 0 || distance < startThreshold)) expected.add(id)
          }
        }
        expect(proximityProblem(nodes, edges, positions, { minHops, startThreshold }).problemIds).toEqual(expected)
      }
    }
  })
})
