import { buildMixedScene } from "../xySceneBuilders/mixedScene"
import { areaCanvasRenderer } from "../renderers/areaCanvasRenderer"
import { lineCanvasRenderer } from "../renderers/lineCanvasRenderer"
import { pointCanvasRenderer } from "../renderers/pointCanvasRenderer"
import type { XYChartPlugin } from "./registry"

export const mixedXYPlugin: XYChartPlugin = {
  chartType: "mixed",
  buildScene: (ctx, data) => buildMixedScene(ctx, data),
  canvasRenderers: [areaCanvasRenderer, lineCanvasRenderer, pointCanvasRenderer],
}
