import { PipelineStore, type PipelineConfig } from "../PipelineStore"
import { getXYPlugin, resetXYPluginRegistry } from "./registry"
import { warnIfXYPluginMissing } from "./missingPlugin"
import { registerXYPlugin } from "./registry"
import { lineXYPlugin } from "./linePlugin"

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "line",
    runtimeMode: "bounded",
    xAccessor: "x",
    yAccessor: "y",
    ...overrides,
  }
}

describe("missing XY plugin", () => {
  afterEach(() => {
    resetXYPluginRegistry()
  })

  it("builds an empty scene until a plugin is registered", () => {
    resetXYPluginRegistry()
    const store = new PipelineStore(makeConfig())
    store.ingest({ inserts: [{ x: 0, y: 1 }, { x: 1, y: 2 }], bounded: true })
    store.computeScene({ width: 200, height: 100 })
    expect(store.scene).toEqual([])
  })

  it("builds marks after the matching plugin is registered", () => {
    resetXYPluginRegistry()
    registerXYPlugin(lineXYPlugin)
    expect(getXYPlugin("line")).toBe(lineXYPlugin)
    const store = new PipelineStore(makeConfig())
    store.ingest({ inserts: [{ x: 0, y: 1 }, { x: 1, y: 2 }], bounded: true })
    store.computeScene({ width: 200, height: 100 })
    expect(store.scene.length).toBeGreaterThan(0)
  })

  it("does not warn on the client when the plugin is present", () => {
    registerXYPlugin(lineXYPlugin)
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    warnIfXYPluginMissing("line")
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
