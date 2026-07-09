/**
 * Chart-type → canvas renderer dispatch for StreamOrdinalFrame.
 * Connectors are always included when the chart type builds them into the scene.
 */

import type { OrdinalChartType } from "./ordinalTypes"
import { barCanvasRenderer } from "./renderers/barCanvasRenderer"
import { pointCanvasRenderer } from "./renderers/pointCanvasRenderer"
import { symbolCanvasRenderer } from "./renderers/symbolCanvasRenderer"
import { glyphCanvasRenderer } from "./renderers/glyphCanvasRenderer"
import { wedgeCanvasRenderer } from "./renderers/wedgeCanvasRenderer"
import { boxplotCanvasRenderer } from "./renderers/boxplotCanvasRenderer"
import { violinCanvasRenderer } from "./renderers/violinCanvasRenderer"
import { connectorCanvasRenderer } from "./renderers/connectorCanvasRenderer"
import { trapezoidCanvasRenderer, funnelLabelRenderer } from "./renderers/trapezoidCanvasRenderer"
import { barFunnelHatchRenderer, barFunnelLabelRenderer } from "./renderers/barFunnelCanvasRenderer"

// Renderers internally filter nodes by type, so the union-typed array is safe.
// Use a relaxed function type to avoid casting every renderer.
export type OrdinalAnyRendererFn = (
  ctx: CanvasRenderingContext2D,
  nodes: any[],
  scales: any,
  layout: any
) => void

const withConnectors = (renderers: OrdinalAnyRendererFn[]): OrdinalAnyRendererFn[] =>
  [connectorCanvasRenderer, ...renderers]

export const ORDINAL_CANVAS_RENDERERS: Record<OrdinalChartType, OrdinalAnyRendererFn[]> = {
  bar: withConnectors([barCanvasRenderer]),
  clusterbar: withConnectors([barCanvasRenderer]),
  point: withConnectors([pointCanvasRenderer, symbolCanvasRenderer]),
  swarm: withConnectors([pointCanvasRenderer, symbolCanvasRenderer]),
  pie: [wedgeCanvasRenderer],
  donut: [wedgeCanvasRenderer],
  boxplot: withConnectors([boxplotCanvasRenderer, pointCanvasRenderer]),
  violin: withConnectors([violinCanvasRenderer]),
  histogram: withConnectors([barCanvasRenderer]),
  ridgeline: withConnectors([violinCanvasRenderer]),
  timeline: withConnectors([barCanvasRenderer]),
  funnel: [barCanvasRenderer, trapezoidCanvasRenderer, funnelLabelRenderer],
  "bar-funnel": [barCanvasRenderer, barFunnelHatchRenderer, barFunnelLabelRenderer],
  swimlane: withConnectors([barCanvasRenderer]),
  // custom: any node type possible — each renderer self-filters to its type.
  custom: withConnectors([
    barCanvasRenderer,
    pointCanvasRenderer,
    symbolCanvasRenderer,
    glyphCanvasRenderer,
    wedgeCanvasRenderer,
    boxplotCanvasRenderer,
    violinCanvasRenderer,
    trapezoidCanvasRenderer
  ])
}
