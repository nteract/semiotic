/**
 * Scene builders for hierarchy layouts (tree, treemap, circlepack).
 *
 * Converts RealtimeNode/Edge arrays (positioned by d3-hierarchy) into
 * NetworkSceneNode/Edge arrays for canvas rendering.
 *
 * Three builder functions, one per visual form:
 *   buildTreeScene    — circle nodes + curved edges (tree/cluster)
 *   buildRectScene    — rect nodes, no edges (treemap/partition)
 *   buildCircleScene  — circle nodes, no edges (circlepack)
 *
 * Dependencies: hierarchyUtils (palette, contrast, label resolution)
 * Consumed by: hierarchyLayoutPlugin.ts (buildScene dispatcher)
 */
import type {
  NetworkPipelineConfig,
  NetworkSceneNode,
  NetworkSceneEdge,
  NetworkCircleNode,
  NetworkRectNode,
  NetworkCurvedEdge,
  NetworkLabel,
  RealtimeNode,
  RealtimeEdge
} from "../networkTypes"
import type { Style } from "../types"
import { DEPTH_PALETTE, contrastTextColor, resolveLabelFn, resolveDefaultNodeSize } from "./hierarchyUtils"
import { wrapWithDataHint } from "../devDataAccessWarning"

// ── Tree/Cluster scene ────────────────────────────────────────────────

