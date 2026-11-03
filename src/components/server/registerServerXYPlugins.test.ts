import { beforeEach, expect, it, vi } from "vitest"
import type { StreamChartType } from "../stream/types"

let registry: typeof import("../stream/xyPlugins/registry")
let registerServerXYPlugins: typeof import("./registerServerXYPlugins")["registerServerXYPlugins"]
let registerBuiltInXYPlugins: typeof import("../stream/xyPlugins/registerBuiltIn")["registerBuiltInXYPlugins"]
beforeEach(async () => {
  vi.resetModules()
  registry = await import("../stream/xyPlugins/registry")
  ;({ registerServerXYPlugins } = await import("./registerServerXYPlugins"))
  ;({ registerBuiltInXYPlugins } = await import("../stream/xyPlugins/registerBuiltIn"))
})

it("registers every built-in scene without canvas painters", () => {
  registerServerXYPlugins()
  for (const type of [
    "line",
    "area",
    "stackedarea",
    "mixed",
    "scatter",
    "bubble",
    "heatmap",
    "bar",
    "swarm",
    "waterfall",
    "candlestick",
    "custom"
  ] as StreamChartType[]) {
    expect(registry.getXYPlugin(type)?.buildScene).toBeTypeOf("function")
    expect(registry.getXYPlugin(type)?.canvasRenderers).toEqual([])
  }
})

it("preserves canvas renderers regardless of registration order", () => {
  registerServerXYPlugins()
  registerBuiltInXYPlugins()
  const clientPlugin = registry.getXYPlugin("line")
  expect(clientPlugin?.canvasRenderers.length).toBeGreaterThan(0)
  registerServerXYPlugins()
  expect(registry.getXYPlugin("line")).toBe(clientPlugin)
})
