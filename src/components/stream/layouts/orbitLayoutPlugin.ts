import { buildNetworkLinks, buildLinkNodes, buildLinkLabels, indexLinkNodes } from "./networkLinkScene"
import { networkPluginState } from "../networkPluginState"
import { pie as d3Pie } from "d3-shape"
import { flattenHierarchy } from "../../charts/shared/networkUtils"
import { resolveChildrenAccessor, uniqueHierarchyIds } from "./hierarchyUtils"
import type {
  NetworkLayoutPlugin,
  NetworkPipelineConfig,
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkLineEdge,
  NetworkLabel,
  RealtimeNode,
  RealtimeEdge
} from "../networkTypes"
import type { Style } from "../types"
import type { Datum } from "../../charts/shared/datumTypes"

// ── Orbit-specific node metadata ──────────────────────────────────────

interface OrbitMeta {
  ring: number
  angle: number
  depth: number
  parentId: string | null
  eccentricity: number
}

interface OrbitState {
  metaMap: Map<string, OrbitMeta>
  startTime: number
}

const orbitNow = () => globalThis.performance?.now() ?? Date.now()

function numberAccessor<T>(value: number | ((datum: T) => number)) {
  return typeof value === "number" ? () => value : value
}

function getOrbitState(config: NetworkPipelineConfig): OrbitState {
  return networkPluginState(config, "orbit", () => ({
    metaMap: new Map<string, OrbitMeta>(),
    startTime: orbitNow(),
  }))
}

// ── Helpers ───────────────────────────────────────────────────────────

function resolveMode(mode: string | number[] | undefined): number[] {
  if (Array.isArray(mode)) return mode
  switch (mode) {
    case "solar": return [1]
    case "atomic": return [2, 8]
    case "flat":
    default: return [9999]
  }
}

function resolveNodeIdAccessor(acc: string | ((d: Datum) => string) | undefined): (d: Datum) => string {
  if (typeof acc === "function") return acc
  const field = acc || "name"
  return (d: Datum) => String(d[field] ?? "")
}

/**
 * Structural shape this revolution-style callback reads. We could use
 * `RealtimeNode`'s full shape here but every consumer only reads
 * `depth`, so the narrower contract makes the code (and the type
 * dependency footprint) honest.
 */
type DepthLike = { depth?: number }

function resolveRevolutionStyle(style: "locked" | "decay" | "alternate" | undefined): (n: DepthLike) => number {
  switch (style) {
    case "decay":
      // Each depth level is exponentially slower — outer rings wind down
      return (n) => Math.pow(0.6, n.depth ?? 0)
    case "alternate":
      // Odd depths reverse direction — counter-rotating rings
      return (n) => {
        const d = n.depth ?? 0
        const sign = d % 2 === 0 ? 1 : -1
        return sign / (d + 1)
      }
    case "locked":
    default:
      // Children rotate with parent at speed proportional to 1/(depth+1)
      return (n) => 1 / ((n.depth ?? 0) + 1)
  }
}

// ── Layout engine ─────────────────────────────────────────────────────

function buildOrbitLayout(
  root: Datum,
  size: [number, number],
  config: NetworkPipelineConfig,
  nodes: RealtimeNode[],
  edges: RealtimeEdge[]
): void {
  const childrenFn = resolveChildrenAccessor(config.childrenAccessor || "children")!
  const nodeIdFn = resolveNodeIdAccessor(config.nodeIDAccessor)
  const ringCapacities = resolveMode(config.orbitMode)
  const ringCapacity = (index: number) => ringCapacities[Math.min(index, ringCapacities.length - 1)]
  const orbitSizeFn = numberAccessor(config.orbitSize ?? 2.95)
  const eccentricityFn = numberAccessor(config.orbitEccentricity ?? 1)

  // Clear previous layout state (but preserve frame counter for continuous animation)
  const state = getOrbitState(config)
  state.metaMap.clear()
  nodes.length = 0
  edges.length = 0

  // Reserve authored suffix-shaped IDs before assigning occurrence suffixes.
  const ids = uniqueHierarchyIds(
    flattenHierarchy(root, childrenFn).map((datum) => String(nodeIdFn(datum)))
  )
  const angularLayout = d3Pie<Datum>().value(kid => childrenFn(kid)?.length ? 4 : 1).sort(null)
  let idIndex = 0

  const cx = size[0] / 2
  const cy = size[1] / 2
  const maxRing = (Math.min(size[0], size[1]) / 2) * 0.85

  function addNode(id: string, x: number, y: number, depth: number, data: Datum) {
    nodes.push({ id, x, y, x0: x, x1: x, y0: y, y1: y, width: 0, height: 0, value: 0, depth, data })
  }

  const rootId = ids[idIndex++]
  addNode(rootId, cx, cy, 0, root)
  state.metaMap.set(rootId, { ring: maxRing, angle: 0, depth: 0, parentId: null, eccentricity: 1 })

  function buildTree(parentDatum: Datum, parentId: string, parentX: number, parentY: number, parentRing: number, depth: number) {
    const kids = childrenFn(parentDatum)
    if (!kids?.length) return

    const totalChildren = kids.length

    // Compute how many rings we need
    let ringCount = 0
    let counted = 0
    while (counted < totalChildren) {
      counted += ringCapacity(ringCount)
      ringCount++
    }

    let childIndex = 0
    for (let currentRing = 0; currentRing < ringCount; currentRing++) {
      const capacity = ringCapacity(currentRing)
      const ringSlice = kids.slice(childIndex, childIndex + capacity)
      if (!ringSlice.length) break

      const ringFraction = (currentRing + 1) / ringCount
      // Build a context object for callbacks that matches what user functions expect
      const depthContext = { id: parentId, depth, data: parentDatum, parentId: parentId }
      const r = depth > 1
        ? (parentRing / orbitSizeFn(depthContext)) * ringFraction
        : parentRing * ringFraction

      const arcs = angularLayout(ringSlice)
      const ecc = eccentricityFn(depthContext)

      for (let j = 0; j < ringSlice.length; j++) {
        const angle = (arcs[j].startAngle + arcs[j].endAngle) / 2
        const kidDatum = ringSlice[j]
        const kidId = ids[idIndex++]

        const x = parentX + r * Math.sin(angle)
        const y = parentY + r * Math.cos(angle) * ecc

        addNode(kidId, x, y, depth, kidDatum)
        state.metaMap.set(kidId, { ring: r, angle, depth, parentId: parentId, eccentricity: ecc })

        // Edge from parent to child
        edges.push({
          source: parentId,
          target: kidId,
          value: 1,
          y0: 0, y1: 0,
          sankeyWidth: 0,
          data: { source: parentId, target: kidId }
        })

        buildTree(kidDatum, kidId, x, y, r, depth + 1)
      }

      childIndex += capacity
    }
  }

  buildTree(root, rootId, cx, cy, maxRing, 1)
}

