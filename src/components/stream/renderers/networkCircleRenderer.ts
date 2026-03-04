import type { NetworkSceneNode, NetworkCircleNode } from "../networkTypes"

/**
 * Canvas painter for NetworkCircleNode (force nodes, tree nodes, circlepack).
 */
export function networkCircleRenderer(
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[]
): void {
  for (const node of nodes) {
    if (node.type !== "circle") continue
    const c = node as NetworkCircleNode

    if (c.r <= 0) continue

    ctx.save()

    if (c.style.opacity !== undefined) {
      ctx.globalAlpha = c.style.opacity
    }

    ctx.beginPath()
    ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2)

    // Fill
    if (c.style.fill) {
      ctx.fillStyle = c.style.fill
      if (c.style.fillOpacity !== undefined) {
        ctx.globalAlpha = (c.style.opacity ?? 1) * c.style.fillOpacity
      }
      ctx.fill()
    }

    // Stroke
    if (c.style.stroke && c.style.stroke !== "none") {
      ctx.strokeStyle = c.style.stroke
      ctx.lineWidth = c.style.strokeWidth ?? 1
      ctx.globalAlpha = c.style.opacity ?? 1
      ctx.stroke()
    }

    ctx.restore()
  }
}
