/**
 * Push API edge case scenarios.
 *
 * Tests behaviors that cross multiple layers: store → scene rebuild → data integrity.
 * Focus on edge cases that have caused real bugs or near-misses.
 */

import { PipelineStore } from "../../components/stream/PipelineStore"
import { OrdinalPipelineStore } from "../../components/stream/OrdinalPipelineStore"
import { NetworkPipelineStore } from "../../components/stream/NetworkPipelineStore"

function makeXYStore(overrides: Record<string, any> = {}) {
  return new PipelineStore({
    chartType: "scatter",
    windowSize: 100,
    windowMode: "sliding" as const,
    extentPadding: 0,
    xAccessor: "x",
    yAccessor: "y",
    pointIdAccessor: "id",
    ...overrides,
  })
}

function makeOrdinalStore(overrides: Record<string, any> = {}) {
  return new OrdinalPipelineStore({
    chartType: "bar",
    windowSize: 100,
    windowMode: "sliding" as const,
    extentPadding: 0,
    projection: "vertical",
    dataIdAccessor: "id",
    ...overrides,
  })
}

// ── Remove edge cases ────────────────────────────────────────────────────

describe("remove on empty store", () => {
  it("XY: remove on empty store does not crash", () => {
    const store = makeXYStore()
    expect(() => store.remove("nonexistent")).not.toThrow()
  })

  it("ordinal: remove on empty store does not crash", () => {
    const store = makeOrdinalStore()
    expect(() => store.remove("nonexistent")).not.toThrow()
  })
})

describe("remove all data leaves store in valid state", () => {
  it("XY: remove all → getData empty, computeScene produces empty scene", () => {
    const store = makeXYStore()
    store.ingest({ inserts: [
      { id: "a", x: 1, y: 10 },
      { id: "b", x: 2, y: 20 },
    ], bounded: true })
    store.remove("a")
    store.remove("b")

    expect(store.getData()).toHaveLength(0)
    store.computeScene([400, 300])
    expect(store.scene).toHaveLength(0)
  })

  it("ordinal: remove all → empty scene", () => {
    const store = makeOrdinalStore()
    store.ingest({ inserts: [
      { id: "a", category: "A", value: 10 },
      { id: "b", category: "B", value: 20 },
    ], bounded: true })
    store.remove("a")
    store.remove("b")
    store.computeScene([400, 300])
    expect(store.scene).toHaveLength(0)
  })
})

describe("remove then push fills the gap", () => {
  it("XY: remove + push maintains correct data count", () => {
    const store = makeXYStore()
    store.ingest({ inserts: [
      { id: "a", x: 1, y: 10 },
      { id: "b", x: 2, y: 20 },
    ], bounded: true })

    store.remove("a")
    expect(store.getData()).toHaveLength(1)

    store.ingest({ inserts: [{ id: "c", x: 3, y: 30 }], bounded: false })
    expect(store.getData()).toHaveLength(2)
    expect(store.getData().some(d => d.id === "c")).toBe(true)
    expect(store.getData().some(d => d.id === "a")).toBe(false)
  })
})

// ── Update edge cases ────────────────────────────────────────────────────

describe("update on nonexistent ID", () => {
  it("XY: update nonexistent ID does not crash, returns empty", () => {
    const store = makeXYStore()
    store.ingest({ inserts: [{ id: "a", x: 1, y: 10 }], bounded: true })
    const result = store.update("nonexistent", d => ({ ...d, y: 99 }))
    expect(result).toHaveLength(0)
    // Original data unchanged
    expect(store.getData()[0].y).toBe(10)
  })
})

describe("update preserves other items", () => {
  it("XY: updating one item leaves others untouched", () => {
    const store = makeXYStore()
    store.ingest({ inserts: [
      { id: "a", x: 1, y: 10 },
      { id: "b", x: 2, y: 20 },
      { id: "c", x: 3, y: 30 },
    ], bounded: true })

    store.update("b", d => ({ ...d, y: 99 }))
    const data = store.getData()
    expect(data.find(d => d.id === "a")?.y).toBe(10)
    expect(data.find(d => d.id === "b")?.y).toBe(99)
    expect(data.find(d => d.id === "c")?.y).toBe(30)
  })
})

