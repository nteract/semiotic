import { interpolateNumber } from "d3-interpolate"
import type { CircularPathData } from "../stream/networkTypes"
import { buildRibbonGeometry } from "./ribbonGeometry"

const curvature = 0.5

/** A laid-out sankey node end: its depth extent along the flow. */
interface SankeyLinkEnd {
  x0: number
  x1: number
}

/** The laid-out sankey edge fields the ribbon paths read. */
export interface SankeyAreaLinkInput {
  /** Unresolved (string) ends have no geometry yet, and produce no path. */
  source: SankeyLinkEnd | string
  target: SankeyLinkEnd | string
  y0: number
  y1: number
  sankeyWidth: number
  direction?: string
}

export interface SankeyCircularLinkInput {
  sankeyWidth: number
  circularPathData?: CircularPathData
  circularLinkType?: string
  direction?: string
}

export const areaLink = (d: SankeyAreaLinkInput): string | null => {
  const { source, target } = d
  if (typeof source === "string" || typeof target === "string") return null

  if (d.direction === "down") {
    // Vertical sankey: d3-sankey uses swapped extent so x = depth, y = breadth.
    // For screen rendering: breadth → horizontal (x), depth → vertical (y).
    // edge.y0/y1 = breadth offsets at source/target → horizontal center
    // source.x1 = depth bottom of source node → vertical start
    // target.x0 = depth top of target node → vertical end
    const x0 = d.y0 - d.sankeyWidth / 2
    const x1 = d.y1 - d.sankeyWidth / 2
    const x2 = d.y1 + d.sankeyWidth / 2
    const x3 = d.y0 + d.sankeyWidth / 2
    const y0 = source.x1
    const y1 = target.x0
    const xi = interpolateNumber(y0, y1)
    const y2 = xi(curvature)
    const y3 = xi(1 - curvature)

    return `M${x0},${y0}C${x0},${y2} ${x1},${y3} ${x1},${y1}L${x2},${y1}C${x2},${y3} ${x3},${y2} ${x3},${y0}Z`
  }
  // Horizontal sankey ribbon — delegates path emission to the shared
  // `buildRibbonGeometry` helper so SankeyDiagram and ProcessSankey
  // produce the same M-C-L-C-Z shape from a single source. Each
  // chart contributes its own coordinate math (Sankey reads
  // source/target node x edges + edge band y from d3-sankey;
  // ProcessSankey reads attachment time + centerline mass) but the
  // emission rule is shared.
  const hw = d.sankeyWidth / 2
  const horizontalXi = interpolateNumber(source.x1, target.x0)
  const { pathD } = buildRibbonGeometry({
    sx: source.x1,
    sTop: d.y0 - hw,
    sBot: d.y0 + hw,
    tx: target.x0,
    tTop: d.y1 - hw,
    tBot: d.y1 + hw,
    cp1X: horizontalXi(curvature),
    cp2X: horizontalXi(1 - curvature),
  })
  return pathD
}

export function circularAreaLink(link: SankeyCircularLinkInput): string | null {
  const cpd = link.circularPathData
  if (!cpd) return null
  const hw = link.sankeyWidth / 2
  const s = link.circularLinkType === "bottom" ? 1 : -1
  const sweep = s === 1 ? 1 : 0
  // Layout coordinates always flow left-to-right. Transpose the entire path
  // (including ellipse radii and sweep) for vertical charts.
  const down = link.direction === "down"
  const point = (x: number, y: number) => down ? `${y},${x}` : `${x},${y}`
  const turn = (rx: number, ry: number, clockwise: number, x: number, y: number) =>
    `A${down ? ry : rx},${down ? rx : ry} 0 0 ${down ? 1 - clockwise : clockwise} ${point(x, y)}`
  const {
    sourceX: sx, sourceY: sy, targetX: tx, targetY: ty,
    rightInnerExtent: ri, leftInnerExtent: li,
    rightFullExtent: rf, leftFullExtent: lf, verticalFullExtent: vf,
    verticalRightInnerExtent: vr, verticalLeftInnerExtent: vl,
    rightLargeArcRadius: rr, rightSmallArcRadius: rs,
    leftLargeArcRadius: lr, leftSmallArcRadius: ls
  } = cpd

  // Offset both sides of the computed centerline by half the real band width.
  // Keep the engine's nested corner radii instead of replacing them with
  // chamfers or narrowing the return route.
  return (
    `M${point(sx, sy - s * hw)}L${point(ri, sy - s * hw)}` +
    turn(rr + hw, rs + hw, sweep, rf + hw, sy + s * rs) +
    `L${point(rf + hw, vr)}` +
    turn(rr + hw, rr + hw, sweep, ri, vf + s * hw) +
    `L${point(li, vf + s * hw)}` +
    turn(lr + hw, lr + hw, sweep, lf - hw, vl) +
    `L${point(lf - hw, ty + s * ls)}` +
    turn(lr + hw, ls + hw, sweep, li, ty - s * hw) +
    `L${point(tx, ty - s * hw)}L${point(tx, ty + s * hw)}L${point(li, ty + s * hw)}` +
    turn(lr - hw, ls - hw, 1 - sweep, lf + hw, ty + s * ls) +
    `L${point(lf + hw, vl)}` +
    turn(lr - hw, lr - hw, 1 - sweep, li, vf - s * hw) +
    `L${point(ri, vf - s * hw)}` +
    turn(rr - hw, rr - hw, 1 - sweep, rf - hw, vr) +
    `L${point(rf - hw, sy + s * rs)}` +
    turn(rr - hw, rs - hw, 1 - sweep, ri, sy + s * hw) +
    `L${point(sx, sy + s * hw)}Z`
  )
}
