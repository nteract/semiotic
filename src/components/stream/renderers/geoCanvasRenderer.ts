import type { GeoAreaSceneNode, GeoScales, GeoSceneNode } from "../geoTypes"
import type { StreamLayout } from "../types"
import { resolveCSSColor } from "./resolveCSSColor"
import { coerceCanvasFill } from "./canvasRenderHelpers"
import { renderPathPulse } from "./renderPulse"

/**
 * Canvas renderer for GeoAreaSceneNode — projected geographic polygons.
 * Uses Path2D for GPU-accelerated rendering of complex geo paths.
 *
 * Points and lines in a geo frame are rendered by the existing
 * pointCanvasRenderer and lineCanvasRenderer respectively.
 */
export function geoCanvasRenderer(
  ctx: CanvasRenderingContext2D,
  nodes: GeoSceneNode[],
  _scales: GeoScales,
  _layout: StreamLayout
): void {
  const geoAreas = nodes.filter(
    (n): n is GeoAreaSceneNode => n.type === "geoarea"
  )

  for (const node of geoAreas) {
    if (!node.pathData) continue

    // Reuse the Path2D the hit tester also caches on the node (GeoCanvasHitTester)
    // rather than re-parsing the SVG path string on every repaint. A geo-area
    // node's `pathData` is fixed for its lifetime — a projection/zoom change
    // rebuilds the scene with fresh node objects, so the cache invalidates
    // naturally. Path2D string parsing is among the most expensive canvas ops,
    // and pan/zoom/drag-rotate repaint every animation frame.
    if (!node._cachedPath2D) node._cachedPath2D = new Path2D(node.pathData)
    const path = node._cachedPath2D

    // Fill
    const fillColor = coerceCanvasFill(ctx, node.style.fill) || "#e0e0e0"
    if (fillColor !== "none") {
      ctx.fillStyle = fillColor
      ctx.globalAlpha = (node._decayOpacity ?? 1) * (node.style.fillOpacity ?? 1)
      ctx.fill(path)
    }

    // Stroke
    if (node.style.stroke && node.style.stroke !== "none") {
      ctx.strokeStyle = resolveCSSColor(ctx, node.style.stroke) || node.style.stroke
      ctx.lineWidth = node.style.strokeWidth || 0.5
      ctx.globalAlpha = node._decayOpacity ?? 1
      if (node.style.strokeDasharray) {
        const dashes = node.style.strokeDasharray.split(",").map(Number)
        ctx.setLineDash(dashes)
      } else {
        ctx.setLineDash([])
      }
      ctx.stroke(path)
    }

    // Pulse overlay
    renderPathPulse(ctx, node, path)

    ctx.globalAlpha = 1
    ctx.setLineDash([])
  }
}
