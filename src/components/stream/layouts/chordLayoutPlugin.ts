import { chord, ribbon } from "d3-chord"
import { arc } from "d3-shape"
import type {
  NetworkLayoutPlugin,
  NetworkPipelineConfig,
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkArcNode,
  NetworkRibbonEdge,
  NetworkLabel,
  RealtimeNode,
  RealtimeEdge
} from "../networkTypes"
import type { Style } from "../types"

/**
 * Chord layout plugin — uses d3-chord for layout computation.
 *
 * Produces arc scene nodes for chord group arcs and ribbon scene edges
 * for the chord ribbons. Labels are positioned outside arcs.
 */
export const chordLayoutPlugin: NetworkLayoutPlugin = {
  supportsStreaming: false,
  hierarchical: false,

  computeLayout(
    nodes: RealtimeNode[],
    edges: RealtimeEdge[],
    config: NetworkPipelineConfig,
    size: [number, number]
  ): void {
    if (nodes.length === 0) return

    const { padAngle = 0.01, groupWidth = 20, sortGroups } = config

    const radius = Math.min(size[0], size[1]) / 2
    const innerRadius = radius - groupWidth
    const cx = size[0] / 2
    const cy = size[1] / 2

    const valueAccessorFn = resolveValueAccessor(config.valueAccessor)

    // ── Build node index map ──────────────────────────────────────────
    const nodeIndex = new Map<string, number>()
    for (let i = 0; i < nodes.length; i++) {
      nodeIndex.set(nodes[i].id, i)
    }

    // ── Build NxN matrix from edges ───────────────────────────────────
    const n = nodes.length
    const matrix: number[][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => 0)
    )

    for (const edge of edges) {
      const sourceId =
        typeof edge.source === "string" ? edge.source : edge.source.id
      const targetId =
        typeof edge.target === "string" ? edge.target : edge.target.id

      const si = nodeIndex.get(sourceId)
      const ti = nodeIndex.get(targetId)
      if (si === undefined || ti === undefined) continue

      const value = valueAccessorFn(edge)
      matrix[si][ti] = value
    }

    // ── Run chord generator ───────────────────────────────────────────
    const chordGenerator = chord().padAngle(padAngle)
    if (sortGroups) {
      chordGenerator.sortGroups(sortGroups)
    }

    const chords = chordGenerator(matrix)
    const groups = chords.groups

    // ── Arc generator for centroid calculation ────────────────────────
    const arcGenerator = arc<any>()
      .innerRadius(innerRadius)
      .outerRadius(radius)

    // ── Set node positions from arc centroids ────────────────────────
    for (const group of groups) {
      const node = nodes[group.index]
      const centroid = arcGenerator.centroid(group)

      node.x = centroid[0] + cx
      node.y = centroid[1] + cy

      // Stash arc data on the node for buildScene
      ;(node as any).arcData = {
        startAngle: group.startAngle,
        endAngle: group.endAngle
      }
    }

    // ── Stash chord data on edges for buildScene ─────────────────────
    for (const generatedChord of chords) {
      const sourceId = nodes[generatedChord.source.index].id
      const targetId = nodes[generatedChord.target.index].id

      // d3-chord always emits source.index < target.index, which may
      // not match the original edge direction. Try both key orders.
      const matchedEdge = edges.find((e) => {
        const eSrc =
          typeof e.source === "string" ? e.source : e.source.id
        const eTgt =
          typeof e.target === "string" ? e.target : e.target.id
        return (
          (eSrc === sourceId && eTgt === targetId) ||
          (eSrc === targetId && eTgt === sourceId)
        )
      })

      if (matchedEdge) {
        ;(matchedEdge as any).chordData = generatedChord
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
    const { groupWidth = 20, edgeOpacity = 0.5 } = config

    const radius = Math.min(size[0], size[1]) / 2
    const innerRadius = radius - groupWidth
    const cx = size[0] / 2
    const cy = size[1] / 2

    const nodeStyleFn =
      config.nodeStyle || ((): Record<string, any> => ({ fill: "#4d430c" }))
    const edgeStyleFn =
      config.edgeStyle || ((): Record<string, any> => ({}))

    const ribbonGenerator = ribbon<any, any>().radius(innerRadius)

    const sceneNodes: NetworkArcNode[] = []
    const sceneEdges: NetworkRibbonEdge[] = []
    const labels: NetworkLabel[] = []

    // ── Build arc nodes ──────────────────────────────────────────────
    for (const node of nodes) {
      const arcData = (node as any).arcData
      if (!arcData) continue

      const userStyle = nodeStyleFn(node)
      const style: Style = {
        fill: userStyle.fill || "#4d430c",
        stroke: userStyle.stroke,
        strokeWidth: userStyle.strokeWidth,
        opacity: userStyle.opacity
      }

      sceneNodes.push({
        type: "arc",
        cx,
        cy,
        innerR: innerRadius,
        outerR: radius,
        startAngle: arcData.startAngle,
        endAngle: arcData.endAngle,
        style,
        datum: node,
        id: node.id,
        label: node.id
      })
    }

    // ── Build ribbon edges ───────────────────────────────────────────
    for (const edge of edges) {
      const chordData = (edge as any).chordData
      if (!chordData) continue

      const pathD = ribbonGenerator(chordData)
      if (!pathD) continue

      const userStyle = edgeStyleFn(edge)
      const style: Style = {
        fill: userStyle.fill || "#999",
        fillOpacity: userStyle.fillOpacity ?? edgeOpacity,
        stroke: userStyle.stroke || "none",
        strokeWidth: userStyle.strokeWidth,
        opacity: userStyle.opacity
      }

      sceneEdges.push({
        type: "ribbon",
        pathD,
        style,
        datum: edge
      })
    }

    // ── Build labels ─────────────────────────────────────────────────
    if (config.showLabels !== false) {
      const labelFn = resolveLabelFn(config.nodeLabel)
      const labelRadius = radius + 12

      for (const node of nodes) {
        const arcData = (node as any).arcData
        if (!arcData) continue

        const text = labelFn ? labelFn(node) : node.id
        if (!text) continue

        const midAngle =
          (arcData.startAngle + arcData.endAngle) / 2
        // Angles in d3-chord start from 12 o'clock (top), going clockwise.
        // Convert to standard x/y: subtract PI/2.
        const angle = midAngle - Math.PI / 2
        const lx = cx + Math.cos(angle) * labelRadius
        const ly = cy + Math.sin(angle) * labelRadius

        // Anchor depends on which side of the circle the label is on
        const anchor: "start" | "middle" | "end" =
          midAngle > Math.PI ? "end" : "start"

        labels.push({
          x: lx,
          y: ly,
          text: String(text),
          anchor,
          baseline: "middle",
          fontSize: 11
        })
      }
    }

    return { sceneNodes, sceneEdges, labels }
  }
}

function resolveLabelFn(
  nodeLabel: string | ((d: any) => string) | undefined
): ((d: any) => string) | null {
  if (!nodeLabel) return null
  if (typeof nodeLabel === "function") return nodeLabel
  return (d: any) => d[nodeLabel] || d.id
}

function resolveValueAccessor(
  valueAccessor: string | ((d: any) => number) | undefined
): (d: any) => number {
  if (!valueAccessor) return (d: any) => d.value ?? 1
  if (typeof valueAccessor === "function") return valueAccessor
  return (d: any) => d[valueAccessor] ?? 1
}
