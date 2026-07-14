import { ParticlePool } from "./ParticlePool"
import { getLayoutPlugin } from "./layouts"
import type {
  NetworkLayoutResult,
  NetworkHtmlMark
} from "./networkCustomLayout"
import type { CustomLayoutSelection } from "./customLayoutSelection"
import { warnCustomLayoutDiagnostics } from "./customLayoutDiagnostics"
import type { CustomLayoutFailureDiagnostic } from "./customLayoutFailure"
import {
  computeEasing,
  computeRawProgress,
  lerp,
  now as getTimestamp
} from "./pipelineTransitionUtils"
import type { ActiveTransition } from "./pipelineTransitionUtils"
import { quadtree as d3Quadtree, type Quadtree } from "d3-quadtree"
import type {
  NetworkPipelineConfig,
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkCircleNode,
  NetworkLabel,
  RealtimeNode,
  RealtimeEdge,
  EdgePush,
  TensionConfig,
  BezierCache
} from "./networkTypes"
import { createNode, isValidBezierCache } from "./networkPipelineHelpers"
import {
  NETWORK_EDGE_CURVATURE,
  updateEdgeBezier as updateEdgeBezierPure
} from "./networkBezier"
import {
  applyNetworkPulse,
  applyNetworkDecay,
  applyNetworkTopologyDiff,
  hasActiveNetworkTopologyDiff,
  applyNetworkThresholds,
  hasActiveNetworkThresholds,
  hasActiveNetworkPulses,
  type NetworkDecayCache
} from "./networkRealtimeEncoding"
import { DEFAULT_TENSION_CONFIG } from "./networkTypes"
import type { Datum } from "../charts/shared/datumTypes"
import { NetworkPipelineUpdateResults } from "./networkPipelineUpdateResults"
import { attachUpdateResultStore, type UpdateResult, type UpdateResultStore } from "./pipelineUpdateStore"
import { runNetworkCustomLayout } from "./networkCustomLayoutRunner"
import {
  restyleNetworkCustomScene,
  snapshotNetworkCustomStyles
} from "./networkCustomRestyle"

/**
 * NetworkPipelineStore — stateful store for the StreamNetworkFrame.
 *
 * Absorbs TopologyStore's functionality (mutable Maps, tension tracking,
 * bezier caching) and adds layout plugin dispatch and scene graph generation.
 *
 * For bounded data: ingests nodes/edges arrays, runs layout once, builds scene.
 * For streaming data: ingests edge pushes, tracks tension, relayouts on threshold.
 */
export class NetworkPipelineStore implements UpdateResultStore {
  declare getLastUpdateResult: () => UpdateResult
  declare getUpdateSnapshot: () => UpdateResult
  declare subscribeUpdateResult: (listener: () => void) => () => void
  declare setLayoutSelection: (selection: CustomLayoutSelection | null) => void
  declare markStylePaintPending: () => void
  declare consumeStylePaintPending: () => boolean

  // ── Topology ──────────────────────────────────────────────────────────

  nodes: Map<string, RealtimeNode> = new Map()
  edges: Map<string, RealtimeEdge> = new Map()
  tension = 0
  /**
   * Monotonic scene/layout-rebuild counter — Network's equivalent of the
   * `version` field on the XY/Ordinal/Geo stores. Shared cross-store
   * convention: bumps on every layout rebuild and on clear(); never resets to
   * a prior value, so a consumer comparing against a last-seen value can
   * always detect "something changed."
   */
  layoutVersion = 0

  // ── Scene graph ───────────────────────────────────────────────────────

  sceneNodes: NetworkSceneNode[] = []
  sceneEdges: NetworkSceneEdge[] = []
  labels: NetworkLabel[] = []
  /** Overlays returned from customNetworkLayout (consumed by StreamNetworkFrame). */
  customLayoutOverlays: import("react").ReactNode = null
  /** Most recent custom layout result for host readback (`getCustomLayout()`).
   *  Null before the first layout or without a custom layout. A failed rerun
   *  retains this last successful result when its rendered scene is reusable. */
  lastCustomLayoutResult: NetworkLayoutResult | null = null
  /** Latest custom-layout failure for frame-handle readback. */
  lastCustomLayoutFailure: CustomLayoutFailureDiagnostic | null = null
  /** HTML marks returned from customNetworkLayout — positioned DOM nodes the
   *  frame renders in a layer above the canvas/overlays (consumed by
   *  StreamNetworkFrame). Empty for built-in chart types. */
  customLayoutHtmlMarks: NetworkHtmlMark[] = []
  private _customLayoutDiagnosticsWarned = new Set<string>()
  /** Per-frame restyle callbacks from the custom layout result. When set, the
   *  frame routes selection changes through `restyleScene()` (style-only repaint)
   *  instead of a full `buildScene()`. */
  private _customRestyle: NetworkLayoutResult["restyle"] = undefined
  private _customRestyleEdge: NetworkLayoutResult["restyleEdge"] = undefined
  /** True when the active custom layout supplied a `restyle`/`restyleEdge`. */
  hasCustomRestyle = false
  /** Base (as-emitted) style per mark, so a restyle pass starts from the layout's
   *  own style rather than compounding patches across selection changes. */
  private _baseStyles = new WeakMap<object, import("./types").Style>()

  // ── Spatial index for node hit testing ─────────────────────────────────
  // Circle-node hit testing (force/orbit graphs) is O(n) per hover frame
  // without an index. Above QUADTREE_THRESHOLD circles we lazily build a
  // quadtree over their centers and query it in O(log n), mirroring the
  // XY/ordinal point quadtree. Lazy + revision-keyed so it's only built when a
  // hover actually occurs after the scene changed (not on every animation
  // frame). Hit testing reads `sceneNodes`, which only change in buildScene(),
  // so a quadtree built from them is exactly as fresh as a linear scan.
  private _nodeQuadtree: Quadtree<NetworkCircleNode> | null = null
  private _maxNodeRadius = 0
  /** Bumped whenever sceneNodes is rebuilt; keys the quadtree cache. */
  private _sceneNodesRevision = 0
  private _nodeQuadtreeRevision = -1
  private static readonly QUADTREE_THRESHOLD = 500

