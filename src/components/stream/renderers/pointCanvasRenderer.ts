import type { PointSceneNode } from "../types"
import type { StreamRendererFn } from "./types"
import { hasPulse, renderCirclePulse } from "./renderPulse"
import { resolveCanvasFill } from "./canvasRenderHelpers"

// Chromium's Canvas2D path implementation gets slower again when one path
// accumulates tens of thousands of arcs. Keep the semantic win of opaque
// same-style batching while bounding path complexity and temporary storage.
// The controlled 50k browser fixture owns the performance evidence for this
// value; the focused renderer test locks only the bounded behavior.
const MAX_POINTS_PER_BATCH = 2_048

/**
 * Canvas point renderer.
 * Renders PointSceneNode as circles. Used by Scatterplot, BubbleChart, SwarmChart,
 * and showPoints on LineChart, AreaChart, and StackedAreaChart.
 * Supports pulse glow effect via _pulseIntensity/_pulseColor fields.
 *
 * Opaque same-style points that are contiguous in data order share one path.
 * Translucent points, hatches/patterns, and pulses stay per-mark so overlap
 * compositing and z-order match the unbatched painter.
 */
export const pointCanvasRenderer: StreamRendererFn = (
  ctx,
  nodes,
  _scales,
  _layout
) => {
  const pointNodes = nodes.filter(
    (n): n is PointSceneNode => n.type === "point"
  )
  if (pointNodes.length === 0) return

  ctx.save()
  try {
    const baseAlpha = ctx.globalAlpha
    let batch: PointSceneNode[] = []
    let batchKey = ""

    const paintOne = (node: PointSceneNode) => {
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
      const alpha = node.style.opacity ?? node.style.fillOpacity ?? 1
      ctx.globalAlpha = baseAlpha * alpha
      ctx.fillStyle = resolveCanvasFill(ctx, node.style.fill, "#4e79a7")
      ctx.fill()
      const strokeWidth = node.style.strokeWidth ?? 1
      if (
        node.style.stroke &&
        node.style.stroke !== "none" &&
        strokeWidth > 0
      ) {
        ctx.strokeStyle = resolveCanvasFill(
          ctx,
          node.style.stroke,
          node.style.stroke
        )
        ctx.lineWidth = strokeWidth
        ctx.stroke()
      }
      renderCirclePulse(ctx, node)
    }

    const flushBatch = () => {
      if (batch.length === 0) return
      if (batch.length === 1) {
        paintOne(batch[0])
        batch = []
        batchKey = ""
        return
      }
      const sample = batch[0]
      const alpha = sample.style.opacity ?? sample.style.fillOpacity ?? 1
      ctx.globalAlpha = baseAlpha * alpha
      ctx.beginPath()
      for (const node of batch) {
        ctx.moveTo(node.x + node.r, node.y)
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
      }
      ctx.fillStyle = resolveCanvasFill(ctx, sample.style.fill, "#4e79a7")
      ctx.fill()
      const strokeWidth = sample.style.strokeWidth ?? 1
      if (
        sample.style.stroke &&
        sample.style.stroke !== "none" &&
        strokeWidth > 0
      ) {
        ctx.strokeStyle = resolveCanvasFill(
          ctx,
          sample.style.stroke,
          sample.style.stroke
        )
        ctx.lineWidth = strokeWidth
        ctx.stroke()
      }
      batch = []
      batchKey = ""
    }

    for (const node of pointNodes) {
      const alpha = node.style.opacity ?? node.style.fillOpacity ?? 1
      const rawFill = node.style.fill
      const cannotBatch =
        hasPulse(node) ||
        (rawFill != null && typeof rawFill !== "string") ||
        alpha < 1
      if (cannotBatch) {
        flushBatch()
        paintOne(node)
        continue
      }
      const strokeWidth = node.style.strokeWidth ?? 1
      const stroke =
        node.style.stroke && node.style.stroke !== "none" && strokeWidth > 0
          ? String(node.style.stroke)
          : ""
      const fill = rawFill ?? "#4e79a7"
      const key = `${fill}\0${stroke}\0${strokeWidth}\0${node.r}\0${alpha}`
      if (batch.length > 0 && key !== batchKey) flushBatch()
      batchKey = key
      batch.push(node)
      if (batch.length >= MAX_POINTS_PER_BATCH) flushBatch()
    }
    flushBatch()
  } finally {
    ctx.restore()
  }
}
