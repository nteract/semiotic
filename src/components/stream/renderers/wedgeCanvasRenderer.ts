import { arc as d3Arc } from "d3-shape"
import type { OrdinalSceneNode, OrdinalScales, OrdinalLayout, WedgeSceneNode } from "../ordinalTypes"
import { renderPathPulse } from "./renderPulse"
import { resolveCSSColor } from "./resolveCSSColor"

/** Trace the wedge arc path (donut or pie) onto the current context — fast path for no cornerRadius. */
function drawWedgeManual(ctx: CanvasRenderingContext2D, node: WedgeSceneNode): void {
  ctx.beginPath()
  if (node.innerRadius > 0) {
    ctx.arc(node.cx, node.cy, node.outerRadius, node.startAngle, node.endAngle)
    ctx.arc(node.cx, node.cy, node.innerRadius, node.endAngle, node.startAngle, true)
  } else {
    ctx.moveTo(node.cx, node.cy)
    ctx.arc(node.cx, node.cy, node.outerRadius, node.startAngle, node.endAngle)
  }
  ctx.closePath()
}

/** Draw a wedge using d3-shape arc (for cornerRadius) with canvas context rotation. */
function drawWedgeRounded(ctx: CanvasRenderingContext2D, node: WedgeSceneNode): void {
  const arcGen = d3Arc()
    .innerRadius(node.innerRadius)
    .outerRadius(node.outerRadius)
    // d3-shape: 0 = 12 o'clock. Scene stores canvas convention (0 = 3 o'clock).
    // Add π/2 to convert scene → d3-shape, same as SVG renderer.
    .startAngle(node.startAngle + Math.PI / 2)
    .endAngle(node.endAngle + Math.PI / 2)
    .cornerRadius(node.cornerRadius!)
  const pathStr = arcGen({} as any)
  if (!pathStr) return
  // d3-shape arc centered at (0,0) — translate to node center
  ctx.save()
  ctx.translate(node.cx, node.cy)
  const path = new Path2D(pathStr)
  ctx.fill(path)
  if (node.style.stroke && node.style.stroke !== "none") {
    ctx.stroke(path)
  }
  ctx.restore()
}

export const wedgeCanvasRenderer = (
  ctx: CanvasRenderingContext2D,
  nodes: OrdinalSceneNode[],
  _scales: OrdinalScales,
  _layout: OrdinalLayout
): void => {
  const wedgeNodes = nodes.filter((n): n is WedgeSceneNode => n.type === "wedge")

  for (const node of wedgeNodes) {
    ctx.globalAlpha = node.style.fillOpacity ?? node.style.opacity ?? 1
    ctx.fillStyle = (typeof node.style.fill === "string" ? resolveCSSColor(ctx, node.style.fill) : node.style.fill) || "#007bff"

    if (node.cornerRadius) {
      // Rounded corners — use d3-shape arc + Path2D
      if (node.style.stroke && node.style.stroke !== "none") {
        ctx.strokeStyle = resolveCSSColor(ctx, node.style.stroke) || node.style.stroke
        ctx.lineWidth = node.style.strokeWidth || 1
      }
      drawWedgeRounded(ctx, node)
    } else {
      // Standard path — fast manual approach
      drawWedgeManual(ctx, node)
      ctx.fill()

      if (node.style.stroke && node.style.stroke !== "none") {
        ctx.strokeStyle = resolveCSSColor(ctx, node.style.stroke) || node.style.stroke
        ctx.lineWidth = node.style.strokeWidth || 1
        ctx.stroke()
      }
    }

    // Pulse overlay
    if (node._pulseIntensity && node._pulseIntensity > 0) {
      drawWedgeManual(ctx, node) // pulse uses simple path
      renderPathPulse(ctx, node)
    }

    ctx.globalAlpha = 1
  }
}