export function buildTreeScene(
  nodes: RealtimeNode[],
  edges: RealtimeEdge[],
  config: NetworkPipelineConfig,
  size: [number, number],
  nodeStyleFn: (d: any) => Record<string, any>,
  edgeStyleFn: (d: any) => Record<string, any>
): {
  sceneNodes: NetworkSceneNode[]
  sceneEdges: NetworkSceneEdge[]
  labels: NetworkLabel[]
} {
  const sceneNodes: NetworkCircleNode[] = []
  const sceneEdges: NetworkCurvedEdge[] = []
  const labels: NetworkLabel[] = []

  const orientation = config.treeOrientation || "vertical"
  const isRadial = orientation === "radial"
  const cx = size[0] / 2
  const cy = size[1] / 2
  const defaultNodeSize = resolveDefaultNodeSize(config.nodeSize)

  // Build circle nodes
  for (const node of nodes) {
    let nx = node.x
    let ny = node.y

    if (isRadial) {
      nx += cx
      ny += cy
    }

    const userStyle = nodeStyleFn(wrapWithDataHint(node, "nodeStyle"))
    let fill = userStyle.fill || "#4d430c"

    if (config.colorByDepth && node.depth !== undefined) {
      fill = DEPTH_PALETTE[node.depth % DEPTH_PALETTE.length]
    }

    const style: Style = {
      fill,
      stroke: userStyle.stroke || "#fff",
      strokeWidth: userStyle.strokeWidth ?? 1,
      opacity: userStyle.opacity
    }

    sceneNodes.push({
      type: "circle",
      cx: nx,
      cy: ny,
      r: defaultNodeSize,
      style,
      datum: node,
      id: node.id,
      label: node.id,
      depth: node.depth
    })
  }

  // Build curved edges between parent-child pairs
  const edgeOpacity = config.edgeOpacity ?? 0.5
  for (const edge of edges) {
    const sourceNode = typeof edge.source === "object" ? edge.source : null
    const targetNode = typeof edge.target === "object" ? edge.target : null
    if (!sourceNode || !targetNode) continue

    let sx = sourceNode.x
    let sy = sourceNode.y
    let tx = targetNode.x
    let ty = targetNode.y

    if (isRadial) {
      sx += cx
      sy += cy
      tx += cx
      ty += cy
    }

    const pathD = generateTreeEdgePath(sx, sy, tx, ty, orientation)

    const userStyle = edgeStyleFn(wrapWithDataHint(edge, "edgeStyle"))
    const style: Style = {
      fill: "none",
      stroke: userStyle.stroke || "#999",
      strokeWidth: userStyle.strokeWidth ?? 1.5,
      opacity: userStyle.opacity ?? edgeOpacity
    }

    sceneEdges.push({
      type: "curved",
      pathD,
      style,
      datum: edge
    })
  }

  // Build labels
  if (config.showLabels !== false) {
    const labelFn = resolveLabelFn(config.nodeLabel)

    for (const node of nodes) {
      const text = labelFn ? labelFn(node) : node.id
      if (!text) continue

      let nx = node.x
      let ny = node.y

      if (isRadial) {
        nx += cx
        ny += cy
      }

      let x: number
      let y: number
      let anchor: "start" | "middle" | "end"

      if (isRadial) {
        const dx = nx - cx
        const dy = ny - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist > 0) {
          x = nx + (dx / dist) * 10
          y = ny + (dy / dist) * 10
          anchor = dx >= 0 ? "start" : "end"
        } else {
          x = nx
          y = ny - 12
          anchor = "middle"
        }
      } else if (orientation === "horizontal") {
        const isLeaf = !node.data?.children || node.data.children.length === 0
        if (isLeaf) {
          x = nx + defaultNodeSize + 6
          anchor = "start"
        } else {
          x = nx - defaultNodeSize - 6
          anchor = "end"
        }
        y = ny
      } else {
        x = nx
        y = ny + defaultNodeSize + 14
        anchor = "middle"
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

// ── Treemap/Partition scene ───────────────────────────────────────────

export function buildRectScene(
  nodes: RealtimeNode[],
  config: NetworkPipelineConfig,
  size: [number, number],
  nodeStyleFn: (d: any) => Record<string, any>
): {
  sceneNodes: NetworkSceneNode[]
  sceneEdges: NetworkSceneEdge[]
  labels: NetworkLabel[]
} {
  const sceneNodes: NetworkRectNode[] = []
  const labels: NetworkLabel[] = []

  for (const node of nodes) {
    const w = node.x1 - node.x0
    const h = node.y1 - node.y0
    if (w <= 0 || h <= 0) continue

    const userStyle = nodeStyleFn(wrapWithDataHint(node, "nodeStyle"))
    let fill = userStyle.fill || "#4d430c"

    if (config.colorByDepth && node.depth !== undefined) {
      fill = DEPTH_PALETTE[node.depth % DEPTH_PALETTE.length]
    }

    const style: Style = {
      fill,
      stroke: userStyle.stroke || "#fff",
      strokeWidth: userStyle.strokeWidth ?? 1,
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
      label: node.id,
      depth: node.depth
    })
  }

  // Build labels
  if (config.showLabels !== false) {
    const labelFn = resolveLabelFn(config.nodeLabel)
    const labelMode = config.labelMode || "leaf"
    const isPartition = config.chartType === "partition"

    for (const node of nodes) {
      const w = node.x1 - node.x0
      const h = node.y1 - node.y0
      if (w <= 0 || h <= 0) continue

      const isLeaf = !(node.data?.children && node.data.children.length > 0)

      if (!isPartition) {
        if (labelMode === "leaf" && !isLeaf) continue
        if (labelMode === "parent" && isLeaf) continue
      }

      const text = labelFn ? labelFn(node) : node.id
      if (!text) continue

      const minWidth = isLeaf ? 30 : 40
      const minHeight = isLeaf ? 16 : 14
      if (w < minWidth || h < minHeight) continue

      const userStyle = nodeStyleFn(wrapWithDataHint(node, "nodeStyle"))
      let fill = userStyle.fill || "#4d430c"
      if (config.colorByDepth && node.depth !== undefined) {
        fill = DEPTH_PALETTE[node.depth % DEPTH_PALETTE.length]
      }
      const textColor = contrastTextColor(fill)

      if (isLeaf) {
        labels.push({
          x: node.x0 + w / 2,
          y: node.y0 + h / 2,
          text: String(text),
          anchor: "middle",
          baseline: "middle",
          fontSize: Math.min(11, Math.max(8, Math.min(w, h) / 6)),
          fill: textColor
        })
      } else {
        labels.push({
          x: node.x0 + 4,
          y: node.y0 + 12,
          text: String(text),
          anchor: "start",
          baseline: "auto",
          fontSize: 11,
          fontWeight: 600,
          fill: textColor
        })
      }
    }
  }

  return { sceneNodes, sceneEdges: [], labels }
}

// ── CirclePack scene ──────────────────────────────────────────────────

export function buildCircleScene(
  nodes: RealtimeNode[],
  config: NetworkPipelineConfig,
  size: [number, number],
  nodeStyleFn: (d: any) => Record<string, any>
): {
  sceneNodes: NetworkSceneNode[]
  sceneEdges: NetworkSceneEdge[]
  labels: NetworkLabel[]
} {
  const sceneNodes: NetworkCircleNode[] = []
  const labels: NetworkLabel[] = []
  const circleOpacity = 0.7

  for (const node of nodes) {
    const r = (node as any).__radius ?? 5
    if (r <= 0) continue

    const userStyle = nodeStyleFn(wrapWithDataHint(node, "nodeStyle"))
    let fill = userStyle.fill || "#4d430c"

    if (config.colorByDepth && node.depth !== undefined) {
      fill = DEPTH_PALETTE[node.depth % DEPTH_PALETTE.length]
    }

    const style: Style = {
      fill,
      stroke: userStyle.stroke || "#fff",
      strokeWidth: userStyle.strokeWidth ?? 1,
      opacity: userStyle.opacity ?? circleOpacity
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

  // Build labels
  if (config.showLabels !== false) {
    const labelFn = resolveLabelFn(config.nodeLabel)

    for (const node of nodes) {
      const r = (node as any).__radius ?? 5

      const text = labelFn ? labelFn(node) : node.id
      if (!text) continue

      if (r < 15) continue

      const isLeaf = !(node.data?.children && node.data.children.length > 0)

      const userStyle = nodeStyleFn(wrapWithDataHint(node, "nodeStyle"))
      let fill = userStyle.fill || "#4d430c"
      if (config.colorByDepth && node.depth !== undefined) {
        fill = DEPTH_PALETTE[node.depth % DEPTH_PALETTE.length]
      }

      if (isLeaf) {
        const textColor = contrastTextColor(fill)
        labels.push({
          x: node.x,
          y: node.y,
          text: String(text),
          anchor: "middle",
          baseline: "middle",
          fontSize: Math.min(11, Math.max(8, r / 3)),
          fill: textColor
        })
      } else {
        labels.push({
          x: node.x,
          y: node.y - r + 14,
          text: String(text),
          anchor: "middle",
          baseline: "hanging",
          fontSize: Math.min(11, Math.max(8, r / 3)),
          fill: "#000",
          stroke: "#fff",
          strokeWidth: 3,
          paintOrder: "stroke"
        })
      }
    }
  }

  return { sceneNodes, sceneEdges: [], labels }
}

// ── Edge path generation ──────────────────────────────────────────────

/**
 * Generate a cubic bezier path string for a tree/cluster edge.
 * Uses different curve strategies based on tree orientation.
 */
export function generateTreeEdgePath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  orientation: string
): string {
  if (orientation === "horizontal") {
    const midX = (sx + tx) / 2
    return `M ${sx},${sy} C ${midX},${sy} ${midX},${ty} ${tx},${ty}`
  } else if (orientation === "radial") {
    const midX = (sx + tx) / 2
    const midY = (sy + ty) / 2
    return `M ${sx},${sy} Q ${midX},${sy} ${midX},${midY} T ${tx},${ty}`
  } else {
    const midY = (sy + ty) / 2
    return `M ${sx},${sy} C ${sx},${midY} ${tx},${midY} ${tx},${ty}`
  }
}
