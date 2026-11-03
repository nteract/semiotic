import type { PipelineConfig } from "../PipelineStore"

let PipelineStore: typeof import("../PipelineStore")["PipelineStore"]
let registry: typeof import("./registry")
let warnIfXYPluginMissing: typeof import("./missingPlugin")["warnIfXYPluginMissing"]
let lineXYPlugin: typeof import("./linePlugin")["lineXYPlugin"]
beforeEach(async () => {
  vi.resetModules()
  registry = await import("./registry")
  ;({ PipelineStore } = await import("../PipelineStore"))
  ;({ warnIfXYPluginMissing } = await import("./missingPlugin"))
  ;({ lineXYPlugin } = await import("./linePlugin"))
})

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "line",
    runtimeMode: "bounded",
    windowSize: 100,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0,
    xAccessor: "x",
    yAccessor: "y",
    ...overrides,
  }
}

describe("missing XY plugin", () => {
  it("builds an empty scene until a plugin is registered", () => {
    const store = new PipelineStore(makeConfig())
    store.ingest({ inserts: [{ x: 0, y: 1 }, { x: 1, y: 2 }], bounded: true })
    store.computeScene({ width: 200, height: 100 })
    expect(store.scene).toEqual([])
  })

  it("builds marks after the matching plugin is registered", () => {
    registry.registerXYPlugin(lineXYPlugin)
    expect(registry.getXYPlugin("line")).toBe(lineXYPlugin)
    const store = new PipelineStore(makeConfig())
    store.ingest({ inserts: [{ x: 0, y: 1 }, { x: 1, y: 2 }], bounded: true })
    store.computeScene({ width: 200, height: 100 })
    expect(store.scene.length).toBeGreaterThan(0)
  })

  it("does not warn on the client when the plugin is present", () => {
    registry.registerXYPlugin(lineXYPlugin)
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    warnIfXYPluginMissing("line")
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
