import {
  forceSimulation,
  forceCenter,
  forceX,
  forceY,
  forceLink,
  forceManyBody,
  forceCollide
} from "d3-force"
import { schemeCategory10 } from "../../charts/shared/colorPalettes"
import { buildNetworkLinks, buildLinkNodes, buildLinkLabels, indexLinkNodes } from "./networkLinkScene"
import { resolveNodeSizeFn } from "./forceLayoutNodeSize"
import { resolveForceEdgeWeight } from "./forceLayoutEdgeWeight"
import { createSeededFrameRandom } from "../FrameRuntime"
import { resolveLabelFn, resolveNodeRefId } from "../accessorUtils"
import type {
  NetworkLayoutPlugin,
  NetworkPipelineConfig,
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLabel,
  RealtimeNode,
  RealtimeEdge
} from "../networkTypes"

/**
 * Force-directed layout plugin — uses d3-force for physics-based node positioning.
 *
 * Produces circle nodes and links. Runs the force simulation
 * synchronously for a configurable number of iterations, using phyllotaxis
 * spiral for deterministic initial positions.
 *
 * Supports warm-start mode for incremental streaming updates: when most nodes
 * already have positions, existing nodes keep their positions, new nodes are
 * placed near their connected neighbors, and fewer iterations are run.
 */

/** Number of iterations for warm-start relayout */
const WARM_START_ITERATIONS = 40

/** Fraction of new nodes above which a cold start (full re-simulation) is used */
const COLD_START_THRESHOLD = 0.3

