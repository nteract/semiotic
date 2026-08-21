import { buildWaterfallScene } from "../xySceneBuilders/waterfallScene"
import { waterfallCanvasRenderer } from "../renderers/waterfallCanvasRenderer"
import type { XYChartPlugin } from "./registry"

export const waterfallXYPlugin: XYChartPlugin = {
  chartType: "waterfall",
  buildScene: (ctx, data, layout) => buildWaterfallScene(ctx, data, layout),
  canvasRenderers: [waterfallCanvasRenderer],
}
