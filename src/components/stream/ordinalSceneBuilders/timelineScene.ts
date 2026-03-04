import { buildRectNode } from "../SceneGraph"
import type { OrdinalSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { OrdinalSceneContext } from "./types"

export function buildTimelineScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, getRawRange, resolvePieceStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const isHorizontal = projection === "horizontal"

  for (const col of Object.values(columns)) {
    for (const d of col.pieceData) {
      const range = getRawRange(d)
      if (!range) continue

      const [start, end] = range
      const style = resolvePieceStyle(d, col.name)

      if (isHorizontal) {
        const x0 = rScale(Math.min(start, end))
        const x1 = rScale(Math.max(start, end))
        nodes.push(buildRectNode(
          x0, col.x, x1 - x0, col.width,
          style, d, col.name
        ))
      } else {
        const y0 = rScale(Math.max(start, end))
        const y1 = rScale(Math.min(start, end))
        nodes.push(buildRectNode(
          col.x, y0, col.width, y1 - y0,
          style, d, col.name
        ))
      }
    }
  }

  return nodes
}
