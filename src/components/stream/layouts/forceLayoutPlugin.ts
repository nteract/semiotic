import {
  forceSimulation,
  forceCenter,
  forceX,
  forceY,
  forceLink,
  forceManyBody
} from "d3-force"
import { scaleLinear } from "d3-scale"
import { min, max } from "d3-array"
import { schemeCategory10 } from "d3-scale-chromatic"
import type {
  NetworkLayoutPlugin,
  NetworkPipelineConfig,
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkCircleNode,
  NetworkLineEdge,
  NetworkLabel,
  RealtimeNode,
  RealtimeEdge
} from "../networkTypes"
import type { Style } from "../types"

/**
 * Force-directed layout plugin — uses d3-force for physics-based node positioning.
 *
 * Produces circle scene nodes and line scene edges. Runs the force simulation
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

    // Retrieve previous positions if stashed by the pipeline store
    // (used for bounded re-ingestion where nodes are recreated)
    const previousPositions: Map<string, { x: number; y: number }> | undefined =
      (config as any).__previousPositions

    // Classify nodes: positioned (have non-zero x/y or a previous position) vs new
    let positionedCount = 0
    const newNodes: RealtimeNode[] = []

    for (const node of nodes) {
      const hasCurrentPos = node.x != null && node.y != null && (node.x !== 0 || node.y !== 0)
      const prevPos = previousPositions?.get(node.id)

      if (hasCurrentPos) {
        positionedCount++
      } else if (prevPos) {
        // Restore from previous positions map (bounded re-ingestion case)
        node.x = prevPos.x
        node.y = prevPos.y
        positionedCount++
      } else {
        newNodes.push(node)
      }
    }

    // Decide warm vs cold start
    const newFraction = nodes.length > 0 ? newNodes.length / nodes.length : 1
    const useWarmStart = positionedCount > 0 && newFraction <= COLD_START_THRESHOLD

    if (useWarmStart) {
      // Warm start: place new nodes near the centroid of their connected neighbors
      const nodeMap = new Map<string, RealtimeNode>()
      for (const n of nodes) nodeMap.set(n.id, n)

      for (const node of newNodes) {
        const neighbors = findNeighborPositions(node.id, edges, nodeMap)

        if (neighbors.length > 0) {
          // Place near centroid of connected neighbors with a small offset
          let sumX = 0, sumY = 0
          for (const pos of neighbors) {
            sumX += pos.x
            sumY += pos.y
          }
          // Add a small deterministic offset based on the node id hash to avoid
          // stacking multiple new nodes at exactly the same point
          const hash = simpleHash(node.id)
          const offsetAngle = (hash % 360) * (Math.PI / 180)
          const offsetR = 10 + (hash % 20)
          node.x = sumX / neighbors.length + offsetR * Math.cos(offsetAngle)
          node.y = sumY / neighbors.length + offsetR * Math.sin(offsetAngle)
        } else {
          // No positioned neighbors — place near center
          const hash = simpleHash(node.id)
          const offsetAngle = (hash % 360) * (Math.PI / 180)
          const offsetR = 15 + (hash % 30)
          node.x = cx + offsetR * Math.cos(offsetAngle)
          node.y = cy + offsetR * Math.sin(offsetAngle)
        }
      }
    } else {
      // Cold start: deterministic phyllotaxis spiral for all unpositioned nodes.
      // d3-force uses Math.random() for unpositioned nodes which produces
      // different layouts on every render. A phyllotaxis spiral gives
      // evenly-distributed starting positions based on index alone.
      const goldenAngle = Math.PI * (3 - Math.sqrt(5))

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (node.x == null || node.y == null || (node.x === 0 && node.y === 0)) {
          const r = Math.sqrt(i + 0.5) * 10
          const theta = i * goldenAngle
          node.x = cx + r * Math.cos(theta)
          node.y = cy + r * Math.sin(theta)
        }
      }
    }

    // Adaptive iteration count: reduce iterations for large networks (cold start only)
    const nodeCount = nodes.length
    const coldIterations = config.iterations ?? Math.max(
      50,
      Math.min(300, Math.floor(300 - (nodeCount - 30) * 2))
    )
    const iterations = useWarmStart ? WARM_START_ITERATIONS : coldIterations

    // Build node size accessor for charge strength
    const nodeSizeFn = resolveNodeSizeFn(
      config.nodeSize,
      config.nodeSizeRange,
      nodes
    )
    const nodeRadius = (d: any) => nodeSizeFn(d)

    // Configure link force
    const linkForce = forceLink()
      .strength((d: any) =>
        Math.min(2.5, d.weight ? d.weight * forceStrength : forceStrength)
      )
      .id((d: any) => d.id)

    // Build simulation
    const simulation = forceSimulation()
      .force(
        "charge",
        forceManyBody().strength((d: any) => -25 * nodeRadius(d))
      )
      // forceCenter shifts the center of mass to the target on every tick,
      // ensuring the graph as a whole stays centered in the chart area
      .force("center", forceCenter(cx, cy).strength(0.8))
      // forceX/forceY pull individual nodes toward center, preventing outliers
      .force("x", forceX(cx).strength(0.15))
      .force("y", forceY(cy).strength(0.15))

    simulation.nodes(nodes as any)

    if (edges.length > 0) {
      // Resolve edge source/target to id strings for d3-force linking
      const linkData = edges.map((e) => ({
        ...e,
        source: typeof e.source === "string" ? e.source : e.source.id,
        target: typeof e.target === "string" ? e.target : e.target.id
      }))

      simulation.force("link", linkForce)
      ;(simulation.force("link") as any).links(linkData)
    }

    // For warm start, use a lower initial alpha since the layout is mostly converged
    if (useWarmStart) {
      simulation.alpha(0.3)
    } else if (simulation.alpha() < 0.1) {
      simulation.alpha(1)
    }

    simulation.stop()

    // Run synchronously
    for (let i = 0; i < iterations; ++i) {
      simulation.tick()
    }

    // Clamp node positions to stay within the canvas area (with padding for node radius)
    for (const node of nodes) {
      if (node.x == null || node.y == null) continue
      const r = nodeRadius(node)
      node.x = Math.max(r, Math.min(size[0] - r, node.x))
      node.y = Math.max(r, Math.min(size[1] - r, node.y))

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
    const resolveMap = new Map<string, RealtimeNode>()
    for (const n of nodes) resolveMap.set(n.id, n)

    for (const edge of edges) {
      if (typeof edge.source === "string") {
        const n = resolveMap.get(edge.source)
        if (n) edge.source = n
      }
      if (typeof edge.target === "string") {
        const n = resolveMap.get(edge.target as string)
        if (n) edge.target = n
      }
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
    const nodeStyleFn = config.nodeStyle
    const edgeStyleFn = config.edgeStyle
    const nodeSizeFn = resolveNodeSizeFn(
      config.nodeSize,
      config.nodeSizeRange,
      nodes
    )

    // Auto-color palette for when no nodeStyle is provided
    const palette = Array.isArray(config.colorScheme)
      ? config.colorScheme
      : (schemeCategory10 as readonly string[])
    const nodeColorMap = new Map<string, string>()
    nodes.forEach((n, i) => {
      nodeColorMap.set(n.id, palette[i % palette.length])
    })

    const sceneNodes: NetworkCircleNode[] = []
    const sceneEdges: NetworkLineEdge[] = []
    const labels: NetworkLabel[] = []

    // Build circle nodes
    for (const node of nodes) {
      if (node.x == null || node.y == null) continue

      const r = nodeSizeFn(node)
      const userStyle = nodeStyleFn ? nodeStyleFn(node) : {}
      const style: Style = {
        fill: userStyle.fill || nodeColorMap.get(node.id) || "#007bff",
        stroke: userStyle.stroke || "#fff",
        strokeWidth: userStyle.strokeWidth ?? 2,
        opacity: userStyle.opacity
      }

      sceneNodes.push({
        type: "circle",
        cx: node.x,
        cy: node.y,
        r,
        style,
        datum: node,
        id: node.id,
        label: node.id
      })
    }

    // Build node lookup for edge resolution
    const nodeMap = new Map<string, RealtimeNode>()
    for (const n of nodes) nodeMap.set(n.id, n)

    // Build line edges
    for (const edge of edges) {
      const sourceNode =
        typeof edge.source === "object" ? edge.source : nodeMap.get(edge.source)
      const targetNode =
        typeof edge.target === "object" ? edge.target : nodeMap.get(edge.target)
      if (!sourceNode || !targetNode) continue
      if (sourceNode.x == null || sourceNode.y == null) continue
      if (targetNode.x == null || targetNode.y == null) continue

      const userStyle = edgeStyleFn ? edgeStyleFn(edge) : {}
      const style: Style = {
        stroke: userStyle.stroke || "#999",
        strokeWidth: userStyle.strokeWidth ?? 1,
        opacity: userStyle.opacity ?? 0.6
      }

      sceneEdges.push({
        type: "line",
        x1: sourceNode.x,
        y1: sourceNode.y,
        x2: targetNode.x,
        y2: targetNode.y,
        style,
        datum: edge
      })
    }

    // Build labels
    if (config.showLabels !== false) {
      const labelFn = resolveLabelFn(config.nodeLabel)

      for (const node of nodes) {
        if (node.x == null || node.y == null) continue

        const text = labelFn ? labelFn(node) : node.id
        if (!text) continue

        const r = nodeSizeFn(node)

        labels.push({
          x: node.x,
          y: node.y - r - 4,
          text: String(text),
          anchor: "middle",
          baseline: "auto",
          fontSize: 11
        })
      }
    }

    return { sceneNodes, sceneEdges, labels }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Find positioned neighbors of a node by scanning edges.
 * Returns an array of {x, y} for neighbors that have non-zero positions.
 */