export const forceLayoutPlugin: NetworkLayoutPlugin = {
  supportsStreaming: true,
  hierarchical: false,

  computeLayout(
    nodes: RealtimeNode[],
    edges: RealtimeEdge[],
    config: NetworkPipelineConfig,
    size: [number, number]
  ): void {
    if (nodes.length === 0) return

    const forceStrength = config.forceStrength ?? 0.1
    const cx = size[0] / 2
    const cy = size[1] / 2
    // Fixed full-chart force distances cannot fit in short context/sparkline
    // viewports. When the smaller dimension drops below 200px, scale distances
    // and repulsion while strengthening the positional pull, so the simulation
    // settles inside the plot instead of relying on a final boundary clamp.
    // Charts at or above 200px use the standard force magnitudes.
    const spatialScale = Math.max(0.1, Math.min(1, Math.min(size[0], size[1]) / 200))
    const positionalStrength = Math.min(0.5, 0.06 + (1 - spatialScale) * 1.8)

    // Retrieve previous positions if stashed by the pipeline store
    // (used for bounded re-ingestion where nodes are recreated)
    const previousPositions: Map<string, { x: number; y: number }> | undefined =
      config.__previousPositions

    // Classify nodes: positioned (have initialized coordinates or a previous position) vs new
    const nodeById = indexLinkNodes(nodes)
    const newNodes: RealtimeNode[] = []

    for (const node of nodes) {
      const prevPos = previousPositions?.get(node.id)

      if (hasPosition(node)) continue
      if (prevPos) {
        // Restore from previous positions map (bounded re-ingestion case)
        node.x = prevPos.x
        node.y = prevPos.y
      } else {
        newNodes.push(node)
      }
    }

    // Decide warm vs cold start
    const useWarmStart = newNodes.length / nodes.length <= COLD_START_THRESHOLD

    if (useWarmStart) {
      for (const node of newNodes) {
        const center = neighborCentroid(node.id, edges, nodeById)
        const hash = simpleHash(node.id)
        const angle = (hash % 360) * (Math.PI / 180)
        const offset = (center ? 10 + hash % 20 : 15 + hash % 30) * spatialScale
        node.x = (center?.x ?? cx) + offset * Math.cos(angle)
        node.y = (center?.y ?? cy) + offset * Math.sin(angle)
      }
    } else {
      // Cold start: deterministic phyllotaxis spiral for all unpositioned nodes.
      // d3-force uses Math.random() for unpositioned nodes which produces
      // different layouts on every render. A phyllotaxis spiral gives
      // evenly-distributed starting positions based on index alone.
      const goldenAngle = Math.PI * (3 - Math.sqrt(5))

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (!hasPosition(node)) {
          const r = Math.sqrt(i + 0.5) * 10 * spatialScale
          const theta = i * goldenAngle
          node.x = cx + r * Math.cos(theta)
          node.y = cy + r * Math.sin(theta)
        }
      }
    }

    for (const node of nodes) node.__hasPosition = true

    // When iterations is omitted, reduce the cold-start budget for large networks.
    // Frame and HOC callers supply their default budget explicitly.
    const nodeCount = nodes.length
    const coldIterations = config.iterations ?? Math.max(
      50,
      Math.min(300, Math.floor(300 - (nodeCount - 30) * 2))
    )
    // config.iterations=0 means "skip simulation" (pinned layout) regardless of warm/cold
    const iterations = config.__skipForceSimulation || config.iterations === 0 ? 0
      : useWarmStart ? WARM_START_ITERATIONS
      : coldIterations

    // Build node size accessor for charge strength
    const nodeRadius = resolveNodeSizeFn(
      config.nodeSize,
      config.nodeSizeRange,
      nodes
    )

    // Skip simulation entirely when iterations=0 (pinned layout mode).
    // d3-force's simulation.nodes() modifies positions during setup, so
    // we must avoid calling it when positions are pre-set.
    if (iterations > 0) {
      // Degree-aware forces are substantially more stable around hubs than a
      // uniform spring/charge model. This mirrors the useful parts of
      // ForceAtlas2 (degree-dependent repulsion) and d3-force's own default
      // link-strength heuristic without requiring a continuous worker layout.
      type ForceLink = RealtimeEdge & { source: RealtimeNode; target: RealtimeNode }
      const linkData: ForceLink[] = []
      const degrees = new Map<RealtimeNode, number>()
      const requireNode = (id: string) => {
        const node = nodeById.get(id)
        if (!node) throw new Error(`node not found: ${id}`)
        return node
      }
      for (const edge of edges) {
        const sourceId = resolveNodeRefId(edge.source)
        const targetId = resolveNodeRefId(edge.target)
        if (sourceId === targetId) continue
        const source = requireNode(sourceId)
        const target = requireNode(targetId)
        linkData.push({ ...edge, source, target })
        degrees.set(source, (degrees.get(source) ?? 0) + 1)
        degrees.set(target, (degrees.get(target) ?? 0) + 1)
      }

      const linkForce = forceLink<RealtimeNode, ForceLink>(linkData)
        .strength((d) => {
          const weight = resolveForceEdgeWeight(d)
          const endpointDegree = Math.min(degrees.get(d.source)!, degrees.get(d.target)!)
          const weightFactor = weight > 0 ? Math.sqrt(weight) : 1
          return Math.min(
            2.5,
            (weightFactor * forceStrength) / (0.1 * endpointDegree)
          )
        })
        .distance((d) => {
          const endpointClearance =
            nodeRadius(d.source) + nodeRadius(d.target) +
            Math.max(6, 12 * spatialScale)
          return Math.max(16, 40 * spatialScale, endpointClearance)
        })

      // Build simulation — parameterizing forceSimulation + forceManyBody with
      // RealtimeNode lets d3-force thread the node type through charge callbacks
      // without per-call casts.
      // Keep d3-force's built-in LCG when the caller has not explicitly
      // selected a random source. The deterministic LCG keeps
      // otherwise identical force layouts between renders. A custom random
      // callback or serializable seed opts into an override.
      const simulation = forceSimulation(nodes)

      if (config.random !== undefined || config.seed !== undefined) {
        simulation.randomSource(
          config.random ?? createSeededFrameRandom(config.seed as number)
        )
      }

      simulation
        .force(
          "charge",
          forceManyBody<RealtimeNode>().strength((d) => {
            const degree = degrees.get(d) ?? 0
            return -15 * spatialScale * nodeRadius(d) * Math.sqrt(degree + 1)
          })
        )
        // A static no-overlap pass is one of the main reasons Sigma/Graphology
        // examples remain legible after ForceAtlas2 settles. Applying collision
        // during the synchronous simulation gives Semiotic the same protection
        // while preserving deterministic, non-interactive output.
        .force(
          "collide",
          forceCollide<RealtimeNode>((d) => nodeRadius(d) + 3 * spatialScale)
            .strength(0.9)
            .iterations(2)
        )
        // forceCenter shifts the center of mass to the target on every tick,
        // ensuring the graph as a whole stays centered in the chart area
        .force("center", forceCenter(cx, cy).strength(0.8))
        // Keep components on screen without crushing community structure into
        // the center. Compact layouts need a stronger pull to balance the
        // repulsion between disconnected components; full-size layouts retain
        // a positional strength of 0.06.
        .force("x", forceX<RealtimeNode>(cx).strength(positionalStrength))
        .force("y", forceY<RealtimeNode>(cy).strength(positionalStrength))
        // Apply the viewport constraint during settling so collision and link
        // forces can respond to it. A final coordinate clamp alone assigns
        // every outlier the same border coordinate in short viewports.
        .force("bounds", forceBounds(nodes, size, nodeRadius))

      if (linkData.length > 0) simulation.force("link", linkForce)
      if (useWarmStart) simulation.alpha(0.3)
      simulation.stop().tick(iterations)
    }

    // Retain a padded safety clamp for extremely dense or under-settled
    // layouts. The bounds force above should do nearly all of this work while
    // preserving collision spacing.
    for (const node of nodes) {
      if (node.x == null || node.y == null) continue
      const r = nodeRadius(node)
      // Use a radius-only clamp for explicitly pinned
      // layouts; the extra inset belongs to simulated layouts only.
      const safetyPadding = iterations > 0 ? 2 : 0
      node.x = clampToViewport(node.x, size[0], r + safetyPadding)
      node.y = clampToViewport(node.y, size[1], r + safetyPadding)

      // Reset bounding box so finalizeLayout derives it from the updated x/y.
      // Without this, stale x0/x1/y0/y1 from a previous layout would cause
      // finalizeLayout to overwrite the force-computed positions.
      node.x0 = 0
      node.x1 = 0
      node.y0 = 0
      node.y1 = 0
    }

    // Resolve edge source/target to node object references so that
    // HOC style functions can access d.source.data for color lookups.
    for (const edge of edges) {
      if (typeof edge.source === "string") edge.source = nodeById.get(edge.source) ?? edge.source
      if (typeof edge.target === "string") edge.target = nodeById.get(edge.target) ?? edge.target
    }
  },

  buildScene(
    nodes: RealtimeNode[],
    edges: RealtimeEdge[],
    config: NetworkPipelineConfig,
    size: [number, number]
  ): {
    sceneNodes: NetworkSceneNode[]
    sceneEdges: NetworkSceneEdge[]
    labels: NetworkLabel[]
  } {
    const nodeSizeFn = resolveNodeSizeFn(
      config.nodeSize,
      config.nodeSizeRange,
      nodes
    )

    // Auto-color palette for when no nodeStyle is provided.
    // Priority: explicit array colorScheme > theme categorical (non-empty) > schemeCategory10.
    // An empty categorical array would produce `palette.length === 0` and
    // `undefined` fills from the modulo lookup below, so guard the length.
    const palette = Array.isArray(config.colorScheme)
      ? config.colorScheme
      : config.themeCategorical && config.themeCategorical.length > 0
          ? config.themeCategorical
          : (schemeCategory10 as readonly string[])
    const sceneNodes = buildLinkNodes(nodes, config, nodeSizeFn, (_node, index) => ({
      fill: palette[index % palette.length] || config.themeSemantic?.primary || "#007bff",
      strokeWidth: 2,
    }))

    const sceneEdges = buildNetworkLinks(
      sceneNodes, edges, size[1], config.edgeStyle,
      config.themeSemantic?.border || config.themeSemantic?.secondary || "#999",
    )

    const label = resolveLabelFn(config.nodeLabel)
    const labels = config.showLabels !== false ? buildLinkLabels(sceneNodes, "above", node => label ? label(node) : node.id) : []
    return { sceneNodes, sceneEdges, labels }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function hasPosition(node: RealtimeNode) {
  return node.__hasPosition !== false && Number.isFinite(node.x) && Number.isFinite(node.y)
}

function neighborCentroid(nodeId: string, edges: RealtimeEdge[], nodes: ReadonlyMap<string, RealtimeNode>) {
  let x = 0
  let y = 0
  let count = 0
  for (const edge of edges) {
    const source = resolveNodeRefId(edge.source)
    const target = resolveNodeRefId(edge.target)
    if (source === target) continue
    const id = source === nodeId ? target : target === nodeId ? source : undefined
    const neighbor = id && nodes.get(id)
    if (neighbor && (neighbor.x !== 0 || neighbor.y !== 0)) {
      x += neighbor.x
      y += neighbor.y
      count++
    }
  }
  return count ? { x: x / count, y: y / count } : undefined
}

function clampToViewport(value: number, length: number, radius: number) {
  const inset = Math.min(length / 2, radius)
  return Math.max(inset, Math.min(length - inset, value))
}

/**
 * Softly keep a force simulation inside its viewport. Constraining velocity
 * during the simulation lets link and collision forces settle around the
 * boundary; clamping coordinates only after the last tick collapses outliers
 * onto identical edge positions.
 */
function forceBounds(
  nodes: (RealtimeNode & { vx?: number; vy?: number })[],
  size: [number, number],
  nodeRadius: (node: RealtimeNode) => number
) {
  return (alpha: number) => {
    const forceStrength = 0.6 * Math.max(alpha, 0.2)
    for (const node of nodes) {
      const vx = node.vx ?? 0
      const vy = node.vy ?? 0
      const radius = nodeRadius(node) + 2
      const nextX = node.x + vx
      const nextY = node.y + vy
      node.vx = vx + (clampToViewport(nextX, size[0], radius) - nextX) * forceStrength
      node.vy = vy + (clampToViewport(nextY, size[1], radius) - nextY) * forceStrength
    }
  }

}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export { resolveNodeSizeFn } from "./forceLayoutNodeSize"
