import type { NetworkSceneNode, NetworkRectNode } from "../networkTypes"
import { renderRectPulse } from "./renderPulse"
import { paintNetworkFill, paintNetworkStroke } from "./canvasRenderHelpers"

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

    paintNetworkFill(ctx, r.style, "#007bff", () => ctx.fillRect(r.x, r.y, r.w, r.h))
    paintNetworkStroke(ctx, r.style, () => ctx.strokeRect(r.x, r.y, r.w, r.h))

    // Pulse overlay
    renderRectPulse(ctx, r)

    ctx.restore()
  }
}
