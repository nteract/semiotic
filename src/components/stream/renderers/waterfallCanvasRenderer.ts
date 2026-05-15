import type { RectSceneNode } from "../types"
import type { StreamRendererFn } from "./types"
import { barCanvasRenderer } from "./barCanvasRenderer"
import { resolveCSSColor } from "./resolveCSSColor"

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
  const rects = nodes.filter((n): n is RectSceneNode => n.type === "rect")
  if (rects.length < 2) return

  // Read connector style from the first rect's datum (stashed by PipelineStore)
  type WaterfallDatum = {
    _connectorStroke?: string
    _connectorWidth?: number
    cumEnd?: number
    baseline?: number
  }
  const firstDatum = rects[0].datum as WaterfallDatum | null
  const connectorStroke = firstDatum?._connectorStroke
  if (!connectorStroke) return // No connector lines requested

  ctx.save()
  ctx.strokeStyle = resolveCSSColor(ctx, connectorStroke) || connectorStroke
  ctx.lineWidth = firstDatum?._connectorWidth ?? 1
  ctx.setLineDash([])

  for (let i = 0; i < rects.length - 1; i++) {
    const curr = rects[i]
    const next = rects[i + 1]
    const currDatum = curr.datum as WaterfallDatum | null
    const nextDatum = next.datum as WaterfallDatum | null
    if (!currDatum?.cumEnd || !nextDatum?.baseline) continue

    // Connect from end of current bar to start of next bar at cumEnd level
    const yConn = scales.y(currDatum.cumEnd)
    const x1 = curr.x + curr.w
    const x2 = next.x

    ctx.beginPath()
    ctx.moveTo(x1, yConn)
    ctx.lineTo(x2, yConn)
    ctx.stroke()
  }

  ctx.restore()
}
