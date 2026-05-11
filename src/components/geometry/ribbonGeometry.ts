/**
 * Shared ribbon geometry — emits both the SVG path-D string and the
 * centerline cubic-bezier cache for a sankey-style band.
 *
 * Both SankeyDiagram (via `areaLink` in `./sankeyLinks`) and
 * ProcessSankey (via the HOC's ribbon-spec construction) need to
 * draw the same M-C-L-C-Z trapezoid-cap-with-bezier-sides shape and
 * provide a matching 4-point centerline bezier for the particle
 * pool. The two charts compute their inputs differently — Sankey
 * reads (x0/x1/y0/y1, sankeyWidth) from the d3-sankey layout while
 * ProcessSankey computes (sx, sTop, sBot, tx, tTop, tBot, cp1X, cp2X)
 * from its temporal attachment math — but the *emission* is shared.
 *
 * For Sankey:  cp1X = xi(curvature), cp2X = xi(1-curvature) (smooth
 *              S-curve, symmetric around the midpoint).
 * For ProcessSankey: cp1X = cp2X = cx where `cx` depends on
 *              `ribbonLane` ("source"/"target"/"both") — concentrates
 *              the bend at a chosen x position.
 */
import type { BezierCache } from "../stream/networkTypes"

export interface RibbonGeometryInput {
  /** Source x coordinate. */
  sx: number
  /** Source band top (y at source end, smaller y). */
  sTop: number
  /** Source band bottom (y at source end, larger y). */
  sBot: number
  /** Target x coordinate. */
  tx: number
  /** Target band top. */
  tTop: number
  /** Target band bottom. */
  tBot: number
  /** x of the near-source bezier control point. The top curve uses
   *  `(cp1X, sTop)` as its first control point and the bottom curve
   *  uses `(cp1X, sBot)` as its last (mirrored). */
  cp1X: number
  /** x of the near-target bezier control point. The top curve uses
   *  `(cp2X, tTop)` as its second control point and the bottom curve
   *  uses `(cp2X, tBot)` as its first (mirrored). */
  cp2X: number
}

export interface RibbonGeometryOutput {
  /** Closed SVG path describing the visible ribbon band. */
  pathD: string
  /** Centerline cubic for the particle pool. Matches the shape
   *  `NetworkPipelineStore.buildStandardBezier` produces for sankey
   *  edges, so both ribbon kinds drive the shared particle
   *  pipeline identically. */
  bezier: BezierCache
}

/**
 * Build both the visible-ribbon path-D and the centerline bezier
 * cache from a single set of geometric inputs.
 *
 * @example
 * ```ts
 * // SankeyDiagram (smooth curvature-based S-curve):
 * const xi = interpolateNumber(source.x1, target.x0)
 * buildRibbonGeometry({
 *   sx: source.x1, tx: target.x0,
 *   sTop: edge.y0 - edge.sankeyWidth / 2,
 *   sBot: edge.y0 + edge.sankeyWidth / 2,
 *   tTop: edge.y1 - edge.sankeyWidth / 2,
 *   tBot: edge.y1 + edge.sankeyWidth / 2,
 *   cp1X: xi(0.5),  cp2X: xi(0.5),  // curvature defaults to 0.5
 * })
 *
 * // ProcessSankey (lane-aware bend):
 * const cx = ribbonLane === "source" ? sx + (tx - sx) * 0.85
 *          : ribbonLane === "target" ? sx + (tx - sx) * 0.15
 *          : (sx + tx) / 2
 * buildRibbonGeometry({ sx, sTop, sBot, tx, tTop, tBot, cp1X: cx, cp2X: cx })
 * ```
 */
export function buildRibbonGeometry(input: RibbonGeometryInput): RibbonGeometryOutput {
  const { sx, sTop, sBot, tx, tTop, tBot, cp1X, cp2X } = input

  // M-C-L-C-Z: top edge of the band (cubic), down at target, bottom
  // edge back to source (cubic), close. Control points are mirrored
  // across the centerline so the band keeps a constant local width.
  const pathD = [
    `M${sx},${sTop}`,
    `C${cp1X},${sTop} ${cp2X},${tTop} ${tx},${tTop}`,
    `L${tx},${tBot}`,
    `C${cp2X},${tBot} ${cp1X},${sBot} ${sx},${sBot}`,
    "Z",
  ].join(" ")

  // Centerline of the band at source/target ends. The particle pool
  // walks this 4-point cubic and uses the chord direction (P0→P3)
  // to spread particles perpendicular to flow up to `halfWidth`.
  const sCenter = (sTop + sBot) / 2
  const tCenter = (tTop + tBot) / 2
  const bezier: BezierCache = {
    circular: false,
    points: [
      { x: sx, y: sCenter },
      { x: cp1X, y: sCenter },
      { x: cp2X, y: tCenter },
      { x: tx, y: tCenter },
    ],
    halfWidth: (sBot - sTop) / 2,
  }
  return { pathD, bezier }
}
