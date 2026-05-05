import { buildRectNode } from "../SceneGraph"
import type { OrdinalSceneNode, OrdinalLayout, RectSceneNode } from "../ordinalTypes"
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
export function buildSwimlaneScene(ctx: OrdinalSceneContext, _layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, getR, getStack, resolvePieceStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const isHorizontal = projection === "horizontal"
  const gradientFill = ctx.config.gradientFill
  // Gradient runs along the bar's growth direction. Horizontal lanes grow
  // left→right, so the gradient axis pivots on the "left" edge; vertical
  // lanes grow bottom→top, pivoting on "bottom". roundedEdge alone doesn't
  // round corners (the canvas renderer only rounds when roundedTop > 0).
  const gradientEdge: RectSceneNode["roundedEdge"] = isHorizontal ? "left" : "bottom"

  // ── Track ────────────────────────────────────────────────────────────
  // Optional rect drawn behind each lane spanning the full value-axis
  // range, sized to the lane's bandwidth. Lets budget/progress lanes read
  // as filled vs. empty. Emitted before data items so the bar paints on
  // top. Pixel range = the r-scale's pixel range (already accounts for
  // extentPadding so the track aligns with the axis ticks).
  const trackFill = ctx.config.trackFill
  if (trackFill) {
    const trackColor = typeof trackFill === "string" ? trackFill : trackFill.color
    const trackOpacity = typeof trackFill === "string" ? 1 : (trackFill.opacity ?? 1)
    const [r0, r1] = rScale.range()
    const trackStart = Math.min(r0, r1)
    const trackLen = Math.abs(r1 - r0)
    for (const col of Object.values(columns)) {
      const trackStyle = { fill: trackColor, opacity: trackOpacity }
      // datum: null so hit-testing returns no payload — track is purely visual.
      const node = isHorizontal
        ? buildRectNode(trackStart, col.x, trackLen, col.width, trackStyle, null, "__track__")
        : buildRectNode(col.x, trackStart, col.width, trackLen, trackStyle, null, "__track__")
      nodes.push(node)
    }
  }

  for (const col of Object.values(columns)) {
    // Each piece becomes its own rect, stacked sequentially within the lane.
    // No aggregation — duplicates of the same subcategory are expected.
    let offset = 0

    for (const d of col.pieceData) {
      const val = Math.abs(getR(d))
      if (val === 0) continue

      const subcategory = getStack ? getStack(d) : col.name
      const style = resolvePieceStyle(d, subcategory)

      let node: RectSceneNode
      if (isHorizontal) {
        const x0 = rScale(offset)
        const x1 = rScale(offset + val)
        node = buildRectNode(
          x0, col.x, x1 - x0, col.width,
          style, d, subcategory
        )
      } else {
        const y0 = rScale(offset + val)
        const y1 = rScale(offset)
        node = buildRectNode(
          col.x, y0, col.width, y1 - y0,
          style, d, subcategory
        )
      }

      if (gradientFill) {
        node.fillGradient = gradientFill
        node.roundedEdge = gradientEdge
      }
      nodes.push(node)

      offset += val
    }
  }

  return nodes
}
