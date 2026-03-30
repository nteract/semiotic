import { describe, it, expect } from "vitest"
import { buildHeatmapScene } from "./heatmapScene"
import type { XYSceneContext } from "./types"
import type { StreamLayout } from "../types"

function makeCtx(overrides: Partial<XYSceneContext> = {}): XYSceneContext {
  const identity = (v: number) => v
  const identityScale = Object.assign(identity, { domain: () => [0, 100], range: () => [0, 400] })
  return {
    scales: { x: identityScale, y: identityScale } as any,
    config: {},
    getX: (d) => d.x,
    getY: (d) => d.y,
    resolveLineStyle: () => ({ stroke: "#000" }),
    resolveAreaStyle: () => ({ fill: "#000" }),
    resolveBoundsStyle: () => ({ fill: "#ccc" }),
    resolveColorMap: () => new Map(),
    resolveGroupColor: () => null,
    groupData: (data) => {
      const map = new Map<string, any[]>()
      for (const d of data) {
        const key = d.group ?? "default"
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(d)
      }
      return Array.from(map, ([key, data]) => ({ key, data }))
    },
    ...overrides,
  }
}

const defaultLayout: StreamLayout = { width: 400, height: 400 }

describe("buildHeatmapScene (static mode)", () => {
  it("produces a HeatcellSceneNode for each unique (x, y) combination", () => {
    const data = [
      { x: 0, y: 0, value: 10 },
      { x: 0, y: 1, value: 20 },
      { x: 1, y: 0, value: 30 },
      { x: 1, y: 1, value: 40 },
    ]
    const ctx = makeCtx({ config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value" } })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(4)
    expect(nodes.every((n) => n.type === "heatcell")).toBe(true)
  })

  it("cell positions and dimensions are correct for a 2x2 grid", () => {
    // 2 x-values, 2 y-values => cellW = 400/2 = 200, cellH = 400/2 = 200
    const data = [
      { x: 0, y: 0, value: 1 },
      { x: 0, y: 1, value: 2 },
      { x: 1, y: 0, value: 3 },
      { x: 1, y: 1, value: 4 },
    ]
    const ctx = makeCtx({ config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value" } })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)

    // Expected: cellW=200, cellH=200
    // x=0 => xi=0, x=1 => xi=1
    // y=0 => yi=0 => screen y = (2-1-0)*200 = 200
    // y=1 => yi=1 => screen y = (2-1-1)*200 = 0
    const byPos = nodes.map((n) => ({ x: (n as any).x, y: (n as any).y, w: (n as any).w, h: (n as any).h }))

    // (x=0, y=0) => pixel (0, 200)
    expect(byPos).toContainEqual({ x: 0, y: 200, w: 200, h: 200 })
    // (x=0, y=1) => pixel (0, 0)
    expect(byPos).toContainEqual({ x: 0, y: 0, w: 200, h: 200 })
    // (x=1, y=0) => pixel (200, 200)
    expect(byPos).toContainEqual({ x: 200, y: 200, w: 200, h: 200 })
    // (x=1, y=1) => pixel (200, 0)
    expect(byPos).toContainEqual({ x: 200, y: 0, w: 200, h: 200 })
  })

  it("value accessor determines fill intensity — higher values produce different fills", () => {
    const data = [
      { x: 0, y: 0, value: 0 },
      { x: 1, y: 0, value: 100 },
    ]
    const ctx = makeCtx({ config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value" } })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(2)

    const fills = nodes.map((n) => (n as any).fill)
    // Min and max values should produce different colors from the sequential scale
    expect(fills[0]).not.toBe(fills[1])
  })

  it("handles string axes — preserves insertion order and positions cells correctly", () => {
    // String axes are non-numeric, so values are taken in insertion order (not sorted).
    const data = [
      { x: "b", y: "q", value: 10 },
      { x: "a", y: "q", value: 20 },
      { x: "b", y: "p", value: 30 },
    ]
    const ctx = makeCtx({ config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value" } })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)

    // 3 unique combos — "a/p" is missing so only 3 cells
    expect(nodes).toHaveLength(3)

    // With 2 x-values and 2 y-values: cellW = 400/2 = 200, cellH = 400/2 = 200
    const widths = nodes.map((n) => (n as any).w)
    expect(widths.every((w: number) => w === 200)).toBe(true)
  })

  it("missing values in grid are skipped — no cell for (a, p) combo", () => {
    const data = [
      { x: 0, y: 0, value: 10 },
      { x: 0, y: 1, value: 20 },
      { x: 1, y: 1, value: 40 },
      // x=1, y=0 is missing
    ]
    const ctx = makeCtx({ config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value" } })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    // Only 3 cells — the missing combo is skipped
    expect(nodes).toHaveLength(3)
  })

  it("empty data produces no nodes", () => {
    const ctx = makeCtx({ config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value" } })
    const nodes = buildHeatmapScene(ctx, [], defaultLayout)
    expect(nodes).toHaveLength(0)
  })

  it("showValues flag sets label metadata on nodes", () => {
    const data = [
      { x: 0, y: 0, value: 42 },
    ]
    const ctx = makeCtx({
      config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value", showValues: true },
    })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(1)
    const node = nodes[0] as any
    expect(node.showValues).toBe(true)
    expect(node.value).toBe(42)
  })

  it("showValues with custom valueFormat passes format function to node", () => {
    const fmt = (v: number) => `$${v}`
    const data = [{ x: 0, y: 0, value: 99 }]
    const ctx = makeCtx({
      config: {
        xAccessor: "x", yAccessor: "y", valueAccessor: "value",
        showValues: true, heatmapValueFormat: fmt,
      },
    })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    const node = nodes[0] as any
    expect(node.valueFormat).toBe(fmt)
  })
})

describe("buildStreamingHeatmapScene", () => {
  function makeStreamCtx(overrides: Partial<XYSceneContext> = {}): XYSceneContext {
    const identity = (v: number) => v
    const identityScale = Object.assign(identity, { domain: () => [0, 100], range: () => [0, 400] })
    return {
      scales: { x: identityScale, y: identityScale } as any,
      config: { heatmapAggregation: "count", heatmapXBins: 5, heatmapYBins: 5, valueAccessor: "value" },
      getX: (d) => d.x,
      getY: (d) => d.y,
      resolveLineStyle: () => ({ stroke: "#000" }),
      resolveAreaStyle: () => ({ fill: "#000" }),
      resolveBoundsStyle: () => ({ fill: "#ccc" }),
      resolveColorMap: () => new Map(),
      resolveGroupColor: () => null,
      groupData: (data) => {
        const map = new Map<string, any[]>()
        for (const d of data) {
          const key = d.group ?? "default"
          if (!map.has(key)) map.set(key, [])
          map.get(key)!.push(d)
        }
        return Array.from(map, ([key, data]) => ({ key, data }))
      },
      ...overrides,
    }
  }

  it("bins data into heatmapXBins x heatmapYBins grid", () => {
    // Domain [0,100], 5 bins each => bin size 20
    // Point at (10, 10) => bin (0, 0)
    // Point at (30, 30) => bin (1, 1)
    // Point at (90, 90) => bin (4, 4)
    const data = [
      { x: 10, y: 10, value: 5 },
      { x: 30, y: 30, value: 5 },
      { x: 90, y: 90, value: 5 },
    ]
    const ctx = makeStreamCtx()
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    // 3 distinct bins
    expect(nodes).toHaveLength(3)
    expect(nodes.every((n) => n.type === "heatcell")).toBe(true)
  })

  it("count aggregation counts data points per bin", () => {
    // Two points in same bin (x in [0,20), y in [0,20))
    const data = [
      { x: 5, y: 5, value: 100 },
      { x: 15, y: 15, value: 200 },
    ]
    const ctx = makeStreamCtx({
      config: { heatmapAggregation: "count", heatmapXBins: 5, heatmapYBins: 5, valueAccessor: "value" },
    })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    // Both land in bin (0, 0) with domain [0,100] and 5 bins => binSize=20
    expect(nodes).toHaveLength(1)
    const datum = (nodes[0] as any).datum
    expect(datum.count).toBe(2)
    // For count aggregation, the cell value should be the count
    expect(datum.value).toBe(2)
  })

  it("sum aggregation sums values per bin", () => {
    const data = [
      { x: 5, y: 5, value: 10 },
      { x: 15, y: 15, value: 25 },
    ]
    const ctx = makeStreamCtx({
      config: { heatmapAggregation: "sum", heatmapXBins: 5, heatmapYBins: 5, valueAccessor: "value" },
    })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(1)
    const datum = (nodes[0] as any).datum
    expect(datum.sum).toBe(35)
    expect(datum.value).toBe(35)
  })

  it("mean aggregation averages values per bin", () => {
    const data = [
      { x: 5, y: 5, value: 10 },
      { x: 15, y: 15, value: 30 },
    ]
    const ctx = makeStreamCtx({
      config: { heatmapAggregation: "mean", heatmapXBins: 5, heatmapYBins: 5, valueAccessor: "value" },
    })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(1)
    const datum = (nodes[0] as any).datum
    // mean = (10 + 30) / 2 = 20
    expect(datum.value).toBe(20)
    expect(datum.count).toBe(2)
    expect(datum.sum).toBe(40)
  })

  it("cell positions are correct for streaming bins", () => {
    // Domain [0, 100], 5 bins => binSize 20, cellW = 400/5 = 80, cellH = 400/5 = 80
    // Point at (50, 50) => xi = floor((50-0)/20) = 2, yi = floor((50-0)/20) = 2
    // screen x = 2 * 80 = 160, screen y = (5-1-2) * 80 = 160
    const data = [{ x: 50, y: 50, value: 1 }]
    const ctx = makeStreamCtx()
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(1)
    const node = nodes[0] as any
    expect(node.x).toBe(160)
    expect(node.y).toBe(160)
    expect(node.w).toBe(80)
    expect(node.h).toBe(80)
  })

  it("points at domain boundary land in last bin, not out of bounds", () => {
    // x=100 with domain [0,100] and 5 bins: floor((100-0)/20) = 5, clamped to 4
    const data = [{ x: 100, y: 100, value: 1 }]
    const ctx = makeStreamCtx()
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(1)
    const datum = (nodes[0] as any).datum
    expect(datum.xi).toBe(4)
    expect(datum.yi).toBe(4)
  })

  it("empty data produces no nodes in streaming mode", () => {
    const ctx = makeStreamCtx()
    const nodes = buildHeatmapScene(ctx, [], defaultLayout)
    expect(nodes).toHaveLength(0)
  })

  it("showValues sets label metadata in streaming mode", () => {
    const data = [{ x: 10, y: 10, value: 7 }]
    const ctx = makeStreamCtx({
      config: {
        heatmapAggregation: "count", heatmapXBins: 5, heatmapYBins: 5,
        valueAccessor: "value", showValues: true,
      },
    })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    const node = nodes[0] as any
    expect(node.showValues).toBe(true)
    // count aggregation for a single point => value is 1
    expect(node.value).toBe(1)
  })

  it("multiple points in different bins produce separate cells", () => {
    // bin (0,0) and bin (4,4) — well-separated
    const data = [
      { x: 5, y: 5, value: 1 },
      { x: 95, y: 95, value: 1 },
    ]
    const ctx = makeStreamCtx()
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(2)
    const xis = nodes.map((n) => (n as any).datum.xi).sort()
    expect(xis).toEqual([0, 4])
  })
})
