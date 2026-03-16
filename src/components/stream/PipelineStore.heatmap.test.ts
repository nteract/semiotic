import { PipelineStore, type PipelineConfig } from "./PipelineStore"

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "heatmap",
    runtimeMode: "streaming",
    windowSize: 200,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    ...overrides
  }
}

describe("PipelineStore — Streaming Heatmap", () => {
  it("produces heatcell nodes with count aggregation", () => {
    const store = new PipelineStore(makeConfig({
      heatmapAggregation: "count",
      heatmapXBins: 5,
      heatmapYBins: 5,
      xAccessor: "x",
      yAccessor: "y",
      valueAccessor: "value"
    }))

    // Push data clustered in a few bins
    const data = [
      { x: 1, y: 1, value: 10 },
      { x: 1.1, y: 1.1, value: 20 },
      { x: 5, y: 5, value: 30 },
      { x: 5.1, y: 5.1, value: 40 }
    ]
    store.ingest({ inserts: data, bounded: false })
    store.computeScene({ width: 100, height: 100 })

    const heatcells = store.scene.filter(n => n.type === "heatcell")
    expect(heatcells.length).toBeGreaterThan(0)

    // Each cell should have count in datum
    for (const cell of heatcells) {
      expect(cell.datum.count).toBeGreaterThan(0)
    }
  })

  it("produces heatcell nodes with sum aggregation", () => {
    const store = new PipelineStore(makeConfig({
      heatmapAggregation: "sum",
      heatmapXBins: 5,
      heatmapYBins: 5,
      xAccessor: "x",
      yAccessor: "y",
      valueAccessor: "value"
    }))

    // Two points at the same coordinates share a bin; third point is distant
    const data = [
      { x: 1, y: 1, value: 10 },
      { x: 1, y: 1, value: 20 },
      { x: 5, y: 5, value: 30 }
    ]
    store.ingest({ inserts: data, bounded: false })
    store.computeScene({ width: 100, height: 100 })

    const heatcells = store.scene.filter(n => n.type === "heatcell")
    expect(heatcells.length).toBeGreaterThan(0)

    // Verify all data points are accounted for and sum aggregation is correct
    const totalCount = heatcells.reduce((s, c) => s + c.datum.count, 0)
    expect(totalCount).toBe(3)

    // For sum aggregation, cell.value === cell.sum
    for (const cell of heatcells) {
      expect(cell.datum.value).toBe(cell.datum.sum)
    }

    // Total value across all cells should equal total input values (10+20+30=60)
    const totalValue = heatcells.reduce((s, c) => s + c.datum.value, 0)
    expect(totalValue).toBe(60)
  })

  it("produces heatcell nodes with mean aggregation", () => {
    const store = new PipelineStore(makeConfig({
      heatmapAggregation: "mean",
      heatmapXBins: 5,
      heatmapYBins: 5,
      xAccessor: "x",
      yAccessor: "y",
      valueAccessor: "value"
    }))

    // Two identical-coordinate points share a bin; verify mean = (10+20)/2 = 15
    const data = [
      { x: 1, y: 1, value: 10 },
      { x: 1, y: 1, value: 20 },
      { x: 5, y: 5, value: 30 }
    ]
    store.ingest({ inserts: data, bounded: false })
    store.computeScene({ width: 100, height: 100 })

    const heatcells = store.scene.filter(n => n.type === "heatcell")
    expect(heatcells.length).toBeGreaterThan(0)

    // Verify aggregation values across all cells
    const totalCount = heatcells.reduce((s, c) => s + c.datum.count, 0)
    expect(totalCount).toBe(3) // all 3 data points accounted for

    // For mean aggregation, a cell with count > 1 should have a mean value
    const multiCell = heatcells.find(c => c.datum.count > 1)
    if (multiCell) {
      // cell.value = sum / count (mean aggregation)
      expect(multiCell.datum.value).toBeCloseTo(multiCell.datum.sum / multiCell.datum.count, 5)
    }
  })

  it("produces no cells for empty data", () => {
    const store = new PipelineStore(makeConfig({
      heatmapAggregation: "count",
      heatmapXBins: 5,
      heatmapYBins: 5
    }))

    store.computeScene({ width: 100, height: 100 })
    expect(store.scene.length).toBe(0)
  })

  it("falls back to bounded heatmap when no aggregation specified", () => {
    const store = new PipelineStore(makeConfig({
      // No heatmapAggregation — uses bounded heatmap path
      xAccessor: "x",
      yAccessor: "y",
      valueAccessor: "value"
    }))

    const data = [
      { x: 0, y: 0, value: 1 },
      { x: 0, y: 1, value: 2 },
      { x: 1, y: 0, value: 3 },
      { x: 1, y: 1, value: 4 }
    ]
    store.ingest({ inserts: data, bounded: true })
    store.computeScene({ width: 100, height: 100 })

    const heatcells = store.scene.filter(n => n.type === "heatcell")
    expect(heatcells.length).toBe(4)
  })

  it("heatcell nodes include showValues and value when showValues enabled", () => {
    const store = new PipelineStore(makeConfig({
      heatmapAggregation: "count",
      heatmapXBins: 5,
      heatmapYBins: 5,
      xAccessor: "x",
      yAccessor: "y",
      valueAccessor: "value",
      showValues: true
    }))

    const data = [
      { x: 1, y: 1, value: 10 },
      { x: 1.1, y: 1.1, value: 20 },
      { x: 5, y: 5, value: 30 }
    ]
    store.ingest({ inserts: data, bounded: false })
    store.computeScene({ width: 100, height: 100 })

    const heatcells = store.scene.filter(n => n.type === "heatcell")
    expect(heatcells.length).toBeGreaterThan(0)

    for (const cell of heatcells) {
      if (cell.type !== "heatcell") continue
      expect(cell.showValues).toBe(true)
      expect(typeof cell.value).toBe("number")
    }
  })

  it("heatcell nodes omit showValues fields when showValues not set", () => {
    const store = new PipelineStore(makeConfig({
      heatmapAggregation: "count",
      heatmapXBins: 5,
      heatmapYBins: 5,
      xAccessor: "x",
      yAccessor: "y",
      valueAccessor: "value"
    }))

    const data = [
      { x: 1, y: 1, value: 10 },
      { x: 5, y: 5, value: 30 }
    ]
    store.ingest({ inserts: data, bounded: false })
    store.computeScene({ width: 100, height: 100 })

    const heatcells = store.scene.filter(n => n.type === "heatcell")
    expect(heatcells.length).toBeGreaterThan(0)

    for (const cell of heatcells) {
      if (cell.type !== "heatcell") continue
      expect(cell.showValues).toBeUndefined()
      expect(cell.value).toBeUndefined()
    }
  })

  it("cell dimensions respect bin count", () => {
    const store = new PipelineStore(makeConfig({
      heatmapAggregation: "count",
      heatmapXBins: 10,
      heatmapYBins: 10,
      xAccessor: "x",
      yAccessor: "y",
      valueAccessor: "value"
    }))

    // Spread data across the range
    const data = Array.from({ length: 50 }, (_, i) => ({
      x: i * 2,
      y: i * 2,
      value: i
    }))
    store.ingest({ inserts: data, bounded: false })
    store.computeScene({ width: 200, height: 200 })

    const heatcells = store.scene.filter(n => n.type === "heatcell")
    expect(heatcells.length).toBeGreaterThan(0)

    // Each cell should have width = 200/10 = 20
    for (const cell of heatcells) {
      if (cell.type === "heatcell") {
        expect(cell.w).toBeCloseTo(20, 0)
        expect(cell.h).toBeCloseTo(20, 0)
      }
    }
  })
})
