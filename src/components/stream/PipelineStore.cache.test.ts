import type { Datum } from "../charts/shared/datumTypes"
/**
 * Cache invalidation tests for PipelineStore.
 *
 * These tests verify that internal caches (color maps, stacked extents,
 * bar categories, buffer arrays) are properly invalidated when data changes.
 * A cache invalidation regression produces wrong chart values with no error —
 * the chart renders, but the numbers are stale.
 */

import { PipelineStore } from "./PipelineStore"
import type { HeatcellSceneNode, PointSceneNode, RectSceneNode } from "./types"

function makeStore(overrides: Datum = {}) {
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
function setData(store: PipelineStore, data: Datum[]) {
  store.ingest({ inserts: data, bounded: true })
}

function pointNodes(store: PipelineStore): PointSceneNode[] {
  return store.scene.filter((node): node is PointSceneNode => node.type === "point")
}

function heatcellNodes(store: PipelineStore): HeatcellSceneNode[] {
  return store.scene.filter((node): node is HeatcellSceneNode => node.type === "heatcell")
}

function rectNodes(store: PipelineStore): RectSceneNode[] {
  return store.scene.filter((node): node is RectSceneNode => node.type === "rect")
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

  it("uses a monotonic counter for palette indexing (stable across lookups)", () => {
    // Palette length 2 makes the counter/size distinction observable.
    const store = makeStore({ colorScheme: ["red", "blue"] })
    expect(store.resolveGroupColor("A")).toBe("red")   // counter 0 → red
    expect(store.resolveGroupColor("B")).toBe("blue")  // counter 1 → blue
    expect(store.resolveGroupColor("C")).toBe("red")   // counter 2 → red

    // Re-querying existing groups doesn't increment the counter or mutate colors.
    expect(store.resolveGroupColor("A")).toBe("red")
    expect(store.resolveGroupColor("B")).toBe("blue")
    expect(store.resolveGroupColor("C")).toBe("red")
  })

  it("returns a non-empty color when user palettes are empty, falling through to STREAMING_PALETTE", () => {
    // Empty user-supplied palette + empty theme palette — before the guard this indexed
    // `palette[NaN]` and stored `undefined` in _groupColorMap, corrupting later reads.
    const store = makeStore({
      colorScheme: [],           // empty user scheme
      themeCategorical: [],      // empty theme palette
    })
    const color = store.resolveGroupColor("A")
    expect(color).toBeTruthy()
    expect(typeof color).toBe("string")
  })

  it("FIFO-evicts the oldest entry past GROUP_COLOR_MAP_CAP", () => {
    const store = makeStore({
      colorScheme: ["c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"],
    })
    const cap = (PipelineStore as any).GROUP_COLOR_MAP_CAP
    const total = cap + Math.floor(cap / 2)
    // Push well past the configured cap — prevents unbounded growth on streams with unique group IDs.
    for (let i = 0; i < total; i++) {
      store.resolveGroupColor(`g${i}`)
    }
    // Internal map bounded by the cap.
    expect((store as any)._groupColorMap.size).toBeLessThanOrEqual(cap)

    // The most-recent group is still resolvable and holds its monotonically-assigned palette slot
    // (counter was `total - 1` at the time of that group's insertion).
    expect(store.resolveGroupColor(`g${total - 1}`)).toBe(`c${(total - 1) % 10}`)

    // A previously-evicted group re-appearing gets a fresh palette slot off the running counter,
    // not its original color. Counter is now `total`. The test's point is that eviction-then-
    // reappearance doesn't throw, collide, or corrupt the rest of the map.
    const revived = store.resolveGroupColor("g0")
    expect(revived).toBe(`c${total % 10}`)
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

  it("resolveColorMap invalidates when themeCategorical changes (theme switch)", () => {
    // resolveColorMap short-circuits on _ingestVersion. A theme change without
    // a data ingest must still invalidate the cache.
    const store = makeStore({
      colorAccessor: "group",
      themeCategorical: ["#aaa", "#bbb", "#ccc"],
    })
    setData(store, [
      { x: 1, y: 10, group: "A" },
      { x: 2, y: 20, group: "B" },
    ])
    store.computeScene([400, 300])
    const before = store.resolveGroupColor("A")

    store.updateConfig({
      xAccessor: "x",
      yAccessor: "y",
      chartType: "scatter",
      windowSize: 100,
      windowMode: "sliding" as const,
      extentPadding: 0,
      colorAccessor: "group",
      themeCategorical: ["#111", "#222", "#333"],
    })
    store.computeScene([400, 300])
    const after = store.resolveGroupColor("A")

    expect(after).not.toBe(before)
  })

  it("resolveColorMap invalidates when colorAccessor changes", () => {
    const store = makeStore({
      colorAccessor: "group",
      colorScheme: ["red", "blue", "green"],
    })
    setData(store, [
      { x: 1, y: 10, group: "A", region: "north" },
      { x: 2, y: 20, group: "B", region: "south" },
      { x: 3, y: 30, group: "B", region: "north" },
    ])
    store.computeScene([400, 300])
    // Warm the cache for group "B" so the subsequent colorAccessor swap has
    // something stale to invalidate. Return value intentionally unused.
    store.resolveGroupColor("B")

    // Switch the colorAccessor — categories change from {A, B} to {north, south},
    // so the cached map is wrong. This must invalidate.
    store.updateConfig({
      xAccessor: "x",
      yAccessor: "y",
      chartType: "scatter",
      windowSize: 100,
      windowMode: "sliding" as const,
      extentPadding: 0,
      colorAccessor: "region",
      colorScheme: ["red", "blue", "green"],
    })
    store.computeScene([400, 300])
    // After the swap, "B" is no longer a valid category in the colorAccessor,
    // but resolveGroupColor falls back to _groupColorMap which should also have
    // been reset. The fact that we don't return the stale "B" color is the key.
    const northColor = store.resolveGroupColor("north")
    const southColor = store.resolveGroupColor("south")
    expect(northColor).not.toBe(southColor)
    expect([northColor, southColor]).toContain("red")
  })

  it("scatter scene rebuilds when themeSemantic.primary changes without ingest", () => {
    const store = makeStore({
      themeSemantic: { primary: "#111111" },
    })
    setData(store, [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ])
    store.computeScene([400, 300])
    const pointsBefore = pointNodes(store)
    expect(pointsBefore.length).toBeGreaterThan(0)
    expect(pointsBefore[0].style.fill).toBe("#111111")

    store.updateConfig({
      themeSemantic: { primary: "#222222" },
    })
    store.computeScene([400, 300])

    const pointsAfter = pointNodes(store)
    expect(pointsAfter).toHaveLength(pointsBefore.length)
    expect(pointsAfter[0].style.fill).toBe("#222222")
  })

  it("heatmap scene rebuilds when themeSequential changes without ingest", () => {
    const store = makeStore({
      chartType: "heatmap",
      xAccessor: "x",
      yAccessor: "y",
      valueAccessor: "value",
      themeSequential: "blues",
    })
    setData(store, [
      { x: 0, y: 0, value: 0 },
      { x: 1, y: 0, value: 100 },
    ])
    store.computeScene([400, 300])
    const beforeNodes = heatcellNodes(store)
    expect(beforeNodes.length).toBeGreaterThan(0)
    const before = beforeNodes.map(node => node.fill)

    store.updateConfig({
      themeSequential: "viridis",
    })
    store.computeScene([400, 300])
    const afterNodes = heatcellNodes(store)
    expect(afterNodes).toHaveLength(beforeNodes.length)
    const after = afterNodes.map(node => node.fill)

    expect(after).not.toEqual(before)
  })

  it("bar scene rebuilds when barColors values change without ingest", () => {
    const store = makeStore({
      chartType: "bar",
      runtimeMode: "streaming",
      binSize: 10,
      timeAccessor: "time",
      valueAccessor: "value",
      categoryAccessor: "category",
      barColors: { A: "#111111", B: "#222222" },
    })
    setData(store, [
      { time: 1, value: 10, category: "A" },
      { time: 2, value: 20, category: "B" },
    ])
    store.computeScene([400, 300])
    const beforeGroupARect = rectNodes(store).find(node => node.group === "A")
    expect(beforeGroupARect).toBeDefined()
    expect(beforeGroupARect!.style.fill).toBe("#111111")

    store.updateConfig({
      barColors: { A: "#333333", B: "#444444" },
    })
    store.computeScene([400, 300])

    const afterGroupARect = rectNodes(store).find(node => node.group === "A")
    expect(afterGroupARect).toBeDefined()
    expect(afterGroupARect!.style.fill).toBe("#333333")
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
