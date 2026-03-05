import { chord, ribbon } from "d3-chord"
import { arc } from "d3-shape"
import { schemeCategory10, schemeTableau10 } from "d3-scale-chromatic"
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

const DEFAULT_PALETTE = schemeCategory10 as readonly string[]

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
    const arcGenerator = arc()
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

    // ── Resolve edge source/target to node references ─────────────────
    // The HOC edge style functions need d.source/d.target as node objects
    // (not string IDs) so they can look up colors via d.source.data.
    const nodeMap = new Map<string, RealtimeNode>()
    for (const n of nodes) nodeMap.set(n.id, n)

    for (const edge of edges) {
      const srcId = typeof edge.source === "string" ? edge.source : edge.source.id
      const tgtId = typeof edge.target === "string" ? edge.target : edge.target.id
      const srcNode = nodeMap.get(srcId)
      const tgtNode = nodeMap.get(tgtId)
      if (srcNode) edge.source = srcNode
      if (tgtNode) edge.target = tgtNode
    }

    // ── Stash chord data on edges for buildScene ─────────────────────
    // Build bidirectional edge lookup (chord may emit in either direction)
    const edgeLookup = new Map<string, RealtimeEdge>()
    for (const e of edges) {
      const eSrc = typeof e.source === "string" ? e.source : e.source.id
      const eTgt = typeof e.target === "string" ? e.target : e.target.id
      edgeLookup.set(`${eSrc}\0${eTgt}`, e)
    }

    for (const generatedChord of chords) {
      const sourceId = nodes[generatedChord.source.index].id
      const targetId = nodes[generatedChord.target.index].id

      // d3-chord always emits source.index < target.index, which may
      // not match the original edge direction. Try both key orders.
      const matchedEdge =
        edgeLookup.get(`${sourceId}\0${targetId}`) ||
        edgeLookup.get(`${targetId}\0${sourceId}`)

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

    const nodeStyleFn = config.nodeStyle
    const edgeStyleFn = config.edgeStyle
    const edgeColorBy = config.edgeColorBy || "source"

    // Auto-color palette: used when no nodeStyle is provided
    const palette = Array.isArray(config.colorScheme)
      ? config.colorScheme
      : DEFAULT_PALETTE
    // Build a node-id → color map for consistent coloring
    const nodeColorMap = new Map<string, string>()
    nodes.forEach((n, i) => {
      nodeColorMap.set(n.id, palette[i % palette.length])
    })

    const ribbonGenerator = ribbon().radius(innerRadius)

    const sceneNodes: NetworkArcNode[] = []
    const sceneEdges: NetworkRibbonEdge[] = []
    const labels: NetworkLabel[] = []

    // ── Build arc nodes ──────────────────────────────────────────────
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      const arcData = (node as any).arcData
      if (!arcData) continue

      let fill: string
      if (nodeStyleFn) {
        const userStyle = nodeStyleFn(node)
        fill = userStyle.fill || nodeColorMap.get(node.id) || palette[i % palette.length]
      } else {
        fill = nodeColorMap.get(node.id) || palette[i % palette.length]
      }

      const userStyle = nodeStyleFn ? nodeStyleFn(node) : {}
      const style: Style = {
        fill,
        stroke: userStyle.stroke || "black",
        strokeWidth: userStyle.strokeWidth ?? 1,
        opacity: userStyle.opacity
      }

      // d3-chord angles start at 12 o'clock; canvas arc() starts at 3 o'clock
      // Offset by -PI/2 to align arcs with labels and ribbons
      sceneNodes.push({
        type: "arc",
        cx,
        cy,
        innerR: innerRadius,
        outerR: radius,
        startAngle: arcData.startAngle - Math.PI / 2,
        endAngle: arcData.endAngle - Math.PI / 2,
        style,
        datum: node,
        id: node.id,
        label: node.id
      })
    }

    // ── Build ribbon edges ───────────────────────────────────────────
    // d3-chord ribbon paths are centered at (0,0). Offset every
    // coordinate by (cx, cy) so they align with the arc nodes.
    for (const edge of edges) {
      const chordData = (edge as any).chordData
      if (!chordData) continue

      // d3-chord's ribbon() internally subtracts PI/2 from all angles
      // (converting from d3's 12-o'clock convention to standard math coords),
      // so we must NOT pre-offset here — otherwise we double-subtract.
      const rawPath = ribbonGenerator(chordData)
      if (!rawPath) continue

      const pathD = translateSvgPath(rawPath, cx, cy)

      // Resolve edge fill — use edgeStyle if provided, otherwise
      // inherit from source or target node color
      let fill = "#999"
      if (edgeStyleFn) {
        const userStyle = edgeStyleFn(edge)
        fill = userStyle.fill || fill
      } else {
        // Auto-color by source or target node
        const srcNode = typeof edge.source === "object" ? edge.source : null
        const tgtNode = typeof edge.target === "object" ? edge.target : null
        if (edgeColorBy === "target" && tgtNode) {
          fill = nodeColorMap.get(tgtNode.id) || fill
        } else if (srcNode) {
          fill = nodeColorMap.get(srcNode.id) || fill
        }
      }

      const userStyle = edgeStyleFn ? edgeStyleFn(edge) : {}
      const style: Style = {
        fill,
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

/**
 * Translate all absolute coordinates in an SVG path string by (dx, dy).
 *
 * d3-chord ribbon() produces paths using only M, C, Q, L, A, and Z commands
 * with absolute coordinates. We parse the numeric values and offset the
 * positional ones. For arc (A) commands the positional values are the last
 * two numbers in each 7-parameter group.
 */
function translateSvgPath(d: string, dx: number, dy: number): string {
  // Tokenize: split into command letters and number tokens
  const tokens = d.match(/[a-zA-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g)
  if (!tokens) return d

  const out: string[] = []
  let i = 0

  while (i < tokens.length) {
    const cmd = tokens[i]

    if (cmd === "M" || cmd === "L") {
      out.push(cmd)
      i++
      // Pairs of (x, y) follow
      while (i < tokens.length && !isNaN(Number(tokens[i]))) {
        out.push(String(Number(tokens[i]) + dx))
        i++
        if (i < tokens.length && !isNaN(Number(tokens[i]))) {
          out.push(String(Number(tokens[i]) + dy))
          i++
        }
      }
    } else if (cmd === "C") {
      out.push(cmd)
      i++
      // Triplets of (x,y) control points
      while (i < tokens.length && !isNaN(Number(tokens[i]))) {
        for (let p = 0; p < 3 && i < tokens.length; p++) {
          if (isNaN(Number(tokens[i]))) break
          out.push(String(Number(tokens[i]) + dx))
          i++
          if (i < tokens.length && !isNaN(Number(tokens[i]))) {
            out.push(String(Number(tokens[i]) + dy))
            i++
          }
        }
      }
    } else if (cmd === "Q") {
      out.push(cmd)
      i++
      // Pairs of (x,y) — 2 pairs per Q
      while (i < tokens.length && !isNaN(Number(tokens[i]))) {
        for (let p = 0; p < 2 && i < tokens.length; p++) {
          if (isNaN(Number(tokens[i]))) break
          out.push(String(Number(tokens[i]) + dx))
          i++
          if (i < tokens.length && !isNaN(Number(tokens[i]))) {
            out.push(String(Number(tokens[i]) + dy))
            i++
          }
        }
      }
    } else if (cmd === "A") {
      out.push(cmd)
      i++
      // Arc: rx ry x-rotation large-arc-flag sweep-flag x y
      while (i < tokens.length && !isNaN(Number(tokens[i]))) {
        // rx, ry — no offset
        out.push(tokens[i++])
        if (i < tokens.length) out.push(tokens[i++]) // ry
        if (i < tokens.length) out.push(tokens[i++]) // x-rotation
        if (i < tokens.length) out.push(tokens[i++]) // large-arc-flag
        if (i < tokens.length) out.push(tokens[i++]) // sweep-flag
        // x, y — offset
        if (i < tokens.length) {
          out.push(String(Number(tokens[i]) + dx))
          i++
        }
        if (i < tokens.length) {
          out.push(String(Number(tokens[i]) + dy))
          i++
        }
      }
    } else if (cmd === "Z" || cmd === "z") {
      out.push(cmd)
      i++
    } else {
      // Unknown or lowercase relative command — pass through
      out.push(tokens[i])
      i++
    }
  }

  return out.join(" ")
}
