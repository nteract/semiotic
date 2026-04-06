import type { OrdinalSceneNode, OrdinalScales, OrdinalLayout, ConnectorSceneNode } from "../ordinalTypes"
import { resolveCSSColor } from "./resolveCSSColor"

export const connectorCanvasRenderer = (
  ctx: CanvasRenderingContext2D,
  nodes: OrdinalSceneNode[],
  _scales: OrdinalScales,
  _layout: OrdinalLayout
): void => {
  const connectorNodes = nodes.filter((n): n is ConnectorSceneNode => n.type === "connector")
  if (connectorNodes.length === 0) return

  // Group connectors by their group key so we can draw filled polygons
  const groups = new Map<string, ConnectorSceneNode[]>()
  for (const node of connectorNodes) {
    const key = node.group || "_default"
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(node)
  }

  for (const [, segments] of groups) {
    if (segments.length === 0) continue

    const firstStyle = segments[0].style
    const hasFill = firstStyle.fill && firstStyle.fill !== "none"

    // Draw filled polygon if fill is specified (e.g. radar plot)
    if (hasFill) {
      ctx.beginPath()
      ctx.moveTo(segments[0].x1, segments[0].y1)
      for (const seg of segments) {
        ctx.lineTo(seg.x2, seg.y2)
      }
      ctx.closePath()

      ctx.globalAlpha = firstStyle.fillOpacity ?? firstStyle.opacity ?? 0.3
      ctx.fillStyle = firstStyle.fill!
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Draw stroke lines
    for (const node of segments) {
      ctx.beginPath()
      ctx.moveTo(node.x1, node.y1)
      ctx.lineTo(node.x2, node.y2)

      ctx.strokeStyle = resolveCSSColor(ctx, node.style.stroke) || (typeof node.style.fill === "string" ? resolveCSSColor(ctx, node.style.fill) : node.style.fill) || "#999"
      ctx.lineWidth = node.style.strokeWidth || 1
      ctx.globalAlpha = node.style.opacity ?? 0.5
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }
}
