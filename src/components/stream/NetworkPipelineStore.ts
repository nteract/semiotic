import { interpolateNumber } from "d3-interpolate"
import { ParticlePool } from "./ParticlePool"
import { getLayoutPlugin } from "./layouts"
import type {
  NetworkChartType,
  NetworkPipelineConfig,
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel,
  RealtimeNode,
  RealtimeEdge,
  EdgePush,
  TensionConfig,
  BezierCache,
  BezierPoint
} from "./networkTypes"
import {
  DEFAULT_TENSION_CONFIG,
  DEFAULT_PARTICLE_STYLE
} from "./networkTypes"

const CURVATURE = 0.5

/**
 * NetworkPipelineStore — stateful store for the StreamNetworkFrame.
 *
 * Absorbs TopologyStore's functionality (mutable Maps, tension tracking,
 * bezier caching) and adds layout plugin dispatch and scene graph generation.
 *
 * For bounded data: ingests nodes/edges arrays, runs layout once, builds scene.
 * For streaming data: ingests edge pushes, tracks tension, relayouts on threshold.
 */
export class NetworkPipelineStore {
  // ── Topology ──────────────────────────────────────────────────────────

  nodes: Map<string, RealtimeNode> = new Map()
  edges: Map<string, RealtimeEdge> = new Map()
  tension = 0
  layoutVersion = 0

  // ── Scene graph ───────────────────────────────────────────────────────

  sceneNodes: NetworkSceneNode[] = []
  sceneEdges: NetworkSceneEdge[] = []
  labels: NetworkLabel[] = []

  // ── Particles ─────────────────────────────────────────────────────────

  particlePool: ParticlePool | null = null

  // ── Config ────────────────────────────────────────────────────────────

  private config: NetworkPipelineConfig
  private tensionConfig: TensionConfig

  // ── Transition animation ──────────────────────────────────────────────

  transition: {
    startTime: number
    duration: number
  } | null = null

  constructor(config: NetworkPipelineConfig) {
    this.config = config
    this.tensionConfig = {
      ...DEFAULT_TENSION_CONFIG,
      ...config.tensionConfig
    }

    // Lazy particle pool — only for sankey with particles
    if (config.chartType === "sankey" && config.showParticles) {
      this.particlePool = new ParticlePool(2000)
    }
  }

  // ── Config update ─────────────────────────────────────────────────────

  updateConfig(config: NetworkPipelineConfig): void {
    this.config = config
    this.tensionConfig = {
      ...DEFAULT_TENSION_CONFIG,
      ...config.tensionConfig
    }

    // Create/destroy particle pool based on config
    if (config.chartType === "sankey" && config.showParticles) {
      if (!this.particlePool) {
        this.particlePool = new ParticlePool(2000)
      }
    } else {
      this.particlePool = null
    }
  }

  // ── Hierarchy data ingestion ──────────────────────────────────────────

  /**
   * Ingest hierarchy root data for tree/treemap/circlepack/partition layouts.
   * The hierarchy root is passed to the layout plugin via config.__hierarchyRoot.
   */
  ingestHierarchy(
    rootData: any,
    size: [number, number]
  ): void {
    this.nodes.clear()
    this.edges.clear()

    // Stash hierarchy root on config for the plugin to read
    ;(this.config as any).__hierarchyRoot = rootData

    // Run layout — the hierarchical plugin will populate nodes/edges
    this.runLayout(size)
  }

  // ── Bounded data ingestion ────────────────────────────────────────────

