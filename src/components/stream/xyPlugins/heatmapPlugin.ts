import { buildHeatmapScene } from "../xySceneBuilders/heatmapScene"
import { heatmapCanvasRenderer } from "../renderers/heatmapCanvasRenderer"
import type { XYChartPlugin } from "./registry"

export const heatmapXYPlugin: XYChartPlugin = {
  chartType: "heatmap",
  buildScene: (ctx, data, layout) => buildHeatmapScene(ctx, data, layout),
  canvasRenderers: [heatmapCanvasRenderer],
}
