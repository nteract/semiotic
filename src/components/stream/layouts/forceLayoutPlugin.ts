import {
  forceSimulation,
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
 */
export const forceLayoutPlugin: NetworkLayoutPlugin = {
  supportsStreaming: false,
  hierarchical: false,

  computeLayout(
    nodes: RealtimeNode[],
    edges: RealtimeEdge[],
    config: NetworkPipelineConfig,
    size: [number, number]
  ): void {
    if (nodes.length === 0) return

    // Adaptive iteration count: reduce iterations for large networks
    const nodeCount = nodes.length
    const adaptiveIterations = Math.max(
      50,
      Math.min(300, Math.floor(300 - (nodeCount - 30) * 2))
    )

    const iterations = config.iterations ?? adaptiveIterations
    const forceStrength = config.forceStrength ?? 0.1

    // Set deterministic initial positions using phyllotaxis spiral.
    // d3-force uses Math.random() for unpositioned nodes which produces
    // different layouts on every render. A phyllotaxis spiral gives
    // evenly-distributed starting positions based on index alone.
    // RealtimeNode initialises x/y to 0, so we treat (0,0) as "unpositioned".
    const cx = size[0] / 2
    const cy = size[1] / 2
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
    const forceMod = size[1] / size[0]
    const simulation = forceSimulation()
      .force(
        "charge",
        forceManyBody().strength((d: any) => -25 * nodeRadius(d))
      )
      .force("x", forceX(size[0] / 2).strength(forceMod * 0.1))
      .force("y", forceY(size[1] / 2).strength(0.1))

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

    // Reset alpha if too cold
    if (simulation.alpha() < 0.1) {
      simulation.alpha(1)
    }

    simulation.stop()

    // Run synchronously
    for (let i = 0; i < iterations; ++i) {
      simulation.tick()
    }

    // Resolve edge source/target to node object references so that
    // HOC style functions can access d.source.data for color lookups.
    for (const edge of edges) {
      if (typeof edge.source === "string") {
        const n = nodes.find((nd) => nd.id === edge.source)
        if (n) edge.source = n
      }
      if (typeof edge.target === "string") {
        const n = nodes.find((nd) => nd.id === (edge.target as any))
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

    // Build line edges
    for (const edge of edges) {
      const sourceNode =
        typeof edge.source === "object" ? edge.source : findNode(nodes, edge.source)
      const targetNode =
        typeof edge.target === "object" ? edge.target : findNode(nodes, edge.target)
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

function findNode(
  nodes: RealtimeNode[],
  id: string
): RealtimeNode | undefined {
  return nodes.find((n) => n.id === id)
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
