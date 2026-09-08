import type { OrdinalSceneNode, OrdinalScales, OrdinalLayout, ViolinSceneNode } from "../ordinalTypes"
import { resolveCSSColor } from "./resolveCSSColor"
import { resolveCanvasFill } from "./canvasRenderHelpers"

// Keep parsed geometry only as long as its scene node lives. Transitions may
// update a retained node's path, so identity alone cannot validate the cache.
const PATH_CACHE = new WeakMap<ViolinSceneNode, { source: string; path: Path2D }>()

export const violinCanvasRenderer = (
  ctx: CanvasRenderingContext2D,
  nodes: OrdinalSceneNode[],
  _scales: OrdinalScales,
  _layout: OrdinalLayout
): void => {
  for (const node of nodes) {
    if (node.type !== "violin") continue
    ctx.save()

    if (node.translateX || node.translateY) {
      ctx.translate(node.translateX, node.translateY)
    }

    // Draw the violin shape
    let cached = PATH_CACHE.get(node)
    if (!cached || cached.source !== node.pathString) {
      cached = { source: node.pathString, path: new Path2D(node.pathString) }
      PATH_CACHE.set(node, cached)
    }
    const path = cached.path

    ctx.globalAlpha = node.style.fillOpacity ?? node.style.opacity ?? 0.6
    ctx.fillStyle = resolveCanvasFill(ctx, node.style.fill, "#007bff")
    ctx.fill(path)

    ctx.globalAlpha = 1
    const strokeWidth = node.style.strokeWidth ?? 1
    if (node.style.stroke && node.style.stroke !== "none" && strokeWidth > 0) {
      ctx.strokeStyle = resolveCSSColor(ctx, node.style.stroke) || node.style.stroke
      ctx.lineWidth = strokeWidth
      ctx.stroke(path)
    }

    // IQR overlay lines
    if (node.iqrLine) {
      ctx.strokeStyle = "#333"
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.8

      const center = node.iqrLine.centerPos
      const isVert = node.iqrLine.isVertical !== false

      // Q1 to Q3 line
      ctx.beginPath()
      if (isVert) {
        // Vertical violin: IQR runs vertically at the category center x
        ctx.moveTo(center, node.iqrLine.q1Pos)
        ctx.lineTo(center, node.iqrLine.q3Pos)
      } else {
        // Horizontal violin: IQR runs horizontally at the category center y
        ctx.moveTo(node.iqrLine.q1Pos, center)
        ctx.lineTo(node.iqrLine.q3Pos, center)
      }
      ctx.stroke()

      // Median dot
      ctx.beginPath()
      if (isVert) {
        ctx.arc(center, node.iqrLine.medianPos, 3, 0, Math.PI * 2)
      } else {
        ctx.arc(node.iqrLine.medianPos, center, 3, 0, Math.PI * 2)
      }
      ctx.fillStyle = "#fff"
      ctx.fill()
      ctx.strokeStyle = "#333"
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.globalAlpha = 1
    }

    ctx.restore()
  }
}
