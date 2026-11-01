import { areaCanvasRenderer } from "../renderers/areaCanvasRenderer"
import { barCanvasRenderer } from "../renderers/barCanvasRenderer"
import { heatmapCanvasRenderer } from "../renderers/heatmapCanvasRenderer"
import { lineCanvasRenderer } from "../renderers/lineCanvasRenderer"
import { pointCanvasRenderer } from "../renderers/pointCanvasRenderer"
import { symbolCanvasRenderer } from "../renderers/symbolCanvasRenderer"
import { glyphCanvasRenderer } from "../renderers/glyphCanvasRenderer"
import { candlestickCanvasRenderer } from "../renderers/candlestickCanvasRenderer"
import { swarmCanvasRenderer } from "../renderers/swarmCanvasRenderer"
import { waterfallCanvasRenderer } from "../renderers/waterfallCanvasRenderer"
import type { XYChartPlugin } from "./registry"

/**
 * Painter set for customLayout. Scene geometry comes from the user callback;
 * this plugin only supplies every self-filtering canvas renderer.
 */
export const customXYPlugin: XYChartPlugin = {
  chartType: "custom",
  buildScene: () => [],
  canvasRenderers: [
    areaCanvasRenderer,
    barCanvasRenderer,
    heatmapCanvasRenderer,
    lineCanvasRenderer,
    pointCanvasRenderer,
    symbolCanvasRenderer,
    glyphCanvasRenderer,
    candlestickCanvasRenderer,
    swarmCanvasRenderer,
    waterfallCanvasRenderer,
  ],
}
