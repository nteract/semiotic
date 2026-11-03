import { beforeEach, describe, expect, it, vi } from "vitest"

let registry: typeof import("./registry")
let lineXYPlugin: typeof import("./linePlugin")["lineXYPlugin"]
let candlestickXYPlugin: typeof import("./candlestickPlugin")["candlestickXYPlugin"]
let heatmapXYPlugin: typeof import("./heatmapPlugin")["heatmapXYPlugin"]
let customXYPlugin: typeof import("./customPlugin")["customXYPlugin"]
let registerBuiltInXYPlugins: typeof import("./registerBuiltIn")["registerBuiltInXYPlugins"]
let ensureLineFamilyXYPlugins: typeof import("./lineFamily")["ensureLineFamilyXYPlugins"]
let attachBarColumnHover: typeof import("./barColumnLookup")["attachBarColumnHover"]

beforeEach(async () => {
  vi.resetModules()
  registry = await import("./registry")
  ;({ lineXYPlugin } = await import("./linePlugin"))
  ;({ candlestickXYPlugin } = await import("./candlestickPlugin"))
  ;({ heatmapXYPlugin } = await import("./heatmapPlugin"))
  ;({ customXYPlugin } = await import("./customPlugin"))
  ;({ registerBuiltInXYPlugins } = await import("./registerBuiltIn"))
  ;({ ensureLineFamilyXYPlugins } = await import("./lineFamily"))
  ;({ attachBarColumnHover } = await import("./barColumnLookup"))
})

describe("XY plugin registry", () => {
  it("registers line without requiring the candlestick plugin module at the lookup site", () => {
    registry.registerXYPlugin(lineXYPlugin)
    expect(registry.getXYPlugin("line")).toBe(lineXYPlugin)
    expect(registry.getXYSceneBuilder("line")).toBe(lineXYPlugin.buildScene)
    expect(registry.getXYPlugin("candlestick")).toBeUndefined()
  })

  it("keeps candlestick as a separately registered plugin", () => {
    registry.registerXYPlugin(candlestickXYPlugin)
    expect(registry.getXYPlugin("candlestick")).toBe(candlestickXYPlugin)
    expect(registry.getXYPlugin("line")).toBeUndefined()
  })

  it("registerBuiltInXYPlugins installs every built-in chartType by value", () => {
    registerBuiltInXYPlugins()
    expect(registry.getXYPlugin("line")).toBe(lineXYPlugin)
    expect(registry.getXYPlugin("heatmap")).toBeTruthy()
    expect(registry.getXYPlugin("candlestick")).toBe(candlestickXYPlugin)
    expect(registry.getXYPlugin("custom")?.canvasRenderers.length).toBeGreaterThan(3)
  })

  it("gives bars column multi hover and leaves path charts on series interpolation", () => {
    registerBuiltInXYPlugins()
    expect(registry.getXYPlugin("bar")?.multiHover).toBe(attachBarColumnHover)
    expect(registry.getXYPlugin("line")?.multiHover).toBeUndefined()
    expect(registry.getXYPlugin("stackedarea")?.multiHover).toBeUndefined()
  })

  it("line family registration does not install heatmap or candlestick", () => {
    ensureLineFamilyXYPlugins()
    expect(registry.getXYPlugin("line")).toBeTruthy()
    expect(registry.getXYPlugin("area")).toBeTruthy()
    expect(registry.getXYPlugin("mixed")).toBeTruthy()
    expect(registry.getXYPlugin("heatmap")).toBeUndefined()
    expect(registry.getXYPlugin("candlestick")).toBeUndefined()
    expect(registry.getXYPlugin("custom")).toBeUndefined()
  })

  it("heatmap registration does not install line", () => {
    registry.registerXYPlugin(heatmapXYPlugin)
    expect(registry.getXYPlugin("heatmap")).toBe(heatmapXYPlugin)
    expect(registry.getXYPlugin("line")).toBeUndefined()
  })

  it("customLayout uses the full custom painter set when that plugin is registered", () => {
    registry.registerXYPlugin(lineXYPlugin)
    registry.registerXYPlugin(customXYPlugin)
    const custom = registry.getXYCanvasRenderers("line", true)
    expect(custom).toBe(customXYPlugin.canvasRenderers)
    expect(custom.length).toBeGreaterThan(registry.getXYCanvasRenderers("line", false).length)
  })

  it("customLayout falls back to already-registered painters before the custom chunk loads", () => {
    ensureLineFamilyXYPlugins()
    const fallback = registry.getXYCanvasRenderers("line", true)
    expect(fallback.length).toBeGreaterThan(0)
    expect(fallback).toEqual(expect.arrayContaining(lineXYPlugin.canvasRenderers))
  })

  it("preserves explicit plugins even when they intentionally omit canvas painters", () => {
    const custom = { ...lineXYPlugin, canvasRenderers: [], buildScene: vi.fn(lineXYPlugin.buildScene) }
    registry.registerXYPlugin(custom)
    registry.ensureXYPlugin(lineXYPlugin)
    expect(registry.getXYPlugin("line")).toBe(custom)
    expect(registry.needsXYPlugin("line")).toBe(false)
  })

  it("upgrades only library-owned SVG placeholders", () => {
    const placeholder = { ...lineXYPlugin, canvasRenderers: [] }
    registry.ensureServerXYPlugin(placeholder)
    expect(registry.needsXYPlugin("line")).toBe(true)
    registry.ensureXYPlugin(lineXYPlugin)
    expect(registry.getXYPlugin("line")).toBe(lineXYPlugin)
    expect(registry.needsXYPlugin("line")).toBe(false)
  })

  it("honors explicit ownership of a previously server-only plugin", () => {
    const placeholder = { ...lineXYPlugin, canvasRenderers: [] }
    registry.ensureServerXYPlugin(placeholder)
    registry.registerXYPlugin(placeholder)
    registry.ensureXYPlugin(lineXYPlugin)
    expect(registry.getXYPlugin("line")).toBe(placeholder)
    expect(registry.needsXYPlugin("line")).toBe(false)
  })
})
