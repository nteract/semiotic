import { buildCandlestickScene } from "../xySceneBuilders/candlestickScene"
import { candlestickCanvasRenderer } from "../renderers/candlestickCanvasRenderer"
import type { XYChartPlugin } from "./registry"

export const candlestickXYPlugin: XYChartPlugin = {
  chartType: "candlestick",
  buildScene: (ctx, data, layout) => buildCandlestickScene(ctx, data, layout),
  canvasRenderers: [candlestickCanvasRenderer],
}
