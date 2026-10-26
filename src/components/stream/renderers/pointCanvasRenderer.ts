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
  nodes) =>
  renderCanvasPoints(
    ctx,
    nodes.filter(
    (node): node is PointSceneNode => node.type === "point"
  )
  )

export function renderCanvasPoints(
  ctx: CanvasRenderingContext2D,
  pointNodes: PointSceneNode[]
): void {
  if (pointNodes.length === 0) return

  ctx.save()
  try {
    const baseAlpha = ctx.globalAlpha
    let batch: PointSceneNode[] = []
    let batchKey = ""

    const paintPath = (node: PointSceneNode, points?: PointSceneNode[]) => {
      ctx.beginPath()
      if (points) {
        for (const point of points) {
          ctx.moveTo(point.x + point.r, point.y)
          ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2)
        }
      } else {
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
      }
      const alpha = baseAlpha * (node.style.opacity ?? 1) * (node._decayOpacity ?? 1)
      ctx.globalAlpha = alpha * (node.style.fillOpacity ?? 1)
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
        ctx.globalAlpha = alpha * (node.style.strokeOpacity ?? 1)
        ctx.stroke()
      }
      renderCirclePulse(ctx, node, baseAlpha)
    }

    const flushBatch = () => {
      if (batch.length === 0) return
      paintPath(batch[0], batch.length > 1 ? batch : undefined)
      batch = []
      batchKey = ""
    }

    for (const node of pointNodes) {
      const alpha = baseAlpha * (node.style.opacity ?? 1) * (node._decayOpacity ?? 1)
      const rawFill = node.style.fill
      const cannotBatch =
        hasPulse(node) ||
        (rawFill != null && typeof rawFill !== "string") ||
        alpha * (node.style.fillOpacity ?? 1) < 1 ||
        alpha * (node.style.strokeOpacity ?? 1) < 1
      if (cannotBatch) {
        flushBatch()
        paintPath(node)
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
