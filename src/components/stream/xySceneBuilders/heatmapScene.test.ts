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

describe("buildHeatmapScene (static mode) — color LUT and deduplication", () => {
  it("color LUT produces consistent fills across repeated calls (caching)", () => {
    const data = [
      { x: 0, y: 0, value: 0 },
      { x: 1, y: 0, value: 50 },
      { x: 2, y: 0, value: 100 },
    ]
    const ctx = makeCtx({ config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value" } })
    const nodes1 = buildHeatmapScene(ctx, data, defaultLayout)
    const nodes2 = buildHeatmapScene(ctx, data, defaultLayout)

    const fills1 = nodes1.map((n) => (n as any).fill)
    const fills2 = nodes2.map((n) => (n as any).fill)
    expect(fills1).toEqual(fills2)
  })

  it("different color schemes produce different fills", () => {
    const data = [
      { x: 0, y: 0, value: 0 },
      { x: 1, y: 0, value: 100 },
    ]
    const ctxBlues = makeCtx({ config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value", colorScheme: "blues" } })
    const ctxReds = makeCtx({ config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value", colorScheme: "reds" } })
    const nodesBlues = buildHeatmapScene(ctxBlues, data, defaultLayout)
    const nodesReds = buildHeatmapScene(ctxReds, data, defaultLayout)

    const fillsBlues = nodesBlues.map((n) => (n as any).fill)
    const fillsReds = nodesReds.map((n) => (n as any).fill)
    // At least one cell should differ between schemes
    expect(fillsBlues).not.toEqual(fillsReds)
  })

  it("duplicate (x, y) pairs — last value wins", () => {
    const data = [
      { x: 0, y: 0, value: 10 },
      { x: 0, y: 0, value: 99 },
    ]
    const ctx = makeCtx({ config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value", showValues: true } })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(1)
    // Last write wins — value should be 99
    expect((nodes[0] as any).value).toBe(99)
  })

  it("numeric x/y axes are sorted — cell positions reflect sorted order", () => {
    // Data arrives in non-sorted order: x values 10, 5 — sorted to 5, 10
    const data = [
      { x: 10, y: 0, value: 1 },
      { x: 5, y: 0, value: 2 },
    ]
    const ctx = makeCtx({ config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value" } })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(2)

    // After sorting: x=5 gets xi=0, x=10 gets xi=1
    // cellW = 400/2 = 200
    const byX = nodes.map((n) => ({ x: (n as any).x, val: (n as any).datum.value }))
    const at0 = byX.find((n) => n.x === 0)
    const at200 = byX.find((n) => n.x === 200)
    expect(at0!.val).toBe(2) // x=5 (smaller) → xi=0 → pixel x=0
    expect(at200!.val).toBe(1) // x=10 (larger) → xi=1 → pixel x=200
  })

  it("large dataset with many unique cells produces correct count", () => {
    // 100 unique x * 10 unique y = 1000 cells
    const data: any[] = []
    for (let x = 0; x < 100; x++) {
      for (let y = 0; y < 10; y++) {
        data.push({ x, y, value: x + y })
      }
    }
    const ctx = makeCtx({ config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value" } })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(1000)
    // Cell dimensions: 400/100 = 4 wide, 400/10 = 40 tall
    expect((nodes[0] as any).w).toBe(4)
    expect((nodes[0] as any).h).toBe(40)
  })

  it("all-same-value data produces uniform fill", () => {
    const data = [
      { x: 0, y: 0, value: 50 },
      { x: 1, y: 0, value: 50 },
      { x: 0, y: 1, value: 50 },
    ]
    const ctx = makeCtx({ config: { xAccessor: "x", yAccessor: "y", valueAccessor: "value" } })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    const fills = new Set(nodes.map((n) => (n as any).fill))
    // When min === max, all cells get the same color
    expect(fills.size).toBe(1)
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

  it("typed array binning: many points collapse into correct bin counts", () => {
    // 100 points all in bin (0, 0) — x in [0,20), y in [0,20)
    const data = Array.from({ length: 100 }, (_, i) => ({
      x: i * 0.19, // 0..18.81, all in first bin
      y: i * 0.15, // 0..14.85, all in first bin
      value: i,
    }))
    const ctx = makeStreamCtx({
      config: { heatmapAggregation: "count", heatmapXBins: 5, heatmapYBins: 5, valueAccessor: "value" },
    })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(1)
    expect((nodes[0] as any).datum.count).toBe(100)
    expect((nodes[0] as any).datum.value).toBe(100)
  })

  it("typed array binning: sum aggregation accumulates across all points in bin", () => {
    // 5 points in same bin, values 10, 20, 30, 40, 50 => sum = 150
    const data = [
      { x: 1, y: 1, value: 10 },
      { x: 2, y: 2, value: 20 },
      { x: 3, y: 3, value: 30 },
      { x: 4, y: 4, value: 40 },
      { x: 5, y: 5, value: 50 },
    ]
    const ctx = makeStreamCtx({
      config: { heatmapAggregation: "sum", heatmapXBins: 5, heatmapYBins: 5, valueAccessor: "value" },
    })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(1)
    expect((nodes[0] as any).datum.value).toBe(150)
    expect((nodes[0] as any).datum.sum).toBe(150)
  })

  it("NaN/Infinity values are skipped during binning", () => {
    const data = [
      { x: 5, y: 5, value: 10 },
      { x: NaN, y: 5, value: 20 },
      { x: 5, y: Infinity, value: 30 },
      { x: 15, y: 15, value: 40 },
    ]
    const ctx = makeStreamCtx({
      config: { heatmapAggregation: "count", heatmapXBins: 5, heatmapYBins: 5, valueAccessor: "value" },
    })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    // Only 2 valid points: (5,5) and (15,15) — both land in bin (0,0)
    expect(nodes).toHaveLength(1)
    expect((nodes[0] as any).datum.count).toBe(2)
  })

  it("negative values in domain are binned correctly", () => {
    const identity = (v: number) => v
    const negScale = Object.assign(identity, { domain: () => [-50, 50], range: () => [0, 400] })
    const ctx = makeStreamCtx({
      scales: { x: negScale, y: negScale } as any,
      config: { heatmapAggregation: "count", heatmapXBins: 10, heatmapYBins: 10, valueAccessor: "value" },
    })
    // Point at (-25, -25): xi = floor((-25 - (-50))/10) = floor(25/10) = 2
    const data = [{ x: -25, y: -25, value: 1 }]
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(1)
    expect((nodes[0] as any).datum.xi).toBe(2)
    expect((nodes[0] as any).datum.yi).toBe(2)
  })

  it("fills vary across bins with different aggregated values", () => {
    // bin (0,0): 1 point, bin (4,4): 10 points — count aggregation produces different fills
    const data = [
      { x: 5, y: 5, value: 1 },
      ...Array.from({ length: 10 }, () => ({ x: 95, y: 95, value: 1 })),
    ]
    const ctx = makeStreamCtx({
      config: { heatmapAggregation: "count", heatmapXBins: 5, heatmapYBins: 5, valueAccessor: "value" },
    })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(2)
    const fills = nodes.map((n) => (n as any).fill)
    expect(fills[0]).not.toBe(fills[1])
  })

  it("large bin grid (100x100) with sparse data produces only occupied cells", () => {
    // Only 3 points in a 100x100 grid = 10000 possible cells
    const data = [
      { x: 10, y: 10, value: 1 },
      { x: 50, y: 50, value: 2 },
      { x: 90, y: 90, value: 3 },
    ]
    const ctx = makeStreamCtx({
      config: { heatmapAggregation: "count", heatmapXBins: 100, heatmapYBins: 100, valueAccessor: "value" },
    })
    const nodes = buildHeatmapScene(ctx, data, defaultLayout)
    expect(nodes).toHaveLength(3)
  })
})
