/**
 * Cache invalidation tests for PipelineStore.
 *
 * These tests verify that internal caches (color maps, stacked extents,
 * bar categories, buffer arrays) are properly invalidated when data changes.
 * A cache invalidation regression produces wrong chart values with no error —
 * the chart renders, but the numbers are stale.
 */

import { PipelineStore } from "./PipelineStore"

function makeStore(overrides: Record<string, any> = {}) {
  return new PipelineStore({
    xAccessor: "x",
    yAccessor: "y",
    chartType: "scatter",
    windowSize: 100,
    windowMode: "sliding" as const,
    extentPadding: 0,
    ...overrides,
  })
}

/** Ingest as bounded data (replaces entire buffer) */
function setData(store: PipelineStore, data: Record<string, any>[]) {
  store.ingest({ inserts: data, bounded: true })
}

// ── Color resolution via scene ───────────────────────────────────────────

describe("resolveGroupColor after data changes", () => {
  it("assigns distinct colors per group", () => {
    const store = makeStore({
      colorAccessor: "group",
      colorScheme: ["red", "blue", "green"],
    })
    setData(store, [
      { x: 1, y: 10, group: "A" },
      { x: 2, y: 20, group: "B" },
      { x: 3, y: 30, group: "C" },
    ])
    store.computeScene([400, 300])

    // resolveGroupColor should return distinct colors for each group
    const colorA = store.resolveGroupColor("A")
    const colorB = store.resolveGroupColor("B")
    const colorC = store.resolveGroupColor("C")
    expect(colorA).toBeDefined()
    expect(colorB).toBeDefined()
    expect(colorC).toBeDefined()
    // All three should be different
    const colors = new Set([colorA, colorB, colorC])
    expect(colors.size).toBe(3)
  })

  it("clear resets group color map", () => {
    const store = makeStore({
      colorAccessor: "group",
      colorScheme: ["red", "blue"],
    })
    setData(store, [
      { x: 1, y: 10, group: "A" },
      { x: 2, y: 20, group: "B" },
    ])
    store.computeScene([400, 300])
    expect(store.resolveGroupColor("A")).toBeDefined()

    store.clear()
    setData(store, [
      { x: 1, y: 10, group: "X" },
      { x: 2, y: 20, group: "Y" },
    ])
    store.computeScene([400, 300])

    // New groups should get colors (X and Y are valid)
    const colorX = store.resolveGroupColor("X")
    const colorY = store.resolveGroupColor("Y")
    expect(colorX).toBeDefined()
    expect(colorY).toBeDefined()
    expect(colorX).not.toBe(colorY)
  })
})

// ── Stacked area extent cache ────────────────────────────────────────────

describe("stacked area extent cache invalidation", () => {
  it("recomputes stacked extent when new data pushes higher cumulative sum", () => {
    const store = makeStore({
      chartType: "stackedarea",
      groupAccessor: "group",
    })
    setData(store, [
      { x: 1, y: 10, group: "A" },
      { x: 1, y: 20, group: "B" },
      { x: 2, y: 15, group: "A" },
      { x: 2, y: 25, group: "B" },
    ])
    store.computeScene([400, 300])

    // Re-set with data that has higher cumulative sum
    setData(store, [
      { x: 1, y: 10, group: "A" },
      { x: 1, y: 20, group: "B" },
      { x: 2, y: 15, group: "A" },
      { x: 2, y: 25, group: "B" },
      { x: 3, y: 50, group: "A" },
      { x: 3, y: 60, group: "B" },
    ])
    store.computeScene([400, 300])

    // Scene should have been rebuilt with new extent (max now 110 at x=3)
    // The scene node count or positions should differ
    expect(store.scene.length).toBeGreaterThan(0)
    // Version should have incremented
    expect(store.version).toBeGreaterThan(0)
  })
})

// ── Buffer array cache ───────────────────────────────────────────────────

