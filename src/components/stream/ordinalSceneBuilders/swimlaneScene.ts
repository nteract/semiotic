import { buildRectNode } from "../SceneGraph"
import type { OrdinalSceneNode, OrdinalLayout } from "../ordinalTypes"
import type { OrdinalSceneContext } from "./types"

/**
 * Swimlane scene builder.
 *
 * Each category (oAccessor) defines a horizontal lane.
 * Items within a lane are stacked left-to-right (or bottom-to-top in vertical),
 * colored by subcategory (stackBy/colorBy). Unlike a standard stacked bar,
 * multiple items with the same subcategory can appear in the same lane —
 * they simply stack sequentially.
 */
export function buildSwimlaneScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, getR, getStack, resolvePieceStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const isHorizontal = projection === "horizontal"

  for (const col of Object.values(columns)) {
    // Each piece becomes its own rect, stacked sequentially within the lane.
    // No aggregation — duplicates of the same subcategory are expected.
    let offset = 0

    for (const d of col.pieceData) {
      const val = Math.abs(getR(d))
      if (val === 0) continue

      const subcategory = getStack ? getStack(d) : col.name
      const style = resolvePieceStyle(d, subcategory)

      if (isHorizontal) {
        const x0 = rScale(offset)
        const x1 = rScale(offset + val)
        nodes.push(buildRectNode(
          x0, col.x, x1 - x0, col.width,
          style, d, subcategory
        ))
      } else {
        const y0 = rScale(offset + val)
        const y1 = rScale(offset)
        nodes.push(buildRectNode(
          col.x, y0, col.width, y1 - y0,
          style, d, subcategory
        ))
      }

      offset += val
    }
  }

  return nodes
}