describe("update extent recalculation", () => {
  it("updating max value contracts the extent", () => {
    const store = makeXYStore()
    store.ingest({ inserts: [
      { id: "a", x: 1, y: 10 },
      { id: "b", x: 2, y: 100 },
    ], bounded: true })
    store.computeScene([400, 300])
    const sceneBefore = store.scene.filter(n => n.type === "point")

    // Reduce the max value
    store.update("b", d => ({ ...d, y: 20 }))
    store.computeScene([400, 300])
    const sceneAfter = store.scene.filter(n => n.type === "point")

    // Scene should still have 2 points
    expect(sceneAfter).toHaveLength(2)
    // The y positions should differ because extent changed
    expect(sceneAfter).not.toEqual(sceneBefore)
  })
})

// ── Network cascade ──────────────────────────────────────────────────────

describe("network cascade deletion", () => {
  it("removing a node deletes all connected edges", () => {
    const store = new NetworkPipelineStore({
      chartType: "force",
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      iterations: 0, // skip layout — just test data
    })
    store.ingestBounded(
      [{ id: "A" }, { id: "B" }, { id: "C" }],
      [
        { source: "A", target: "B", value: 1 },
        { source: "B", target: "C", value: 1 },
        { source: "A", target: "C", value: 1 },
      ],
      [400, 300]
    )

    // Remove node B — should cascade to edges A→B and B→C
    store.removeNode("B")
    const data = store.getLayoutData()
    expect(data.nodes.some(n => n.id === "B")).toBe(false)
    // Only edge A→C should remain
    expect(data.edges.filter(e => {
      const src = typeof e.source === "object" ? e.source.id : e.source
      const tgt = typeof e.target === "object" ? e.target.id : e.target
      return src === "B" || tgt === "B"
    })).toHaveLength(0)
  })

  it("removing all nodes leaves empty graph", () => {
    const store = new NetworkPipelineStore({
      chartType: "force",
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      iterations: 0,
    })
    store.ingestBounded(
      [{ id: "A" }, { id: "B" }],
      [{ source: "A", target: "B", value: 1 }],
      [400, 300]
    )

    store.removeNode("A")
    store.removeNode("B")
    const data = store.getLayoutData()
    expect(data.nodes).toHaveLength(0)
    expect(data.edges).toHaveLength(0)
  })
})

// ── Rapid mutation sequences ─────────────────────────────────────────────

describe("rapid mutation sequences", () => {
  it("push → remove → push → computeScene produces valid scene", () => {
    const store = makeXYStore()

    // Push initial data
    store.ingest({ inserts: [
      { id: "a", x: 1, y: 10 },
      { id: "b", x: 2, y: 20 },
    ], bounded: true })

    // Remove one
    store.remove("a")

    // Push replacement
    store.ingest({ inserts: [{ id: "c", x: 3, y: 30 }], bounded: false })

    // Scene should be valid
    store.computeScene([400, 300])
    expect(store.scene.length).toBeGreaterThan(0)
    expect(store.getData()).toHaveLength(2)
  })

  it("multiple updates to same item accumulate", () => {
    const store = makeXYStore()
    store.ingest({ inserts: [{ id: "a", x: 1, y: 10 }], bounded: true })

    store.update("a", d => ({ ...d, y: d.y + 10 }))
    store.update("a", d => ({ ...d, y: d.y + 10 }))
    store.update("a", d => ({ ...d, y: d.y + 10 }))

    expect(store.getData()[0].y).toBe(40) // 10 + 10 + 10 + 10
  })

  it("clear during mutation sequence resets cleanly", () => {
    const store = makeXYStore()
    store.ingest({ inserts: [
      { id: "a", x: 1, y: 10 },
      { id: "b", x: 2, y: 20 },
    ], bounded: true })
    store.remove("a")
    store.clear()

    expect(store.getData()).toHaveLength(0)

    // Store should accept new data after clear
    store.ingest({ inserts: [{ id: "x", x: 5, y: 50 }], bounded: true })
    expect(store.getData()).toHaveLength(1)
    store.computeScene([400, 300])
    expect(store.scene.length).toBeGreaterThan(0)
  })
})