  /**
   * Ingest bounded node/edge arrays (from props).
   * Clears existing topology and rebuilds from scratch.
   */
  ingestBounded(
    rawNodes: any[],
    rawEdges: any[],
    size: [number, number]
  ): void {
    const {
      nodeIDAccessor = "id",
      sourceAccessor = "source",
      targetAccessor = "target",
      valueAccessor = "value"
    } = this.config

    const getNodeId = typeof nodeIDAccessor === "function"
      ? nodeIDAccessor
      : (d: any) => d[nodeIDAccessor]

    const getSource = typeof sourceAccessor === "function"
      ? sourceAccessor
      : (d: any) => d[sourceAccessor]

    const getTarget = typeof targetAccessor === "function"
      ? targetAccessor
      : (d: any) => d[targetAccessor]

    const getValue = typeof valueAccessor === "function"
      ? valueAccessor
      : (d: any) => d[valueAccessor] ?? 1

    this.nodes.clear()
    this.edges.clear()

    // Build node map
    for (const raw of rawNodes) {
      const id = String(getNodeId(raw))
      this.nodes.set(id, {
        ...createNode(id),
        data: raw
      })
    }

    // Build edge map (creating nodes if not provided)
    for (const raw of rawEdges) {
      const sourceId = String(getSource(raw))
      const targetId = String(getTarget(raw))
      const value = Number(getValue(raw)) || 1

      if (!this.nodes.has(sourceId)) {
        this.nodes.set(sourceId, { ...createNode(sourceId), data: raw })
      }
      if (!this.nodes.has(targetId)) {
        this.nodes.set(targetId, { ...createNode(targetId), data: raw })
      }

      const key = `${sourceId}\0${targetId}`
      this.edges.set(key, {
        source: sourceId,
        target: targetId,
        value,
        y0: 0,
        y1: 0,
        sankeyWidth: 0,
        data: raw
      })
    }

    // Run layout
    this.runLayout(size)
  }

  // ── Streaming data ingestion ──────────────────────────────────────────

  /**
   * Unique key for an edge (same as TopologyStore).
   */
  private edgeKey(source: string, target: string): string {
    return `${source}\0${target}`
  }

  /**
   * Ingest a pushed edge. Creates nodes/edges as needed and accumulates tension.
   * Returns true if a relayout is needed.
   */
  ingestEdge(push: EdgePush): boolean {
    const { source, target, value } = push
    const isFirst = this.nodes.size === 0
    let topologyChanged = false

    if (!this.nodes.has(source)) {
      this.nodes.set(source, createNode(source))
      this.tension += this.tensionConfig.newNode
      topologyChanged = true
    }

    if (!this.nodes.has(target)) {
      this.nodes.set(target, createNode(target))
      this.tension += this.tensionConfig.newNode
      topologyChanged = true
    }

    const key = this.edgeKey(source, target)
    const existing = this.edges.get(key)

    if (existing) {
      existing.value += value
      this.tension += this.tensionConfig.weightChange
    } else {
      this.edges.set(key, {
        source,
        target,
        value,
        y0: 0,
        y1: 0,
        sankeyWidth: 0
      })
      this.tension += this.tensionConfig.newEdge
      topologyChanged = true
    }

    return isFirst || topologyChanged || this.tension >= this.tensionConfig.threshold
  }

  // ── Layout execution ──────────────────────────────────────────────────

  /**
   * Run the layout algorithm via the appropriate plugin.
   */
  runLayout(size: [number, number]): void {
    const plugin = getLayoutPlugin(this.config.chartType)
    if (!plugin) return

    let nodesArr = Array.from(this.nodes.values())
    let edgesArr = Array.from(this.edges.values())

    // For hierarchical plugins the store's Maps are empty — the plugin
    // populates the nodes/edges arrays itself from config.__hierarchyRoot.
    // Skip the early exit so the plugin gets called.
    if (nodesArr.length === 0 && !plugin.hierarchical) return

    // Save previous positions for transition
    this.prepareForRelayout()

    // Execute layout — hierarchical plugins push into the arrays directly
    plugin.computeLayout(nodesArr, edgesArr, this.config, size)

    // After hierarchical layout, sync the populated arrays back into the
    // store's Maps so buildScene and getLayoutData work correctly.
    if (plugin.hierarchical && nodesArr.length > 0) {
      this.nodes.clear()
      this.edges.clear()
      for (const node of nodesArr) {
        this.nodes.set(node.id, node)
      }
      for (const edge of edgesArr) {
        const srcId = typeof edge.source === "string" ? edge.source : edge.source.id
        const tgtId = typeof edge.target === "string" ? edge.target : edge.target.id
        this.edges.set(`${srcId}\0${tgtId}`, edge)
      }
    }

    // Finalize — update derived properties and bezier caches
    this.finalizeLayout()

    // Save target positions for animation
    this.saveTargetPositions()

    // Check if we have meaningful previous positions to animate from
    const hasOldPositions = nodesArr.some(
      (n) => n._prevX0 !== undefined &&
        (n._prevX0 !== 0 || n._prevX1 !== 0 || n._prevY0 !== 0 || n._prevY1 !== 0)
    )

    if (hasOldPositions && this.tensionConfig.transitionDuration > 0) {
      // Reset to previous positions (animation starts from here)
      this.restorePreviousPositions()

      // Start transition
      this.transition = {
        startTime: performance.now(),
        duration: this.tensionConfig.transitionDuration
      }
    }

    this.layoutVersion++
  }

