import { pie as d3Pie } from "d3-shape"
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

// ── Orbit-specific node metadata ──────────────────────────────────────

interface OrbitMeta {
  ring: number
  angle: number
  depth: number
  parentId: string | null
  eccentricity: number
}

// Per-instance orbit state is stored on the config to support multiple OrbitDiagrams
interface OrbitState {
  metaMap: Map<string, OrbitMeta>
  frame: number
}

function getOrbitState(config: NetworkPipelineConfig): OrbitState {
  const c = config as any
  if (!c.__orbitState) {
    c.__orbitState = { metaMap: new Map<string, OrbitMeta>(), frame: 0 }
  }
  return c.__orbitState
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

function resolveChildrenAccessor(acc: string | ((d: any) => any[]) | undefined): (d: any) => any[] | null {
  if (typeof acc === "function") return acc
  const field = acc || "children"
  return (d: any) => d[field] || null
}

function resolveNodeIdAccessor(acc: string | ((d: any) => string) | undefined): (d: any) => string {
  if (typeof acc === "function") return acc
  const field = acc || "name"
  return (d: any) => String(d[field] ?? "")
}

// ── Layout engine ─────────────────────────────────────────────────────

function buildOrbitLayout(
  root: any,
  size: [number, number],
  config: NetworkPipelineConfig,
  nodes: RealtimeNode[],
  edges: RealtimeEdge[]
): void {
  const childrenFn = resolveChildrenAccessor(config.childrenAccessor)
  const nodeIdFn = resolveNodeIdAccessor(config.nodeIDAccessor)
  const ringCapacities = resolveMode(config.orbitMode)
  const orbitSizeOpt = config.orbitSize ?? 2.95
  const eccentricityOpt = config.orbitEccentricity ?? 1
  const orbitSizeFn = typeof orbitSizeOpt === "number" ? () => orbitSizeOpt : orbitSizeOpt
  const eccentricityFn = typeof eccentricityOpt === "number" ? () => eccentricityOpt : eccentricityOpt

  // Clear previous state
  const state = getOrbitState(config)
  state.metaMap.clear()
  state.frame = 0
  nodes.length = 0
  edges.length = 0

  const cx = size[0] / 2
  const cy = size[1] / 2
  const maxRing = Math.min(size[0], size[1]) / 2 * 0.85

  // Create root node
  const rootId = nodeIdFn(root)
  const rootNode: RealtimeNode = {
    id: rootId,
    x: cx, y: cy,
    x0: cx, x1: cx, y0: cy, y1: cy,
    width: 0, height: 0,
    value: 0,
    depth: 0,
    data: root
  }
  nodes.push(rootNode)
  state.metaMap.set(rootId, { ring: maxRing, angle: 0, depth: 0, parentId: null, eccentricity: 1 })

  function buildTree(parentDatum: any, parentId: string, parentX: number, parentY: number, parentRing: number, depth: number, hasGrandparent: boolean) {
    const kids = childrenFn(parentDatum)
    if (!kids?.length) return

    const totalChildren = kids.length

    // Compute how many rings we need
    let ringCount = 0
    let counted = 0
    let p = 0
    while (counted < totalChildren) {
      counted += ringCapacities[Math.min(p, ringCapacities.length - 1)]
      p++
      ringCount++
    }

    let childIndex = 0
    for (let currentRing = 0; currentRing < ringCount; currentRing++) {
      const capacity = ringCapacities[Math.min(currentRing, ringCapacities.length - 1)]
      const ringSlice = kids.slice(childIndex, childIndex + capacity)
      if (!ringSlice.length) break

      const ringFraction = (currentRing + 1) / ringCount
      const r = hasGrandparent
        ? (parentRing / orbitSizeFn({ depth })) * ringFraction
        : parentRing * ringFraction

      // Use d3-pie for angular spacing — heavier children (with grandchildren) get more space
      const pieGen = d3Pie<any>()
        .value((kid: any) => {
          const hasKids = childrenFn(kid)?.length
          return hasKids ? 4 : 1
        })
        .sort(null)

      const arcs = pieGen(ringSlice)
      const ecc = eccentricityFn({ depth })

      for (let j = 0; j < ringSlice.length; j++) {
        const angle = (arcs[j].startAngle + arcs[j].endAngle) / 2
        const kidDatum = ringSlice[j]
        const kidId = nodeIdFn(kidDatum)

        const x = parentX + r * Math.sin(angle)
        const y = parentY + r * Math.cos(angle) * ecc

        const kidNode: RealtimeNode = {
          id: kidId,
          x, y,
          x0: x, x1: x, y0: y, y1: y,
          width: 0, height: 0,
          value: 0,
          depth,
          data: kidDatum
        }
        nodes.push(kidNode)

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

        buildTree(kidDatum, kidId, x, y, r, depth + 1, true)
      }

      childIndex += capacity
    }
  }

  buildTree(root, rootId, cx, cy, maxRing, 1, false)
}

// ── Tick: update positions each frame ─────────────────────────────────

function tickOrbitPositions(
  nodes: RealtimeNode[],
  config: NetworkPipelineConfig,
  _size: [number, number]
): void {
  const state = getOrbitState(config)
  const speed = config.orbitSpeed ?? 0.25
  const tickStep = speed * (Math.PI / 360)
  const revolutionFn = config.orbitRevolution ?? ((n: any) => 1 / ((n.depth ?? 0) + 1))

  // Build a node lookup for parent positions
  const nodeMap = new Map<string, RealtimeNode>()
  for (const node of nodes) {
    nodeMap.set(node.id, node)
  }

  for (const node of nodes) {
    const meta = state.metaMap.get(node.id)
    if (!meta || !meta.parentId) continue

    const parent = nodeMap.get(meta.parentId)
    if (!parent) continue

    const a = meta.angle + state.frame * tickStep * revolutionFn({ depth: meta.depth })
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
    const hierarchyRoot = (config as any).__hierarchyRoot
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
    const nodeStyleFn = config.nodeStyle
    const nodeSize = config.nodeSize
    const nodeSizeFn = typeof nodeSize === "number"
      ? () => nodeSize
      : typeof nodeSize === "function"
        ? nodeSize
        : () => 6

    const sceneNodes: NetworkCircleNode[] = []
    const sceneEdges: NetworkLineEdge[] = []
    const labels: NetworkLabel[] = []

    // Build ring ellipses as "decoration" scene edges (rendered as line edges
    // but the HOC will override with foregroundGraphics for ellipses)

    // Build circle nodes
    for (const node of nodes) {
      if (node.x == null || node.y == null) continue

      const r = nodeSizeFn(node)
      const userStyle = nodeStyleFn ? nodeStyleFn(node) : {}
      const style: Style = {
        fill: userStyle.fill || "#6366f1",
        stroke: userStyle.stroke || "#fff",
        strokeWidth: userStyle.strokeWidth ?? 1,
        opacity: userStyle.opacity ?? ((node.depth ?? 0) === 0 ? 1 : 0.85)
      }

      sceneNodes.push({
        type: "circle",
        cx: node.x,
        cy: node.y,
        r,
        style,
        datum: node,
        id: node.id,
        label: node.id,
        depth: node.depth
      })
    }

    // Build line edges (parent → child)
    const nodeMap = new Map<string, RealtimeNode>()
    for (const n of nodes) nodeMap.set(n.id, n)

    for (const edge of edges) {
      const sourceNode = typeof edge.source === "object" ? edge.source : nodeMap.get(edge.source)
      const targetNode = typeof edge.target === "object" ? edge.target : nodeMap.get(edge.target)
      if (!sourceNode || !targetNode) continue
      if (sourceNode.x == null || targetNode.x == null) continue

      const style: Style = {
        stroke: "currentColor",
        strokeWidth: 0.5,
        opacity: 0.1
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

    // Labels
    if (config.showLabels) {
      const labelFn = config.nodeLabel
      for (const node of nodes) {
        const r = nodeSizeFn(node)
        if (r <= 4) continue
        const text = typeof labelFn === "function"
          ? labelFn(node)
          : labelFn
            ? (node.data?.[labelFn] ?? node.id)
            : node.id

        labels.push({
          x: node.x,
          y: node.y + r + 12,
          text: String(text),
          anchor: "middle",
          fontSize: 10,
          fill: "currentColor"
        })
      }
    }

    return { sceneNodes, sceneEdges, labels }
  },

  tick(
    nodes: RealtimeNode[],
    _edges: RealtimeEdge[],
    config: NetworkPipelineConfig,
    size: [number, number],
    _deltaTime: number
  ): boolean {
    if (config.orbitAnimated === false) return false
    const state = getOrbitState(config)
    state.frame++
    tickOrbitPositions(nodes, config, size)
    return true // always rebuild scene
  }
}
