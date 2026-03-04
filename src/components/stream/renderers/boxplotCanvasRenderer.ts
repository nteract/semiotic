import type { OrdinalSceneNode, OrdinalScales, OrdinalLayout, BoxplotSceneNode } from "../ordinalTypes"

export const boxplotCanvasRenderer = (
  ctx: CanvasRenderingContext2D,
  nodes: OrdinalSceneNode[],
  _scales: OrdinalScales,
  _layout: OrdinalLayout
): void => {
  const boxNodes = nodes.filter((n): n is BoxplotSceneNode => n.type === "boxplot")

  for (const node of boxNodes) {
    const halfWidth = node.columnWidth / 2
    const isVert = node.projection === "vertical"

    const fillColor = node.style.fill || "#007bff"
    const strokeColor = node.style.stroke || "#333"
    const lineWidth = node.style.strokeWidth || 1
    const opacity = node.style.fillOpacity ?? node.style.opacity ?? 0.6

    ctx.save()

    // Whisker line (min to max)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = lineWidth
    ctx.beginPath()
    if (isVert) {
      ctx.moveTo(node.x, node.minPos)
      ctx.lineTo(node.x, node.maxPos)
    } else {
      ctx.moveTo(node.minPos, node.y)
      ctx.lineTo(node.maxPos, node.y)
    }
    ctx.stroke()

    // Whisker caps
    ctx.beginPath()
    if (isVert) {
      ctx.moveTo(node.x - halfWidth * 0.4, node.minPos)
      ctx.lineTo(node.x + halfWidth * 0.4, node.minPos)
      ctx.moveTo(node.x - halfWidth * 0.4, node.maxPos)
      ctx.lineTo(node.x + halfWidth * 0.4, node.maxPos)
    } else {
      ctx.moveTo(node.minPos, node.y - halfWidth * 0.4)
      ctx.lineTo(node.minPos, node.y + halfWidth * 0.4)
      ctx.moveTo(node.maxPos, node.y - halfWidth * 0.4)
      ctx.lineTo(node.maxPos, node.y + halfWidth * 0.4)
    }
    ctx.stroke()

    // IQR box (q1 to q3)
    ctx.globalAlpha = opacity
    ctx.fillStyle = fillColor
    if (isVert) {
      const boxTop = Math.min(node.q1Pos, node.q3Pos)
      const boxH = Math.abs(node.q3Pos - node.q1Pos)
      ctx.fillRect(node.x - halfWidth, boxTop, node.columnWidth, boxH)
      ctx.globalAlpha = 1
      ctx.strokeRect(node.x - halfWidth, boxTop, node.columnWidth, boxH)
    } else {
      const boxLeft = Math.min(node.q1Pos, node.q3Pos)
      const boxW = Math.abs(node.q3Pos - node.q1Pos)
      ctx.fillRect(boxLeft, node.y - halfWidth, boxW, node.columnWidth)
      ctx.globalAlpha = 1
      ctx.strokeRect(boxLeft, node.y - halfWidth, boxW, node.columnWidth)
    }

    // Median line
    ctx.strokeStyle = "#fff"
    ctx.lineWidth = 2
    ctx.beginPath()
    if (isVert) {
      ctx.moveTo(node.x - halfWidth, node.medianPos)
      ctx.lineTo(node.x + halfWidth, node.medianPos)
    } else {
      ctx.moveTo(node.medianPos, node.y - halfWidth)
      ctx.lineTo(node.medianPos, node.y + halfWidth)
    }
    ctx.stroke()

    ctx.restore()
  }
}
