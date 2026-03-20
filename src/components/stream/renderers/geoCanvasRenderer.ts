import type { GeoAreaSceneNode, GeoSceneNode } from "../geoTypes"
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
  _scales: any,
  _layout: any
): void {
  const geoAreas = nodes.filter(
    (n): n is GeoAreaSceneNode => n.type === "geoarea"
  )

  for (const node of geoAreas) {
    if (!node.pathData) continue

    const path = new Path2D(node.pathData)

    // Fill
    const fillColor = node.style.fill || "#e0e0e0"
    if (fillColor !== "none") {
      ctx.fillStyle = fillColor
      ctx.globalAlpha = (node._decayOpacity ?? 1) * (node.style.fillOpacity ?? 1)
      ctx.fill(path)
    }

    // Stroke
    if (node.style.stroke && node.style.stroke !== "none") {
      ctx.strokeStyle = node.style.stroke
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
