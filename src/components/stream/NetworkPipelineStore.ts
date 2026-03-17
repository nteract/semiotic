import { interpolateNumber } from "d3-interpolate"
import { ParticlePool } from "./ParticlePool"
import { getLayoutPlugin } from "./layouts"
import { computeEasing, computeRawProgress, lerp } from "./pipelineTransitionUtils"
import type { ActiveTransition } from "./pipelineTransitionUtils"
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

  transition: ActiveTransition | null = null

  // ── Realtime encoding timestamps ──────────────────────────────────────

  lastIngestTime = 0
  private nodeTimestamps: Map<string, number> = new Map()
  private edgeTimestamps: Map<string, number> = new Map()

  // ── Decay sort cache ──────────────────────────────────────────────────
  /** Cached sorted node-timestamp entries for applyDecay(); null = needs rebuild */
  private _decaySortedNodes: Array<[string, number]> | null = null

  // ── Topology diffing ───────────────────────────────────────────────────

  /** Node IDs added in the most recent layout */
  addedNodes: Set<string> = new Set()
  /** Node IDs removed in the most recent layout */
  removedNodes: Set<string> = new Set()
  /** Edge keys added in the most recent layout */
  addedEdges: Set<string> = new Set()
  /** Edge keys removed in the most recent layout */
  removedEdges: Set<string> = new Set()
  /** Timestamp of last topology change */
  lastTopologyChangeTime = 0
  private previousNodeIds: Set<string> = new Set()
  private previousEdgeKeys: Set<string> = new Set()

  /** Snapshot of node positions from the last layout — used for force warm-start */
  _lastPositionSnapshot: Map<string, { x: number; y: number }> | null = null

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

    // Create particle pool on demand; keep it alive when toggled off
    // so that toggling showParticles false→true doesn't lose canvas state
    if (config.chartType === "sankey" && config.showParticles && !this.particlePool) {
      this.particlePool = new ParticlePool(2000)
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
    this._decaySortedNodes = null

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
    this._decaySortedNodes = null

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
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    this.lastIngestTime = now

    if (!this.nodes.has(source)) {
      this.nodes.set(source, createNode(source))
      this.nodeTimestamps.set(source, now)
      this._decaySortedNodes = null
      this.tension += this.tensionConfig.newNode
      topologyChanged = true
    }

    if (!this.nodes.has(target)) {
      this.nodes.set(target, createNode(target))
      this.nodeTimestamps.set(target, now)
      this._decaySortedNodes = null
      this.tension += this.tensionConfig.newNode
      topologyChanged = true
    }

    const key = this.edgeKey(source, target)
    const existing = this.edges.get(key)

    if (existing) {
      existing.value += value
      this.edgeTimestamps.set(key, now)
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
      this.edgeTimestamps.set(key, now)
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

    // For force layout warm-start: collect previous node positions into a Map
    // and stash on config so the plugin can restore positions for nodes that
    // were recreated (e.g. bounded re-ingestion clears and recreates nodes).
    // Streaming ingestion preserves existing nodes so their x/y are already set.
    if (plugin.supportsStreaming && !plugin.hierarchical) {
      const prevPositions = new Map<string, { x: number; y: number }>()
      for (const node of nodesArr) {
        if (node._prevX0 !== undefined) {
          // Use the center of the previous bounding box
          const prevW = (node._prevX1 ?? 0) - (node._prevX0 ?? 0)
          const prevH = (node._prevY1 ?? 0) - (node._prevY0 ?? 0)
          prevPositions.set(node.id, {
            x: (node._prevX0 ?? 0) + prevW / 2,
            y: (node._prevY0 ?? 0) + prevH / 2
          })
        } else if (node.x !== 0 || node.y !== 0) {
          prevPositions.set(node.id, { x: node.x, y: node.y })
        }
      }
      // Also include positions from the previous layout's node set (covers
      // nodes that existed before but may have been removed in this update)
      if (this._lastPositionSnapshot) {
        for (const [id, pos] of this._lastPositionSnapshot) {
          if (!prevPositions.has(id)) {
            prevPositions.set(id, pos)
          }
        }
      }
      ;(this.config as any).__previousPositions = prevPositions.size > 0 ? prevPositions : undefined
    }

    // Execute layout — hierarchical plugins push into the arrays directly
    plugin.computeLayout(nodesArr, edgesArr, this.config, size)

    // Clean up the stashed positions from config
    delete (this.config as any).__previousPositions

    // After hierarchical layout, sync the populated arrays back into the
    // store's Maps so buildScene and getLayoutData work correctly.
    if (plugin.hierarchical && nodesArr.length > 0) {
      this.nodes.clear()
      this.edges.clear()
      this._decaySortedNodes = null
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

    // Snapshot node positions for future warm-start relayouts
    const posSnapshot = new Map<string, { x: number; y: number }>()
    for (const node of this.nodes.values()) {
      if (node.x !== 0 || node.y !== 0) {
        posSnapshot.set(node.id, { x: node.x, y: node.y })
      }
    }
    this._lastPositionSnapshot = posSnapshot

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

    // Compute topology diff
    const currentNodeIds = new Set(this.nodes.keys())
    const currentEdgeKeys = new Set(this.edges.keys())

    this.addedNodes = new Set<string>()
    this.removedNodes = new Set<string>()
    this.addedEdges = new Set<string>()
    this.removedEdges = new Set<string>()

    for (const id of currentNodeIds) {
      if (!this.previousNodeIds.has(id)) this.addedNodes.add(id)
    }
    for (const id of this.previousNodeIds) {
      if (!currentNodeIds.has(id)) this.removedNodes.add(id)
    }
    for (const key of currentEdgeKeys) {
      if (!this.previousEdgeKeys.has(key)) this.addedEdges.add(key)
    }
    for (const key of this.previousEdgeKeys) {
      if (!currentEdgeKeys.has(key)) this.removedEdges.add(key)
    }

    if (this.addedNodes.size > 0 || this.removedNodes.size > 0 ||
        this.addedEdges.size > 0 || this.removedEdges.size > 0) {
      this.lastTopologyChangeTime = typeof performance !== "undefined" ? performance.now() : Date.now()
    }

    this.previousNodeIds = currentNodeIds
    this.previousEdgeKeys = currentEdgeKeys

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

  // ── Animation tick (orbit etc.) ──────────────────────────────────────

  /** Whether the current layout plugin drives continuous animation */
  get isAnimating(): boolean {
    const plugin = getLayoutPlugin(this.config.chartType)
    return !!plugin?.supportsAnimation
  }

  /**
   * Advance the layout animation by one frame (e.g. orbit rotation).
   * Returns true if the scene should be rebuilt.
   */
  tickAnimation(size: [number, number], deltaTime: number): boolean {
    const plugin = getLayoutPlugin(this.config.chartType)
    if (!plugin?.tick) return false

    const nodesArr = Array.from(this.nodes.values())
    const edgesArr = Array.from(this.edges.values())
    return plugin.tick(nodesArr, edgesArr, this.config, size, deltaTime)
  }

  // ── Transition animation ──────────────────────────────────────────────

  /**
   * Advance the transition animation. Returns true if still animating.
   */
  advanceTransition(now: number): boolean {
    if (!this.transition) return false

    const rawT = computeRawProgress(now, this.transition)
    const t = computeEasing(rawT)

    for (const node of this.nodes.values()) {
      if (
        node._targetX0 !== undefined &&
        node._prevX0 !== undefined &&
        (node._prevX0 !== 0 || node._prevX1 !== 0)
      ) {
        node.x0 = lerp(node._prevX0, node._targetX0, t)
        node.x1 = lerp(node._prevX1!, node._targetX1!, t)
        node.y0 = lerp(node._prevY0!, node._targetY0!, t)
        node.y1 = lerp(node._prevY1!, node._targetY1!, t)
      }
    }

    for (const edge of this.edges.values()) {
      if (
        edge._targetY0 !== undefined &&
        edge._prevY0 !== undefined &&
        edge._prevSankeyWidth !== undefined &&
        edge._prevSankeyWidth > 0
      ) {
        edge.y0 = lerp(edge._prevY0, edge._targetY0, t)
        edge.y1 = lerp(edge._prevY1!, edge._targetY1!, t)
        edge.sankeyWidth = lerp(edge._prevSankeyWidth, edge._targetSankeyWidth!, t)
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
    const hw = ((edge as any)._circularWidth || edge.sankeyWidth || 1) / 2
    const cpd = edge.circularPathData

    // Stub edges: particles travel outbound stub, then teleport to inbound stub
    if ((edge as any)._circularStub) {
      const stubLen = Math.max(15, Math.min(40, (cpd.rightFullExtent - cpd.sourceX) * 0.33))
      const stubLenT = Math.max(15, Math.min(40, (cpd.targetX - cpd.leftFullExtent) * 0.33))

      // Two segments: outbound stub (t=0..0.5), then teleport to inbound stub (t=0.5..1)
      const segments: Array<[BezierPoint, BezierPoint, BezierPoint, BezierPoint]> = [
        // Outbound: source → source+stubLen (first half of t)
        [
          { x: cpd.sourceX, y: cpd.sourceY },
          { x: cpd.sourceX + stubLen * 0.33, y: cpd.sourceY },
          { x: cpd.sourceX + stubLen * 0.66, y: cpd.sourceY },
          { x: cpd.sourceX + stubLen, y: cpd.sourceY }
        ],
        // Inbound: target-stubLenT → target (second half of t)
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

  // ── Realtime encoding ─────────────────────────────────────────────────

  /**
   * Apply pulse glow to scene nodes/edges based on their creation timestamps.
   */
  applyPulse(now: number): void {
    const pulse = this.config.pulse
    if (!pulse) return

    const duration = pulse.duration ?? 500
    const pulseColor = pulse.color ?? "rgba(255,255,255,0.6)"
    const glowRadius = pulse.glowRadius ?? 4

    for (const node of this.sceneNodes) {
      const nodeId = node.id
      if (!nodeId) continue
      const ts = this.nodeTimestamps.get(nodeId)
      if (!ts) continue
      const age = now - ts
      if (age >= duration) continue
      const intensity = 1 - age / duration
      ;(node as any)._pulseIntensity = intensity
      ;(node as any)._pulseColor = pulseColor
      ;(node as any)._pulseGlowRadius = glowRadius
    }

    for (const edge of this.sceneEdges) {
      const edgeDatum = edge.datum
      if (!edgeDatum) continue
      const sourceId = typeof edgeDatum.source === "object" ? edgeDatum.source?.id : edgeDatum.source
      const targetId = typeof edgeDatum.target === "object" ? edgeDatum.target?.id : edgeDatum.target
      if (!sourceId || !targetId) continue
      const key = `${sourceId}\0${targetId}`
      const ts = this.edgeTimestamps.get(key)
      if (!ts) continue
      const age = now - ts
      if (age >= duration) continue
      const intensity = 1 - age / duration
      ;(edge as any)._pulseIntensity = intensity
      ;(edge as any)._pulseColor = pulseColor
    }
  }

  /**
   * Apply decay opacity to scene nodes based on topology age order.
   * Older nodes (created earlier) are more faded.
   */
  applyDecay(): void {
    const decay = this.config.decay
    if (!decay) return

    const minOpacity = decay.minOpacity ?? 0.1
    const nodeCount = this.nodeTimestamps.size
    if (nodeCount <= 1) return

    // Sort nodes by creation time (oldest first) — cached when topology is stable
    if (!this._decaySortedNodes) {
      this._decaySortedNodes = Array.from(this.nodeTimestamps.entries()).sort((a, b) => a[1] - b[1])
    }
    const sorted = this._decaySortedNodes
    const nodeAgeMap = new Map<string, number>()
    for (let i = 0; i < sorted.length; i++) {
      nodeAgeMap.set(sorted[i][0], i)
    }

    for (const node of this.sceneNodes) {
      const nodeId = node.id
      if (!nodeId) continue
      const ageIndex = nodeAgeMap.get(nodeId)
      if (ageIndex === undefined) continue

      const age = nodeCount - 1 - ageIndex // 0=newest

      let opacity: number
      switch (decay.type) {
        case "linear": {
          const t = 1 - age / (nodeCount - 1)
          opacity = minOpacity + t * (1 - minOpacity)
          break
        }
        case "exponential": {
          const halfLife = decay.halfLife ?? nodeCount / 2
          const t = Math.pow(0.5, age / halfLife)
          opacity = minOpacity + t * (1 - minOpacity)
          break
        }
        case "step": {
          const threshold = decay.stepThreshold ?? nodeCount * 0.5
          opacity = age < threshold ? 1 : minOpacity
          break
        }
        default:
          opacity = 1
      }

      const baseOpacity = node.style?.opacity ?? 1
      node.style = { ...node.style, opacity: baseOpacity * opacity }
    }
  }

  /**
   * Apply topology diff highlight — newly added nodes glow briefly.
   * Duration: 2 seconds from lastTopologyChangeTime.
   */
  applyTopologyDiff(now: number): void {
    if (this.addedNodes.size === 0) return

    const age = now - this.lastTopologyChangeTime
    const duration = 2000
    if (age >= duration) return

    const intensity = 1 - age / duration

    for (const sceneNode of this.sceneNodes) {
      const nodeId = sceneNode.id
      if (!nodeId || !this.addedNodes.has(nodeId)) continue
      ;(sceneNode as any)._pulseIntensity = Math.max(
        (sceneNode as any)._pulseIntensity ?? 0,
        intensity
      )
      ;(sceneNode as any)._pulseColor = "rgba(34, 197, 94, 0.7)"
      ;(sceneNode as any)._pulseGlowRadius = 8
    }
  }

  /** Whether there is an active topology diff animation */
  get hasActiveTopologyDiff(): boolean {
    if (this.addedNodes.size === 0) return false
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    return (now - this.lastTopologyChangeTime) < 2000
  }

  /**
   * Apply threshold alerting to scene nodes.
   * Overrides fill color and adds pulse for nodes exceeding thresholds.
   */
  applyThresholds(now: number): void {
    const thresholds = this.config.thresholds
    if (!thresholds) return

    const warningColor = thresholds.warningColor ?? "#f59e0b"
    const criticalColor = thresholds.criticalColor ?? "#ef4444"
    const shouldPulse = thresholds.pulse !== false

    for (const sceneNode of this.sceneNodes) {
      const nodeId = sceneNode.id
      if (!nodeId) continue
      const realtimeNode = this.nodes.get(nodeId)
      if (!realtimeNode) continue

      const value = thresholds.metric(realtimeNode)
      let alertColor: string | null = null

      if (thresholds.critical !== undefined && value >= thresholds.critical) {
        alertColor = criticalColor
      } else if (thresholds.warning !== undefined && value >= thresholds.warning) {
        alertColor = warningColor
      }

      if (alertColor) {
        sceneNode.style = { ...sceneNode.style, fill: alertColor }
        if (shouldPulse) {
          ;(sceneNode as any)._pulseIntensity = 0.6 + 0.4 * Math.sin(now / 300)
          ;(sceneNode as any)._pulseColor = alertColor
          ;(sceneNode as any)._pulseGlowRadius = 6
        }
      }
    }
  }

  /**
   * Whether there are active threshold alerts on any node.
   */
  get hasActiveThresholds(): boolean {
    const thresholds = this.config.thresholds
    if (!thresholds) return false

    for (const node of this.nodes.values()) {
      const value = thresholds.metric(node)
      if (
        (thresholds.warning !== undefined && value >= thresholds.warning) ||
        (thresholds.critical !== undefined && value >= thresholds.critical)
      ) {
        return true
      }
    }
    return false
  }

  /**
   * Whether there are active pulse animations (recent ingests within pulse duration).
   */
  get hasActivePulses(): boolean {
    const pulse = this.config.pulse
    if (!pulse || this.lastIngestTime === 0) return false
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    const duration = pulse.duration ?? 500
    return (now - this.lastIngestTime) < duration
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
    this._decaySortedNodes = null
    this.tension = 0
    this.layoutVersion = 0
    this.sceneNodes = []
    this.sceneEdges = []
    this.labels = []
    this.transition = null
    this.lastIngestTime = 0
    this._lastPositionSnapshot = null
    this.nodeTimestamps.clear()
    this.edgeTimestamps.clear()
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
