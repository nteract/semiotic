import { interpolateNumber } from "d3-interpolate"
import type {
  RealtimeNode,
  RealtimeEdge,
  EdgePush,
  TensionConfig,
  BezierCache,
  BezierPoint,
  DEFAULT_TENSION_CONFIG
} from "./types"

const CURVATURE = 0.5

/**
 * Mutable graph topology tracker for the realtime network frame.
 *
 * Maintains node/edge maps, accumulates tension from pushes, and caches
 * bezier control points for particle evaluation.
 */
export class TopologyStore {
  nodes: Map<string, RealtimeNode> = new Map()
  edges: Map<string, RealtimeEdge> = new Map()
  tension = 0
  layoutVersion = 0
  private config: TensionConfig

  constructor(config: TensionConfig) {
    this.config = config
  }

  /** Unique key for an edge */
  private edgeKey(source: string, target: string): string {
    return `${source}\0${target}`
  }

  /**
   * Ingest a pushed edge. Creates nodes/edges as needed and accumulates tension.
   * Returns true if a relayout is needed.
   *
   * Topology changes (new nodes or edges) always trigger an immediate relayout.
   * Weight-only changes (incrementing existing edges) use the tension threshold
   * to batch relayouts during high-frequency streaming.
   */
  ingestEdge(push: EdgePush): boolean {
    const { source, target, value } = push
    const isFirst = this.nodes.size === 0
    let topologyChanged = false

    // Create source node if new
    if (!this.nodes.has(source)) {
      this.nodes.set(source, createNode(source))
      this.tension += this.config.newNode
      topologyChanged = true
    }

    // Create target node if new
    if (!this.nodes.has(target)) {
      this.nodes.set(target, createNode(target))
      this.tension += this.config.newNode
      topologyChanged = true
    }

    // Create or update edge
    const key = this.edgeKey(source, target)
    const existing = this.edges.get(key)

    if (existing) {
      existing.value += value
      this.tension += this.config.weightChange
    } else {
      const edge: RealtimeEdge = {
        source,
        target,
        value,
        y0: 0,
        y1: 0,
        sankeyWidth: 0
      }
      this.edges.set(key, edge)
      this.tension += this.config.newEdge
      topologyChanged = true
    }

    return isFirst || topologyChanged || this.tension >= this.config.threshold
  }

  /**
   * Save current positions on all nodes/edges before a relayout.
   * These are used to interpolate the transition animation.
   */
  prepareForRelayout(): void {
    for (const node of this.nodes.values()) {
      node._prevX0 = node.x0
      node._prevX1 = node.x1
      node._prevY0 = node.y0
      node._prevY1 = node.y1
    }

    for (const edge of this.edges.values()) {
      edge._prevY0 = edge.y0
      edge._prevY1 = edge.y1
      edge._prevSankeyWidth = edge.sankeyWidth
    }
  }

  /**
   * After relayout completes, update derived node properties and
   * cache bezier control points for all edges.
   */
  finalizeLayout(direction: string): void {
    for (const node of this.nodes.values()) {
      node.width = node.x1 - node.x0
      node.height = node.y1 - node.y0
      node.x = node.x0 + node.width / 2
      node.y = node.y0 + node.height / 2
    }

    for (const edge of this.edges.values()) {
      edge.direction = direction
      this.updateEdgeBezier(edge)
    }

    this.tension = 0
    this.layoutVersion++
  }

  /**
   * Compute and cache bezier control points for a single edge.
   * Used by the particle system for position evaluation.
   */
  private updateEdgeBezier(edge: RealtimeEdge): void {
    const sourceNode = typeof edge.source === "string"
      ? this.nodes.get(edge.source)!
      : edge.source
    const targetNode = typeof edge.target === "string"
      ? this.nodes.get(edge.target)!
      : edge.target

    if (!sourceNode || !targetNode) return

    if (edge.circular && edge.circularPathData) {
      // Multi-segment bezier for circular links
      edge.bezier = this.buildCircularBezier(edge, sourceNode, targetNode)
    } else {
      edge.bezier = this.buildStandardBezier(edge, sourceNode, targetNode)
    }
  }

