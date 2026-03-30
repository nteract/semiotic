import {
  sankeyCircular,
  sankeyLeft,
  sankeyRight,
  sankeyCenter,
  sankeyJustify
} from "../../../vendor/sankey-plus/index.js"
import { interpolateNumber } from "d3-interpolate"
import { schemeCategory10 } from "d3-scale-chromatic"
import { areaLink, circularAreaLink } from "../../geometry/sankeyLinks"
import { wrapWithDataHint } from "../devDataAccessWarning"
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

    // Clone for d3-sankey (it mutates).
    // Apply sqrt scaling to link values — preserves relative proportions
    // while compressing the range so large accumulated values don't
    // create links wider than the chart. sqrt(582)≈24 vs sqrt(89)≈9
    // maintains a 2.6x ratio instead of 6.5x, producing more balanced layouts.
    const sankeyNodes = nodes.map((n) => ({ ...n }))
    const sankeyEdges = edges.map((e) => ({
      ...e,
      source: typeof e.source === "string" ? e.source : e.source.id,
      target: typeof e.target === "string" ? e.target : e.target.id,
      value: Math.sqrt(Math.max(1, e.value || 1))
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

    // ── Scale-to-fit ──────────────────────────────────────────────────
    // The layout may produce nodes and circular paths that extend beyond
    // the requested extent. Compute the actual bounding box of everything
    // and scale/translate to fit within [0, width] x [0, height].
    {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity

      // Node bounds
      for (const sn of sankeyNodes) {
        if (sn.x0 < minX) minX = sn.x0
        if (sn.x1 > maxX) maxX = sn.x1
        if (sn.y0 < minY) minY = sn.y0
        if (sn.y1 > maxY) maxY = sn.y1
      }

      // Circular path bounds
      for (const se of sankeyEdges) {
        if (!(se as any).circular || !(se as any).circularPathData) continue
        const cpd = (se as any).circularPathData
        const cw = ((se as any)._circularWidth ?? (se as any).width ?? 0) / 2
        if (cpd.leftFullExtent - cw < minX) minX = cpd.leftFullExtent - cw
        if (cpd.rightFullExtent + cw > maxX) maxX = cpd.rightFullExtent + cw
        if (cpd.verticalFullExtent - cw < minY) minY = cpd.verticalFullExtent - cw
        if (cpd.verticalFullExtent + cw > maxY) maxY = cpd.verticalFullExtent + cw
      }

      const bboxW = maxX - minX
      const bboxH = maxY - minY
      const targetW = size[0]
      const targetH = size[1]

      if (bboxW > 0 && bboxH > 0 && (minX < 0 || minY < 0 || maxX > targetW || maxY > targetH)) {
        const scaleX = targetW / bboxW
        const scaleY = targetH / bboxH
        const scale = Math.min(scaleX, scaleY)
        const offsetX = -minX * scale + (targetW - bboxW * scale) / 2
        const offsetY = -minY * scale + (targetH - bboxH * scale) / 2

        // Scale nodes
        for (const sn of sankeyNodes) {
          sn.x0 = sn.x0 * scale + offsetX
          sn.x1 = sn.x1 * scale + offsetX
          sn.y0 = sn.y0 * scale + offsetY
          sn.y1 = sn.y1 * scale + offsetY
        }

        // Scale edge positions
        for (const se of sankeyEdges) {
          (se as any).y0 = (se as any).y0 * scale + offsetY;
          (se as any).y1 = (se as any).y1 * scale + offsetY;
          (se as any).width = ((se as any).width ?? 0) * scale
          if ((se as any)._circularWidth) {
            (se as any)._circularWidth *= scale
          }

          // Scale circular path data
          if ((se as any).circular && (se as any).circularPathData) {
            const cpd = (se as any).circularPathData
            cpd.sourceX = cpd.sourceX * scale + offsetX
            cpd.targetX = cpd.targetX * scale + offsetX
            cpd.sourceY = cpd.sourceY * scale + offsetY
            cpd.targetY = cpd.targetY * scale + offsetY
            cpd.rightFullExtent = cpd.rightFullExtent * scale + offsetX
            cpd.leftFullExtent = cpd.leftFullExtent * scale + offsetX
            cpd.verticalFullExtent = cpd.verticalFullExtent * scale + offsetY
            cpd.rightInnerExtent = cpd.rightInnerExtent * scale + offsetX
            cpd.leftInnerExtent = cpd.leftInnerExtent * scale + offsetX
            cpd.verticalRightInnerExtent = cpd.verticalRightInnerExtent * scale + offsetY
            cpd.verticalLeftInnerExtent = cpd.verticalLeftInnerExtent * scale + offsetY
            cpd.rightSmallArcRadius *= scale
            cpd.rightLargeArcRadius *= scale
            cpd.leftSmallArcRadius *= scale
            cpd.leftLargeArcRadius *= scale
            cpd.sourceWidth *= scale
            cpd.rightNodeBuffer *= scale
            cpd.leftNodeBuffer *= scale
            cpd.arcRadius *= scale
          }
        }
      }
    }

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

    // Build edge lookup map — use _edgeKey for parallel edge support,
    // fall back to source\0target for streaming edges without _edgeKey
    const edgeMap = new Map<string, RealtimeEdge>()
    for (const e of edges) {
      if (e._edgeKey) {
        edgeMap.set(e._edgeKey, e)
      } else {
        const eSrc = typeof e.source === "string" ? e.source : e.source.id
        const eTgt = typeof e.target === "string" ? e.target : e.target.id
        edgeMap.set(`${eSrc}\0${eTgt}`, e)
      }
    }

    // Write computed positions back to original edges
    for (const se of sankeyEdges) {
      const src = se.source as any
      const tgt = se.target as any
      const sourceId = typeof src === "object" && src !== null ? src.id : String(src)
      const targetId = typeof tgt === "object" && tgt !== null ? tgt.id : String(tgt)

      const original = (se as any)._edgeKey
        ? edgeMap.get((se as any)._edgeKey)
        : edgeMap.get(`${sourceId}\0${targetId}`)

      if (original) {
        original.y0 = (se as any).y0
        original.y1 = (se as any).y1
        original.sankeyWidth = (se as any).width ?? 0
        original.circular = !!(se as any).circular
        original.circularPathData = (se as any).circularPathData
        ;(original as any)._circularWidth = (se as any)._circularWidth
        ;(original as any)._circularStub = (se as any)._circularStub
        ;(original as any).path = (se as any).path
        ;(original as any).circularLinkType = (se as any).circularLinkType
        original.direction = direction

        // Resolve source/target to node references
        const srcNode = nodeMap.get(sourceId)
        const tgtNode = nodeMap.get(targetId)
        if (srcNode) original.source = srcNode
        if (tgtNode) original.target = tgtNode
      }
    }

    // _circularStub is set inside addCircularPathData by the layout engine
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
    // Maps node ID → actual rendered fill color, so edges can inherit via edgeColorBy
    const resolvedNodeFills = new Map<string, string>()

    // Build rect nodes
    // For vertical (direction="down"), d3-sankey computed layout with swapped extent
    // so x = depth (vertical) and y = breadth (horizontal). Swap back for rendering.
    for (const node of nodes) {
      const w = node.x1 - node.x0
      const h = node.y1 - node.y0
      if (w <= 0 || h <= 0) continue

      const userStyle = nodeStyleFn ? nodeStyleFn(wrapWithDataHint(node, "nodeStyle")) : {}
      const style: Style = {
        fill: userStyle.fill || nodeColorMap.get(node.id) || "#4d430c",
        stroke: userStyle.stroke,
        strokeWidth: userStyle.strokeWidth,
        opacity: userStyle.opacity
      }

      // Track the resolved fill per node so edges can inherit the actual rendered color
      resolvedNodeFills.set(node.id, (typeof style.fill === "string" ? style.fill : null) || nodeColorMap.get(node.id) || "#4d430c")

      if (direction === "down") {
        sceneNodes.push({
          type: "rect",
          x: node.y0,
          y: node.x0,
          w: h,
          h: w,
          style,
          datum: node,
          id: node.id,
          label: node.id
        })
      } else {
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

      // Resolve edge fill.
      // For source/target coloring, use the ACTUAL rendered node fill (resolvedNodeFills)
      // so edges inherit colors even when frameProps.nodeStyle overrides the HOC's nodeStyle.
      let fill = "#999"
      if (typeof edgeColorBy === "function") {
        fill = edgeColorBy(edge) || fill
      } else if (edgeColorBy === "target") {
        fill = resolvedNodeFills.get(targetNode.id) || nodeColorMap.get(targetNode.id) || fill
      } else {
        // "source" (default) or any other value
        fill = resolvedNodeFills.get(sourceNode.id) || nodeColorMap.get(sourceNode.id) || fill
      }

      const userStyle = edgeStyleFn ? edgeStyleFn(wrapWithDataHint(edge, "edgeStyle")) : {}

      // Stub circular edges: two separate fading rectangles
      if ((edge as any)._circularStub && edge.circular && edge.circularPathData) {
        const cpd = edge.circularPathData
        const hw = edge.sankeyWidth / 2
        const stubLen = Math.max(15, Math.min(40, (cpd.rightFullExtent - cpd.sourceX) * 0.33))
        const stubLenT = Math.max(15, Math.min(40, (cpd.targetX - cpd.leftFullExtent) * 0.33))

        const edgeFill = userStyle.fill || fill

        // Outbound stub (fades out)
        const outPath = `M${cpd.sourceX},${cpd.sourceY - hw}L${cpd.sourceX + stubLen},${cpd.sourceY - hw}L${cpd.sourceX + stubLen},${cpd.sourceY + hw}L${cpd.sourceX},${cpd.sourceY + hw}Z`
        sceneEdges.push({
          type: "bezier",
          pathD: outPath,
          style: {
            fill: edgeFill,
            fillOpacity: userStyle.fillOpacity ?? edgeOpacity,
            stroke: "none",
            opacity: userStyle.opacity,
          },
          datum: edge,
          _gradient: { direction: "right", from: 1, to: 0, x0: cpd.sourceX, x1: cpd.sourceX + stubLen }
        } as any)

        // Inbound stub (fades in)
        const inPath = `M${cpd.targetX},${cpd.targetY - hw}L${cpd.targetX - stubLenT},${cpd.targetY - hw}L${cpd.targetX - stubLenT},${cpd.targetY + hw}L${cpd.targetX},${cpd.targetY + hw}Z`
        sceneEdges.push({
          type: "bezier",
          pathD: inPath,
          style: {
            fill: edgeFill,
            fillOpacity: userStyle.fillOpacity ?? edgeOpacity,
            stroke: "none",
            opacity: userStyle.opacity,
          },
          datum: edge,
          _gradient: { direction: "left", from: 0, to: 1, x0: cpd.targetX - stubLenT, x1: cpd.targetX }
        } as any)

        continue
      }

      // Normal or full circular edge
      let pathD: string
      if (edge.circular && edge.circularPathData) {
        pathD = circularAreaLink(edge) as string
      } else {
        pathD = areaLink(edge) as string
      }
      if (!pathD) continue

      const style: Style = {
        fill: userStyle.fill || fill,
        fillOpacity: userStyle.fillOpacity ?? edgeOpacity,
        stroke: userStyle.stroke || "none",
        strokeWidth: userStyle.strokeWidth,
        opacity: userStyle.opacity,
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
          // Vertical: x = depth (0→height), y = breadth (0→width) in raw sankey coords.
          // Swap for rendering: horizontal = breadth (y), vertical = depth (x).
          x = node.y0 + (node.y1 - node.y0) / 2
          y = node.x1 + 14
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
