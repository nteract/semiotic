/**
 * Register every built-in XY scene/renderer plugin.
 *
 * Call this from the server renderer, tests, and direct StreamXYFrame
 * consumers. Client HOCs import and register only the plugin they need
 * so a LineChart consumer does not load candlestick / heatmap / bar.
 *
 * Must be a live function call: `package.json` has `"sideEffects": false`,
 * so a side-effect-only import is dropped from the published bundles.
 */
import { registerXYPlugin } from "./registry"
import { lineXYPlugin } from "./linePlugin"
import { areaXYPlugin } from "./areaPlugin"
import { stackedAreaXYPlugin } from "./stackedAreaPlugin"
import { mixedXYPlugin } from "./mixedPlugin"
import { scatterXYPlugin, bubbleXYPlugin } from "./pointPlugin"
import { heatmapXYPlugin } from "./heatmapPlugin"
import { barXYPlugin } from "./barPlugin"
import { swarmXYPlugin } from "./swarmPlugin"
import { waterfallXYPlugin } from "./waterfallPlugin"
import { candlestickXYPlugin } from "./candlestickPlugin"
import { customXYPlugin } from "./customPlugin"

export function registerBuiltInXYPlugins(): void {
  registerXYPlugin(lineXYPlugin)
  registerXYPlugin(areaXYPlugin)
  registerXYPlugin(stackedAreaXYPlugin)
  registerXYPlugin(mixedXYPlugin)
  registerXYPlugin(scatterXYPlugin)
  registerXYPlugin(bubbleXYPlugin)
  registerXYPlugin(heatmapXYPlugin)
  registerXYPlugin(barXYPlugin)
  registerXYPlugin(swarmXYPlugin)
  registerXYPlugin(waterfallXYPlugin)
  registerXYPlugin(candlestickXYPlugin)
  registerXYPlugin(customXYPlugin)
}
