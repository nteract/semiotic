import type { StreamRendererFn } from "./types"
import { barCanvasRenderer } from "./barCanvasRenderer"

/**
 * Canvas waterfall renderer.
 * Waterfall bars are pre-computed as RectSceneNodes by PipelineStore,
 * so the rendering is identical to the bar renderer.
 * Connector lines between bars are handled separately if needed.
 */
export const waterfallCanvasRenderer: StreamRendererFn = (ctx, nodes, scales, layout) => {
  // Render the bar segments
  barCanvasRenderer(ctx, nodes, scales, layout)

  // Draw connector lines between consecutive waterfall bars
  const rects = nodes.filter(n => n.type === "rect")
  if (rects.length < 2) return

  ctx.save()
  ctx.strokeStyle = "#999"
  ctx.lineWidth = 1
  ctx.setLineDash([])

  for (let i = 0; i < rects.length - 1; i++) {
    const curr = rects[i] as any
    const next = rects[i + 1] as any
    if (!curr.datum?.cumEnd || !next.datum?.baseline) continue

    // Connect from end of current bar to start of next bar at cumEnd level
    const yConn = scales.y(curr.datum.cumEnd)
    const x1 = curr.x + curr.w
    const x2 = next.x

    ctx.beginPath()
    ctx.moveTo(x1, yConn)
    ctx.lineTo(x2, yConn)
    ctx.stroke()
  }

  ctx.restore()
}
