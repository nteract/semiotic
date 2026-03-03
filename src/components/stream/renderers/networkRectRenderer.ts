import type { NetworkSceneNode, NetworkRectNode } from "../networkTypes"

/**
 * Canvas painter for NetworkRectNode (sankey nodes, treemap cells, partition blocks).
 */
export function networkRectRenderer(
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[]
): void {
  for (const node of nodes) {
    if (node.type !== "rect") continue
    const r = node as NetworkRectNode

    if (r.w <= 0 || r.h <= 0) continue

    ctx.save()

    if (r.style.opacity !== undefined) {
      ctx.globalAlpha = r.style.opacity
    }

    // Fill
    if (r.style.fill) {
      ctx.fillStyle = r.style.fill
      if (r.style.fillOpacity !== undefined) {
        ctx.globalAlpha = (r.style.opacity ?? 1) * r.style.fillOpacity
      }
      ctx.fillRect(r.x, r.y, r.w, r.h)
    }

    // Stroke
    if (r.style.stroke && r.style.stroke !== "none") {
      ctx.strokeStyle = r.style.stroke
      ctx.lineWidth = r.style.strokeWidth ?? 1
      ctx.globalAlpha = r.style.opacity ?? 1
      ctx.strokeRect(r.x, r.y, r.w, r.h)
    }

    ctx.restore()
  }
}