  // ── Materialized array cache ────────────────────────────────────────────
  // buildScene, tickAnimation, and particle rendering each need the node/edge
  // Maps as arrays every frame during animation. `Array.from` on every frame
  // allocates O(n+m) garbage for a graph that hasn't structurally changed
  // (a 5k-node/10k-edge orbit/sankey churns millions of slots/sec → GC stalls).
  // Cache keyed on layoutVersion — which bumps on every Map mutation
  // (ingest/remove/clear) but NOT on an animation tick — so animation frames
  // reuse the arrays. Handed only to non-hierarchical layout plugins, which
  // read them (mutating node-object positions in place); hierarchical plugins
  // use the arrays as scratch and get fresh copies.
  private _nodesArrCache: RealtimeNode[] | null = null
  private _edgesArrCache: RealtimeEdge[] | null = null
  private _arrCacheVersion = -1

  // ── Particles ─────────────────────────────────────────────────────────

  particlePool: ParticlePool | null = null

  // ── Config ────────────────────────────────────────────────────────────

  private config: NetworkPipelineConfig
  private tensionConfig: TensionConfig
  protected updateResults = new NetworkPipelineUpdateResults()

  /** Keep ingest, live encodings, staleness, and transitions on one clock. */
  private currentTime(): number {
    return this.config.clock?.() ?? getTimestamp()
  }

  // ── Transition animation ──────────────────────────────────────────────

  transition: ActiveTransition | null = null
  private _hasRenderedOnce = false
  /** Snapshot of node positions from before bounded re-ingestion cleared the maps */
  private _boundedPrevSnapshot: Map<
    string,
    { x0: number; x1: number; y0: number; y1: number }
  > | null = null
  /** Snapshot of edge positions from before bounded re-ingestion cleared the maps */
  private _boundedEdgeSnapshot: Map<
    string,
    { y0: number; y1: number; sankeyWidth: number }
  > | null = null

  // ── Realtime encoding timestamps ──────────────────────────────────────

  lastIngestTime = 0
  private nodeTimestamps: Map<string, number> = new Map()
  private edgeTimestamps: Map<string, number> = new Map()

  // ── Decay sort cache ──────────────────────────────────────────────────
  /** Cached sorted node-timestamp entries for applyDecay(); null = needs rebuild */
  private _decaySortedNodes: Array<[string, number]> | null = null
  /** id→age-index map derived from _decaySortedNodes; rebuilt with it, not per frame. */
  private _decayAgeMap: Map<string, number> | null = null

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
  private _networkDecayCache: NetworkDecayCache | null = null

  /** Snapshot of node positions from the last layout — used for force warm-start */
  _lastPositionSnapshot: Map<string, { x: number; y: number }> | null = null

  constructor(config: NetworkPipelineConfig) {
    this.config = config
    this.tensionConfig = {
      ...DEFAULT_TENSION_CONFIG,
      ...config.tensionConfig
    }

    // Lazy particle pool — sankey (which sets edge.bezier via the
    // sankey layout) plus any chart using `customNetworkLayout` that
    // wants particles. ProcessSankey is the original
    // customNetworkLayout consumer: it computes its own bezier
    // control points HOC-side and writes them onto each edge before
    // pushing to the frame, so the pool can drive particles through
    // the standard ribbon path math.
    if (
      config.showParticles &&
      (config.chartType === "sankey" || !!config.customNetworkLayout)
    ) {
      this.particlePool = new ParticlePool(2000)
    }
  }

  // ── Config update ─────────────────────────────────────────────────────

  updateConfig(config: Partial<NetworkPipelineConfig>): void {
    // Preserve plugin state stored on the config object across updates
    const prev = this.config
    // Network historically received a full frame config, while direct store
    // callers need the same merged-effective-config patch semantics as the
    // other pipeline stores. Copy before preserving internal plugin state so
    // a partial accessor patch compares against the active, not absent,
    // sibling accessors.
    const nextConfig = { ...prev, ...config } as NetworkPipelineConfig
    if (prev.__orbitState) nextConfig.__orbitState = prev.__orbitState
    if (prev.__hierarchyRoot) nextConfig.__hierarchyRoot = prev.__hierarchyRoot
    // `layoutSelection` is owned by a dedicated frame effect (so a selection
    // change can repaint via restyleScene instead of forcing a rebuild), and is
    // intentionally not part of the rebuild-triggering pipelineConfig — preserve
    // it across other config updates.
    if (config.layoutSelection === undefined && prev.layoutSelection != null) {
      nextConfig.layoutSelection = prev.layoutSelection
    }
    const changedConfigKeys = [...new Set([...Object.keys(prev), ...Object.keys(nextConfig)])].filter(
      (key) =>
        (prev as unknown as Record<string, unknown>)[key] !==
        (nextConfig as unknown as Record<string, unknown>)[key],
    )
    this.config = nextConfig
    this.tensionConfig = {
      ...DEFAULT_TENSION_CONFIG,
      ...nextConfig.tensionConfig
    }

    // Create particle pool on demand; keep it alive when toggled off
    // so that toggling showParticles false→true doesn't lose canvas state.
    // Gate matches the constructor — sankey OR customNetworkLayout.
    if (
      nextConfig.showParticles &&
      (nextConfig.chartType === "sankey" || !!nextConfig.customNetworkLayout) &&
      !this.particlePool
    ) {
      this.particlePool = new ParticlePool(2000)
    }
    this.updateResults.recordConfig(changedConfigKeys)
  }

  /** Additive explicit-result form of {@link updateConfig}. */
  updateConfigWithResult(config: Partial<NetworkPipelineConfig>): UpdateResult {
    this.updateConfig(config)
    return this.updateResults.last
  }

  // ── Hierarchy data ingestion ──────────────────────────────────────────

