/**
 * Chart-type → canvas renderer dispatch for StreamXYFrame.
 * Order matters: earlier renderers paint underneath later ones.
 */

import type { StreamChartType } from "./types"
import type { StreamRendererFn } from "./renderers/types"
import { lineCanvasRenderer } from "./renderers/lineCanvasRenderer"
import { areaCanvasRenderer } from "./renderers/areaCanvasRenderer"
import { pointCanvasRenderer } from "./renderers/pointCanvasRenderer"
import { symbolCanvasRenderer } from "./renderers/symbolCanvasRenderer"
import { glyphCanvasRenderer } from "./renderers/glyphCanvasRenderer"
import { barCanvasRenderer } from "./renderers/barCanvasRenderer"
import { swarmCanvasRenderer } from "./renderers/swarmCanvasRenderer"
import { waterfallCanvasRenderer } from "./renderers/waterfallCanvasRenderer"
import { heatmapCanvasRenderer } from "./renderers/heatmapCanvasRenderer"
import { candlestickCanvasRenderer } from "./renderers/candlestickCanvasRenderer"

export const XY_CANVAS_RENDERERS: Record<StreamChartType, StreamRendererFn[]> = {
  line: [areaCanvasRenderer, lineCanvasRenderer, pointCanvasRenderer],
  area: [areaCanvasRenderer, pointCanvasRenderer],
  stackedarea: [areaCanvasRenderer, pointCanvasRenderer],
  scatter: [pointCanvasRenderer, symbolCanvasRenderer],
  bubble: [pointCanvasRenderer, symbolCanvasRenderer],
  heatmap: [heatmapCanvasRenderer],
  bar: [barCanvasRenderer],
  swarm: [swarmCanvasRenderer],
  waterfall: [waterfallCanvasRenderer],
  candlestick: [candlestickCanvasRenderer],
  mixed: [areaCanvasRenderer, lineCanvasRenderer, pointCanvasRenderer],
  // custom: all node types possible — each renderer self-filters to its type.
  custom: [
    areaCanvasRenderer,
    barCanvasRenderer,
    heatmapCanvasRenderer,
    lineCanvasRenderer,
    pointCanvasRenderer,
    symbolCanvasRenderer,
    glyphCanvasRenderer,
    candlestickCanvasRenderer
  ]
}
