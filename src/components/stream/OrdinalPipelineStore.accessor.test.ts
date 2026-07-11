import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import type { OrdinalPipelineConfig } from "./ordinalTypes"
import type { Datum } from "../charts/shared/datumTypes"

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

  it("re-resolves oAccessor for a new inline-arrow identity (identity semantics)", () => {
    const store = new OrdinalPipelineStore(makeConfig({
      oAccessor: (d: Datum) => d.name
    }))
    const originalGetO = store.getOAccessor()

    // Simulate React re-render passing a NEW function object with the same
    // source. Identity semantics can't prove equivalence, so it re-resolves.
    store.updateConfig({ oAccessor: (d: Datum) => d.name })
    expect(store.getOAccessor()).not.toBe(originalGetO)
  })

  it("does not re-resolve oAccessor when the SAME function reference is re-passed", () => {
    const oAccessor = (d: Datum) => d.name
    const store = new OrdinalPipelineStore(makeConfig({ oAccessor }))
    const originalGetO = store.getOAccessor()

    store.updateConfig({ oAccessor })
    expect(store.getOAccessor()).toBe(originalGetO)
  })

  it("re-resolves oAccessor when function source changes", () => {
    const store = new OrdinalPipelineStore(makeConfig({
      oAccessor: (d: Datum) => d.name
    }))
    const originalGetO = store.getOAccessor()

    store.updateConfig({ oAccessor: (d: Datum) => d.label })
    expect(store.getOAccessor()).not.toBe(originalGetO)
  })

  it("does not re-resolve rAccessor for equivalent string", () => {
    const store = new OrdinalPipelineStore(makeConfig({ rAccessor: "count" }))
    const originalGetR = store.getRAccessor()

    store.updateConfig({ rAccessor: "count" })
    expect(store.getRAccessor()).toBe(originalGetR)
  })

  it("re-resolves rAccessor for a new function identity (identity semantics)", () => {
    const store = new OrdinalPipelineStore(makeConfig({
      rAccessor: (d: Datum) => d.count
    }))
    const originalGetR = store.getRAccessor()

    // New inline-arrow identity → re-resolve (source text is not consulted).
    store.updateConfig({ rAccessor: (d: Datum) => d.count })
    expect(store.getRAccessor()).not.toBe(originalGetR)
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

  it("re-resolves colorAccessor for a new function identity and the store still works", () => {
    const store = new OrdinalPipelineStore(makeConfig({
      colorAccessor: (d: Datum) => d.type
    }))

    // Simulate re-render passing a new function object
    store.updateConfig({ colorAccessor: (d: Datum) => d.type })

    // Verify store still works after re-resolution
    store.ingest({
      inserts: [{ category: "A", value: 10, type: "primary" }],
      bounded: true
    })
    store.computeScene({ width: 200, height: 200 })
    expect(store.scene.length).toBeGreaterThan(0)
  })

  it("rebuilds the ordinal domain from retained data when a same-source oAccessor closure captures a new value", () => {
    // Ordinal analogue of the XY closure-capture regression: two closures with
    // identical source text but different captured prefixes must produce
    // different category domains. Source-text equality retained the stale domain.
    const makeO = (prefix: string) => (d: Datum) => `${prefix}-${d.k as string}`
    const store = new OrdinalPipelineStore(makeConfig({ oAccessor: makeO("a") }))
    store.ingest({ inserts: [{ k: "x", value: 1 }, { k: "y", value: 2 }], bounded: true })
    store.computeScene({ width: 200, height: 200 })
    expect(store.scales!.o.domain().sort()).toEqual(["a-x", "a-y"])

    // Same source (`d => \`${prefix}-${d.k}\``), different captured prefix.
    // React updates configuration and renders; it does not ingest the same
    // data again, so this must rebuild from the existing buffer.
    store.updateConfig({ oAccessor: makeO("b") })
    store.computeScene({ width: 200, height: 200 })
    expect(store.scales!.o.domain().sort()).toEqual(["b-x", "b-y"])
  })

  it("rebuilds the value extent from retained data when rAccessor changes", () => {
    const makeR = (multiplier: number) => (d: Datum) => (d.value as number) * multiplier
    const store = new OrdinalPipelineStore(makeConfig({
      chartType: "bar",
      extentPadding: 0,
      oSort: false,
      rAccessor: makeR(1),
    }))
    store.ingest({
      inserts: [{ category: "a", value: 10 }, { category: "b", value: 20 }],
      bounded: true,
    })
    store.computeScene({ width: 200, height: 200 })
    expect(store.scales!.r.domain()).toEqual([0, 20])

    // Same source (`d => d.value * multiplier`), new captured multiplier;
    // no new ingest occurs before the next render.
    store.updateConfig({ rAccessor: makeR(10) })
    store.computeScene({ width: 200, height: 200 })
    expect(store.scales!.r.domain()).toEqual([0, 200])
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

  it("accessorRevision re-derives the domain when a stable oAccessor's capture changed", () => {
    // Stable reference (identity never changes) reading external mutable state.
    let prefix = "a"
    const oAccessor = (d: Datum) => `${prefix}-${d.k as string}`
    const store = new OrdinalPipelineStore(makeConfig({ oAccessor }))
    store.ingest({ inserts: [{ k: "x", value: 1 }], bounded: true })
    store.computeScene({ width: 200, height: 200 })
    expect(store.scales!.o.domain()).toEqual(["a-x"])

    // Mutate the capture; re-passing the same reference is a no-op.
    prefix = "b"
    store.updateConfig({ oAccessor })
    store.computeScene({ width: 200, height: 200 })
    expect(store.scales!.o.domain()).toEqual(["a-x"]) // still stale — by design

    // Bumping accessorRevision forces re-derivation against the live accessor.
    store.updateConfig({ accessorRevision: 1 })
    store.computeScene({ width: 200, height: 200 })
    expect(store.scales!.o.domain()).toEqual(["b-x"])
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
    const before = store.scene.find(n => n.type === "rect")?.style.fill

    store.updateConfig({ colorScheme: ["#111111", "#222222", "#333333"] })
    store.computeScene({ width: 400, height: 300 })
    const after = store.scene.find(n => n.type === "rect")?.style.fill

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
    const before = store.scene.find(n => n.type === "rect")?.style.fill

    store.updateConfig({ themeCategorical: ["#111111", "#222222", "#333333"] })
    store.computeScene({ width: 400, height: 300 })
    const after = store.scene.find(n => n.type === "rect")?.style.fill

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
    const before = store.scene.find(n => n.type === "rect")?.style.fill

    // Explicitly clear themeCategorical (theme switch path). Only the
    // field under test is passed — `updateConfig` does a shallow merge, so
    // everything else is preserved from the original `makeConfig()` state.
    store.updateConfig({ themeCategorical: undefined })
    store.computeScene({ width: 400, height: 300 })
    const after = store.scene.find(n => n.type === "rect")?.style.fill

    expect(before).toBeDefined()
    expect(after).not.toBe(before)
  })
})
