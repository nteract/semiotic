import type {
  NetworkSceneEdge,
  NetworkBezierEdge,
  NetworkLineEdge,
  NetworkRibbonEdge,
  NetworkCurvedEdge
} from "../networkTypes"

/**
 * Canvas painter for all network edge types.
 *
 * - bezier: Sankey flow bands (Path2D from SVG path string)
 * - line: Force-directed straight edges
 * - ribbon: Chord diagram ribbons
 * - curved: Tree/cluster curved edges
 */
export function networkEdgeRenderer(
  ctx: CanvasRenderingContext2D,
  edges: NetworkSceneEdge[]
): void {
  for (const edge of edges) {
    switch (edge.type) {
      case "bezier":
        renderBezierEdge(ctx, edge)
        break
      case "line":
        renderLineEdge(ctx, edge)
        break
      case "ribbon":
        renderRibbonEdge(ctx, edge)
        break
      case "curved":
        renderCurvedEdge(ctx, edge)
        break
    }
  }
}

function renderBezierEdge(
  ctx: CanvasRenderingContext2D,
  edge: NetworkBezierEdge
): void {
  if (!edge.pathD) return

  ctx.save()

  const path = new Path2D(edge.pathD)

  // Fill the band
  if (edge.style.fill && edge.style.fill !== "none") {
    ctx.fillStyle = edge.style.fill
    ctx.globalAlpha = edge.style.fillOpacity ?? edge.style.opacity ?? 0.5
    ctx.fill(path)
  }

  // Stroke the band outline
  if (edge.style.stroke && edge.style.stroke !== "none") {
    ctx.strokeStyle = edge.style.stroke
    ctx.lineWidth = edge.style.strokeWidth ?? 0.5
    ctx.globalAlpha = (edge.style.opacity ?? 1) * 0.5
    ctx.stroke(path)
  }

  ctx.restore()
}

function renderLineEdge(
  ctx: CanvasRenderingContext2D,
  edge: NetworkLineEdge
): void {
  ctx.save()

  ctx.strokeStyle = edge.style.stroke || "#999"
  ctx.lineWidth = edge.style.strokeWidth ?? 1
  if (edge.style.opacity !== undefined) {
    ctx.globalAlpha = edge.style.opacity
  }
  if (edge.style.strokeDasharray) {
    ctx.setLineDash(edge.style.strokeDasharray.split(/[\s,]+/).map(Number))
  }

  ctx.beginPath()
  ctx.moveTo(edge.x1, edge.y1)
  ctx.lineTo(edge.x2, edge.y2)
  ctx.stroke()

  ctx.restore()
}

function renderRibbonEdge(
  ctx: CanvasRenderingContext2D,
  edge: NetworkRibbonEdge
): void {
  if (!edge.pathD) return

  ctx.save()

  const path = new Path2D(edge.pathD)

  if (edge.style.fill && edge.style.fill !== "none") {
    ctx.fillStyle = edge.style.fill
    ctx.globalAlpha = edge.style.fillOpacity ?? edge.style.opacity ?? 0.5
    ctx.fill(path)
  }

  if (edge.style.stroke && edge.style.stroke !== "none") {
    ctx.strokeStyle = edge.style.stroke
    ctx.lineWidth = edge.style.strokeWidth ?? 0.5
    ctx.globalAlpha = (edge.style.opacity ?? 1) * 0.3
    ctx.stroke(path)
  }

  ctx.restore()
}

function renderCurvedEdge(
  ctx: CanvasRenderingContext2D,
  edge: NetworkCurvedEdge
): void {
  if (!edge.pathD) return

  ctx.save()

  const path = new Path2D(edge.pathD)

  ctx.strokeStyle = edge.style.stroke || "#999"
  ctx.lineWidth = edge.style.strokeWidth ?? 1
  if (edge.style.opacity !== undefined) {
    ctx.globalAlpha = edge.style.opacity
  }
  ctx.stroke(path)

  // Fill if specified (usually not for tree edges)
  if (edge.style.fill && edge.style.fill !== "none") {
    ctx.fillStyle = edge.style.fill
    ctx.globalAlpha = edge.style.fillOpacity ?? 0.1
    ctx.fill(path)
  }

  ctx.restore()
}
