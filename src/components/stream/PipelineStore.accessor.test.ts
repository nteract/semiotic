import { PipelineStore, type PipelineConfig } from "./PipelineStore"

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
      xAccessor: (d: any) => d.time,
      yAccessor: (d: any) => d.value
    }))
    store.ingest({ inserts: [{ time: 1, value: 2 }], bounded: false })
    store.computeScene({ width: 100, height: 100 })
    store.needsFullRebuild = false

    // Simulate a React re-render: new function objects with identical source
    store.updateConfig({
      xAccessor: (d: any) => d.time,
      yAccessor: (d: any) => d.value
    })
    expect(store.needsFullRebuild).toBe(false)
  })

  it("sets needsFullRebuild when function accessor source changes", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: (d: any) => d.time,
      yAccessor: (d: any) => d.value
    }))
    store.needsFullRebuild = false

    store.updateConfig({ yAccessor: (d: any) => d.price })
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
      colorAccessor: (d: any) => d.category
    }))
    store.needsFullRebuild = false

    store.updateConfig({ colorAccessor: (d: any) => d.category })
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
      xAccessor: (d: any) => d.ts,
      yAccessor: (d: any) => d.val,
      runtimeMode: "bounded"
    }))
    store.ingest({ inserts: [{ ts: 10, val: 20 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    // Pass equivalent functions — should NOT re-resolve
    store.updateConfig({
      xAccessor: (d: any) => d.ts,
      yAccessor: (d: any) => d.val
    })

    // Ingest more data and verify scene still works
    store.ingest({ inserts: [{ ts: 30, val: 40 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })
    expect(store.scene.length).toBeGreaterThan(0)
  })
})
