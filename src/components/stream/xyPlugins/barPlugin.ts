import { buildBarScene } from "../xySceneBuilders/barScene"
import { barCanvasRenderer } from "../renderers/barCanvasRenderer"
import type { XYChartPlugin } from "./registry"

export const barXYPlugin: XYChartPlugin = {
  chartType: "bar",
  buildScene: (ctx, data) => buildBarScene(ctx, data),
  canvasRenderers: [barCanvasRenderer],
}