  /**
   * Ingest hierarchy root data for tree/treemap/circlepack/partition layouts.
   * The hierarchy root is passed to the layout plugin via config.__hierarchyRoot.
   */
  ingestHierarchy(rootData: any, size: [number, number]): void {
    // Snapshot positions before clearing so data-change transitions work.
    // Stored on _boundedPrevSnapshot; prepareForRelayout uses it as fallback.
    this._boundedPrevSnapshot = new Map()
    for (const [id, node] of this.nodes) {
      if (node.x0 !== 0 || node.x1 !== 0 || node.y0 !== 0 || node.y1 !== 0) {
        this._boundedPrevSnapshot.set(id, {
          x0: node.x0,
          x1: node.x1,
          y0: node.y0,
          y1: node.y1
        })
      }
    }

    this.nodes.clear()
    this.edges.clear()
    this._decaySortedNodes = null; this._networkDecayCache = null

    // Stash hierarchy root on config for the plugin to read
    this.config.__hierarchyRoot = rootData

    // Run layout — the hierarchical plugin will populate nodes/edges
    this.runLayout(size)

    this._boundedPrevSnapshot = null
    this.updateResults.recordData("replace", 1)
  }

  // ── Bounded data ingestion ────────────────────────────────────────────

  /**
   * Ingest bounded node/edge arrays (from props).
   * Clears existing topology and rebuilds from scratch.
   */
  ingestBounded(
    rawNodes: any[],
    rawEdges: any[],
    size: [number, number],
    options?: { deferLayout?: boolean }
  ): void {
    const {
      nodeIDAccessor = "id",
      sourceAccessor = "source",
      targetAccessor = "target",
      valueAccessor = "value"
    } = this.config

    const getNodeId =
      typeof nodeIDAccessor === "function"
        ? nodeIDAccessor
        : (d: Datum) => d[nodeIDAccessor]

    const getSource =
      typeof sourceAccessor === "function"
        ? sourceAccessor
        : (d: Datum) => d[sourceAccessor]

    const getTarget =
      typeof targetAccessor === "function"
        ? targetAccessor
        : (d: Datum) => d[targetAccessor]

    const getValue =
      typeof valueAccessor === "function"
        ? valueAccessor
        : (d: Datum) => d[valueAccessor] ?? 1

    // Snapshot positions before clearing so data-change transitions work.
    // Stored on _boundedPrevSnapshot; prepareForRelayout uses it as fallback.
    this._boundedPrevSnapshot = new Map()
    for (const [id, node] of this.nodes) {
      if (node.x0 !== 0 || node.x1 !== 0 || node.y0 !== 0 || node.y1 !== 0) {
        this._boundedPrevSnapshot.set(id, {
          x0: node.x0,
          x1: node.x1,
          y0: node.y0,
          y1: node.y1
        })
      }
    }
    this._boundedEdgeSnapshot = new Map()
    for (const [, edge] of this.edges) {
      const src = typeof edge.source === "string" ? edge.source : edge.source.id
      const tgt = typeof edge.target === "string" ? edge.target : edge.target.id
      if (edge.sankeyWidth > 0) {
        this._boundedEdgeSnapshot.set(`${src}\0${tgt}`, {
          y0: edge.y0,
          y1: edge.y1,
          sankeyWidth: edge.sankeyWidth
        })
      }
    }

    this.nodes.clear()
    this.edges.clear()
    this._decaySortedNodes = null; this._networkDecayCache = null

    // Build node map
    for (const raw of rawNodes) {
      const id = String(getNodeId(raw))
      this.nodes.set(id, { ...createNode(id), data: raw })
    }

    // Build edge map (creating nodes if not provided).
    // Use a unique index key so parallel edges (same source→target, different
    // groups) are preserved. Streaming ingestion still aggregates by source+target.
    for (let i = 0; i < rawEdges.length; i++) {
      const raw = rawEdges[i]
      const sourceId = String(getSource(raw))
      const targetId = String(getTarget(raw))
      // Preserve `value: 0` (e.g. an edge with no flow that should
      // suppress particles); fall back to 1 only when the raw value is
      // nullish or non-finite. The earlier `|| 1` pattern collapsed
      // legitimate zeros into 1, which made "no-flow" edges still
      // animate particles at the default rate.
      const rawValue = getValue(raw)
      const numValue = rawValue == null ? NaN : Number(rawValue)
      const value = Number.isFinite(numValue) ? numValue : 1

      if (!this.nodes.has(sourceId)) {
        this.nodes.set(sourceId, { ...createNode(sourceId), data: raw })
      }
      if (!this.nodes.has(targetId)) {
        this.nodes.set(targetId, { ...createNode(targetId), data: raw })
      }

      const key = `${sourceId}\0${targetId}\0${i}`
      const edge: RealtimeEdge = {
        source: sourceId,
        target: targetId,
        value,
        y0: 0,
        y1: 0,
        sankeyWidth: 0,
        data: raw,
        _edgeKey: key
      }
      // For customNetworkLayout charts (e.g. ProcessSankey), `runLayout`
      // short-circuits before `finalizeLayout` would have computed
      // bezier from node positions. The HOC pre-computes bezier
      // control points and attaches them to each edge before push;
      // copy them through here so the particle pool can read them.
      // Harmless for built-in layouts — they overwrite this inside
      // `finalizeLayout` anyway.
      //
      // Validate the shape before assigning — a truthiness-only check
      // would let `bezier: true` or a partial object through and the
      // particle pipeline would then crash reading
      // `edge.bezier.points[0].x` etc.
      if (raw && typeof raw === "object" && isValidBezierCache(raw.bezier)) {
        edge.bezier = raw.bezier as BezierCache
      }
      this.edges.set(key, edge)
    }

    // Run layout unless a worker will provide the force positions.
    if (!options?.deferLayout) this.runLayout(size)
    this.updateResults.recordData("replace", rawNodes.length + rawEdges.length)
  }

  /** Additive explicit-result form of {@link ingestBounded}. */
  ingestBoundedWithResult(
    rawNodes: any[],
    rawEdges: any[],
    size: [number, number],
    options?: { deferLayout?: boolean },
  ): UpdateResult {
    this.ingestBounded(rawNodes, rawEdges, size, options)
    return this.updateResults.last
  }

