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
    const grad = (edge as any)._gradient
    if (grad) {
      // Gradient fill for stub circular edges
      const gradient = ctx.createLinearGradient(grad.x0, 0, grad.x1, 0)
      const baseAlpha = edge.style.fillOpacity ?? edge.style.opacity ?? 0.5
      const color = edge.style.fill
      gradient.addColorStop(0, grad.from === 1 ? color : "transparent")
      gradient.addColorStop(1, grad.to === 1 ? color : "transparent")
      ctx.fillStyle = gradient
      ctx.globalAlpha = baseAlpha
    } else {
      ctx.fillStyle = edge.style.fill
      ctx.globalAlpha = edge.style.fillOpacity ?? edge.style.opacity ?? 0.5
    }
    ctx.fill(path)
  }

  // Stroke the band outline
  if (edge.style.stroke && edge.style.stroke !== "none") {
    ctx.strokeStyle = edge.style.stroke
    ctx.lineWidth = edge.style.strokeWidth ?? 0.5
    ctx.globalAlpha = (edge.style.opacity ?? 1) * 0.5
    ctx.stroke(path)
  }

  // Pulse overlay
  if (edge._pulseIntensity && edge._pulseIntensity > 0) {
    ctx.fillStyle = edge._pulseColor || "rgba(255,255,255,0.6)"
    ctx.globalAlpha = edge._pulseIntensity * 0.2
    ctx.fill(path)
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

  // Pulse glow — thicker bright line on top
  if (edge._pulseIntensity && edge._pulseIntensity > 0) {
    ctx.setLineDash([])
    ctx.strokeStyle = edge._pulseColor || "rgba(255,255,255,0.6)"
    ctx.lineWidth = (edge.style.strokeWidth ?? 1) + 3 * edge._pulseIntensity
    ctx.globalAlpha = edge._pulseIntensity * 0.4
    ctx.beginPath()
    ctx.moveTo(edge.x1, edge.y1)
    ctx.lineTo(edge.x2, edge.y2)
    ctx.stroke()
  }

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

  // Pulse overlay
  if ((edge as any)._pulseIntensity && (edge as any)._pulseIntensity > 0) {
    ctx.fillStyle = (edge as any)._pulseColor || "rgba(255,255,255,0.6)"
    ctx.globalAlpha = (edge as any)._pulseIntensity * 0.25
    ctx.fill(path)
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
