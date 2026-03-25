/**
 * Reproduction tests for chart rendering issues:
 * 1. LineChart: axes render but no lines (Date xAccessor, function yAccessor)
 * 2. StackedAreaChart: data bunched left, "undefined" legend
 * 3. MultiAxisLineChart: no dual-axis unitization
 */
import { PipelineStore, type PipelineConfig } from "./PipelineStore"

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "scatter",
    windowSize: 500,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    ...overrides
  }
}

// ── Sample data mimicking Chart shapes ────────────────────────────────

// "Processed" data: points with x (Date-like) and value fields
const processedData = [
  { x: "2003-01-06 00:00:00", value: 72, metricLabel: "valueA" },
  { x: "2003-01-07 00:00:00", value: 75, metricLabel: "valueA" },
  { x: "2003-01-08 00:00:00", value: 74, metricLabel: "valueA" },
  { x: "2003-01-06 00:00:00", value: 78, metricLabel: "valueB" },
  { x: "2003-01-07 00:00:00", value: 76, metricLabel: "valueB" },
  { x: "2003-01-08 00:00:00", value: 77, metricLabel: "valueB" }
]

// "Raw story" data: points with metric names as fields (no 'value')
const rawStoryData = [
  {
    timestamp: "2003-01-06 00:00:00",
    valueA: 72,
    valueB: 78,
    metricLabel: "valueA"
  },
  {
    timestamp: "2003-01-07 00:00:00",
    valueA: 75,
    valueB: 76,
    metricLabel: "valueA"
  },
  {
    timestamp: "2003-01-08 00:00:00",
    valueA: 74,
    valueB: 77,
    metricLabel: "valueA"
  },
  {
    timestamp: "2003-01-06 00:00:00",
    valueA: 72,
    valueB: 78,
    metricLabel: "valueB"
  },
  {
    timestamp: "2003-01-07 00:00:00",
    valueA: 75,
    valueB: 76,
    metricLabel: "valueB"
  },
  {
    timestamp: "2003-01-08 00:00:00",
    valueA: 74,
    valueB: 77,
    metricLabel: "valueB"
  }
]

// Multi-axis data: rows with multiple metric fields
const multiAxisData = Array.from({ length: 20 }, (_, i) => ({
  x: new Date(2003, 0, 6 + i).toISOString(),
  requests: 50 + ((i * 37) % 150),
  latencyMs: 3000 + ((i * 173) % 3500)
}))

describe("Chart Repro — LineChart with Date xAccessor", () => {
  it("produces line scene nodes with function xAccessor returning Date", () => {
    const store = new PipelineStore(
      makeConfig({
        chartType: "line",
        xAccessor: (d: any) => new Date(d.x),
        yAccessor: "value",
        groupAccessor: "metricLabel",
        runtimeMode: "bounded"
      })
    )
    store.ingest({ inserts: processedData, bounded: true })
    store.computeScene({ width: 600, height: 400 })

    const lineNodes = store.scene.filter((n) => n.type === "line")
    expect(lineNodes.length).toBeGreaterThan(0)
    for (const node of lineNodes) {
      if (node.type === "line") {
        expect(node.path.length).toBeGreaterThanOrEqual(2)
        // Verify no NaN in path coordinates
        for (const [px, py] of node.path) {
          expect(isNaN(px)).toBe(false)
          expect(isNaN(py)).toBe(false)
        }
      }
    }
  })

  it("produces line scene nodes with function yAccessor (dynamic field)", () => {
    const store = new PipelineStore(
      makeConfig({
        chartType: "line",
        xAccessor: (d: any) => new Date(d.timestamp),
        yAccessor: (d: any) => d[d.metricLabel],
        groupAccessor: "metricLabel",
        runtimeMode: "bounded"
      })
    )
    store.ingest({ inserts: rawStoryData, bounded: true })
    store.computeScene({ width: 600, height: 400 })

    const lineNodes = store.scene.filter((n) => n.type === "line")
    expect(lineNodes.length).toBeGreaterThan(0)
    for (const node of lineNodes) {
      if (node.type === "line") {
        expect(node.path.length).toBeGreaterThanOrEqual(2)
        for (const [px, py] of node.path) {
          expect(isNaN(px)).toBe(false)
          expect(isNaN(py)).toBe(false)
        }
      }
    }
  })

  it("produces 2 line groups for 2 metricLabel values", () => {
    const store = new PipelineStore(
      makeConfig({
        chartType: "line",
        xAccessor: (d: any) => new Date(d.x),
        yAccessor: "value",
        groupAccessor: "metricLabel",
        runtimeMode: "bounded"
      })
    )
    store.ingest({ inserts: processedData, bounded: true })
    store.computeScene({ width: 600, height: 400 })

    const lineNodes = store.scene.filter((n) => n.type === "line")
    expect(lineNodes.length).toBe(2)

    const groups = lineNodes.map((n) => (n.type === "line" ? n.group : ""))
    expect(groups.sort()).toEqual(["valueA", "valueB"])
  })
})