  /**
   * Apply worker-computed force positions through the normal layout finalizer.
   * The force plugin still resolves edge endpoints, clamps bounds, records
   * topology diffs, snapshots positions, and prepares transitions; it only
   * skips the expensive simulation itself.
   */
  applyForceLayoutPositions(
    positions: Record<string, { x: number; y: number }>,
    size: [number, number]
  ): void {
    for (const [id, position] of Object.entries(positions)) {
      const node = this.nodes.get(id)
      if (!node) continue
      node.x = position.x
      node.y = position.y
    }
    this.config.__skipForceSimulation = true
    try {
      this.runLayout(size)
    } finally {
      this.config.__skipForceSimulation = undefined
    }
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
    const now = this.currentTime()
    this.lastIngestTime = now
    this._decaySortedNodes = null; this._networkDecayCache = null

    if (!this.nodes.has(source)) {
      this.nodes.set(source, createNode(source))
      this.nodeTimestamps.set(source, now)
      this.tension += this.tensionConfig.newNode
      topologyChanged = true
    }

    if (!this.nodes.has(target)) {
      this.nodes.set(target, createNode(target))
      this.nodeTimestamps.set(target, now)
      this.tension += this.tensionConfig.newNode
      topologyChanged = true
    }

    const key = this.edgeKey(source, target)
    const existing = this.edges.get(key)

    let valueChanged = false
    if (existing) {
      existing.value += value
      this.edgeTimestamps.set(key, now)
      this.tension += this.tensionConfig.weightChange
      valueChanged = true
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

    const needsRelayout = (
      isFirst ||
      topologyChanged ||
      valueChanged ||
      this.tension >= this.tensionConfig.threshold
    )
    this.updateResults.recordData("ingest", 1)
    return needsRelayout
  }

  /** Additive explicit-result form of {@link ingestEdge}. */
  ingestEdgeWithResult(push: EdgePush): UpdateResult {
    this.ingestEdge(push)
    return this.updateResults.last
  }

  // ── Layout execution ──────────────────────────────────────────────────

  /**
   * Run the layout algorithm via the appropriate plugin.
   */
  runLayout(size: [number, number]): void {
    // customLayout escape hatch — when the user supplies their own layout,
    // skip plugin dispatch entirely. The layout produces scene primitives
    // directly inside `buildScene`; nodes/edges in this.* don't need
    // positions because the scene IS the geometry. We still need to keep
    // the topology-diff bookkeeping in sync so push-mode subscribers
    // (SVG overlays, labels, useTopologyDiff consumers, addedNodes-driven
    // highlighting) observe added/removed nodes and edges.
    if (this.config.customNetworkLayout) {
      this.recordTopologyDiff()
      this.layoutVersion++
      return
    }
    const plugin = getLayoutPlugin(this.config.chartType)
    if (!plugin) return

    let nodesArr = Array.from(this.nodes.values())
    const edgesArr = Array.from(this.edges.values())

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
      this.config.__previousPositions =
        prevPositions.size > 0 ? prevPositions : undefined
    }

    // Execute layout — hierarchical plugins push into the arrays directly
    plugin.computeLayout(nodesArr, edgesArr, this.config, size)

    // Clean up the stashed positions from config
    this.config.__previousPositions = undefined

    // After hierarchical layout, sync the populated arrays back into the
    // store's Maps so buildScene and getLayoutData work correctly.
    if (plugin.hierarchical && nodesArr.length > 0) {
      this.nodes.clear()
      this.edges.clear()
      this._decaySortedNodes = null; this._networkDecayCache = null
      for (const node of nodesArr) {
        this.nodes.set(node.id, node)
      }
      for (let i = 0; i < edgesArr.length; i++) {
        const edge = edgesArr[i]
        const srcId =
          typeof edge.source === "string" ? edge.source : edge.source.id
        const tgtId =
          typeof edge.target === "string" ? edge.target : edge.target.id
        const key = edge._edgeKey || `${srcId}\0${tgtId}\0${i}`
        edge._edgeKey = key
        this.edges.set(key, edge)
      }

      // For hierarchical layouts, prepareForRelayout ran when the node Maps were
      // empty (cleared before plugin). Apply the bounded snapshot now that the
      // plugin has populated nodes so data-change transitions can fire.
      const snapshot = this._boundedPrevSnapshot
      if (snapshot && snapshot.size > 0) {
        for (const node of this.nodes.values()) {
          const prev = snapshot.get(node.id)
          if (prev) {
            node._prevX0 = prev.x0
            node._prevX1 = prev.x1
            node._prevY0 = prev.y0
            node._prevY1 = prev.y1
          }
        }
      }
      this._boundedPrevSnapshot = null
      this._boundedEdgeSnapshot = null

      // Refresh nodesArr to include the populated nodes (used by hasOldPositions check below)
      nodesArr = Array.from(this.nodes.values())
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
      (n) =>
        n._prevX0 !== undefined &&
        (n._prevX0 !== 0 ||
          n._prevX1 !== 0 ||
          n._prevY0 !== 0 ||
          n._prevY1 !== 0)
    )

    // Resolve transition duration: config.transition (from animate) > tensionConfig
    const transitionDuration =
      this.config.transition?.duration ?? this.tensionConfig.transitionDuration

    // Intro animation: synthesize center-origin prev positions on first layout.
    // Only for deterministic layouts (sankey, tree, treemap, circlepack) — force/chord
    // layouts compute positions from randomized starting points and don't benefit
    // from a center-origin intro (it fights the simulation).
    const deterministicLayout = [
      "sankey",
      "tree",
      "treemap",
      "circlepack",
      "partition"
    ].includes(this.config.chartType)
    if (
      !this._hasRenderedOnce &&
      this.config.introAnimation &&
      deterministicLayout &&
      nodesArr.length > 0 &&
      transitionDuration > 0
    ) {
      const cx = size[0] / 2
      const cy = size[1] / 2
      for (const node of this.nodes.values()) {
        node._prevX0 = cx
        node._prevX1 = cx
        node._prevY0 = cy
        node._prevY1 = cy
      }
      for (const edge of this.edges.values()) {
        edge._prevY0 = cy
        edge._prevY1 = cy
        edge._prevSankeyWidth = 0
        edge._introFromZero = true
      }
      this.restorePreviousPositions()
      this.transition = {
        startTime: this.currentTime(),
        duration: transitionDuration
      }
    } else if (hasOldPositions && transitionDuration > 0) {
      // Data-change transition: reset to previous positions (animation starts from here)
      this.restorePreviousPositions()
      this.transition = {
        startTime: this.currentTime(),
        duration: transitionDuration
      }
    }

    this._hasRenderedOnce = true

    this.recordTopologyDiff()

    this.layoutVersion++
  }

