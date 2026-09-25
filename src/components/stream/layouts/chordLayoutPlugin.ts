import { chord, ribbon, type Chord } from "d3-chord"
import { wrapWithDataHint } from "../devDataAccessWarning"
import { resolveLabelFn, resolveNodeRefId } from "../accessorUtils"
import { arc, type DefaultArcObject } from "d3-shape"
import { schemeCategory10 } from "../../charts/shared/colorPalettes"
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
import { registerLayoutPlugin } from "./registry"

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
    // A relayout may remove every positive edge. Discard geometry before
    // any early return so old ribbons and isolated arcs cannot survive.
    for (const node of nodes) delete node.__arcData
    for (const edge of edges) {
      delete edge.__chordData
      delete edge.__chordEdges
    }
    if (nodes.length === 0) return

    const { padAngle = 0.01, groupWidth = 20, sortGroups } = config

    const radius = Math.min(size[0], size[1]) / 2
    const innerRadius = radius - groupWidth
    const cx = size[0] / 2
    const cy = size[1] / 2

    const nodeMap = new Map(nodes.map((node) => [node.id, node]))
    const activeIds = new Set<string>()
    const positiveEdges = edges.filter((edge) => {
      const sourceId = resolveNodeRefId(edge.source)
      const targetId = resolveNodeRefId(edge.target)
      // Ingestion already resolved the user's accessor against the raw row.
      // Negative and non-finite values have no meaningful angular extent.
      if (
        !Number.isFinite(edge.value) || edge.value <= 0 ||
        !nodeMap.has(sourceId) || !nodeMap.has(targetId)
      ) return false
      activeIds.add(sourceId)
      activeIds.add(targetId)
      return true
    })
    const activeNodes = nodes.filter((node) => activeIds.has(node.id))
    const n = activeNodes.length
    if (n === 0) return
    const nodeIndex = new Map(activeNodes.map((node, index) => [node.id, index]))
    const matrix: number[][] = Array.from({ length: n }, () =>
      new Array<number>(n).fill(0)
    )
    const edgeLookup = new Map<string, RealtimeEdge[]>()
    for (const edge of positiveEdges) {
      const sourceId = resolveNodeRefId(edge.source)
      const targetId = resolveNodeRefId(edge.target)
      const si = nodeIndex.get(sourceId)!
      const ti = nodeIndex.get(targetId)!
      matrix[si][ti] += edge.value
      // One ribbon represents both directions and all parallel input rows.
      const key = si <= ti ? `${si}\0${ti}` : `${ti}\0${si}`
      const contributors = edgeLookup.get(key)
      if (contributors) contributors.push(edge)
      else edgeLookup.set(key, [edge])
    }

    // Reserve at least half the circle for data, even with many categories.
    const gap = Math.min(
      Number.isFinite(padAngle) ? Math.max(0, padAngle) : 0.01,
      Math.PI / n
    )
    const chordGenerator = chord().padAngle(gap)
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
      const node = activeNodes[group.index]
      // ChordGroup carries startAngle/endAngle but no innerRadius/outerRadius;
      // construct an explicit DefaultArcObject so the centroid call
      // satisfies d3-shape's typed accessor contract.
      const arcArg: DefaultArcObject = {
        innerRadius,
        outerRadius: radius,
        startAngle: group.startAngle,
        endAngle: group.endAngle,
      }
      const centroid = arcGenerator.centroid(arcArg)

      node.x = centroid[0] + cx
      node.y = centroid[1] + cy

      // Stash arc data on the node for buildScene. `__arcData` is
      // declared on RealtimeNode with this concrete shape — chord is
      // the only writer, so no narrowing-at-read is needed (unlike
      // `__hierarchyNode` whose shape varies per layout).
      node.__arcData = {
        startAngle: group.startAngle,
        endAngle: group.endAngle,
      }
    }

    // ── Resolve edge source/target to node references ─────────────────
    // The HOC edge style functions need d.source/d.target as node objects
    // (not string IDs) so they can look up colors via d.source.data.
    for (const edge of edges) {
      const srcId = resolveNodeRefId(edge.source)
      const tgtId = resolveNodeRefId(edge.target)
      const srcNode = nodeMap.get(srcId)
      const tgtNode = nodeMap.get(tgtId)
      if (srcNode) edge.source = srcNode
      if (tgtNode) edge.target = tgtNode
    }

    for (const generatedChord of chords) {
      const si = generatedChord.source.index
      const ti = generatedChord.target.index
      const key = si <= ti ? `${si}\0${ti}` : `${ti}\0${si}`
      const contributors = edgeLookup.get(key)!
      for (const edge of contributors) {
        edge.__chordData = generatedChord
        edge.__chordEdges = contributors
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

    // Auto-color palette: used when no nodeStyle is provided.
    // Priority: explicit array colorScheme > theme categorical (non-empty) > DEFAULT_PALETTE.
    // Guard length: an empty categorical array would yield undefined fills
    // from the modulo lookup below.
    const palette = Array.isArray(config.colorScheme)
      ? config.colorScheme
      : (config.themeCategorical && config.themeCategorical.length > 0
          ? config.themeCategorical
          : DEFAULT_PALETTE)
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
      const arcData = node.__arcData
      if (!arcData) continue

      const userStyle = nodeStyleFn ? nodeStyleFn(wrapWithDataHint(node, "nodeStyle")) : {}
      const fill =
        (typeof userStyle.fill === "string" ? userStyle.fill : undefined) ||
        nodeColorMap.get(node.id) ||
        palette[i % palette.length]
      const style: Style = {
        fill,
        stroke: userStyle.stroke || "black",
        strokeWidth: userStyle.strokeWidth ?? 1,
        opacity: userStyle.opacity,
        cursor: userStyle.cursor
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
    const renderedChords = new Set<Chord>()
    const activeNodes = nodes.filter((node) => node.__arcData)
    for (let edge of edges) {
      // `edge.__chordData` is `unknown` on RealtimeEdge — narrow at
      // the read site rather than coupling networkTypes to d3-chord's
      // `Chord`.
      const chordData = edge.__chordData as Chord | undefined
      if (!chordData || renderedChords.has(chordData)) continue
      renderedChords.add(chordData)
      // Preserve the historical representative used by style/custom tooltip
      // callbacks: the last authored row in d3's source direction (the larger
      // matrix cell). All contributing rows remain available on the datum.
      const sourceId = activeNodes[chordData.source.index].id
      for (const contributor of edge.__chordEdges || []) {
        if (resolveNodeRefId(contributor.source) === sourceId) edge = contributor
      }

      // d3-chord's ribbon() internally subtracts PI/2 from all angles
      // (converting from d3's 12-o'clock convention to standard math coords),
      // so we must NOT pre-offset here — otherwise we double-subtract.
      //
      // The cast through `unknown` is the boundary between d3-chord's
      // `Chord` (no per-subgroup `radius`) and the generator's `Ribbon`
      // input type (which carries `radius`). At runtime our generator
      // is configured with `.radius(innerRadius)` as a constant, so the
      // per-`Ribbon` `radius` field is never read — `Chord` is
      // structurally sufficient.
      const rawPath = ribbonGenerator(chordData as unknown as Parameters<typeof ribbonGenerator>[0]) as string | undefined
      if (!rawPath) continue

      const pathD = translateSvgPath(rawPath, cx, cy)

      // Resolve edge fill — use edgeStyle if provided, otherwise
      // inherit from source or target node color.
      // Fallback order matches other Network edge defaults (tree / force /
      // sankey / connector): theme border first, then secondary, then
      // hardcoded #999.
      let fill = config.themeSemantic?.border || config.themeSemantic?.secondary || "#999"
      const userStyle = edgeStyleFn ? edgeStyleFn(wrapWithDataHint(edge, "edgeStyle")) : {}
      if (edgeStyleFn) {
        fill =
          (typeof userStyle.fill === "string" ? userStyle.fill : undefined) ||
          fill
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

      const style: Style = {
        fill,
        fillOpacity: userStyle.fillOpacity ?? edgeOpacity,
        stroke: userStyle.stroke || "none",
        strokeWidth: userStyle.strokeWidth,
        opacity: userStyle.opacity,
        cursor: userStyle.cursor
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
        const arcData = node.__arcData
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

registerLayoutPlugin("chord", chordLayoutPlugin)

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

    if (cmd === "M" || cmd === "L" || cmd === "C" || cmd === "Q") {
      out.push(cmd)
      i++
      // Endpoints and control points are all (x, y) pairs.
      while (i < tokens.length && !isNaN(Number(tokens[i]))) {
        out.push(String(Number(tokens[i]) + dx))
        i++
        if (i < tokens.length && !isNaN(Number(tokens[i]))) {
          out.push(String(Number(tokens[i]) + dy))
          i++
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
