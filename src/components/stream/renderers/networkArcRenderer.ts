import type { NetworkSceneNode, NetworkArcNode } from "../networkTypes"

/**
 * Canvas painter for NetworkArcNode (chord diagram arc segments).
 */
export function networkArcRenderer(
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[]
): void {
  for (const node of nodes) {
    if (node.type !== "arc") continue
    const a = node as NetworkArcNode

    ctx.save()

    if (a.style.opacity !== undefined) {
      ctx.globalAlpha = a.style.opacity
    }

    // Draw arc segment (annular sector)
    ctx.beginPath()
    ctx.arc(a.cx, a.cy, a.outerR, a.startAngle, a.endAngle)
    ctx.arc(a.cx, a.cy, a.innerR, a.endAngle, a.startAngle, true)
    ctx.closePath()

    // Fill
    if (a.style.fill) {
      ctx.fillStyle = a.style.fill
      if (a.style.fillOpacity !== undefined) {
        ctx.globalAlpha = (a.style.opacity ?? 1) * a.style.fillOpacity
      }
      ctx.fill()
    }

    // Stroke
    if (a.style.stroke && a.style.stroke !== "none") {
      ctx.strokeStyle = a.style.stroke
      ctx.lineWidth = a.style.strokeWidth ?? 1
      ctx.globalAlpha = a.style.opacity ?? 1
      ctx.stroke()
    }

    ctx.restore()
  }
}
