import type { PointSceneNode } from "../types"
import type { StreamRendererFn } from "./types"
import { hasPulse, renderCirclePulse } from "./renderPulse"
import { resolveCanvasFill } from "./canvasRenderHelpers"

/**
 * Canvas point renderer.
 * Renders PointSceneNode as circles. Used by Scatterplot, BubbleChart, SwarmChart,
 * and showPoints on LineChart, AreaChart, and StackedAreaChart.
 * Supports pulse glow effect via _pulseIntensity/_pulseColor fields.
 *
 * Same-style points (shared fill, stroke, radius, alpha, no pulse) share one
 * path so a 50k scatter does not pay beginPath/fill per mark.
 */
export const pointCanvasRenderer: StreamRendererFn = (ctx, nodes, _scales, _layout) => {
  const pointNodes = nodes.filter((n): n is PointSceneNode => n.type === "point")
  if (pointNodes.length === 0) return

  ctx.save()
  try {
    const baseAlpha = ctx.globalAlpha
    const batches = new Map<string, PointSceneNode[]>()
    const unbatched: PointSceneNode[] = []

    for (const node of pointNodes) {
      if (hasPulse(node)) {
        unbatched.push(node)
        continue
      }
      const alpha = node.style.opacity ?? node.style.fillOpacity ?? 1
      const strokeWidth = node.style.strokeWidth ?? 1
      const stroke = node.style.stroke && node.style.stroke !== "none" && strokeWidth > 0
        ? String(node.style.stroke)
        : ""
      const fill = String(node.style.fill ?? "#4e79a7")
      const key = `${fill}\0${stroke}\0${strokeWidth}\0${node.r}\0${alpha}`
      const batch = batches.get(key)
      if (batch) batch.push(node)
      else batches.set(key, [node])
    }

    for (const group of batches.values()) {
      const sample = group[0]
      const alpha = sample.style.opacity ?? sample.style.fillOpacity ?? 1
      ctx.globalAlpha = baseAlpha * alpha
      ctx.beginPath()
      for (const node of group) {
        ctx.moveTo(node.x + node.r, node.y)
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
      }
      ctx.fillStyle = resolveCanvasFill(ctx, sample.style.fill, "#4e79a7")
      ctx.fill()
      const strokeWidth = sample.style.strokeWidth ?? 1
      if (sample.style.stroke && sample.style.stroke !== "none" && strokeWidth > 0) {
        ctx.strokeStyle = resolveCanvasFill(ctx, sample.style.stroke, sample.style.stroke)
        ctx.lineWidth = strokeWidth
        ctx.stroke()
      }
    }

    for (const node of unbatched) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
      const alpha = node.style.opacity ?? node.style.fillOpacity ?? 1
      ctx.globalAlpha = baseAlpha * alpha
      ctx.fillStyle = resolveCanvasFill(ctx, node.style.fill, "#4e79a7")
      ctx.fill()
      const strokeWidth = node.style.strokeWidth ?? 1
      if (node.style.stroke && node.style.stroke !== "none" && strokeWidth > 0) {
        ctx.strokeStyle = resolveCanvasFill(ctx, node.style.stroke, node.style.stroke)
        ctx.lineWidth = strokeWidth
        ctx.stroke()
      }
      renderCirclePulse(ctx, node)
    }
  } finally {
    ctx.restore()
  }
}
