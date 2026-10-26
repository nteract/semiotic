import type {
  NetworkSceneEdge,
  NetworkBezierEdge,
  NetworkRibbonEdge,
  NetworkCurvedEdge
} from "../networkTypes"
import { resolveCSSColor } from "./resolveCSSColor"
import { hasPulse } from "./renderPulse"
import { resolveCanvasFill } from "./canvasRenderHelpers"

/**
 * Lazily build (and cache) a Path2D for an edge. Re-parses only when `pathD`
 * actually changes. Shared between the renderer and hit tester via the
 * `_cachedPath2D` / `_cachedPath2DSource` fields on edge nodes.
 */
function getOrBuildEdgePath2D(
  edge: { pathD: string; _cachedPath2D?: Path2D; _cachedPath2DSource?: string }
): Path2D {
  if (edge._cachedPath2D && edge._cachedPath2DSource === edge.pathD) {
    return edge._cachedPath2D
  }
  edge._cachedPath2D = new Path2D(edge.pathD)
  edge._cachedPath2DSource = edge.pathD
  return edge._cachedPath2D
}

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
  const sourceOver = ctx.globalCompositeOperation === "source-over"
  for (const edge of edges) {
    // Semantic hit targets often have a zero-alpha stroke and no fill. Keep
    // them in the retained scene/hit index, but avoid even constructing Path2D
    // for an invisible paint. Pulse overlays can remain visible independently.
    if (
      sourceOver &&
      (edge.style.opacity === 0 || edge.style.strokeOpacity === 0) &&
      (!edge.style.fill ||
        edge.style.fill === "none" ||
        (edge.style.fillOpacity ??
          (edge.type === "curved" ? 0.1 : edge.style.opacity)) === 0) &&
      !("_pulseIntensity" in edge && edge._pulseIntensity)
    )
      continue
    if (edge.type === "line") {
      if (edge.style.stroke === "none" || (edge.style.strokeWidth ?? 1) <= 0) continue
    } else if (!edge.pathD) continue

    const baseAlpha = ctx.globalAlpha
    ctx.save()
    if (edge.style.strokeDasharray) {
      ctx.setLineDash(edge.style.strokeDasharray.split(/[\s,]+/).map(Number))
    }
    if (edge.style.strokeLinecap) ctx.lineCap = edge.style.strokeLinecap

    if (edge.type === "line") {
      ctx.beginPath()
      ctx.moveTo(edge.x1, edge.y1)
      ctx.lineTo(edge.x2, edge.y2)
      strokeEdge(ctx, edge, baseAlpha)
      // Pulse is independent of the mark's opacity, but inherits the frame dim.
      if (hasPulse(edge)) {
        ctx.setLineDash([])
        ctx.strokeStyle = edge._pulseColor || "rgba(255,255,255,0.6)"
        ctx.lineWidth = (edge.style.strokeWidth ?? 1) + 3 * edge._pulseIntensity!
        ctx.globalAlpha = baseAlpha * edge._pulseIntensity! * 0.4
        ctx.stroke()
      }
    } else {
      const path = getOrBuildEdgePath2D(edge)
      // Curved paths retain their stroke-before-fill order; bands outline last.
      if (edge.type === "curved") strokeEdge(ctx, edge, baseAlpha, path)
      fillEdge(ctx, edge, baseAlpha, path)
      if (edge.type !== "curved") {
        strokeEdge(ctx, edge, baseAlpha, path)
        if (hasPulse(edge)) {
          ctx.fillStyle = edge._pulseColor || "rgba(255,255,255,0.6)"
          ctx.globalAlpha = baseAlpha * edge._pulseIntensity! * (edge.type === "bezier" ? 0.2 : 0.25)
          ctx.fill(path)
        }
      }
    }
    ctx.restore()
  }
}

function strokeEdge(
  ctx: CanvasRenderingContext2D,
  edge: NetworkSceneEdge,
  baseAlpha: number,
  path?: Path2D
): void {
  const band = edge.type === "bezier" || edge.type === "ribbon"
  const width = edge.style.strokeWidth ?? (band ? 0.5 : 1)
  if (width <= 0 || edge.style.stroke === "none" || (band && !edge.style.stroke)) return
  const color = edge.style.stroke || "#999"
  ctx.strokeStyle = resolveCSSColor(ctx, color) || color
  ctx.lineWidth = width
  const factor = edge.type === "bezier" ? 0.5 : edge.type === "ribbon" ? 0.3 : 1
  ctx.globalAlpha = baseAlpha * (edge.style.opacity ?? 1) * (edge.style.strokeOpacity ?? 1) * factor
  if (path) ctx.stroke(path)
  else ctx.stroke()
}

function fillEdge(
  ctx: CanvasRenderingContext2D,
  edge: NetworkBezierEdge | NetworkRibbonEdge | NetworkCurvedEdge,
  baseAlpha: number,
  path: Path2D
): void {
  if (!edge.style.fill || edge.style.fill === "none") return
  const grad = edge.type === "bezier" ? edge._gradient : undefined
  if (grad) {
    const gradient = ctx.createLinearGradient(grad.x0, grad.y0 ?? 0, grad.x1, grad.y1 ?? 0)
    const rawColor = typeof edge.style.fill === "string" ? edge.style.fill : "#999"
    const color = resolveCSSColor(ctx, rawColor) || rawColor
    gradient.addColorStop(0, grad.from === 1 ? color : "transparent")
    gradient.addColorStop(1, grad.to === 1 ? color : "transparent")
    ctx.fillStyle = gradient
  } else {
    ctx.fillStyle = resolveCanvasFill(ctx, edge.style.fill, "#007bff")
  }
  ctx.globalAlpha = baseAlpha * (edge.style.opacity ?? 1) * (edge.style.fillOpacity ?? (edge.type === "curved" ? 0.1 : 0.5))
  ctx.fill(path)
}