  /**
   * Compute added/removed node and edge sets relative to the previous
   * layout snapshot, and update `lastTopologyChangeTime` if anything
   * changed. Shared by the plugin path (`runLayout` finalization) and the
   * customLayout escape hatch — without this, `getTopologyDiff()` and
   * built-in topology-diff highlighting silently stop working when a
   * `customNetworkLayout` is supplied.
   */
  private recordTopologyDiff(): void {
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

    if (
      this.addedNodes.size > 0 ||
      this.removedNodes.size > 0 ||
      this.addedEdges.size > 0 ||
      this.removedEdges.size > 0
    ) {
      this.lastTopologyChangeTime = this.currentTime()
    }

    this.previousNodeIds = currentNodeIds
    this.previousEdgeKeys = currentEdgeKeys
  }

  /**
   * Build the scene graph from current layout positions.
   */
  /**
   * Re-apply the custom layout's `restyle`/`restyleEdge` to the existing scene
   * for `selection`, mutating styles **in place** off each mark's base style.
   * Does NOT bump the scene revision — positions are unchanged, so the quadtree
   * stays valid and no relayout/repack happens. The frame repaints the canvas
   * after calling this. No-op when the layout supplied no restyle callbacks.
   */
  restyleScene(selection: CustomLayoutSelection | null): void {
    const hasCustomRestyle = restyleNetworkCustomScene({
      nodes: this.sceneNodes,
      edges: this.sceneEdges,
      restyle: this._customRestyle,
      restyleEdge: this._customRestyleEdge,
      baseStyles: this._baseStyles,
      selection
    })
    this.markStylePaintPending()
    this.updateResults.recordRestyle(hasCustomRestyle)
  }

  buildScene(size: [number, number]): void {
    // customLayout escape hatch — short-circuit plugin dispatch and let the
    // user emit scene primitives directly. Hit testing, decay, and SSR keep
    // working because they consume `this.sceneNodes`/`sceneEdges`.
    if (this.config.customNetworkLayout) {
      const outcome = runNetworkCustomLayout({
        config: this.config,
        customLayout: this.config.customNetworkLayout,
        size,
        nodes: Array.from(this.nodes.values()),
        edges: Array.from(this.edges.values()),
        previousResult: this.lastCustomLayoutResult,
        revision: this.layoutVersion
      })
      if (outcome.kind === "failure") {
        this.lastCustomLayoutFailure = outcome.diagnostic
        if (!outcome.preservedLastGoodScene) {
          // A new custom layout must not leave a previously-built plugin scene
          // visible when it fails before ever emitting its own result.
          this.sceneNodes = []
          this.sceneEdges = []
          this.labels = []
          this.customLayoutOverlays = null
          this.customLayoutHtmlMarks = []
          this.lastCustomLayoutResult = null
          this._customRestyle = undefined
          this._customRestyleEdge = undefined
          this.hasCustomRestyle = false
          this._baseStyles = new WeakMap()
          this._sceneNodesRevision++
        }
        return
      }
      const result = outcome.result
      this.sceneNodes = result.sceneNodes ?? []
      this.sceneEdges = result.sceneEdges ?? []
      this.labels = result.labels ?? []
      this.customLayoutOverlays = result.overlays ?? null
      this.customLayoutHtmlMarks = result.htmlMarks ?? []
      this.lastCustomLayoutResult = result
      this.lastCustomLayoutFailure = null
      // Any successful sceneNodes rebuild invalidates the lazily-built node
      // quadtree. A recovered failure deliberately does not.
      this._sceneNodesRevision++
      // Stash per-frame restyle callbacks. Their presence opts the chart into
      // the cheap selection path: snapshot each mark's emitted (base) style, then
      // apply the restyle once for the current selection. `restyleScene()` later
      // re-applies onto these bases without re-running the layout.
      this._customRestyle = result.restyle
      this._customRestyleEdge = result.restyleEdge
      this.hasCustomRestyle = !!(result.restyle || result.restyleEdge)
      if (this.hasCustomRestyle) {
        this._baseStyles = snapshotNetworkCustomStyles(this.sceneNodes, this.sceneEdges)
        this.restyleScene(this.config.layoutSelection ?? null)
      }
      warnCustomLayoutDiagnostics({
        label: "customNetworkLayout",
        nodes: this.sceneNodes,
        overlays: this.customLayoutOverlays,
        warned: this._customLayoutDiagnosticsWarned
      })
      return
    }
    // Non-custom path: no restyle callbacks in effect.
    this._customRestyle = undefined
    this._customRestyleEdge = undefined
    this.hasCustomRestyle = false
    this._baseStyles = new WeakMap()

    // Built-in chart types: clear stale overlays / HTML marks from a prior
    // customLayout run.
    this.customLayoutOverlays = null
    this.customLayoutHtmlMarks = []
    this.lastCustomLayoutResult = null
    this.lastCustomLayoutFailure = null

    const plugin = getLayoutPlugin(this.config.chartType)
    if (!plugin) {
      this._sceneNodesRevision++
      return
    }

    // Non-hierarchical plugins (force/sankey/chord) only read these arrays
    // (mutating node-object positions in place), so they share the per-frame
    // cache. Hierarchical plugins (orbit/hierarchy) use them as mutable scratch
    // (clear + rebuild), so they get fresh arrays.
    const nodesArr = plugin.hierarchical
      ? Array.from(this.nodes.values())
      : this.nodesArray
    const edgesArr = plugin.hierarchical
      ? Array.from(this.edges.values())
      : this.edgesArray

    const { sceneNodes, sceneEdges, labels } = plugin.buildScene(
      nodesArr,
      edgesArr,
      this.config,
      size
    )

    this.sceneNodes = sceneNodes
    this.sceneEdges = sceneEdges
    this.labels = labels
    this._sceneNodesRevision++
  }

