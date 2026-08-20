import type { ConnectorSceneNode, OrdinalSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { Style } from "../types"
import type { OrdinalSceneContext } from "./types"
import type { Datum } from "../../charts/shared/datumTypes"

export function buildConnectors(
  ctx: OrdinalSceneContext,
  pieceNodes: OrdinalSceneNode[],
  _layout: OrdinalLayout
): ConnectorSceneNode[] {
  const { scales, config, getConnector, getO } = ctx
  if (!getConnector || !scales) return []
  const connectors: ConnectorSceneNode[] = []
  const { projection } = scales

  // Group pieces by connector key
  const groups = new Map<string, { x: number; y: number; datum: Datum; category: string }[]>()

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
  const defaultStyle: Style = {
    stroke: ctx.config.themeSemantic?.border || ctx.config.themeSemantic?.secondary || "#999",
    strokeWidth: 1,
    opacity: 0.5
  }
  const styleFor = (d: Datum): Style =>
    typeof resolveConnStyle === "function"
      ? resolveConnStyle(d)
      : (resolveConnStyle || defaultStyle)
  const pushSegment = (
    from: { x: number; y: number; datum: Datum },
    to: { x: number; y: number },
    key: string
  ) => {
    connectors.push({
      type: "connector",
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      style: styleFor(from.datum),
      datum: from.datum,
      group: key
    })
  }

  for (const [key, points] of groups) {
    if (points.length < 2) continue

    // Sort by category order
    points.sort((a, b) => oExtent.indexOf(a.category) - oExtent.indexOf(b.category))

    for (let i = 0; i < points.length - 1; i++) {
      pushSegment(points[i], points[i + 1], key)
    }
    // Radial series (RadarChart) are closed polygons; close last→first so
    // canvas/SVG stroke matches the filled path the renderer already closes.
    if (projection === "radial" && points.length >= 3) {
      pushSegment(points[points.length - 1], points[0], key)
    }
  }

  return connectors
}