  /**
   * Build the scene graph from current layout positions.
   */
  buildScene(size: [number, number]): void {
    const plugin = getLayoutPlugin(this.config.chartType)
    if (!plugin) return

    const nodesArr = Array.from(this.nodes.values())
    const edgesArr = Array.from(this.edges.values())

    const { sceneNodes, sceneEdges, labels } = plugin.buildScene(
      nodesArr,
      edgesArr,
      this.config,
      size
    )

    this.sceneNodes = sceneNodes
    this.sceneEdges = sceneEdges
    this.labels = labels
  }

  // ── Transition animation ──────────────────────────────────────────────

  /**
   * Advance the transition animation. Returns true if still animating.
   */
  advanceTransition(now: number): boolean {
    if (!this.transition) return false

    const elapsed = now - this.transition.startTime
    const rawT = Math.min(elapsed / this.transition.duration, 1)
    // Ease-out cubic
    const t = 1 - Math.pow(1 - rawT, 3)

    for (const node of this.nodes.values()) {
      if (
        node._targetX0 !== undefined &&
        node._prevX0 !== undefined &&
        (node._prevX0 !== 0 || node._prevX1 !== 0)
      ) {
        node.x0 = node._prevX0 + (node._targetX0 - node._prevX0) * t
        node.x1 = node._prevX1! + (node._targetX1! - node._prevX1!) * t
        node.y0 = node._prevY0! + (node._targetY0! - node._prevY0!) * t
        node.y1 = node._prevY1! + (node._targetY1! - node._prevY1!) * t
      }
    }

    for (const edge of this.edges.values()) {
      if (
        edge._targetY0 !== undefined &&
        edge._prevY0 !== undefined &&
        edge._prevSankeyWidth !== undefined &&
        edge._prevSankeyWidth > 0
      ) {
        edge.y0 = edge._prevY0 + (edge._targetY0 - edge._prevY0) * t
        edge.y1 = edge._prevY1! + (edge._targetY1! - edge._prevY1!) * t
        edge.sankeyWidth =
          edge._prevSankeyWidth + (edge._targetSankeyWidth! - edge._prevSankeyWidth) * t
      }
    }

    // Rebuild beziers for new interpolated positions
    this.rebuildAllBeziers()

    if (rawT >= 1) {
      // Snap to final target positions
      this.snapToTargets()
      this.transition = null
      return false
    }

    return true
  }

  // ── Topology helpers (ported from TopologyStore) ──────────────────────