function findNeighborPositions(
  nodeId: string,
  edges: RealtimeEdge[],
  nodeMap: Map<string, RealtimeNode>
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = []

  for (const edge of edges) {
    const srcId = typeof edge.source === "string" ? edge.source : edge.source.id
    const tgtId = typeof edge.target === "string" ? edge.target : edge.target.id

    let neighborId: string | null = null
    if (srcId === nodeId) neighborId = tgtId
    else if (tgtId === nodeId) neighborId = srcId

    if (neighborId) {
      const neighbor = nodeMap.get(neighborId)
      if (neighbor && (neighbor.x !== 0 || neighbor.y !== 0)) {
        positions.push({ x: neighbor.x, y: neighbor.y })
      }
    }
  }

  return positions
}

/**
 * Simple deterministic hash for a string — used for spreading new node offsets.
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function resolveLabelFn(
  nodeLabel: string | ((d: any) => string) | undefined
): ((d: any) => string) | null {
  if (!nodeLabel) return null
  if (typeof nodeLabel === "function") return nodeLabel
  return (d: any) => d[nodeLabel] || d.id
}

/**
 * Build a function that returns a node radius. If `nodeSize` is a number,
 * use it directly. If it is a string accessor, look up `node.data[nodeSize]`
 * and scale the result to `nodeSizeRange`. If it is a function, call it.
 * Falls back to a default radius of 8.
 */
