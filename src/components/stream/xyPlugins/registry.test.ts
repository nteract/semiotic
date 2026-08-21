import { getXYPlugin, getXYSceneBuilder, registerXYPlugin } from "./registry"
import { lineXYPlugin } from "./linePlugin"
import { candlestickXYPlugin } from "./candlestickPlugin"
import { registerBuiltInXYPlugins } from "./registerBuiltIn"

describe("XY plugin registry", () => {
  it("registers line without requiring the candlestick plugin module at the lookup site", () => {
    registerXYPlugin(lineXYPlugin)
    expect(getXYPlugin("line")).toBe(lineXYPlugin)
    expect(getXYSceneBuilder("line")).toBe(lineXYPlugin.buildScene)
  })

  it("keeps candlestick as a separately registered plugin", () => {
    registerXYPlugin(candlestickXYPlugin)
    expect(getXYPlugin("candlestick")).toBe(candlestickXYPlugin)
  })

  it("registerBuiltInXYPlugins installs every built-in chartType by value", () => {
    registerBuiltInXYPlugins()
    expect(getXYPlugin("line")).toBe(lineXYPlugin)
    expect(getXYPlugin("heatmap")).toBeTruthy()
    expect(getXYPlugin("candlestick")).toBe(candlestickXYPlugin)
    expect(getXYPlugin("custom")?.canvasRenderers.length).toBeGreaterThan(3)
  })
})
