import {
  getXYPlugin,
  registerXYPlugin,
  type XYSceneBuilder
} from "../stream/xyPlugins/registry"
import type { StreamChartType } from "../stream/types"
import { buildLineScene } from "../stream/xySceneBuilders/lineScene"
import {
  buildAreaScene,
  buildStackedAreaScene
} from "../stream/xySceneBuilders/areaScene"
import { buildMixedScene } from "../stream/xySceneBuilders/mixedScene"
import { buildPointScene } from "../stream/xySceneBuilders/pointScene"
import { buildHeatmapScene } from "../stream/xySceneBuilders/heatmapScene"
import { buildBarScene } from "../stream/xySceneBuilders/barScene"
import { buildSwarmScene } from "../stream/xySceneBuilders/swarmScene"
import { buildWaterfallScene } from "../stream/xySceneBuilders/waterfallScene"
import { buildCandlestickScene } from "../stream/xySceneBuilders/candlestickScene"

const builders: Record<StreamChartType, XYSceneBuilder> = {
  line: buildLineScene,
  area: buildAreaScene,
  stackedarea: buildStackedAreaScene,
  mixed: buildMixedScene,
  scatter: buildPointScene,
  bubble: buildPointScene,
  heatmap: buildHeatmapScene,
  bar: buildBarScene,
  swarm: buildSwarmScene,
  waterfall: buildWaterfallScene,
  candlestick: buildCandlestickScene,
  custom: () => []
}

/** SVG rendering needs scene builders without importing the canvas painters. */
export function registerServerXYPlugins(): void {
  for (const chartType of Object.keys(builders) as StreamChartType[]) {
    // Browser apps can import server rendering too. Preserve any client or
    // custom plugin already installed in the shared registry.
    if (!getXYPlugin(chartType)) {
      registerXYPlugin({
        chartType,
        buildScene: builders[chartType],
        canvasRenderers: []
      })
    }
  }
}
