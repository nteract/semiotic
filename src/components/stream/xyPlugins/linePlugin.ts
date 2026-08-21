import { buildLineScene } from "../xySceneBuilders/lineScene"
import { areaCanvasRenderer } from "../renderers/areaCanvasRenderer"
import { lineCanvasRenderer } from "../renderers/lineCanvasRenderer"
import { pointCanvasRenderer } from "../renderers/pointCanvasRenderer"
import type { XYChartPlugin } from "./registry"

export const lineXYPlugin: XYChartPlugin = {
  chartType: "line",
  buildScene: (ctx, data) => buildLineScene(ctx, data),
  canvasRenderers: [areaCanvasRenderer, lineCanvasRenderer, pointCanvasRenderer],
}