  private buildStandardBezier(
    edge: RealtimeEdge,
    sourceNode: RealtimeNode,
    targetNode: RealtimeNode
  ): BezierCache {
    const hw = (edge.sankeyWidth || 1) / 2

    if (edge.direction === "down") {
      // Vertical: main axis is Y
      const y0 = sourceNode.y1
      const y1 = targetNode.y0
      const xi = interpolateNumber(y0, y1)
      const p0: BezierPoint = { x: edge.y0, y: y0 }
      const p1: BezierPoint = { x: edge.y0, y: xi(CURVATURE) }
      const p2: BezierPoint = { x: edge.y1, y: xi(1 - CURVATURE) }
      const p3: BezierPoint = { x: edge.y1, y: y1 }
      return { circular: false, points: [p0, p1, p2, p3], halfWidth: hw }
    }

    // Horizontal (default)
    const x0 = sourceNode.x1
    const x1 = targetNode.x0
    const xi = interpolateNumber(x0, x1)
    const p0: BezierPoint = { x: x0, y: edge.y0 }
    const p1: BezierPoint = { x: xi(CURVATURE), y: edge.y0 }
    const p2: BezierPoint = { x: xi(1 - CURVATURE), y: edge.y1 }
    const p3: BezierPoint = { x: x1, y: edge.y1 }
    return { circular: false, points: [p0, p1, p2, p3], halfWidth: hw }
  }

  private buildCircularBezier(
    edge: RealtimeEdge,
    _sourceNode: RealtimeNode,
    _targetNode: RealtimeNode
  ): BezierCache {
    const hw = (edge.sankeyWidth || 1) / 2
    const cpd = edge.circularPathData

    // Build multi-segment path from circularPathData
    // The circular path goes: source → left extent → bottom → right extent → target
    // We break this into segments that can each be a cubic bezier
    let waypoints: BezierPoint[]

    if (edge.direction === "down") {
      waypoints = [
        { x: cpd.sourceY, y: cpd.sourceX },
        { x: cpd.sourceY, y: cpd.leftFullExtent },
        { x: cpd.verticalFullExtent, y: cpd.leftFullExtent },
        { x: cpd.verticalFullExtent, y: cpd.rightFullExtent },
        { x: cpd.targetY, y: cpd.rightFullExtent },
        { x: cpd.targetY, y: cpd.targetX }
      ]
    } else {
      waypoints = [
        { x: cpd.sourceX, y: cpd.sourceY },
        { x: cpd.leftFullExtent, y: cpd.sourceY },
        { x: cpd.leftFullExtent, y: cpd.verticalFullExtent },
        { x: cpd.rightFullExtent, y: cpd.verticalFullExtent },
        { x: cpd.rightFullExtent, y: cpd.targetY },
        { x: cpd.targetX, y: cpd.targetY }
      ]
    }

    // Convert waypoints into cubic bezier segments
    // Each pair of consecutive waypoints becomes a segment with
    // control points at 1/3 and 2/3 of the way
    const segments: Array<[BezierPoint, BezierPoint, BezierPoint, BezierPoint]> = []
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
   * Rebuild bezier cache for all edges and update derived node properties.
   * Called during transition animation frames.
   */
  rebuildAllBeziers(direction: string): void {
    for (const node of this.nodes.values()) {
      node.width = node.x1 - node.x0
      node.height = node.y1 - node.y0
      node.x = node.x0 + node.width / 2
      node.y = node.y0 + node.height / 2
    }
    for (const edge of this.edges.values()) {
      edge.direction = direction
      this.updateEdgeBezier(edge)
    }
  }

  /** Get arrays suitable for d3-sankey-circular */
  getLayoutData(): { nodes: RealtimeNode[]; edges: RealtimeEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values())
    }
  }

  /** Reset everything */
  clear(): void {
    this.nodes.clear()
    this.edges.clear()
    this.tension = 0
    this.layoutVersion = 0
  }
}

function createNode(id: string): RealtimeNode {
  return {
    id,
    x0: 0,
    x1: 0,
    y0: 0,
    y1: 0,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    value: 0,
    createdByFrame: true
  }
}
