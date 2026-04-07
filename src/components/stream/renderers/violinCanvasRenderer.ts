import type { OrdinalSceneNode, OrdinalScales, OrdinalLayout, ViolinSceneNode } from "../ordinalTypes"
import { resolveCSSColor } from "./resolveCSSColor"

export const violinCanvasRenderer = (
  ctx: CanvasRenderingContext2D,
  nodes: OrdinalSceneNode[],
  _scales: OrdinalScales,
  _layout: OrdinalLayout
): void => {
  const violinNodes = nodes.filter((n): n is ViolinSceneNode => n.type === "violin")

  for (const node of violinNodes) {
    ctx.save()

    if (node.translateX || node.translateY) {
      ctx.translate(node.translateX, node.translateY)
    }

    // Draw the violin shape
    const path = new Path2D(node.pathString)

    ctx.globalAlpha = node.style.fillOpacity ?? node.style.opacity ?? 0.6
    ctx.fillStyle = (typeof node.style.fill === "string" ? resolveCSSColor(ctx, node.style.fill) : node.style.fill) || "#007bff"
    ctx.fill(path)

    ctx.globalAlpha = 1
    if (node.style.stroke && node.style.stroke !== "none") {
      ctx.strokeStyle = resolveCSSColor(ctx, node.style.stroke) || node.style.stroke
      ctx.lineWidth = node.style.strokeWidth || 1
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
