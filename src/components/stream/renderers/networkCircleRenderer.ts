import type { NetworkSceneNode, NetworkCircleNode } from "../networkTypes"
import { renderCirclePulse } from "./renderPulse"
import { paintNetworkFill, paintNetworkStroke } from "./canvasRenderHelpers"

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

    paintNetworkFill(ctx, c.style, "#007bff", () => ctx.fill())
    paintNetworkStroke(ctx, c.style, () => ctx.stroke())

    // Pulse glow ring
    renderCirclePulse(ctx, c)

    ctx.restore()
  }
}
