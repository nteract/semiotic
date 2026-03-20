import type { OrdinalSceneNode, OrdinalScales, OrdinalLayout, WedgeSceneNode } from "../ordinalTypes"
import { renderPathPulse } from "./renderPulse"

/** Trace the wedge arc path (donut or pie) onto the current context. */
function drawWedgePath(ctx: CanvasRenderingContext2D, node: WedgeSceneNode): void {
  ctx.beginPath()
  if (node.innerRadius > 0) {
    // Donut: outer arc forward, inner arc backward
    ctx.arc(node.cx, node.cy, node.outerRadius, node.startAngle, node.endAngle)
    ctx.arc(node.cx, node.cy, node.innerRadius, node.endAngle, node.startAngle, true)
  } else {
    // Pie: move to center, arc, close
    ctx.moveTo(node.cx, node.cy)
    ctx.arc(node.cx, node.cy, node.outerRadius, node.startAngle, node.endAngle)
  }
  ctx.closePath()
}

export const wedgeCanvasRenderer = (
  ctx: CanvasRenderingContext2D,
  nodes: OrdinalSceneNode[],
  _scales: OrdinalScales,
  _layout: OrdinalLayout
): void => {
  const wedgeNodes = nodes.filter((n): n is WedgeSceneNode => n.type === "wedge")

  for (const node of wedgeNodes) {
    drawWedgePath(ctx, node)

    ctx.globalAlpha = node.style.fillOpacity ?? node.style.opacity ?? 1

    ctx.fillStyle = node.style.fill || "#007bff"
    ctx.fill()

    if (node.style.stroke && node.style.stroke !== "none") {
      ctx.strokeStyle = node.style.stroke
      ctx.lineWidth = node.style.strokeWidth || 1
      ctx.stroke()
    }

    // Pulse overlay — brightened fill flash when aggregated category value changes
    if (node._pulseIntensity && node._pulseIntensity > 0) {
      drawWedgePath(ctx, node)
      renderPathPulse(ctx, node)
    }

    ctx.globalAlpha = 1
  }
}
