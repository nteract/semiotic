import type { ConnectorSceneNode, OrdinalSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { Style } from "../types"
import type { OrdinalSceneContext } from "./types"

export function buildConnectors(
  ctx: OrdinalSceneContext,
  pieceNodes: OrdinalSceneNode[],
  layout: OrdinalLayout
): ConnectorSceneNode[] {
  const { scales, config, getConnector, getO } = ctx
  if (!getConnector || !scales) return []
  const connectors: ConnectorSceneNode[] = []
  const { projection } = scales

  // Group pieces by connector key
  const groups = new Map<string, { x: number; y: number; datum: any; category: string }[]>()

  for (const node of pieceNodes) {
    if (node.type !== "point" && node.type !== "rect") continue
    const datum = node.datum
    if (!datum) continue

    const key = getConnector(datum)
    if (!key) continue

    let cx: number, cy: number
    if (node.type === "point") {
      cx = node.x
      cy = node.y
    } else {
      // rect: use center
      cx = node.x + node.w / 2
      cy = node.y + (projection === "vertical" ? 0 : node.h / 2)
    }

    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({ x: cx, y: cy, datum, category: getO(datum) })
  }

  // Draw lines connecting pieces with the same connector key, sorted by category order
  const oExtent = scales.o.domain()
  const resolveConnStyle = config.connectorStyle

  for (const [key, points] of groups) {
    if (points.length < 2) continue

    // Sort by category order
    points.sort((a, b) => oExtent.indexOf(a.category) - oExtent.indexOf(b.category))

    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i]
      const to = points[i + 1]
      const style: Style = typeof resolveConnStyle === "function"
        ? resolveConnStyle(from.datum)
        : (resolveConnStyle || { stroke: "#999", strokeWidth: 1, opacity: 0.5 })

      connectors.push({
        type: "connector",
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        style,
        datum: from.datum,
        group: key
      })
    }
  }

  return connectors
}
