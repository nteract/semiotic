import {
  sankeyCircular,
  sankeyLeft,
  sankeyRight,
  sankeyCenter,
  sankeyJustify
} from "d3-sankey-circular"
import { interpolateNumber } from "d3-interpolate"
import { schemeCategory10 } from "d3-scale-chromatic"
import { areaLink, circularAreaLink } from "../../geometry/sankeyLinks"
import type {
  NetworkLayoutPlugin,
  NetworkPipelineConfig,
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkRectNode,
  NetworkBezierEdge,
  NetworkLabel,
  RealtimeNode,
  RealtimeEdge
} from "../networkTypes"
import type { Style } from "../types"

const sankeyOrientHash: Record<string, any> = {
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
  justify: sankeyJustify
}

/**
 * Sankey layout plugin — uses d3-sankey-circular for layout computation.
 *
 * Produces rect scene nodes for Sankey node bars and bezier band scene edges
 * for the flow links. Supports both horizontal and vertical orientation.
 */
export const sankeyLayoutPlugin: NetworkLayoutPlugin = {
  supportsStreaming: true,
  hierarchical: false,

  computeLayout(
    nodes: RealtimeNode[],
    edges: RealtimeEdge[],
    config: NetworkPipelineConfig,
    size: [number, number]
  ): void {
    if (nodes.length === 0) return

    const direction = config.orientation === "vertical" ? "down" : "right"
    const orient = config.nodeAlign || "justify"
    const nodeWidth = config.nodeWidth ?? 15
    const nodePaddingRatio = config.nodePaddingRatio ?? 0.05
    const iterations = config.iterations ?? 100

    // Clone for d3-sankey (it mutates)
    const sankeyNodes = nodes.map((n) => ({ ...n }))
    const sankeyEdges = edges.map((e) => ({
      ...e,
      source: typeof e.source === "string" ? e.source : e.source.id,
      target: typeof e.target === "string" ? e.target : e.target.id
    }))

    let frameExtent: [[number, number], [number, number]]
    if (direction === "down") {
      frameExtent = [[0, 0], [size[1], size[0]]]
    } else {
      frameExtent = [[0, 0], [size[0], size[1]]]
    }

    const sankey = sankeyCircular()
      .extent(frameExtent)
      .links(sankeyEdges)
      .nodes(sankeyNodes)
      .nodeAlign(sankeyOrientHash[orient] || sankeyJustify)
      .nodeId((d: any) => d.id)
      .nodeWidth(nodeWidth)
      .iterations(iterations)

    if (sankey.nodePaddingRatio) {
      sankey.nodePaddingRatio(nodePaddingRatio)
    }

    // Execute layout
    sankey()

    // Build node lookup map
    const nodeMap = new Map<string, RealtimeNode>()
    for (const n of nodes) nodeMap.set(n.id, n)

    // Write computed positions back to original nodes
    for (const sn of sankeyNodes) {
      const original = nodeMap.get(sn.id)
      if (original) {
        original.x0 = sn.x0
        original.x1 = sn.x1
        original.y0 = sn.y0
        original.y1 = sn.y1
        original.value = sn.value
        original.depth = sn.depth
        original.sourceLinks = sn.sourceLinks
        original.targetLinks = sn.targetLinks
        // Derived
        original.width = sn.x1 - sn.x0
        original.height = sn.y1 - sn.y0
        original.x = sn.x0 + (sn.x1 - sn.x0) / 2
        original.y = sn.y0 + (sn.y1 - sn.y0) / 2
      }
    }

    // Build edge lookup map (source\0target → edge)
    const edgeMap = new Map<string, RealtimeEdge>()
    for (const e of edges) {
      const eSrc = typeof e.source === "string" ? e.source : e.source.id
      const eTgt = typeof e.target === "string" ? e.target : e.target.id
      edgeMap.set(`${eSrc}\0${eTgt}`, e)
    }

    // Write computed positions back to original edges
    for (const se of sankeyEdges) {
      const src = se.source as any
      const tgt = se.target as any
      const sourceId = typeof src === "object" && src !== null ? src.id : String(src)
      const targetId = typeof tgt === "object" && tgt !== null ? tgt.id : String(tgt)

      const original = edgeMap.get(`${sourceId}\0${targetId}`)

      if (original) {
        original.y0 = (se as any).y0
        original.y1 = (se as any).y1
        original.sankeyWidth = (se as any).width ?? 0
        original.circular = !!(se as any).circular
        original.circularPathData = (se as any).circularPathData
        original.direction = direction

        // Resolve source/target to node references
        const srcNode = nodeMap.get(sourceId)
        const tgtNode = nodeMap.get(targetId)
        if (srcNode) original.source = srcNode
        if (tgtNode) original.target = tgtNode
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
    const direction = config.orientation === "vertical" ? "down" : "right"
    const nodeStyleFn = config.nodeStyle
    const edgeStyleFn = config.edgeStyle
    const edgeOpacity = config.edgeOpacity ?? 0.5
    const edgeColorBy = config.edgeColorBy || "source"

    // Auto-color palette for when no nodeStyle is provided
    const palette = Array.isArray(config.colorScheme)
      ? config.colorScheme
      : (schemeCategory10 as readonly string[])
    const nodeColorMap = new Map<string, string>()
    nodes.forEach((n, i) => {
      nodeColorMap.set(n.id, palette[i % palette.length])
    })

    const sceneNodes: NetworkRectNode[] = []
    const sceneEdges: NetworkBezierEdge[] = []
    const labels: NetworkLabel[] = []

    // Build rect nodes
    for (const node of nodes) {
      const w = node.x1 - node.x0
      const h = node.y1 - node.y0
      if (w <= 0 || h <= 0) continue

      const userStyle = nodeStyleFn ? nodeStyleFn(node) : {}
      const style: Style = {
        fill: userStyle.fill || nodeColorMap.get(node.id) || "#4d430c",
        stroke: userStyle.stroke,
        strokeWidth: userStyle.strokeWidth,
        opacity: userStyle.opacity
      }

      sceneNodes.push({
        type: "rect",
        x: node.x0,
        y: node.y0,
        w,
        h,
        style,
        datum: node,
        id: node.id,
        label: node.id
      })
    }

    // Build bezier edge bands
    // Sort by width descending so narrow bands render on top
    const sortedEdges = [...edges].sort(
      (a, b) => (b.sankeyWidth || 0) - (a.sankeyWidth || 0)
    )

    for (const edge of sortedEdges) {
      if (!edge.sankeyWidth || edge.sankeyWidth <= 0) continue

      const sourceNode = typeof edge.source === "object" ? edge.source : null
      const targetNode = typeof edge.target === "object" ? edge.target : null
      if (!sourceNode || !targetNode) continue

      // Generate SVG path string using existing helpers
      let pathD: string
      if (edge.circular && edge.circularPathData) {
        pathD = circularAreaLink(edge)
      } else {
        pathD = areaLink(edge)
      }

      // Resolve edge fill — use edgeStyle if provided, otherwise
      // inherit from source or target node color
      let fill = "#999"
      if (edgeStyleFn) {
        const userStyle = edgeStyleFn(edge)
        fill = userStyle.fill || fill
      } else if (edgeColorBy === "target" && targetNode) {
        fill = nodeColorMap.get(targetNode.id) || fill
      } else if (sourceNode) {
        fill = nodeColorMap.get(sourceNode.id) || fill
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
        type: "bezier",
        pathD,
        bezierCache: edge.bezier,
        style,
        datum: edge
      })
    }

    // Build labels
    if (config.showLabels !== false) {
      const labelFn = resolveLabelFn(config.nodeLabel)

      for (const node of nodes) {
        const w = node.x1 - node.x0
        const h = node.y1 - node.y0
        if (w <= 0 || h <= 0) continue

        const text = labelFn ? labelFn(node) : node.id
        if (!text) continue

        let x: number
        let y: number
        let anchor: "start" | "end"

        if (direction === "down") {
          x = node.x0 + w / 2
          y = node.y1 + 14
          anchor = "middle" as any
        } else {
          // Horizontal: label to the right or left depending on position
          const midX = size[0] / 2
          if (node.x0 + w / 2 < midX) {
            x = node.x0 - 6
            anchor = "end"
          } else {
            x = node.x1 + 6
            anchor = "start"
          }
          y = node.y0 + h / 2
        }

        labels.push({
          x,
          y,
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
