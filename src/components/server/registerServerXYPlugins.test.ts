import { afterEach, expect, it } from "vitest"
import { registerServerXYPlugins } from "./registerServerXYPlugins"
import { registerBuiltInXYPlugins } from "../stream/xyPlugins/registerBuiltIn"
import {
  getXYPlugin,
  resetXYPluginRegistry
} from "../stream/xyPlugins/registry"
import type { StreamChartType } from "../stream/types"

afterEach(registerBuiltInXYPlugins)

it("registers every built-in scene without canvas painters", () => {
  resetXYPluginRegistry()
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
    expect(getXYPlugin(type)?.buildScene).toBeTypeOf("function")
    expect(getXYPlugin(type)?.canvasRenderers).toEqual([])
  }
})

it("preserves canvas renderers regardless of registration order", () => {
  resetXYPluginRegistry()
  registerServerXYPlugins()
  registerBuiltInXYPlugins()
  const clientPlugin = getXYPlugin("line")
  expect(clientPlugin?.canvasRenderers.length).toBeGreaterThan(0)
  registerServerXYPlugins()
  expect(getXYPlugin("line")).toBe(clientPlugin)
})
