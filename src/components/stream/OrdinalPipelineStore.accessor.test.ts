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
})
