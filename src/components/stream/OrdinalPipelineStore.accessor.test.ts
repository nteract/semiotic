import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { OrdinalPipelineConfig } from "./ordinalTypes"

function makeConfig(overrides: Partial<OrdinalPipelineConfig> = {}): OrdinalPipelineConfig {
  return {
    chartType: "bar",
    windowSize: 1000,
    windowMode: "sliding",
    extentPadding: 0.05,
    projection: "vertical",
    oAccessor: "category",
    rAccessor: "value",
    ...overrides
  }
}

describe("OrdinalPipelineStore — Accessor Stability", () => {
  it("does not re-resolve oAccessor when string is unchanged", () => {
    const store = new OrdinalPipelineStore(makeConfig({ oAccessor: "name" }))
    const originalGetO = store.getOAccessor()

    store.updateConfig({ oAccessor: "name" })
    expect(store.getOAccessor()).toBe(originalGetO)
  })

  it("re-resolves oAccessor when string changes", () => {
    const store = new OrdinalPipelineStore(makeConfig({ oAccessor: "name" }))
    const originalGetO = store.getOAccessor()

    store.updateConfig({ oAccessor: "label" })
    expect(store.getOAccessor()).not.toBe(originalGetO)
    expect(store.getOAccessor()({ label: "X" })).toBe("X")
  })

  it("does not re-resolve oAccessor for equivalent inline arrows", () => {
    const store = new OrdinalPipelineStore(makeConfig({
      oAccessor: (d: any) => d.name
    }))
    const originalGetO = store.getOAccessor()

    // Simulate React re-render: new function, same source
    store.updateConfig({ oAccessor: (d: any) => d.name })
    expect(store.getOAccessor()).toBe(originalGetO)
  })

  it("re-resolves oAccessor when function source changes", () => {
    const store = new OrdinalPipelineStore(makeConfig({
      oAccessor: (d: any) => d.name
    }))
    const originalGetO = store.getOAccessor()

    store.updateConfig({ oAccessor: (d: any) => d.label })
    expect(store.getOAccessor()).not.toBe(originalGetO)
  })

  it("does not re-resolve rAccessor for equivalent string", () => {
    const store = new OrdinalPipelineStore(makeConfig({ rAccessor: "count" }))
    const originalGetR = store.getRAccessor()

    store.updateConfig({ rAccessor: "count" })
    expect(store.getRAccessor()).toBe(originalGetR)
  })

  it("does not re-resolve rAccessor for equivalent function", () => {
    const store = new OrdinalPipelineStore(makeConfig({
      rAccessor: (d: any) => d.count
    }))
    const originalGetR = store.getRAccessor()

    store.updateConfig({ rAccessor: (d: any) => d.count })
    expect(store.getRAccessor()).toBe(originalGetR)
  })

  it("does not re-resolve stackBy for equivalent string", () => {
    const store = new OrdinalPipelineStore(makeConfig({
      stackBy: "group"
    }))

    // No error, accessor stays stable
    store.updateConfig({ stackBy: "group" })
    // Verify store still functions
    store.ingest({
      inserts: [{ category: "A", value: 10, group: "X" }],
      bounded: true
    })
    store.computeScene({ width: 200, height: 200 })
    expect(store.scene.length).toBeGreaterThan(0)
  })

  it("does not re-resolve colorAccessor for equivalent function", () => {
    const store = new OrdinalPipelineStore(makeConfig({
      colorAccessor: (d: any) => d.type
    }))

    // Simulate re-render
    store.updateConfig({ colorAccessor: (d: any) => d.type })

    // Verify store still works
    store.ingest({
      inserts: [{ category: "A", value: 10, type: "primary" }],
      bounded: true
    })
    store.computeScene({ width: 200, height: 200 })
    expect(store.scene.length).toBeGreaterThan(0)
  })

  it("categoryAccessor alias follows same equivalence rules", () => {
    const store = new OrdinalPipelineStore(makeConfig({
      oAccessor: undefined,
      categoryAccessor: "region"
    }))
    const originalGetO = store.getOAccessor()

    store.updateConfig({ categoryAccessor: "region" })
    expect(store.getOAccessor()).toBe(originalGetO)
  })

  // ── Explicit-clear regression ──────────────────────────────────────
  //
  // Conditional prop patterns like `categoryAccessor={toggle ? "region" : undefined}`
  // send an explicit `undefined` into updateConfig when the toggle flips off.
  // The outer gate used to be `config.X !== undefined`, which skipped the
  // whole block for that case — leaving the previously-resolved accessor
  // stuck. Switched to `"X" in config` so the defined→undefined transition
  // reaches the inner equivalence check and triggers re-resolution.

  it("explicitly clearing categoryAccessor reverts the resolver to the fallback key", () => {
    const store = new OrdinalPipelineStore(makeConfig({ categoryAccessor: "region" }))
    const beforeAccessor = store.getOAccessor()
    const d = { region: "west", category: "fallback-value", value: 1 }
    expect(beforeAccessor(d)).toBe("west")

    store.updateConfig({ categoryAccessor: undefined })
    const afterAccessor = store.getOAccessor()
    expect(afterAccessor).not.toBe(beforeAccessor)
    expect(afterAccessor(d)).toBe("fallback-value")
  })

  it("explicitly clearing oAccessor reverts the resolver to the fallback key", () => {
    const store = new OrdinalPipelineStore(makeConfig({ oAccessor: "name" }))
    const beforeAccessor = store.getOAccessor()
    const d = { name: "node-1", category: "bucket-a", value: 1 }
    expect(beforeAccessor(d)).toBe("node-1")

    store.updateConfig({ oAccessor: undefined })
    const afterAccessor = store.getOAccessor()
    expect(afterAccessor).not.toBe(beforeAccessor)
    expect(afterAccessor(d)).toBe("bucket-a")
  })

  // ── Cache invalidation on config changes ───────────────────────────

  it("color scheme changes produce different bar colors (cache invalidated)", () => {
    const store = new OrdinalPipelineStore(makeConfig({
      colorScheme: ["#aaaaaa", "#bbbbbb", "#cccccc"]
    }))
    store.ingest({
      inserts: [{ category: "A", value: 10 }, { category: "B", value: 20 }],
      bounded: true
    })
    store.computeScene({ width: 400, height: 300 })
    const before = (store.scene.find(n => n.type === "rect") as any)?.style?.fill

    store.updateConfig({ colorScheme: ["#111111", "#222222", "#333333"] })
    store.computeScene({ width: 400, height: 300 })
    const after = (store.scene.find(n => n.type === "rect") as any)?.style?.fill

    expect(before).toBeDefined()
    expect(after).not.toBe(before)
  })

  it("themeCategorical changes invalidate the color cache", () => {
    // `_colorSchemeMap` falls back to `themeCategorical` when `colorScheme`
    // isn't an explicit array — a theme switch must update fill colors.
    const store = new OrdinalPipelineStore(makeConfig({
      themeCategorical: ["#aaaaaa", "#bbbbbb", "#cccccc"]
    }))
    store.ingest({
      inserts: [{ category: "A", value: 10 }, { category: "B", value: 20 }],
      bounded: true
    })
    store.computeScene({ width: 400, height: 300 })
    const before = (store.scene.find(n => n.type === "rect") as any)?.style?.fill

    store.updateConfig({ themeCategorical: ["#111111", "#222222", "#333333"] })
    store.computeScene({ width: 400, height: 300 })
    const after = (store.scene.find(n => n.type === "rect") as any)?.style?.fill

    expect(before).toBeDefined()
    expect(after).not.toBe(before)
  })

  it("themeCategorical explicitly cleared (set to undefined) still invalidates", () => {
    // StreamOrdinalFrame passes `themeCategorical: currentTheme?.colors?.categorical`,
    // which can legitimately go from defined → undefined when the theme is reset.
    // The cache key uses `in config` so this case must still invalidate; previously
    // a `!== undefined` check let the stale palette persist.
    const store = new OrdinalPipelineStore(makeConfig({
      themeCategorical: ["#aaaaaa", "#bbbbbb", "#cccccc"]
    }))
    store.ingest({
      inserts: [{ category: "A", value: 10 }, { category: "B", value: 20 }],
      bounded: true
    })
    store.computeScene({ width: 400, height: 300 })
    const before = (store.scene.find(n => n.type === "rect") as any)?.style?.fill

    // Explicitly clear themeCategorical (theme switch path). Only the
    // field under test is passed — `updateConfig` does a shallow merge, so
    // everything else is preserved from the original `makeConfig()` state.
    store.updateConfig({ themeCategorical: undefined })
    store.computeScene({ width: 400, height: 300 })
    const after = (store.scene.find(n => n.type === "rect") as any)?.style?.fill

    expect(before).toBeDefined()
    expect(after).not.toBe(before)
  })
})
