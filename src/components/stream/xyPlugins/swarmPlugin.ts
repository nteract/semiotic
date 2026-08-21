import { buildSwarmScene } from "../xySceneBuilders/swarmScene"
import { swarmCanvasRenderer } from "../renderers/swarmCanvasRenderer"
import type { XYChartPlugin } from "./registry"

export const swarmXYPlugin: XYChartPlugin = {
  chartType: "swarm",
  buildScene: (ctx, data) => buildSwarmScene(ctx, data),
  canvasRenderers: [swarmCanvasRenderer],
}
