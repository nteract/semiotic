import type {
  CircularPathData,
  RealtimeEdge,
  RealtimeNode
} from "./networkTypes"
import { lerp } from "./pipelineTransitionUtils"

interface EdgePositionSnapshot {
  y0: number
  y1: number
  sankeyWidth: number
  circularPathData?: CircularPathData
}

export type EdgePositionSnapshots = Map<string, EdgePositionSnapshot[]>

function edgeEndpoints(edge: RealtimeEdge): string {
  const source = typeof edge.source === "string" ? edge.source : edge.source.id
  const target = typeof edge.target === "string" ? edge.target : edge.target.id
  return `${source}\0${target}`
}

export function snapshotEdgePositions(
  edges: Iterable<RealtimeEdge>
): EdgePositionSnapshots {
  const snapshots: EdgePositionSnapshots = new Map()
  for (const edge of edges) {
    const key = edgeEndpoints(edge)
    const siblings = snapshots.get(key) ?? []
    siblings.push(snapshotEdgePosition(edge))
    snapshots.set(key, siblings)
  }
  return snapshots
}

export function savePreviousEdgePositions(
  edges: Iterable<RealtimeEdge>,
  snapshots: EdgePositionSnapshots | null
): void {
  for (const edge of edges) {
    // Match parallel rows by their order within a node pair, not their global
    // input index: inserting/reordering unrelated rows should not reset them.
    const previous = snapshots?.get(edgeEndpoints(edge))?.shift()
    savePreviousEdgePosition(
      edge,
      edge.sankeyWidth === 0 ? previous : undefined
    )
  }
}

function snapshotEdgePosition(edge: RealtimeEdge): EdgePositionSnapshot {
  return {
    y0: edge.y0,
    y1: edge.y1,
    sankeyWidth: edge.sankeyWidth,
    circularPathData:
      edge.circular && edge.circularPathData
        ? { ...edge.circularPathData }
        : undefined
  }
}

function savePreviousEdgePosition(
  edge: RealtimeEdge,
  previous: EdgePositionSnapshot = snapshotEdgePosition(edge)
): void {
  edge._prevY0 = previous.y0
  edge._prevY1 = previous.y1
  edge._prevSankeyWidth = previous.sankeyWidth
  edge._prevCircularPathData = previous.circularPathData
  edge._introFromZero = false
}

export function saveTargetEdgePosition(edge: RealtimeEdge): void {
  edge._targetY0 = edge.y0
  edge._targetY1 = edge.y1
  edge._targetSankeyWidth = edge.sankeyWidth
  edge._targetCircularPathData = snapshotEdgePosition(edge).circularPathData
  const target = edge._targetCircularPathData
  const previous = edge._prevCircularPathData
  // A new route (or one switching between top and bottom) cannot borrow the
  // old band's width: its target corner radii may be smaller than that width.
  if (
    target &&
    (!previous ||
      Math.sign(previous.verticalFullExtent - previous.sourceY) !==
        Math.sign(target.verticalFullExtent - target.sourceY))
  ) {
    if (!edge._prevSankeyWidth) {
      edge._prevY0 = previousAnchor(edge.source, edge.y0)
      edge._prevY1 = previousAnchor(edge.target, edge.y1)
    }
    edge._prevCircularPathData = { ...target }
    edge._prevSankeyWidth = 0
    edge._introFromZero = true
  }
}

function previousAnchor(node: RealtimeNode | string, position: number): number {
  if (
    typeof node === "string" ||
    node._prevY0 === undefined ||
    node._prevX0 === undefined ||
    (node._prevX0 === 0 && node._prevX1 === 0)
  ) {
    return position
  }
  const fraction =
    node.y1 > node.y0 ? (position - node.y0) / (node.y1 - node.y0) : 0.5
  return lerp(node._prevY0, node._prevY1!, fraction)
}

export function interpolateEdgePosition(edge: RealtimeEdge, t: number): void {
  if (
    edge._targetY0 === undefined ||
    edge._prevY0 === undefined ||
    edge._prevSankeyWidth === undefined ||
    !(edge._prevSankeyWidth > 0 || edge._introFromZero)
  )
    return

  edge.y0 = lerp(edge._prevY0, edge._targetY0, t)
  edge.y1 = lerp(edge._prevY1!, edge._targetY1!, t)
  edge.sankeyWidth = lerp(edge._prevSankeyWidth, edge._targetSankeyWidth!, t)
  const target = edge._targetCircularPathData
  const previous = edge._prevCircularPathData
  if (!target || !previous) return

  const current = { ...target }
  // Include every numeric field, including any additional vendor metadata.
  // Interpolating radii with width preserves positive inner-band radii.
  for (const key of Object.keys(target) as (keyof CircularPathData)[]) {
    current[key] = lerp(previous[key] ?? target[key], target[key], t)
  }
  // Newly circular routes and intros start with target geometry. Keep its
  // endpoints attached to the nodes while their boxes move into position.
  if (typeof edge.source !== "string") {
    const dx = edge.source.x1 - current.sourceX
    current.sourceX = edge.source.x1
    current.rightInnerExtent += dx
    current.rightFullExtent += dx
    current.sourceWidth = edge.source.x1 - edge.source.x0
  }
  if (typeof edge.target !== "string") {
    const dx = edge.target.x0 - current.targetX
    current.targetX = edge.target.x0
    current.leftInnerExtent += dx
    current.leftFullExtent += dx
  }
  current.sourceY = edge.y0
  current.targetY = edge.y1
  edge.circularPathData = current
  edge._circularWidth = edge.sankeyWidth
}

export function restoreTargetEdgePosition(edge: RealtimeEdge): void {
  if (edge._targetY0 !== undefined) {
    edge.y0 = edge._targetY0
    edge.y1 = edge._targetY1!
    edge.sankeyWidth = edge._targetSankeyWidth!
    if (edge._targetCircularPathData) {
      edge.circularPathData = { ...edge._targetCircularPathData }
      edge._circularWidth = edge.sankeyWidth
    }
  }
  edge._introFromZero = undefined
}
