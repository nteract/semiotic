import type { OrdinalSceneNode, OrdinalScales, OrdinalLayout, ViolinSceneNode } from "../ordinalTypes"

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
    ctx.fillStyle = node.style.fill || "#007bff"
    ctx.fill(path)

    ctx.globalAlpha = 1
    if (node.style.stroke && node.style.stroke !== "none") {
      ctx.strokeStyle = node.style.stroke
      ctx.lineWidth = node.style.strokeWidth || 1
      ctx.stroke(path)
    }

    // IQR overlay lines
    if (node.iqrLine) {
      ctx.strokeStyle = "#333"
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.8

      // Q1 to Q3 line
      ctx.beginPath()
      // Determine if this is a vertical violin by checking path characteristics
      // IQR positions are already in pixel space from rScale
      ctx.moveTo(0, node.iqrLine.q1Pos)
      ctx.lineTo(0, node.iqrLine.q3Pos)
      ctx.stroke()

      // Median dot
      ctx.beginPath()
      ctx.arc(0, node.iqrLine.medianPos, 3, 0, Math.PI * 2)
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
