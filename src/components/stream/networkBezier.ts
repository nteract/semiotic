/**
 * Pure bezier path builders for network edges (sankey / circular).
 * Extracted from NetworkPipelineStore so layout + paint share one path model.
 */
import { interpolateNumber } from "d3-interpolate"
import type {
  BezierCache,
  BezierPoint,
  RealtimeEdge,
  RealtimeNode
} from "./networkTypes"

/** Default cubic control-point curvature (fraction of span). */
export const NETWORK_EDGE_CURVATURE = 0.5

export function buildStandardBezier(
  edge: RealtimeEdge,
  sourceNode: RealtimeNode,
  targetNode: RealtimeNode,
  curvature: number = NETWORK_EDGE_CURVATURE
): BezierCache {
  const hw = (edge.sankeyWidth || 1) / 2

  if (edge.direction === "down") {
    // Vertical sankey: d3-sankey uses swapped extent so x = depth, y = breadth.
    // For rendering: breadth (y) → horizontal, depth (x) → vertical.
    const y0 = sourceNode.x1
    const y1 = targetNode.x0
    const xi = interpolateNumber(y0, y1)
    const p0: BezierPoint = { x: edge.y0, y: y0 }
    const p1: BezierPoint = { x: edge.y0, y: xi(curvature) }
    const p2: BezierPoint = { x: edge.y1, y: xi(1 - curvature) }
    const p3: BezierPoint = { x: edge.y1, y: y1 }
    return { circular: false, points: [p0, p1, p2, p3], halfWidth: hw }
  }

  // Horizontal (default)
  const x0 = sourceNode.x1
  const x1 = targetNode.x0
  const xi = interpolateNumber(x0, x1)
  const p0: BezierPoint = { x: x0, y: edge.y0 }
  const p1: BezierPoint = { x: xi(curvature), y: edge.y0 }
  const p2: BezierPoint = { x: xi(1 - curvature), y: edge.y1 }
  const p3: BezierPoint = { x: x1, y: edge.y1 }
  return { circular: false, points: [p0, p1, p2, p3], halfWidth: hw }
}

export function buildCircularBezier(
  edge: RealtimeEdge,
  curvature: number = NETWORK_EDGE_CURVATURE
): BezierCache {
  void curvature // reserved for future smoothing of circular segments
  const hw = (edge._circularWidth || edge.sankeyWidth || 1) / 2
  const cpd = edge.circularPathData
  if (!cpd) throw new Error("buildCircularBezier requires circularPathData")

  // Stub edges: particles travel outbound stub, then teleport to inbound stub
  if (edge._circularStub) {
    const stubLen = Math.max(
      15,
      Math.min(40, (cpd.rightFullExtent - cpd.sourceX) * 0.33)
    )
    const stubLenT = Math.max(
      15,
      Math.min(40, (cpd.targetX - cpd.leftFullExtent) * 0.33)
    )

    const segments: Array<
      [BezierPoint, BezierPoint, BezierPoint, BezierPoint]
    > = [
      [
        { x: cpd.sourceX, y: cpd.sourceY },
        { x: cpd.sourceX + stubLen * 0.33, y: cpd.sourceY },
        { x: cpd.sourceX + stubLen * 0.66, y: cpd.sourceY },
        { x: cpd.sourceX + stubLen, y: cpd.sourceY }
      ],
      [
        { x: cpd.targetX - stubLenT, y: cpd.targetY },
        { x: cpd.targetX - stubLenT * 0.66, y: cpd.targetY },
        { x: cpd.targetX - stubLenT * 0.33, y: cpd.targetY },
        { x: cpd.targetX, y: cpd.targetY }
      ]
    ]

    return { circular: true, segments, halfWidth: hw }
  }

  // Full circular path: source → right → vertical → left → target
  let waypoints: BezierPoint[]

  if (edge.direction === "down") {
    waypoints = [
      { x: cpd.sourceY, y: cpd.sourceX },
      { x: cpd.sourceY, y: cpd.rightFullExtent },
      { x: cpd.verticalFullExtent, y: cpd.rightFullExtent },
      { x: cpd.verticalFullExtent, y: cpd.leftFullExtent },
      { x: cpd.targetY, y: cpd.leftFullExtent },
      { x: cpd.targetY, y: cpd.targetX }
    ]
  } else {
    waypoints = [
      { x: cpd.sourceX, y: cpd.sourceY },
      { x: cpd.rightFullExtent, y: cpd.sourceY },
      { x: cpd.rightFullExtent, y: cpd.verticalFullExtent },
      { x: cpd.leftFullExtent, y: cpd.verticalFullExtent },
      { x: cpd.leftFullExtent, y: cpd.targetY },
      { x: cpd.targetX, y: cpd.targetY }
    ]
  }

  const segments: Array<
    [BezierPoint, BezierPoint, BezierPoint, BezierPoint]
  > = []
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i]
    const b = waypoints[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    segments.push([
      a,
      { x: a.x + dx / 3, y: a.y + dy / 3 },
      { x: a.x + (2 * dx) / 3, y: a.y + (2 * dy) / 3 },
      b
    ])
  }

  return { circular: true, segments, halfWidth: hw }
}

/**
 * Resolve source/target RealtimeNodes and attach the edge's bezier cache.
 * Returns false if endpoints cannot be resolved.
 */
export function updateEdgeBezier(
  edge: RealtimeEdge,
  nodes: Map<string, RealtimeNode>,
  curvature: number = NETWORK_EDGE_CURVATURE
): boolean {
  const sourceNode =
    typeof edge.source === "string" ? nodes.get(edge.source) : edge.source
  const targetNode =
    typeof edge.target === "string" ? nodes.get(edge.target) : edge.target

  if (!sourceNode || !targetNode) return false

  if (edge.circular && edge.circularPathData) {
    edge.bezier = buildCircularBezier(edge, curvature)
  } else {
    edge.bezier = buildStandardBezier(edge, sourceNode, targetNode, curvature)
  }
  return true
}
