import type { NetworkSceneNode, NetworkCircleNode, NetworkRectNode, NetworkArcNode } from "../networkTypes"
import { renderCirclePulse, renderFillPulse } from "./renderPulse"
import { invisibleNetworkNode, paintNetworkFill, paintNetworkStroke } from "./canvasRenderHelpers"
import { cachedScenePath2D, paintPerspectiveFaces } from "./networkPerspectivePaint"

type Primitive = NetworkCircleNode | NetworkRectNode | NetworkArcNode

/** Shared paint ordering and alpha ownership for flat and projected network marks. */
export function paintNetworkPrimitives(
  ctx: CanvasRenderingContext2D,
  nodes: NetworkSceneNode[],
  type: Primitive["type"]
): void {
  const sourceOver = ctx.globalCompositeOperation === "source-over"
  for (const candidate of nodes) {
    if (candidate.type !== type) continue
    const node = candidate as Primitive
    if (node.type === "circle" && node.r <= 0) continue
    if (node.type === "rect" && (node.w <= 0 || node.h <= 0)) continue
    const pulse = node.type === "arc" ? undefined : node._pulseIntensity
    if (sourceOver && invisibleNetworkNode(node.style, pulse)) continue

    ctx.save()
    const path = node.pathD ? cachedScenePath2D(node.pathD) : null
    if (path) {
      paintPerspectiveFaces(ctx, node.style, node.faces, "#007bff")
    } else if (node.type === "circle") {
      ctx.beginPath()
      ctx.arc(node.cx, node.cy, node.r, 0, Math.PI * 2)
    } else if (node.type === "arc") {
      ctx.beginPath()
      ctx.arc(node.cx, node.cy, node.outerR, node.startAngle, node.endAngle)
      ctx.arc(node.cx, node.cy, node.innerR, node.endAngle, node.startAngle, true)
      ctx.closePath()
    }

    paintNetworkFill(ctx, node.style, "#007bff", () => {
      if (path) ctx.fill(path)
      else if (node.type === "rect") ctx.fillRect(node.x, node.y, node.w, node.h)
      else ctx.fill()
    })
    paintNetworkStroke(ctx, node.style, () => {
      if (path) ctx.stroke(path)
      else if (node.type === "rect") ctx.strokeRect(node.x, node.y, node.w, node.h)
      else ctx.stroke()
    })
    if (node.type === "circle") renderCirclePulse(ctx, node, ctx.globalAlpha)
    else if (node.type === "rect") renderFillPulse(ctx, node, ctx.globalAlpha, path)
    ctx.restore()
  }
}