function resolveNodeSizeFn(
  nodeSize: number | string | ((d: any) => number) | undefined,
  nodeSizeRange: [number, number] | undefined,
  allNodes: RealtimeNode[]
): (node: RealtimeNode) => number {
  if (nodeSize == null) {
    return () => 8
  }

  if (typeof nodeSize === "number") {
    return () => nodeSize
  }

  if (typeof nodeSize === "function") {
    return (node: RealtimeNode) => nodeSize(node) || 8
  }

  // String accessor: look up value on node.data and scale to range
  const range = nodeSizeRange || [5, 20]

  // Extract all numeric values to compute domain
  const values = allNodes
    .map((n) => n.data?.[nodeSize])
    .filter((v): v is number => v != null && typeof v === "number")

  if (values.length === 0) {
    return () => range[0]
  }

  const domainMin = min(values) ?? 0
  const domainMax = max(values) ?? 1

  // If all values are the same, return the midpoint of the range
  if (domainMin === domainMax) {
    return () => (range[0] + range[1]) / 2
  }

  const scale = scaleLinear()
    .domain([domainMin, domainMax])
    .range(range)
    .clamp(true)

  return (node: RealtimeNode) => {
    const raw = node.data?.[nodeSize]
    if (raw == null || typeof raw !== "number") return range[0]
    return scale(raw)
  }
}
