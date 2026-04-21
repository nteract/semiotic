import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import type { Datum } from "../charts/shared/datumTypes"

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "scatter",
    windowSize: 10,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    ...overrides
  }
}

describe("PipelineStore — Accessor Stability", () => {
  it("does not set needsFullRebuild when string accessors are unchanged", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: "time",
      yAccessor: "value"
    }))
    store.ingest({ inserts: [{ time: 1, value: 2 }], bounded: false })
    store.computeScene({ width: 100, height: 100 })
    store.needsFullRebuild = false

    // Re-pass the same string accessors
    store.updateConfig({ xAccessor: "time", yAccessor: "value" })
    expect(store.needsFullRebuild).toBe(false)
  })

  it("sets needsFullRebuild when string accessors change", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: "time",
      yAccessor: "value"
    }))
    store.needsFullRebuild = false

    store.updateConfig({ yAccessor: "price" })
    expect(store.needsFullRebuild).toBe(true)
  })

  it("does not set needsFullRebuild for functionally equivalent inline arrows", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: (d: Datum) => d.time,
      yAccessor: (d: Datum) => d.value
    }))
    store.ingest({ inserts: [{ time: 1, value: 2 }], bounded: false })
    store.computeScene({ width: 100, height: 100 })
    store.needsFullRebuild = false

    // Simulate a React re-render: new function objects with identical source
    store.updateConfig({
      xAccessor: (d: Datum) => d.time,
      yAccessor: (d: Datum) => d.value
    })
    expect(store.needsFullRebuild).toBe(false)
  })

  it("sets needsFullRebuild when function accessor source changes", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: (d: Datum) => d.time,
      yAccessor: (d: Datum) => d.value
    }))
    store.needsFullRebuild = false

    store.updateConfig({ yAccessor: (d: Datum) => d.price })
    expect(store.needsFullRebuild).toBe(true)
  })

  it("does not set needsFullRebuild for equivalent groupAccessor", () => {
    const store = new PipelineStore(makeConfig({
      groupAccessor: "region"
    }))
    store.needsFullRebuild = false

    store.updateConfig({ groupAccessor: "region" })
    expect(store.needsFullRebuild).toBe(false)
  })

  it("does not set needsFullRebuild for equivalent colorAccessor", () => {
    const store = new PipelineStore(makeConfig({
      colorAccessor: (d: Datum) => d.category
    }))
    store.needsFullRebuild = false

    store.updateConfig({ colorAccessor: (d: Datum) => d.category })
    expect(store.needsFullRebuild).toBe(false)
  })

  it("sets needsFullRebuild when non-accessor config changes alongside equivalent accessors", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: "time",
      yAccessor: "value"
    }))
    store.needsFullRebuild = false

    // Accessors equivalent, but chartType changed
    store.updateConfig({ xAccessor: "time", chartType: "line" })
    expect(store.needsFullRebuild).toBe(true)
  })

  it("does not set needsFullRebuild when full config is re-passed with same values", () => {
    const config = makeConfig({
      xAccessor: "time",
      yAccessor: "value",
      groupAccessor: "region"
    })
    const store = new PipelineStore(config)
    store.ingest({ inserts: [{ time: 1, value: 2, region: "A" }], bounded: false })
    store.computeScene({ width: 100, height: 100 })
    store.needsFullRebuild = false

    // Simulate React re-render passing the full config (as StreamXYFrame does)
    store.updateConfig({ ...config })
    expect(store.needsFullRebuild).toBe(false)
  })

  it("resolved accessor functions still work after skipping re-resolution", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: (d: Datum) => d.ts,
      yAccessor: (d: Datum) => d.val,
      runtimeMode: "bounded"
    }))
    store.ingest({ inserts: [{ ts: 10, val: 20 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    // Pass equivalent functions — should NOT re-resolve
    store.updateConfig({
      xAccessor: (d: Datum) => d.ts,
      yAccessor: (d: Datum) => d.val
    })

    // Ingest more data and verify scene still works
    store.ingest({ inserts: [{ ts: 30, val: 40 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })
    expect(store.scene.length).toBeGreaterThan(0)
  })
})

describe("PipelineStore — xIsDate auto-detection", () => {
  it("detects Date objects from function xAccessor", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      runtimeMode: "bounded",
      xAccessor: (d: Datum) => new Date(d.timestamp),
      yAccessor: "value"
    }))
    store.ingest({
      inserts: [
        { timestamp: "2003-01-06 00:00:00.000000", value: 72 },
        { timestamp: "2003-01-09 00:00:00.000000", value: 71 },
      ],
      bounded: true
    })
    expect(store.xIsDate).toBe(true)
  })

  it("detects date strings from string xAccessor", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      runtimeMode: "bounded",
      xAccessor: "timestamp",
      yAccessor: "value"
    }))
    store.ingest({
      inserts: [
        { timestamp: "2003-01-06 00:00:00.000000", value: 72 },
        { timestamp: "2003-01-09 00:00:00.000000", value: 71 },
      ],
      bounded: true
    })
    expect(store.xIsDate).toBe(true)
  })

  it("does not flag numeric x values as dates", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      runtimeMode: "bounded",
      xAccessor: "x",
      yAccessor: "y"
    }))
    store.ingest({
      inserts: [
        { x: 0, y: 10 },
        { x: 1, y: 20 },
      ],
      bounded: true
    })
    expect(store.xIsDate).toBe(false)
  })

  it("produces valid scene nodes (not NaN) for date-string x values", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      runtimeMode: "bounded",
      xAccessor: "timestamp",
      yAccessor: "value"
    }))
    store.ingest({
      inserts: [
        { timestamp: "2003-01-06 00:00:00.000000", value: 72 },
        { timestamp: "2003-01-09 00:00:00.000000", value: 71 },
      ],
      bounded: true
    })
    store.computeScene({ width: 400, height: 300 })
    expect(store.scene.length).toBeGreaterThan(0)
    // Verify no NaN in scene node x positions
    for (const node of store.scene) {
      if ("x" in node) expect(isNaN(node.x as number)).toBe(false)
    }
  })

  it("does not flag numeric string values as dates", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      runtimeMode: "bounded",
      xAccessor: "x",
      yAccessor: "y"
    }))
    store.ingest({
      inserts: [
        { x: "100", y: 10 },
        { x: "200", y: 20 },
      ],
      bounded: true
    })
    expect(store.xIsDate).toBe(false)
  })

  // ── Explicit-clear regression ──────────────────────────────────────
  //
  // Conditional props like `xAccessor={toggle ? "time" : undefined}` send
  // an explicit `undefined` when the toggle flips off. The outer gate used
  // to be `config.X !== undefined`, which skipped the re-resolution block
  // for that case — leaving `getX` stuck on the previously-resolved key.
  // Switched to `"X" in config`.

  it("explicitly clearing xAccessor reverts the resolver to the default key", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      runtimeMode: "bounded",
      xAccessor: "time",
      yAccessor: "value"
    }))
    const d = { time: 99, value: 10, x: 42, y: 5 }
    expect(store.getXAccessor()(d)).toBe(99)

    store.updateConfig({ xAccessor: undefined })
    // Bounded line chart falls back to "x" when xAccessor is unset.
    expect(store.getXAccessor()(d)).toBe(42)
  })

  it("explicitly clearing yAccessor reverts the resolver to the default key", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      runtimeMode: "bounded",
      xAccessor: "x",
      yAccessor: "price"
    }))
    const d = { x: 1, price: 200, y: 7 }
    expect(store.getYAccessor()(d)).toBe(200)

    store.updateConfig({ yAccessor: undefined })
    expect(store.getYAccessor()(d)).toBe(7)
  })
})
