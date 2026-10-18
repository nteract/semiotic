import type { NetworkSceneNode, NetworkCircleNode } from "../networkTypes"
import { renderCirclePulse } from "./renderPulse"
import { invisibleNetworkNode, paintNetworkFill, paintNetworkStroke } from "./canvasRenderHelpers"
import { cachedScenePath2D, paintPerspectiveFaces } from "./networkPerspectivePaint"

/**
 * Canvas painter for NetworkCircleNode (force nodes, tree nodes, circlepack).
 */
export function networkCircleRenderer(
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[]
): void {
  const sourceOver = ctx.globalCompositeOperation === "source-over"
  for (const node of nodes) {
    if (node.type !== "circle") continue
    const c = node as NetworkCircleNode

    if (c.r <= 0) continue
    if (sourceOver && invisibleNetworkNode(c.style, c._pulseIntensity)) continue

    ctx.save()

    if (c.style.opacity !== undefined) {
      ctx.globalAlpha = c.style.opacity
    }

    // Perspective circles carry a projected ellipse outline (and a rim).
    const path = c.pathD ? cachedScenePath2D(c.pathD) : null
    if (path) {
      paintPerspectiveFaces(ctx, c.style, c.faces, "#007bff")
      paintNetworkFill(ctx, c.style, "#007bff", () => ctx.fill(path))
      paintNetworkStroke(ctx, c.style, () => ctx.stroke(path))
    } else {
      ctx.beginPath()
      ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2)

      paintNetworkFill(ctx, c.style, "#007bff", () => ctx.fill())
      paintNetworkStroke(ctx, c.style, () => ctx.stroke())
    }

    // Pulse glow ring
    renderCirclePulse(ctx, c)

    ctx.restore()
  }
}