  private prepareForRelayout(): void {
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

  private finalizeLayout(): void {
    const direction = this.config.orientation === "vertical" ? "down" : "right"

    for (const node of this.nodes.values()) {
      // Sankey/treemap/partition set x0/x1/y0/y1 — derive x/y from those.
      // Force/chord set x/y directly — derive x0/x1 from x/y.
      const hasBox = node.x0 !== 0 || node.x1 !== 0 || node.y0 !== 0 || node.y1 !== 0
      if (hasBox) {
        node.width = node.x1 - node.x0
        node.height = node.y1 - node.y0
        node.x = node.x0 + node.width / 2
        node.y = node.y0 + node.height / 2
      } else {
        // x/y already set by layout (force, chord) — synthesize a bounding box
        const r = 5
        node.x0 = node.x - r
        node.x1 = node.x + r
        node.y0 = node.y - r
        node.y1 = node.y + r
        node.width = r * 2
        node.height = r * 2
      }
    }

    for (const edge of this.edges.values()) {
      edge.direction = direction
      this.updateEdgeBezier(edge)
    }

    this.tension = 0
  }

  private saveTargetPositions(): void {
    for (const node of this.nodes.values()) {
      node._targetX0 = node.x0
      node._targetX1 = node.x1
      node._targetY0 = node.y0
      node._targetY1 = node.y1
    }
    for (const edge of this.edges.values()) {
      edge._targetY0 = edge.y0
      edge._targetY1 = edge.y1
      edge._targetSankeyWidth = edge.sankeyWidth
    }
  }

  private restorePreviousPositions(): void {
    for (const node of this.nodes.values()) {
      if (
        node._prevX0 !== undefined &&
        (node._prevX0 !== 0 || node._prevX1 !== 0)
      ) {
        node.x0 = node._prevX0
        node.x1 = node._prevX1!
        node.y0 = node._prevY0!
        node.y1 = node._prevY1!
      }
    }
    for (const edge of this.edges.values()) {
      if (
        edge._prevY0 !== undefined &&
        edge._prevSankeyWidth !== undefined &&
        edge._prevSankeyWidth > 0
      ) {
        edge.y0 = edge._prevY0
        edge.y1 = edge._prevY1!
        edge.sankeyWidth = edge._prevSankeyWidth
      }
    }
    this.rebuildAllBeziers()
  }

  private snapToTargets(): void {
    for (const node of this.nodes.values()) {
      if (node._targetX0 !== undefined) {
        node.x0 = node._targetX0
        node.x1 = node._targetX1!
        node.y0 = node._targetY0!
        node.y1 = node._targetY1!
      }
    }
    for (const edge of this.edges.values()) {
      if (edge._targetY0 !== undefined) {
        edge.y0 = edge._targetY0
        edge.y1 = edge._targetY1!
        edge.sankeyWidth = edge._targetSankeyWidth!
      }
    }
    this.rebuildAllBeziers()
  }

  // ── Bezier caching (ported from TopologyStore) ────────────────────────

  private updateEdgeBezier(edge: RealtimeEdge): void {
    const sourceNode =
      typeof edge.source === "string"
        ? this.nodes.get(edge.source)!
        : edge.source
    const targetNode =
      typeof edge.target === "string"
        ? this.nodes.get(edge.target)!
        : edge.target

    if (!sourceNode || !targetNode) return

    if (edge.circular && edge.circularPathData) {
      edge.bezier = this.buildCircularBezier(edge)
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

  private buildCircularBezier(edge: RealtimeEdge): BezierCache {
    const hw = (edge.sankeyWidth || 1) / 2
    const cpd = edge.circularPathData

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

  rebuildAllBeziers(): void {
    for (const node of this.nodes.values()) {
      node.width = node.x1 - node.x0
      node.height = node.y1 - node.y0
      node.x = node.x0 + node.width / 2
      node.y = node.y0 + node.height / 2
    }
    for (const edge of this.edges.values()) {
      this.updateEdgeBezier(edge)
    }
  }

  // ── Public accessors ──────────────────────────────────────────────────

  getLayoutData(): { nodes: RealtimeNode[]; edges: RealtimeEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values())
    }
  }

  clear(): void {
    this.nodes.clear()
    this.edges.clear()
    this.tension = 0
    this.layoutVersion = 0
    this.sceneNodes = []
    this.sceneEdges = []
    this.labels = []
    this.transition = null
    if (this.particlePool) {
      this.particlePool.clear()
    }
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