  /**
   * Lazily (re)build the circle-node spatial index. Only built when the scene
   * holds more than QUADTREE_THRESHOLD circle nodes (force/orbit graphs); for
   * rect (sankey/treemap) and arc (chord) scenes — which carry far fewer marks
   * and need area/angular hit logic — it stays null and the hit tester scans
   * linearly. Always tracks `_maxNodeRadius` so the hit query can widen its
   * search to cover the largest node.
   */
  private rebuildNodeQuadtree(): void {
    let circleCount = 0
    let maxR = 0
    for (const node of this.sceneNodes) {
      if (node.type === "circle") {
        circleCount++
        if (node.r > maxR) maxR = node.r
      }
    }
    this._maxNodeRadius = maxR

    if (circleCount <= NetworkPipelineStore.QUADTREE_THRESHOLD) {
      this._nodeQuadtree = null
      return
    }

    const circles: NetworkCircleNode[] = new Array(circleCount)
    let i = 0
    for (const node of this.sceneNodes) {
      if (node.type === "circle") circles[i++] = node
    }
    this._nodeQuadtree = d3Quadtree<NetworkCircleNode>()
      .x((n) => n.cx)
      .y((n) => n.cy)
      .addAll(circles)
  }

  /**
   * Circle-node spatial index for hit testing, or null when the scene is small
   * or not circle-based. Rebuilt on demand only after the scene changed, so a
   * settled graph indexes once and animation frames without a hover pay nothing.
   */
  get nodeQuadtree(): Quadtree<NetworkCircleNode> | null {
    if (this._nodeQuadtreeRevision !== this._sceneNodesRevision) {
      this.rebuildNodeQuadtree()
      this._nodeQuadtreeRevision = this._sceneNodesRevision
    }
    return this._nodeQuadtree
  }

  /** Largest circle-node radius in the current scene (widens the hit query). */
  get maxNodeRadius(): number {
    // Touch the getter so _maxNodeRadius reflects the current scene.
    void this.nodeQuadtree
    return this._maxNodeRadius
  }

  /**
   * Per-frame-stable node/edge arrays (see field docs). Rebuilt only when
   * layoutVersion changes — i.e. on a Map mutation, never on an animation tick.
   */
  private _ensureArrays(): void {
    if (
      this._arrCacheVersion === this.layoutVersion &&
      this._nodesArrCache &&
      this._edgesArrCache
    ) {
      return
    }
    this._nodesArrCache = Array.from(this.nodes.values())
    this._edgesArrCache = Array.from(this.edges.values())
    this._arrCacheVersion = this.layoutVersion
  }

  /** Cached node array — safe only for read / position-mutate consumers. */
  get nodesArray(): RealtimeNode[] {
    this._ensureArrays()
    return this._nodesArrCache!
  }

  /** Cached edge array — safe only for read / position-mutate consumers. */
  get edgesArray(): RealtimeEdge[] {
    this._ensureArrays()
    return this._edgesArrCache!
  }

  // ── Animation tick (orbit etc.) ──────────────────────────────────────

  /** Whether the current layout plugin drives continuous animation (respects orbitAnimated config) */
  get isAnimating(): boolean {
    const plugin = getLayoutPlugin(this.config.chartType)
    if (!plugin?.supportsAnimation) return false
    // Respect the orbitAnimated config — if explicitly false, don't animate
    if (this.config.orbitAnimated === false) return false
    return true
  }

  /**
   * Advance the layout animation by one frame (e.g. orbit rotation).
   * Returns true if the scene should be rebuilt.
   */
  tickAnimation(size: [number, number], deltaTime: number): boolean {
    const plugin = getLayoutPlugin(this.config.chartType)
    if (!plugin?.tick) return false

    // Non-hierarchical layouts (force) share the per-frame array cache; the
    // hierarchical orbit layout uses them as scratch, so it gets fresh arrays.
    const nodesArr = plugin.hierarchical
      ? Array.from(this.nodes.values())
      : this.nodesArray
    const edgesArr = plugin.hierarchical
      ? Array.from(this.edges.values())
      : this.edgesArray
    return plugin.tick(nodesArr, edgesArr, this.config, size, deltaTime)
  }

  // ── Transition animation ──────────────────────────────────────────────