describe("Chart Repro — StackedAreaChart with Date xAccessor", () => {
  it("produces stacked area scene nodes", () => {
    const store = new PipelineStore(
      makeConfig({
        chartType: "stackedarea",
        xAccessor: (d: any) => new Date(d.x),
        yAccessor: "value",
        groupAccessor: "metricLabel",
        runtimeMode: "bounded"
      })
    )
    store.ingest({ inserts: processedData, bounded: true })
    store.computeScene({ width: 600, height: 400 })

    const areaNodes = store.scene.filter((n) => n.type === "area")
    expect(areaNodes.length).toBeGreaterThan(0)
    // All area nodes should have valid paths (no NaN)
    for (const node of areaNodes) {
      if (node.type === "area") {
        for (const [px, py] of node.topPath) {
          expect(isNaN(px)).toBe(false)
          expect(isNaN(py)).toBe(false)
        }
      }
    }
  })

  it("spreads data across x-axis (not bunched)", () => {
    const store = new PipelineStore(
      makeConfig({
        chartType: "stackedarea",
        xAccessor: (d: any) => new Date(d.x),
        yAccessor: "value",
        groupAccessor: "metricLabel",
        runtimeMode: "bounded"
      })
    )
    store.ingest({ inserts: processedData, bounded: true })
    store.computeScene({ width: 600, height: 400 })

    const areaNodes = store.scene.filter((n) => n.type === "area")
    // At least one area should have points spread across the x-axis
    for (const node of areaNodes) {
      if (node.type === "area" && node.topPath.length >= 2) {
        const xCoords = node.topPath.map(([px]) => px)
        const xRange = Math.max(...xCoords) - Math.min(...xCoords)
        // Should span at least 50% of chart width (600 - margins ~= 400)
        expect(xRange).toBeGreaterThan(100)
      }
    }
  })
})

describe("Chart Repro — MultiAxisLineChart unitization", () => {
  const UNITIZED_FIELD = "__ma_unitized"
  const SERIES_FIELD = "__ma_series"

  function unitize(value: number, extent: [number, number]): number {
    const range = extent[1] - extent[0]
    if (range === 0) return 0.5
    return (value - extent[0]) / range
  }

  function makeUnitizedData() {
    // Replicate what MultiAxisLineChart does internally
    const series = [
      { yAccessor: "requests", label: "requests" },
      { yAccessor: "latencyMs", label: "latencyMs" }
    ]

    // Compute extents
    const extents: [number, number][] = series.map((s) => {
      let min = Infinity,
        max = -Infinity
      for (const d of multiAxisData) {
        const v = (d as any)[s.yAccessor]
        if (v < min) min = v
        if (v > max) max = v
      }
      return [min, max] as [number, number]
    })

    // Unitize
    const result: Record<string, any>[] = []
    for (const d of multiAxisData) {
      for (let i = 0; i < 2; i++) {
        const val = (d as any)[series[i].yAccessor]
        result.push({
          ...d,
          [UNITIZED_FIELD]: unitize(val, extents[i]),
          [SERIES_FIELD]: series[i].label
        })
      }
    }
    return { unitizedData: result, extents }
  }

  it("respects yExtent=[0,1] for unitized data", () => {
    const { unitizedData } = makeUnitizedData()
    const store = new PipelineStore(
      makeConfig({
        chartType: "line",
        xAccessor: (d: any) => new Date(d.x),
        yAccessor: UNITIZED_FIELD,
        groupAccessor: SERIES_FIELD,
        yExtent: [0, 1],
        runtimeMode: "bounded"
      })
    )
    store.ingest({ inserts: unitizedData, bounded: true })
    store.computeScene({ width: 800, height: 400 })

    // Y scale domain should be [0, 1]
    expect(store.scales).toBeTruthy()
    const yDomain = store.scales!.y.domain()
    expect(yDomain[0]).toBe(0)
    expect(yDomain[1]).toBe(1)

    // Line nodes should exist for both series
    const lineNodes = store.scene.filter((n) => n.type === "line")
    expect(lineNodes.length).toBe(2)

    // Both series should spread across the full y-range (not bunched at bottom)
    for (const node of lineNodes) {
      if (node.type === "line") {
        const yCoords = node.path.map(([, py]) => py)
        const yRange = Math.max(...yCoords) - Math.min(...yCoords)
        // Each line should span significant portion of chart height
        expect(yRange).toBeGreaterThan(20)
      }
    }
  })

  it("unitized values are in [0,1] range", () => {
    const { unitizedData } = makeUnitizedData()
    for (const d of unitizedData) {
      expect(d[UNITIZED_FIELD]).toBeGreaterThanOrEqual(0)
      expect(d[UNITIZED_FIELD]).toBeLessThanOrEqual(1)
    }
  })
})
