/**
 * Pointer hit-testing helpers for StreamNetworkFrame hover/click.
 * Returns a structured result so the frame owns React setState.
 */
import type { HoverData } from "../realtime/types"
import { buildHoverData, type HoverPointerCoords } from "./hoverUtils"
import { findNearestNetworkNode } from "./NetworkCanvasHitTester"
import type {
  NetworkSceneEdge,
  NetworkSceneNode
} from "./networkTypes"
import type { Quadtree } from "d3-quadtree"
import type { NetworkCircleNode } from "./networkTypes"

export type NetworkPointerHit =
  | { kind: "miss-outside" }
  | { kind: "miss" }
  | { kind: "hit"; hover: HoverData }

export function resolveNetworkPointerHit(options: {
  clientX: number
  clientY: number
  canvasRect: DOMRect
  margin: { left: number; top: number }
  adjustedWidth: number
  adjustedHeight: number
  sceneNodes: NetworkSceneNode[]
  sceneEdges: NetworkSceneEdge[]
  nodeQuadtree: Quadtree<NetworkCircleNode> | null
  maxNodeRadius: number
  hitRadius?: number
}): NetworkPointerHit {
  const {
    clientX,
    clientY,
    canvasRect,
    margin,
    adjustedWidth,
    adjustedHeight,
    sceneNodes,
    sceneEdges,
    nodeQuadtree,
    maxNodeRadius,
    hitRadius = 30
  } = options

  const chartX = clientX - canvasRect.left - margin.left
  const chartY = clientY - canvasRect.top - margin.top

  if (
    chartX < 0 ||
    chartX > adjustedWidth ||
    chartY < 0 ||
    chartY > adjustedHeight
  ) {
    return { kind: "miss-outside" }
  }

  const hit = findNearestNetworkNode(
    sceneNodes,
    sceneEdges,
    chartX,
    chartY,
    hitRadius,
    nodeQuadtree,
    maxNodeRadius
  )

  if (!hit) return { kind: "miss" }

  const rawDatum = hit.datum || {}
  const hover: HoverData = buildHoverData(rawDatum, hit.x, hit.y, {
    nodeOrEdge: hit.type as "node" | "edge"
  })
  return { kind: "hit", hover }
}

export function pointerFromMouseEvent(
  e: { clientX: number; clientY: number }
): HoverPointerCoords {
  return { clientX: e.clientX, clientY: e.clientY }
}