// ── Tick: update positions each frame ─────────────────────────────────

function tickOrbitPositions(
  nodes: RealtimeNode[],
  config: NetworkPipelineConfig
): void {
  const state = getOrbitState(config)
  const speed = config.orbitSpeed ?? 0.25
  const revolutionFn = config.orbitRevolution ?? resolveRevolutionStyle(config.orbitRevolutionStyle)

  // Use wall-clock elapsed time for deterministic animation regardless of
  // re-render frequency or frame rate
  const elapsed = (orbitNow() - state.startTime) / 1000 // seconds
  const baseRate = speed * (Math.PI / 6) // radians per second (speed=0.25 → ~7.5°/s)

  // Build a node lookup for parent positions
  const nodeMap = indexLinkNodes(nodes)

  for (const node of nodes) {
    const meta = state.metaMap.get(node.id)
    if (!meta || !meta.parentId) continue

    const parent = nodeMap.get(meta.parentId)
    if (!parent) continue

    // Pass actual node context to revolutionFn
    const nodeContext = { id: node.id, depth: meta.depth, data: node.data, parentId: meta.parentId }
    const a = meta.angle + elapsed * baseRate * revolutionFn(nodeContext)
    node.x = parent.x + meta.ring * Math.sin(a)
    node.y = parent.y + meta.ring * Math.cos(a) * meta.eccentricity

    // Keep bounding box in sync
    node.x0 = node.x
    node.x1 = node.x
    node.y0 = node.y
    node.y1 = node.y
  }
}

// ── Plugin ────────────────────────────────────────────────────────────

export const orbitLayoutPlugin: NetworkLayoutPlugin = {
  supportsStreaming: false,
  hierarchical: true,
  supportsAnimation: true,

  computeLayout(
    nodes: RealtimeNode[],
    edges: RealtimeEdge[],
    config: NetworkPipelineConfig,
    size: [number, number]
  ): void {
    const hierarchyRoot = config.__hierarchyRoot as Datum | undefined
    if (!hierarchyRoot) return

    buildOrbitLayout(hierarchyRoot, size, config, nodes, edges)
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
    const nodeSize = config.nodeSize
    const nodeSizeFn = numberAccessor(typeof nodeSize === "string" ? 6 : nodeSize ?? 6)

    const ringEdges: NetworkLineEdge[] = []

    // Build orbit ring ellipses (when orbitShowRings !== false)
    if (config.orbitShowRings !== false) {
      const state = getOrbitState(config)
      const nodeMap = indexLinkNodes(nodes)

      const rings = new Set<string>()
      const segments = 48
      const style: Style = { stroke: "rgba(128,128,128,0.35)", strokeWidth: 0.5, opacity: 1 }
      for (const { parentId, ring, eccentricity } of state.metaMap.values()) {
        if (!parentId) continue
        const key = `${parentId}:${ring}`
        const parent = nodeMap.get(parentId)
        if (!parent || rings.has(key)) continue
        rings.add(key)
        let x1 = parent.x
        let y1 = parent.y + ring * eccentricity
        for (let segment = 1; segment <= segments; segment++) {
          const angle = (segment / segments) * Math.PI * 2
          const x2 = parent.x + ring * Math.sin(angle)
          const y2 = parent.y + ring * Math.cos(angle) * eccentricity
          ringEdges.push({ type: "line", x1, y1, x2, y2, style, interactive: false, datum: null })
          x1 = x2
          y1 = y2
        }
      }
    }

    const sceneNodes = buildLinkNodes(nodes, config, nodeSizeFn, node => ({
      fill: config.themeSemantic?.primary || "#6366f1",
      strokeWidth: 1,
      opacity: (node.depth ?? 0) === 0 ? 1 : 0.85,
    }))

    const links = buildNetworkLinks(
      sceneNodes, edges, size[1], config.edgeStyle, "rgba(128,128,128,0.35)", 0.5, 1,
    )

    const label = config.nodeLabel
    const labels = config.showLabels ? buildLinkLabels(sceneNodes, "below", node =>
      typeof label === "function" ? label(node) : label ? (node.data?.[label] ?? node.id) : node.id
    ) : []
    return { sceneNodes, sceneEdges: [...ringEdges, ...links], labels }
  },

  tick(
    nodes: RealtimeNode[],
    _edges: RealtimeEdge[],
    config: NetworkPipelineConfig
  ): boolean {
    if (config.orbitAnimated === false) return false
    tickOrbitPositions(nodes, config)
    return true // always rebuild scene
  }
}
