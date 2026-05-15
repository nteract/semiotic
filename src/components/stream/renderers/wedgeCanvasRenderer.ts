import { arc as d3Arc, type DefaultArcObject } from "d3-shape"
import type { OrdinalSceneNode, OrdinalScales, OrdinalLayout, WedgeSceneNode } from "../ordinalTypes"
import { renderPathPulse } from "./renderPulse"
import { resolveCSSColor } from "./resolveCSSColor"
import { annularSectorPath } from "./wedgePathBuilder"

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
  // d3-shape: 0 = 12 o'clock. Scene stores canvas convention (0 = 3 o'clock).
  // Add π/2 to convert scene → d3-shape, same as SVG renderer.
  const arcDatum: DefaultArcObject = {
    innerRadius: node.innerRadius,
    outerRadius: node.outerRadius,
    startAngle: node.startAngle + Math.PI / 2,
    endAngle: node.endAngle + Math.PI / 2,
  }
  const arcGen = d3Arc<DefaultArcObject>()
    .cornerRadius(node.cornerRadius!)
  const pathStr = arcGen(arcDatum)
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
    // Combine fillOpacity and opacity so transition fade-in/fade-out works
    // even when fillOpacity is set (e.g., 0.6 × 0.5 during enter transition)
    const fillOpacity = node.style.fillOpacity ?? 1
    const transitionOpacity = node.style.opacity ?? 1
    ctx.globalAlpha = fillOpacity * transitionOpacity
    ctx.fillStyle = (typeof node.style.fill === "string" ? resolveCSSColor(ctx, node.style.fill) : node.style.fill) || "#007bff"

    if (node.roundedEnds) {
      // Per-end rounding opted in (gauge convention). The `roundedEnds`
      // object — even when BOTH flags are false — is the authoritative
      // signal: the caller has explicitly chosen which sides round.
      // Middle wedges in a multi-zone gauge fall here with both flags
      // false; the manual path builder short-circuits to a square
      // sector. Without this, those wedges would inherit d3-arc's
      // uniform all-corner rounding via the fallback branch below.
      if (node.style.stroke && node.style.stroke !== "none") {
        ctx.strokeStyle = resolveCSSColor(ctx, node.style.stroke) || node.style.stroke
        ctx.lineWidth = node.style.strokeWidth || 1
      }
      const d = annularSectorPath({
        innerRadius: node.innerRadius,
        outerRadius: node.outerRadius,
        startAngle: node.startAngle,
        endAngle: node.endAngle,
        cornerRadius: node.cornerRadius,
        roundStart: node.roundedEnds.start,
        roundEnd: node.roundedEnds.end,
      })
      ctx.save()
      ctx.translate(node.cx, node.cy)
      const path = new Path2D(d)
      ctx.fill(path)
      if (node.style.stroke && node.style.stroke !== "none") ctx.stroke(path)
      ctx.restore()
    } else if (node.cornerRadius) {
      // Uniform all-corner rounding (regular donut chart). `roundedEnds`
      // is unset, so the d3-arc fast path applies cornerRadius to all
      // four corners — the existing pie/donut contract.
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

    // Pulse overlay — renderPathPulse needs the current context path (not Path2D),
    // so always use drawWedgeManual. The slight shape difference from cornerRadius
    // is invisible at pulse opacity levels.
    if (node._pulseIntensity && node._pulseIntensity > 0) {
      drawWedgeManual(ctx, node)
      renderPathPulse(ctx, node)
    }

    ctx.globalAlpha = 1
  }
}
