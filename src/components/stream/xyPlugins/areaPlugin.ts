import { buildAreaScene } from "../xySceneBuilders/areaScene"
import { areaCanvasRenderer } from "../renderers/areaCanvasRenderer"
import { pointCanvasRenderer } from "../renderers/pointCanvasRenderer"
import type { XYChartPlugin } from "./registry"

export const areaXYPlugin: XYChartPlugin = {
  chartType: "area",
  buildScene: (ctx, data) => buildAreaScene(ctx, data),
  canvasRenderers: [areaCanvasRenderer, pointCanvasRenderer],
}
