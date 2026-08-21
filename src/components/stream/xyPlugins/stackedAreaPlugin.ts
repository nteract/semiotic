import { buildStackedAreaScene } from "../xySceneBuilders/areaScene"
import { areaCanvasRenderer } from "../renderers/areaCanvasRenderer"
import { pointCanvasRenderer } from "../renderers/pointCanvasRenderer"
import type { XYChartPlugin } from "./registry"

export const stackedAreaXYPlugin: XYChartPlugin = {
  chartType: "stackedarea",
  buildScene: (ctx, data) => buildStackedAreaScene(ctx, data),
  canvasRenderers: [areaCanvasRenderer, pointCanvasRenderer],
}
