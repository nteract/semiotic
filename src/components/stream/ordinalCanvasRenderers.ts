/**
 * Chart-type → canvas renderer dispatch for StreamOrdinalFrame.
 * Connectors are always included when the chart type builds them into the scene.
 */

import type { OrdinalChartType, OrdinalRendererFn, OrdinalSceneNode } from "./ordinalTypes"
import type { SceneNode } from "./types"
import type { StreamRendererFn } from "./renderers/types"
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
export type OrdinalAnyRendererFn = OrdinalRendererFn

type SharedOrdinalSceneNode = Extract<OrdinalSceneNode, SceneNode>

function isSharedOrdinalSceneNode(node: OrdinalSceneNode): node is SharedOrdinalSceneNode {
  return node.type === "rect"
    || node.type === "point"
    || node.type === "symbol"
    || node.type === "glyph"
}

function adaptStreamRenderer(renderer: StreamRendererFn): OrdinalRendererFn {
  return (ctx, nodes, scales, layout) => {
    renderer(
      ctx,
      nodes.filter(isSharedOrdinalSceneNode),
      { x: scales.r, y: scales.r },
      layout
    )
  }
}

const ordinalBarCanvasRenderer = /* @__PURE__ */ adaptStreamRenderer(barCanvasRenderer)
const ordinalPointCanvasRenderer = /* @__PURE__ */ adaptStreamRenderer(pointCanvasRenderer)
const ordinalSymbolCanvasRenderer = /* @__PURE__ */ adaptStreamRenderer(symbolCanvasRenderer)
const ordinalGlyphCanvasRenderer = /* @__PURE__ */ adaptStreamRenderer(glyphCanvasRenderer)

const withConnectors = (renderers: OrdinalAnyRendererFn[]): OrdinalAnyRendererFn[] =>
  [connectorCanvasRenderer, ...renderers]

export const ORDINAL_CANVAS_RENDERERS: Record<OrdinalChartType, OrdinalAnyRendererFn[]> = {
  bar: /* @__PURE__ */ withConnectors([ordinalBarCanvasRenderer]),
  clusterbar: /* @__PURE__ */ withConnectors([ordinalBarCanvasRenderer]),
  point: /* @__PURE__ */ withConnectors([ordinalPointCanvasRenderer, ordinalSymbolCanvasRenderer]),
  swarm: /* @__PURE__ */ withConnectors([ordinalPointCanvasRenderer, ordinalSymbolCanvasRenderer]),
  pie: [wedgeCanvasRenderer],
  donut: [wedgeCanvasRenderer],
  boxplot: /* @__PURE__ */ withConnectors([boxplotCanvasRenderer, ordinalPointCanvasRenderer]),
  violin: /* @__PURE__ */ withConnectors([violinCanvasRenderer]),
  histogram: /* @__PURE__ */ withConnectors([ordinalBarCanvasRenderer]),
  ridgeline: /* @__PURE__ */ withConnectors([violinCanvasRenderer]),
  timeline: /* @__PURE__ */ withConnectors([ordinalBarCanvasRenderer]),
  funnel: [ordinalBarCanvasRenderer, trapezoidCanvasRenderer, funnelLabelRenderer],
  "bar-funnel": [ordinalBarCanvasRenderer, barFunnelHatchRenderer, barFunnelLabelRenderer],
  swimlane: /* @__PURE__ */ withConnectors([ordinalBarCanvasRenderer]),
  // custom: any node type possible — each renderer self-filters to its type.
  custom: /* @__PURE__ */ withConnectors([
    ordinalBarCanvasRenderer,
    ordinalPointCanvasRenderer,
    ordinalSymbolCanvasRenderer,
    ordinalGlyphCanvasRenderer,
    wedgeCanvasRenderer,
    boxplotCanvasRenderer,
    violinCanvasRenderer,
    trapezoidCanvasRenderer
  ])
}
