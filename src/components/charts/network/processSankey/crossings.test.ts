import { describe, expect, it } from "vitest"
import { ProcessSankeyCrossings } from "./crossings"
import { countCrossings } from "./ordering"
import type { ProcessSankeyEdge } from "./algorithm"

function reference(edges: ProcessSankeyEdge[], lanes: Record<string, number>) {
  let count = 0
  for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
    const a = edges[i], b = edges[j]
    if (a.source === b.source || a.target === b.target || a.source === b.target || a.target === b.source) continue
    if (Math.max(a.startTime, b.startTime) >= Math.min(a.endTime, b.endTime)) continue
    if ((lanes[a.source] - lanes[b.source]) * (lanes[a.target] - lanes[b.target]) < 0) count++
  }
  return count
}

describe("temporal crossing index", () => {
  it.each([40, 180])("matches exhaustive counts and adjacent deltas for %i temporal edges", (edgeCount) => {
    let seed = 713
    const random = (limit: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed % limit
    }
    for (let sample = 0; sample < 20; sample++) {
      const slotCount = 12
      const slots = new Map(Array.from({ length: 24 }, (_, i) => [`n${i}`, i % slotCount]))
      const positions = Array.from({ length: slotCount }, (_, i) => i)
      for (let i = positions.length - 1; i > 0; i--) {
        const j = random(i + 1)
        ;[positions[i], positions[j]] = [positions[j], positions[i]]
      }
      const edges = Array.from({ length: edgeCount }, (_, i) => {
        const startTime = random(10)
        return { id: `e${i}`, source: `n${random(24)}`, target: `n${random(24)}`, value: 1,
          startTime, endTime: startTime + random(15) }
      })
      const lanes = Object.fromEntries([...slots].map(([id, slot]) => [id, positions[slot]]))
      const index = new ProcessSankeyCrossings(edges, slots, slotCount)
      const before = reference(edges, lanes)
      expect(index.count(positions)).toBe(before)
      expect(countCrossings(lanes, edges)).toBe(before)
      for (let rank = 0; rank < slotCount - 1; rank++) {
        const first = positions.indexOf(rank), second = positions.indexOf(rank + 1)
        const change = index.swapDelta(first, second, positions)
        const after = positions.map((position) => position === rank ? rank + 1 : position === rank + 1 ? rank : position)
        const nextLanes = Object.fromEntries([...slots].map(([id, slot]) => [id, after[slot]]))
        expect(before + change.delta).toBe(reference(edges, nextLanes))
      }
    }
  })

  it("counts dense reciprocal flows without treating shared endpoints as crossings", () => {
    const slots = new Map(Array.from({ length: 20 }, (_, i) => [`n${i}`, i]))
    const edges = [...slots.keys()].flatMap((source, i) => [...slots.keys()].map((target, j) => ({
      id: `${i}-${j}`, source, target, value: 1, startTime: 0, endTime: 10,
    })))
    const positions = Array.from(slots.values())
    expect(new ProcessSankeyCrossings(edges, slots, 20).count(positions))
      .toBe(reference(edges, Object.fromEntries(slots)))
  })
})
