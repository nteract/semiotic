import type { Quadtree } from "d3-quadtree"
import { findNearestOrdinalNode, type OrdinalHitResult } from "./OrdinalCanvasHitTester"
import type {
  HoverData,
  OrdinalSceneNode,
  OrdinalScales,
  StreamOrdinalFrameProps
} from "./ordinalTypes"
import { buildHoverData } from "./hoverUtils"
import type { PointSceneNode } from "./types"

export type OrdinalPointerResolution =
  | { kind: "outside" | "miss" }
  | { kind: "hit"; hit: OrdinalHitResult }

export function resolveOrdinalPointerHit(options: {
  pointer: { clientX: number; clientY: number }
  canvasRect: Pick<DOMRect, "left" | "top">
  margin: { left: number; top: number }
  width: number
  height: number
  projection: OrdinalScales["projection"]
  hoverRadius: number
  scene: OrdinalSceneNode[]
  pointQuadtree: Quadtree<PointSceneNode> | null
  maxPointRadius: number
}): OrdinalPointerResolution {
  const chartX = options.pointer.clientX - options.canvasRect.left - options.margin.left
  const chartY = options.pointer.clientY - options.canvasRect.top - options.margin.top
  if (
    chartX < 0 ||
    chartX > options.width ||
    chartY < 0 ||
    chartY > options.height
  ) {
    return { kind: "outside" }
  }
  if (options.scene.length === 0) return { kind: "miss" }

  const radial = options.projection === "radial"
  const hit = findNearestOrdinalNode(
    options.scene,
    radial ? chartX - options.width / 2 : chartX,
    radial ? chartY - options.height / 2 : chartY,
    options.hoverRadius,
    options.pointQuadtree,
    options.maxPointRadius
  )
  return hit ? { kind: "hit", hit } : { kind: "miss" }
}

export function ordinalHitToHover(
  hit: OrdinalHitResult,
  options: Pick<StreamOrdinalFrameProps, "oAccessor" | "rAccessor" | "chartType">
): HoverData {
  return buildHoverData(hit.datum || {}, hit.x, hit.y, {
    ...(hit.stats && { stats: hit.stats }),
    ...(hit.category && { category: hit.category }),
    __oAccessor:
      typeof options.oAccessor === "string" ? options.oAccessor : undefined,
    __rAccessor:
      typeof options.rAccessor === "string" ? options.rAccessor : undefined,
    __chartType: options.chartType
  })
}
