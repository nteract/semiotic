import type { NetworkSceneNode, NetworkArcNode } from "../networkTypes"
import { paintNetworkFill, paintNetworkStroke } from "./canvasRenderHelpers"

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

    paintNetworkFill(ctx, a.style, "#007bff", () => ctx.fill())
    paintNetworkStroke(ctx, a.style, () => ctx.stroke())

    ctx.restore()
  }
}
