import type { OrdinalSceneNode, OrdinalScales, OrdinalLayout, WedgeSceneNode } from "../ordinalTypes"

export const wedgeCanvasRenderer = (
  ctx: CanvasRenderingContext2D,
  nodes: OrdinalSceneNode[],
  _scales: OrdinalScales,
  _layout: OrdinalLayout
): void => {
  const wedgeNodes = nodes.filter((n): n is WedgeSceneNode => n.type === "wedge")

  for (const node of wedgeNodes) {
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

    if (node.style.opacity != null) ctx.globalAlpha = node.style.opacity
    if (node.style.fillOpacity != null) ctx.globalAlpha = node.style.fillOpacity

    ctx.fillStyle = node.style.fill || "#007bff"
    ctx.fill()

    if (node.style.stroke && node.style.stroke !== "none") {
      ctx.strokeStyle = node.style.stroke
      ctx.lineWidth = node.style.strokeWidth || 1
      ctx.stroke()
    }

    // Pulse overlay — brightened fill flash when aggregated category value changes
    if (node._pulseIntensity && node._pulseIntensity > 0) {
      ctx.beginPath()
      if (node.innerRadius > 0) {
        ctx.arc(node.cx, node.cy, node.outerRadius, node.startAngle, node.endAngle)
        ctx.arc(node.cx, node.cy, node.innerRadius, node.endAngle, node.startAngle, true)
      } else {
        ctx.moveTo(node.cx, node.cy)
        ctx.arc(node.cx, node.cy, node.outerRadius, node.startAngle, node.endAngle)
      }
      ctx.closePath()
      ctx.globalAlpha = node._pulseIntensity * 0.35
      ctx.fillStyle = node._pulseColor || "rgba(255,255,255,0.6)"
      ctx.fill()
    }

    ctx.globalAlpha = 1
  }
}
