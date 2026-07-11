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

function rebuildFlag(store: PipelineStore): { needsFullRebuild: boolean } {
  return store as unknown as { needsFullRebuild: boolean }
}

describe("PipelineStore — Accessor Stability", () => {
  it("does not set needsFullRebuild when string accessors are unchanged", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: "time",
      yAccessor: "value"
    }))
    store.ingest({ inserts: [{ time: 1, value: 2 }], bounded: false })
    store.computeScene({ width: 100, height: 100 })
    rebuildFlag(store).needsFullRebuild = false

    // Re-pass the same string accessors
    store.updateConfig({ xAccessor: "time", yAccessor: "value" })
    expect(rebuildFlag(store).needsFullRebuild).toBe(false)
  })

  it("sets needsFullRebuild when string accessors change", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: "time",
      yAccessor: "value"
    }))
    rebuildFlag(store).needsFullRebuild = false

    store.updateConfig({ yAccessor: "price" })
    expect(rebuildFlag(store).needsFullRebuild).toBe(true)
  })

  it("rebuilds tracked extents when positional accessors change", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      runtimeMode: "bounded",
      xAccessor: "x1",
      yAccessor: "y1",
    }))
    store.ingest({
      inserts: [
        { x1: 1, y1: 10, x2: 100, y2: 1000 },
        { x1: 2, y1: 20, x2: 200, y2: 2000 },
      ],
      bounded: true,
    })
    expect(store.getExtents()).toEqual({ x: [1, 2], y: [10, 20] })

    store.updateConfig({ xAccessor: "x2", yAccessor: "y2" })

    expect(store.getExtents()).toEqual({ x: [100, 200], y: [1000, 2000] })
  })

  it("keeps the existing x accessor when a partial update changes only y", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      runtimeMode: "bounded",
      xAccessor: "x1",
      yAccessor: "y1",
    }))
    store.ingest({
      inserts: [
        { x1: 1, y1: 10, y2: 100 },
        { x1: 2, y1: 20, y2: 200 },
      ],
      bounded: true,
    })

    store.updateConfig({ yAccessor: "y2" })

    expect(store.getXAccessor()({ x: 999, x1: 7 })).toBe(7)
    expect(store.getExtents()).toEqual({ x: [1, 2], y: [100, 200] })
  })

  it("sets needsFullRebuild for a new inline-arrow accessor identity (identity semantics)", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: (d: Datum) => d.time,
      yAccessor: (d: Datum) => d.value
    }))
    store.ingest({ inserts: [{ time: 1, value: 2 }], bounded: false })
    store.computeScene({ width: 100, height: 100 })
    rebuildFlag(store).needsFullRebuild = false

    // Simulate a React re-render passing NEW function objects. The library can
    // no longer prove these are semantically identical to the old closures
    // (identical source can still capture different values), so it rebuilds.
    store.updateConfig({
      xAccessor: (d: Datum) => d.time,
      yAccessor: (d: Datum) => d.value
    })
    expect(rebuildFlag(store).needsFullRebuild).toBe(true)
  })

  it("does not set needsFullRebuild when the SAME function reference is re-passed", () => {
    const xAccessor = (d: Datum) => d.time
    const yAccessor = (d: Datum) => d.value
    const store = new PipelineStore(makeConfig({ xAccessor, yAccessor }))
    store.ingest({ inserts: [{ time: 1, value: 2 }], bounded: false })
    store.computeScene({ width: 100, height: 100 })
    rebuildFlag(store).needsFullRebuild = false

    // Stable references (as a `useCallback`-memoized accessor would produce).
    store.updateConfig({ xAccessor, yAccessor })
    expect(rebuildFlag(store).needsFullRebuild).toBe(false)
  })

  it("re-resolves derived extents when a same-source closure captures a new value", () => {
    // The P0 correctness regression, exercised end-to-end at the store level.
    const makeY = (mult: number) => (d: Datum) => (d.value as number) * mult
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      runtimeMode: "bounded",
      xAccessor: "t",
      yAccessor: makeY(1),
    }))
    store.ingest({ inserts: [{ t: 0, value: 10 }, { t: 1, value: 20 }], bounded: true })
    expect(store.getExtents()!.y).toEqual([10, 20])

    // Same source text (`d => d.value * mult`), different captured `mult`.
    // `updateConfig` rebuilds extents in place from the existing buffer.
    store.updateConfig({ yAccessor: makeY(10) })
    // Old behaviour retained [10, 20]; identity semantics rebuild to ×10.
    expect(store.getExtents()!.y).toEqual([100, 200])
  })

  it("sets needsFullRebuild when function accessor source changes", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: (d: Datum) => d.time,
      yAccessor: (d: Datum) => d.value
    }))
    rebuildFlag(store).needsFullRebuild = false

    store.updateConfig({ yAccessor: (d: Datum) => d.price })
    expect(rebuildFlag(store).needsFullRebuild).toBe(true)
  })

  it("does not set needsFullRebuild for equivalent groupAccessor", () => {
    const store = new PipelineStore(makeConfig({
      groupAccessor: "region"
    }))
    rebuildFlag(store).needsFullRebuild = false

    store.updateConfig({ groupAccessor: "region" })
    expect(rebuildFlag(store).needsFullRebuild).toBe(false)
  })

  it("accessorRevision forces extent re-derivation when a stable accessor's capture changed", () => {
    // A `useCallback([])`-style stable accessor that reads external mutable
    // state. Its identity never changes, so identity comparison can't see the
    // change — accessorRevision is the documented escape hatch.
    let mult = 1
    const yAccessor = (d: Datum) => (d.value as number) * mult
    // Re-pass the full accessor set each render, as the frame does.
    const accessors = { chartType: "line" as const, runtimeMode: "bounded" as const, xAccessor: "t", yAccessor }
    const store = new PipelineStore(makeConfig(accessors))
    store.ingest({ inserts: [{ t: 0, value: 10 }, { t: 1, value: 20 }], bounded: true })
    expect(store.getExtents()!.y).toEqual([10, 20])

    // Mutate the captured value; re-passing the SAME references is a no-op.
    mult = 10
    store.updateConfig({ ...accessors })
    expect(store.getExtents()!.y).toEqual([10, 20]) // still stale — by design

    // Bumping accessorRevision forces re-derivation against the live accessor.
    store.updateConfig({ ...accessors, accessorRevision: 1 })
    expect(store.getExtents()!.y).toEqual([100, 200])
  })

  it("does not set needsFullRebuild for a re-passed stable colorAccessor reference", () => {
    const colorAccessor = (d: Datum) => d.category
    const store = new PipelineStore(makeConfig({ colorAccessor }))
    rebuildFlag(store).needsFullRebuild = false

    store.updateConfig({ colorAccessor })
    expect(rebuildFlag(store).needsFullRebuild).toBe(false)
  })

  it("sets needsFullRebuild when non-accessor config changes alongside equivalent accessors", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: "time",
      yAccessor: "value"
    }))
    rebuildFlag(store).needsFullRebuild = false

    // Accessors equivalent, but chartType changed
    store.updateConfig({ xAccessor: "time", chartType: "line" })
    expect(rebuildFlag(store).needsFullRebuild).toBe(true)
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
    rebuildFlag(store).needsFullRebuild = false

    // Simulate React re-render passing the full config (as StreamXYFrame does)
    store.updateConfig({ ...config })
    expect(rebuildFlag(store).needsFullRebuild).toBe(false)
  })

  it("resolved accessor functions still work after re-resolution from new identities", () => {
    const store = new PipelineStore(makeConfig({
      xAccessor: (d: Datum) => d.ts,
      yAccessor: (d: Datum) => d.val,
      runtimeMode: "bounded"
    }))
    store.ingest({ inserts: [{ ts: 10, val: 20 }], bounded: true })
    store.computeScene({ width: 100, height: 100 })

    // Pass new function objects with identical source — under identity semantics
    // these re-resolve the accessors; the scene must remain valid afterwards.
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
