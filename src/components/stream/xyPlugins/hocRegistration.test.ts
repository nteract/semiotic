import { getXYPlugin, resetXYPluginRegistry } from "./registry"
import { registerLineFamilyXYPlugins } from "./lineFamily"
import { registerXYPlugin } from "./registry"
import { scatterXYPlugin, bubbleXYPlugin } from "./pointPlugin"
import { waterfallXYPlugin } from "./waterfallPlugin"
import { heatmapXYPlugin } from "./heatmapPlugin"
import { candlestickXYPlugin } from "./candlestickPlugin"
import { stackedAreaXYPlugin } from "./stackedAreaPlugin"
import { mixedXYPlugin } from "./mixedPlugin"
import { areaXYPlugin } from "./areaPlugin"
import { barXYPlugin } from "./barPlugin"
import { swarmXYPlugin } from "./swarmPlugin"
import { customXYPlugin } from "./customPlugin"

/**
 * These tests start from an empty registry and re-run the same register
 * calls the HOCs make. Global setupTests does not pre-fill XY plugins.
 */
describe("HOC plugin registration is chart-scoped", () => {
  afterEach(() => {
    resetXYPluginRegistry()
  })

  it("LineChart's line family does not retain candlestick/heatmap/custom", () => {
    registerLineFamilyXYPlugins()
    expect(getXYPlugin("line")).toBeTruthy()
    expect(getXYPlugin("candlestick")).toBeUndefined()
    expect(getXYPlugin("heatmap")).toBeUndefined()
    expect(getXYPlugin("bar")).toBeUndefined()
    expect(getXYPlugin("custom")).toBeUndefined()
  })

  it("Scatterplot registration is scatter-only", () => {
    registerXYPlugin(scatterXYPlugin)
    expect(getXYPlugin("scatter")).toBe(scatterXYPlugin)
    expect(getXYPlugin("line")).toBeUndefined()
    expect(getXYPlugin("bubble")).toBeUndefined()
  })

  it("each remaining HOC plugin stays on its own chartType", () => {
    const pairs = [
      ["area", () => registerXYPlugin(areaXYPlugin)],
      ["stackedarea", () => registerXYPlugin(stackedAreaXYPlugin)],
      ["mixed", () => registerXYPlugin(mixedXYPlugin)],
      ["bubble", () => registerXYPlugin(bubbleXYPlugin)],
      ["heatmap", () => registerXYPlugin(heatmapXYPlugin)],
      ["waterfall", () => registerXYPlugin(waterfallXYPlugin)],
      ["candlestick", () => registerXYPlugin(candlestickXYPlugin)],
      ["bar", () => registerXYPlugin(barXYPlugin)],
      ["swarm", () => registerXYPlugin(swarmXYPlugin)],
      ["custom", () => registerXYPlugin(customXYPlugin)],
    ] as const
    for (const [chartType, register] of pairs) {
      resetXYPluginRegistry()
      register()
      expect(getXYPlugin(chartType)).toBeTruthy()
      expect(getXYPlugin("line")).toBeUndefined()
    }
  })
})