  /**
   * Cancel any pending intro animation that the most recent layout
   * pass set up. After this, the next paint shows nodes/edges in
   * their final positions directly — no transition from the
   * center-origin intro state.
   *
   * Stream Frames call this when they detect SSR hydration. The
   * server already painted the chart in its final state via the SVG
   * branch, so re-animating from blank when the canvas takes over is
   * a visual regression.
   *
   * Idempotent — a second call is a no-op.
   */
  cancelIntroAnimation(): void {
    this.transition = null
    // Wipe per-node and per-edge intro state so the canvas paint
    // pipeline reads the live positions instead of interpolating from
    // center-origin / zero-width values.
    for (const node of this.nodes.values()) {
      node._prevX0 = undefined
      node._prevX1 = undefined
      node._prevY0 = undefined
      node._prevY1 = undefined
    }
    for (const edge of this.edges.values()) {
      edge._prevY0 = undefined
      edge._prevY1 = undefined
      edge._prevSankeyWidth = undefined
      edge._introFromZero = false
    }
  }

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
        (edge._prevSankeyWidth > 0 || edge._introFromZero)
      ) {
        edge.y0 = lerp(edge._prevY0, edge._targetY0, t)
        edge.y1 = lerp(edge._prevY1!, edge._targetY1!, t)
        edge.sankeyWidth = lerp(
          edge._prevSankeyWidth,
          edge._targetSankeyWidth!,
          t
        )
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
    const snapshot = this._boundedPrevSnapshot
    for (const node of this.nodes.values()) {
      // For bounded re-ingestion, nodes were recreated with zeroed positions.
      // Use the snapshot (captured before clear) as the "previous" positions.
      const prev = snapshot?.get(node.id)
      if (
        prev &&
        node.x0 === 0 &&
        node.x1 === 0 &&
        node.y0 === 0 &&
        node.y1 === 0
      ) {
        node._prevX0 = prev.x0
        node._prevX1 = prev.x1
        node._prevY0 = prev.y0
        node._prevY1 = prev.y1
      } else {
        node._prevX0 = node.x0
        node._prevX1 = node.x1
        node._prevY0 = node.y0
        node._prevY1 = node.y1
      }
    }
    const edgeSnapshot = this._boundedEdgeSnapshot
    for (const edge of this.edges.values()) {
      // For bounded re-ingestion, look up previous edge position from snapshot
      if (edgeSnapshot && edge.sankeyWidth === 0) {
        const src =
          typeof edge.source === "string" ? edge.source : edge.source.id
        const tgt =
          typeof edge.target === "string" ? edge.target : edge.target.id
        const prevEdge = edgeSnapshot.get(`${src}\0${tgt}`)
        if (prevEdge) {
          edge._prevY0 = prevEdge.y0
          edge._prevY1 = prevEdge.y1
          edge._prevSankeyWidth = prevEdge.sankeyWidth
          continue
        }
      }
      edge._prevY0 = edge.y0
      edge._prevY1 = edge.y1
      edge._prevSankeyWidth = edge.sankeyWidth
    }
    // Only clear snapshots when nodes were present to process.
    // For hierarchical layouts, nodes are empty at this point — the snapshot
    // is consumed later in the post-plugin sync block inside runLayout.
    if (this.nodes.size > 0) {
      this._boundedPrevSnapshot = null
      this._boundedEdgeSnapshot = null
    }
  }

  private finalizeLayout(): void {
    const direction = this.config.orientation === "vertical" ? "down" : "right"

    for (const node of this.nodes.values()) {
      // Sankey/treemap/partition set x0/x1/y0/y1 — derive x/y from those.
      // Force/chord set x/y directly — derive x0/x1 from x/y.
      const hasBox =
        node.x0 !== 0 || node.x1 !== 0 || node.y0 !== 0 || node.y1 !== 0
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
      edge._introFromZero = undefined
    }
    this.rebuildAllBeziers()
  }

  // ── Bezier caching (see networkBezier.ts) ────────────────────────────

  private updateEdgeBezier(edge: RealtimeEdge): void {
    updateEdgeBezierPure(edge, this.nodes, NETWORK_EDGE_CURVATURE)
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

  // ── Realtime encoding (see networkRealtimeEncoding.ts) ───────────────

  applyPulse(now: number): void {
    applyNetworkPulse({
      sceneNodes: this.sceneNodes,
      sceneEdges: this.sceneEdges,
      nodeTimestamps: this.nodeTimestamps,
      edgeTimestamps: this.edgeTimestamps,
      pulse: this.config.pulse,
      now
    })
  }

  applyDecay(): void {
    if (!this._networkDecayCache) {
      this._networkDecayCache = { sortedNodes: null, ageMap: null }
    }
    if (!this._decaySortedNodes) {
      this._networkDecayCache.sortedNodes = null
      this._networkDecayCache.ageMap = null
    }
    applyNetworkDecay({
      sceneNodes: this.sceneNodes,
      nodeTimestamps: this.nodeTimestamps,
      decay: this.config.decay,
      cache: this._networkDecayCache
    })
    this._decaySortedNodes = this._networkDecayCache.sortedNodes
    this._decayAgeMap = this._networkDecayCache.ageMap
  }

  applyTopologyDiff(now: number): void {
    applyNetworkTopologyDiff({
      sceneNodes: this.sceneNodes,
      addedNodes: this.addedNodes,
      lastTopologyChangeTime: this.lastTopologyChangeTime,
      now
    })
  }

  get hasActiveTopologyDiff(): boolean {
    return hasActiveNetworkTopologyDiff(
      this.addedNodes,
      this.lastTopologyChangeTime
    )
  }

  applyThresholds(now: number): void {
    applyNetworkThresholds({
      sceneNodes: this.sceneNodes,
      nodes: this.nodes,
      thresholds: this.config.thresholds,
      now
    })
  }

  get hasActiveThresholds(): boolean {
    return hasActiveNetworkThresholds(
      this.nodes.values(),
      this.config.thresholds
    )
  }

  get hasActivePulses(): boolean {
    return hasActiveNetworkPulses({
      pulse: this.config.pulse,
      lastIngestTime: this.lastIngestTime
    })
  }


  // ── Public accessors ──────────────────────────────────────────────────

  getLayoutData(): { nodes: RealtimeNode[]; edges: RealtimeEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values())
    }
  }

  /**
   * Update a node's data by ID. Returns the previous data, or null if not found.
   */
  updateNode(id: string, updater: (data: Datum) => Datum): Datum | null {
    const node = this.nodes.get(id)
    if (!node) {
      this.updateResults.recordNoop("update")
      return null
    }
    const previous = node.data ? { ...node.data } : {}
    node.data = updater(node.data ?? {})
    this.layoutVersion++
    this.lastIngestTime = this.currentTime()
    this.updateResults.recordData("update", 1)
    return previous
  }

  /**
   * Update all edges between source and target. Handles parallel edges.
   * Returns array of previous data values (one per updated edge), or empty array.
   */
  updateEdge(
    sourceId: string,
    targetId: string,
    updater: (data: Datum) => Datum
  ): Datum[] {
    const valAcc = this.config.valueAccessor
    const valFn =
      typeof valAcc === "function"
        ? valAcc
        : valAcc
          ? (d: Datum) => d[valAcc]
          : (d: Datum) => d.value
    const results: Datum[] = []
    for (const [, edge] of this.edges) {
      const src = typeof edge.source === "string" ? edge.source : edge.source.id
      const tgt = typeof edge.target === "string" ? edge.target : edge.target.id
      if (src === sourceId && tgt === targetId) {
        results.push(edge.data ? { ...edge.data } : {})
        edge.data = updater(edge.data ?? {})
        const newValue = valFn(edge.data)
        if (newValue != null) edge.value = Number(newValue)
      }
    }
    if (results.length > 0) {
      this.layoutVersion++
      this.lastIngestTime = this.currentTime()
      this.updateResults.recordData("update", results.length)
    } else {
      this.updateResults.recordNoop("update")
    }
    return results
  }

  /**
   * Remove a node by ID. Also removes all edges connected to this node.
   * Returns true if the node was found and removed.
   */
  removeNode(id: string): boolean {
    if (!this.nodes.has(id)) {
      this.updateResults.recordNoop("remove")
      return false
    }
    this.nodes.delete(id)
    this.nodeTimestamps.delete(id)
    // Cascade: remove edges connected to this node
    for (const [edgeKey, edge] of this.edges) {
      const src = typeof edge.source === "string" ? edge.source : edge.source.id
      const tgt = typeof edge.target === "string" ? edge.target : edge.target.id
      if (src === id || tgt === id) {
        this.edges.delete(edgeKey)
        this.edgeTimestamps.delete(edgeKey)
      }
    }
    this.layoutVersion++
    this.lastIngestTime = this.currentTime()
    this.updateResults.recordData("remove", 1)
    return true
  }

  /**
   * Remove all edges between source and target node IDs.
   * Handles parallel edges (multiple edges between the same pair).
   * Returns true if at least one edge was removed.
   */
  /**
   * Remove edges by source+target IDs, or by edge ID when edgeIdAccessor is configured.
   *
   * - `removeEdge(sourceId, targetId)` — removes all parallel edges between endpoints
   * - `removeEdge(edgeId)` — removes the edge matching edgeIdAccessor (requires config.edgeIdAccessor)
   */
  removeEdge(sourceIdOrEdgeId: string, targetId?: string): boolean {
    const toDelete: string[] = []

    if (targetId === undefined) {
      // Single-ID mode: use edgeIdAccessor
      const accessor = this.config.edgeIdAccessor
      if (!accessor) {
        throw new Error(
          "removeEdge(edgeId) requires edgeIdAccessor to be configured. Use removeEdge(sourceId, targetId) instead."
        )
      }
      const getEdgeId =
        typeof accessor === "function" ? accessor : (d: Datum) => d?.[accessor]
      for (const [edgeKey, edge] of this.edges) {
        if (edge.data && getEdgeId(edge.data) === sourceIdOrEdgeId) {
          toDelete.push(edgeKey)
        }
      }
    } else {
      // Two-ID mode: match source + target
      for (const [edgeKey, edge] of this.edges) {
        const src =
          typeof edge.source === "string" ? edge.source : edge.source.id
        const tgt =
          typeof edge.target === "string" ? edge.target : edge.target.id
        if (src === sourceIdOrEdgeId && tgt === targetId) {
          toDelete.push(edgeKey)
        }
      }
    }

    for (const key of toDelete) {
      this.edges.delete(key)
      this.edgeTimestamps.delete(key)
    }
    if (toDelete.length > 0) {
      this.layoutVersion++
      this.lastIngestTime = this.currentTime()
      this.updateResults.recordData("remove", toDelete.length)
    } else {
      this.updateResults.recordNoop("remove")
    }
    return toDelete.length > 0
  }

  clear(): void {
    this.nodes.clear()
    this.edges.clear()
    this._decaySortedNodes = null; this._networkDecayCache = null
    this._decayAgeMap = null
    // Invalidate the lazily-built node spatial index AND the materialized
    // node/edge array caches. These hold references to the actual node/edge
    // objects, so nulling them lets clear() promptly release a (possibly large)
    // pre-clear graph instead of retaining it until the next render rebuilds
    // the caches.
    this._nodeQuadtree = null
    this._nodesArrCache = null
    this._edgesArrCache = null
    this._sceneNodesRevision++
    this.tension = 0
    // Monotonic — never reset to 0. A reset could collide with a consumer's
    // last-seen value and skip a render after clear()+reload.
    this.layoutVersion++
    this.sceneNodes = []
    this.sceneEdges = []
    this.labels = []
    this.customLayoutOverlays = null
    this.customLayoutHtmlMarks = []
    this.lastCustomLayoutResult = null
    this.lastCustomLayoutFailure = null
    this._customRestyle = undefined
    this._customRestyleEdge = undefined
    this.hasCustomRestyle = false
    this._baseStyles = new WeakMap()
    this.transition = null
    this._hasRenderedOnce = false
    this.lastIngestTime = 0
    this._lastPositionSnapshot = null
    this.nodeTimestamps.clear()
    this.edgeTimestamps.clear()
    // Topology-diff tracking must reset too. Otherwise recordTopologyDiff()
    // after a clear()+reload diffs the new graph against the pre-clear node/
    // edge sets and mis-classifies every reappearing node as unchanged —
    // breaking enter/exit highlighting and getTopologyDiff().
    this.previousNodeIds = new Set()
    this.previousEdgeKeys = new Set()
    this.addedNodes = new Set()
    this.removedNodes = new Set()
    this.addedEdges = new Set()
    this.removedEdges = new Set()
    this.lastTopologyChangeTime = 0
    this._boundedPrevSnapshot = null
    this._boundedEdgeSnapshot = null
    if (this.particlePool) {
      this.particlePool.clear()
    }
    this.updateResults.recordData("clear")
  }
}

attachUpdateResultStore(NetworkPipelineStore)
