import {
  getXYCanvasRenderers,
  getXYPlugin,
  getXYSceneBuilder,
  registerXYPlugin,
  resetXYPluginRegistry,
} from "./registry"
import { lineXYPlugin } from "./linePlugin"
import { candlestickXYPlugin } from "./candlestickPlugin"
import { heatmapXYPlugin } from "./heatmapPlugin"
import { customXYPlugin } from "./customPlugin"
import { registerBuiltInXYPlugins } from "./registerBuiltIn"
import { registerLineFamilyXYPlugins } from "./lineFamily"

describe("XY plugin registry", () => {
  afterEach(() => {
    resetXYPluginRegistry()
  })

  it("registers line without requiring the candlestick plugin module at the lookup site", () => {
    registerXYPlugin(lineXYPlugin)
    expect(getXYPlugin("line")).toBe(lineXYPlugin)
    expect(getXYSceneBuilder("line")).toBe(lineXYPlugin.buildScene)
    expect(getXYPlugin("candlestick")).toBeUndefined()
  })

  it("keeps candlestick as a separately registered plugin", () => {
    registerXYPlugin(candlestickXYPlugin)
    expect(getXYPlugin("candlestick")).toBe(candlestickXYPlugin)
    expect(getXYPlugin("line")).toBeUndefined()
  })

  it("registerBuiltInXYPlugins installs every built-in chartType by value", () => {
    registerBuiltInXYPlugins()
    expect(getXYPlugin("line")).toBe(lineXYPlugin)
    expect(getXYPlugin("heatmap")).toBeTruthy()
    expect(getXYPlugin("candlestick")).toBe(candlestickXYPlugin)
    expect(getXYPlugin("custom")?.canvasRenderers.length).toBeGreaterThan(3)
  })

  it("line family registration does not install heatmap or candlestick", () => {
    registerLineFamilyXYPlugins()
    expect(getXYPlugin("line")).toBeTruthy()
    expect(getXYPlugin("area")).toBeTruthy()
    expect(getXYPlugin("mixed")).toBeTruthy()
    expect(getXYPlugin("heatmap")).toBeUndefined()
    expect(getXYPlugin("candlestick")).toBeUndefined()
    expect(getXYPlugin("custom")).toBeUndefined()
  })

  it("heatmap registration does not install line", () => {
    registerXYPlugin(heatmapXYPlugin)
    expect(getXYPlugin("heatmap")).toBe(heatmapXYPlugin)
    expect(getXYPlugin("line")).toBeUndefined()
  })

  it("customLayout uses the full custom painter set when that plugin is registered", () => {
    registerXYPlugin(lineXYPlugin)
    registerXYPlugin(customXYPlugin)
    const custom = getXYCanvasRenderers("line", true)
    expect(custom).toBe(customXYPlugin.canvasRenderers)
    expect(custom.length).toBeGreaterThan(getXYCanvasRenderers("line", false).length)
  })

  it("customLayout falls back to already-registered painters before the custom chunk loads", () => {
    registerLineFamilyXYPlugins()
    const fallback = getXYCanvasRenderers("line", true)
    expect(fallback.length).toBeGreaterThan(0)
    expect(fallback).toEqual(expect.arrayContaining(lineXYPlugin.canvasRenderers))
  })
})
