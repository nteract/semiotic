import { buildPointScene } from "../xySceneBuilders/pointScene"
import { pointCanvasRenderer } from "../renderers/pointCanvasRenderer"
import { symbolCanvasRenderer } from "../renderers/symbolCanvasRenderer"
import type { XYChartPlugin } from "./registry"

const pointRenderers = [pointCanvasRenderer, symbolCanvasRenderer]

export const scatterXYPlugin: XYChartPlugin = {
  chartType: "scatter",
  buildScene: (ctx, data) => buildPointScene(ctx, data),
  canvasRenderers: pointRenderers,
}

export const bubbleXYPlugin: XYChartPlugin = {
  chartType: "bubble",
  buildScene: (ctx, data) => buildPointScene(ctx, data),
  canvasRenderers: pointRenderers,
}