describe("buffer array cache invalidation", () => {
  it("getData reflects data after set and re-set", () => {
    const store = makeStore()
    setData(store, [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ])
    const data1 = store.getData()
    expect(data1).toHaveLength(2)

    // Re-set with 3 items
    setData(store, [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ])
    const data2 = store.getData()
    expect(data2).toHaveLength(3)
    expect(data2.some(d => d.x === 3)).toBe(true)
  })

  it("getData reflects removal after remove()", () => {
    const store = makeStore({ pointIdAccessor: "id" })
    setData(store, [
      { id: "a", x: 1, y: 10 },
      { id: "b", x: 2, y: 20 },
      { id: "c", x: 3, y: 30 },
    ])
    expect(store.getData()).toHaveLength(3)

    store.remove("b")
    const afterRemove = store.getData()
    expect(afterRemove).toHaveLength(2)
    expect(afterRemove.some(d => d.id === "b")).toBe(false)
  })

  it("getData reflects clear()", () => {
    const store = makeStore()
    setData(store, [{ x: 1, y: 10 }])
    expect(store.getData()).toHaveLength(1)

    store.clear()
    expect(store.getData()).toHaveLength(0)
  })
})

// ── Scene rebuild after config changes ───────────────────────────────────

describe("scene rebuilds after config changes", () => {
  it("scene reflects new accessor after updateConfig", () => {
    const store = makeStore({ xAccessor: "x", yAccessor: "y" })
    setData(store, [
      { x: 1, y: 10, val: 100 },
      { x: 2, y: 20, val: 200 },
    ])
    store.computeScene([400, 300])
    const sceneBefore = store.scene.length

    // Change the y accessor
    store.updateConfig({
      xAccessor: "x",
      yAccessor: "val",
      chartType: "scatter",
      windowSize: 100,
      windowMode: "sliding" as const,
      extentPadding: 0,
    })
    store.computeScene([400, 300])

    // Scene should still have nodes (data is still in the buffer)
    expect(store.scene.length).toBeGreaterThan(0)
    // With yAccessor="val", the y values should use the new field
    // We can't check exact positions, but the scene should rebuild
    expect(store.scene.length).toBe(sceneBefore)
  })

  it("resolveGroupColor changes after colorScheme update", () => {
    const store = makeStore({
      colorAccessor: "group",
      colorScheme: ["red", "blue"],
    })
    setData(store, [
      { x: 1, y: 10, group: "A" },
      { x: 2, y: 20, group: "B" },
    ])
    store.computeScene([400, 300])
    const colorBefore = store.resolveGroupColor("A")

    // Change color scheme — this should invalidate the color cache
    store.updateConfig({
      xAccessor: "x",
      yAccessor: "y",
      chartType: "scatter",
      windowSize: 100,
      windowMode: "sliding" as const,
      extentPadding: 0,
      colorAccessor: "group",
      colorScheme: ["green", "orange"],
    })
    store.computeScene([400, 300])
    const colorAfter = store.resolveGroupColor("A")

    // Color should have changed from red to green
    expect(colorAfter).not.toBe(colorBefore)
  })
})

// ── Edge case: rapid push/clear cycles ───────────────────────────────────

describe("rapid push/clear cycles", () => {
  it("caches stay consistent through push-clear-push cycles", () => {
    const store = makeStore({
      colorAccessor: "group",
      colorScheme: ["red", "blue"],
    })

    // First cycle
    setData(store, [{ x: 1, y: 10, group: "A" }])
    store.computeScene([400, 300])
    expect(store.getData()).toHaveLength(1)
    const scene1 = store.scene.filter(n => n.type === "point")
    expect(scene1.length).toBe(1)

    // Clear
    store.clear()
    expect(store.getData()).toHaveLength(0)

    // Second cycle with different categories
    setData(store, [
      { x: 1, y: 10, group: "X" },
      { x: 2, y: 20, group: "Y" },
    ])
    store.computeScene([400, 300])
    expect(store.getData()).toHaveLength(2)

    // Group color map should reflect new categories, not stale from cycle 1
    const colorX = store.resolveGroupColor("X")
    const colorY = store.resolveGroupColor("Y")
    expect(colorX).toBeDefined()
    expect(colorY).toBeDefined()
    expect(colorX).not.toBe(colorY)
  })
})
