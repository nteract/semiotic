import { buildRectNode } from "../SceneGraph"
import type { OrdinalColumn, OrdinalSceneNode, OrdinalLayout, RectSceneNode } from "../ordinalTypes"
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
  const laneCornerRadii = new Map<OrdinalColumn, number>()
  const laneCornerRadius = (column: OrdinalColumn) => {
    const cached = laneCornerRadii.get(column)
    if (cached !== undefined) return cached
    const requestedRadius = typeof ctx.config.roundedTop === "function"
      ? ctx.config.roundedTop(column.width)
      : ctx.config.roundedTop
    const radius = typeof requestedRadius === "number" && Number.isFinite(requestedRadius)
      ? Math.max(0, requestedRadius)
      : 0
    laneCornerRadii.set(column, radius)
    return radius
  }

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
      // A track spans the entire lane, so every one of its corners is an
      // outer lane corner. Match the pieces' radius (including functional
      // roundedTop) so the track cannot show through their curved end caps.
      const cornerR = laneCornerRadius(col)
      if (cornerR > 0) {
        node.cornerRadii = { tl: cornerR, tr: cornerR, br: cornerR, bl: cornerR }
      }
      nodes.push(node)
    }
  }

  for (const col of Object.values(columns)) {
    // Each piece becomes its own rect, stacked sequentially within the lane.
    // No aggregation — duplicates of the same subcategory are expected.
    let offset = 0
    const laneStartIndex = nodes.length
    // The lane bandwidth is the public bar-width argument in either
    // projection (horizontal uses its height; vertical uses its width).
    const cornerR = laneCornerRadius(col)

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

    // Apply rounded corners on the outermost ends of the lane. A single
    // piece rounds all four "outer" corners; multi-piece lanes round only
    // the first piece's leading edge and the last piece's trailing edge.
    // Middle pieces stay square so adjacent pieces visually butt against
    // each other.
    if (cornerR > 0 && nodes.length > laneStartIndex) {
      const lanePieces = nodes.slice(laneStartIndex) as RectSceneNode[]
      const first = lanePieces[0]
      const last = lanePieces[lanePieces.length - 1]
      if (lanePieces.length === 1) {
        // Round all four corners on the single piece.
        first.cornerRadii = { tl: cornerR, tr: cornerR, br: cornerR, bl: cornerR }
      } else if (isHorizontal) {
        // Horizontal lane: leftmost piece rounds left side, rightmost rounds right side.
        first.cornerRadii = { tl: cornerR, bl: cornerR }
        last.cornerRadii = { tr: cornerR, br: cornerR }
      } else {
        // Vertical lane: pieces stack bottom→top in pixel space. The first
        // piece (offset 0) sits at the bottom in pixel space, last piece at top.
        first.cornerRadii = { bl: cornerR, br: cornerR }
        last.cornerRadii = { tl: cornerR, tr: cornerR }
      }
    }
  }

  return nodes
}
