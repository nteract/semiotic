import {
  hierarchy as d3Hierarchy,
  tree as d3Tree,
  cluster as d3Cluster,
  treemap as d3Treemap,
  pack as d3Pack,
  partition as d3Partition,
  treemapBinary
} from "d3-hierarchy"
import type {
  NetworkLayoutPlugin,
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

type HierarchyLayoutType = "tree" | "cluster" | "treemap" | "circlepack" | "partition"

/**
 * Hierarchy layout plugin — handles tree, cluster, treemap, circlepack, and partition layouts.
 *
 * Uses d3-hierarchy for all layout computations. This plugin is `hierarchical: true`,
 * meaning the input data is a single root node object rather than flat nodes+edges arrays.
 *
 * The hierarchy root is passed via `(config as any).__hierarchyRoot`, set by the store
 * before calling computeLayout. The plugin builds the d3 hierarchy internally, runs the
 * appropriate layout algorithm, and populates the nodes/edges arrays.
 *
 * Scene output varies by layout type:
 * - tree/cluster: NetworkCircleNode[] + NetworkCurvedEdge[] (cubic bezier parent-child links)
 * - treemap/partition: NetworkRectNode[] (space-filling rectangles, no edges)
 * - circlepack: NetworkCircleNode[] (nested circles, no edges)
 */
export const hierarchyLayoutPlugin: NetworkLayoutPlugin = {
  supportsStreaming: false,
  hierarchical: true,

  computeLayout(
    nodes: RealtimeNode[],
    edges: RealtimeEdge[],
    config: NetworkPipelineConfig,
    size: [number, number]
  ): void {
    const hierarchyRoot = (config as any).__hierarchyRoot
    if (!hierarchyRoot) return

    const layoutType = config.chartType as HierarchyLayoutType
    const childrenAccessor = resolveChildrenAccessor(config.childrenAccessor)
    const hierarchySum = config.hierarchySum || ((d: any) => d.value ?? 0)

    // Build d3 hierarchy from the root data
    const root = d3Hierarchy(hierarchyRoot, childrenAccessor)
    root.sum(hierarchySum)
    root.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    const [width, height] = size

    // Run the appropriate layout algorithm
    switch (layoutType) {
      case "tree":
        computeTreeLayout(root, config, width, height)
        break
      case "cluster":
        computeClusterLayout(root, config, width, height)
        break
      case "treemap":
        computeTreemapLayout(root, config, width, height)
        break
      case "circlepack":
        computeCirclepackLayout(root, config, width, height)
        break
      case "partition":
        computePartitionLayout(root, config, width, height)
        break
    }

    // Flatten the hierarchy into nodes and edges arrays
    const descendants = root.descendants()

    // Clear and repopulate nodes array
    nodes.length = 0
    edges.length = 0

    const nodeMap = new Map<any, RealtimeNode>()

    for (let i = 0; i < descendants.length; i++) {
      const d = descendants[i]
      const id = resolveNodeId(d, config, i)

      const node: RealtimeNode = {
        id,
        x: 0,
        y: 0,
        x0: 0,
        x1: 0,
        y0: 0,
        y1: 0,
        width: 0,
        height: 0,
        value: d.value ?? 0,
        depth: d.depth,
        data: d.data,
        createdByFrame: true
      }

      // Set positions based on layout type
      if (layoutType === "tree" || layoutType === "cluster") {
        setTreePositions(node, d, config)
      } else if (layoutType === "treemap" || layoutType === "partition") {
        setRectPositions(node, d)
      } else if (layoutType === "circlepack") {
        setCirclePositions(node, d)
      }

      // Store the d3 hierarchy node reference for edge building
      ;(node as any).__hierarchyNode = d

      nodes.push(node)
      nodeMap.set(d, node)
    }

    // Build parent-child edges (for tree/cluster; treemap/circlepack/partition have no edges)
    if (layoutType === "tree" || layoutType === "cluster") {
      for (const d of descendants) {
        if (d.parent) {
          const sourceNode = nodeMap.get(d.parent)
          const targetNode = nodeMap.get(d)
          if (sourceNode && targetNode) {
            edges.push({
              source: sourceNode,
              target: targetNode,
              value: 1,
              y0: 0,
              y1: 0,
              sankeyWidth: 0,
              data: { depth: d.depth }
            })
          }
        }
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
    const layoutType = config.chartType as HierarchyLayoutType
    const nodeStyleFn = config.nodeStyle || ((): Record<string, any> => ({}))
    const edgeStyleFn = config.edgeStyle || ((): Record<string, any> => ({}))

    switch (layoutType) {
      case "tree":
      case "cluster":
        return buildTreeScene(nodes, edges, config, size, nodeStyleFn, edgeStyleFn)
      case "treemap":
      case "partition":
        return buildRectScene(nodes, config, size, nodeStyleFn)
      case "circlepack":
        return buildCircleScene(nodes, config, size, nodeStyleFn)
      default:
        return { sceneNodes: [], sceneEdges: [], labels: [] }
    }
  }
}

// ── Layout computation functions ──────────────────────────────────────────

function computeTreeLayout(
  root: any,
  config: NetworkPipelineConfig,
  width: number,
  height: number
): void {
  const orientation = config.treeOrientation || "vertical"
  const layout = d3Tree<any>()

  if (orientation === "horizontal") {
    layout.size([height, width])
  } else if (orientation === "radial") {
    // For radial layout, use a full circle mapped to [0, 2*PI] x [0, radius]
    const radius = Math.min(width, height) / 2
    layout.size([2 * Math.PI, radius * 0.8])
  } else {
    layout.size([width, height])
  }

  layout(root)
}

function computeClusterLayout(
  root: any,
  config: NetworkPipelineConfig,
  width: number,
  height: number
): void {
  const orientation = config.treeOrientation || "vertical"
  const layout = d3Cluster<any>()

  if (orientation === "horizontal") {
    layout.size([height, width])
  } else if (orientation === "radial") {
    const radius = Math.min(width, height) / 2
    layout.size([2 * Math.PI, radius * 0.8])
  } else {
    layout.size([width, height])
  }

  layout(root)
}

function computeTreemapLayout(
  root: any,
  config: NetworkPipelineConfig,
  width: number,
  height: number
): void {
  const padding = config.padding ?? 4
  const paddingTop = config.paddingTop ?? 0

  const layout = d3Treemap<any>()
    .size([width, height])
    .tile(treemapBinary)
    .padding(padding)

  if (paddingTop > 0) {
    layout.paddingTop(paddingTop)
  }

  layout(root)
}

function computeCirclepackLayout(
  root: any,
  config: NetworkPipelineConfig,
  width: number,
  height: number
): void {
  const padding = config.padding ?? 4

  const layout = d3Pack<any>()
    .size([width, height])
    .padding(padding)

  layout(root)
}

function computePartitionLayout(
  root: any,
  config: NetworkPipelineConfig,
  width: number,
  height: number
): void {
  const layout = d3Partition<any>()
    .size([width, height])
    .padding(config.padding ?? 1)

  layout(root)
}

// ── Position setting helpers ──────────────────────────────────────────────

function setTreePositions(
  node: RealtimeNode,
  d: any,
  config: NetworkPipelineConfig
): void {
  const orientation = config.treeOrientation || "vertical"

  if (orientation === "radial") {
    // Convert polar coordinates to cartesian
    const angle = d.x as number
    const radius = d.y as number
    // Compute Cartesian coordinates — the layout is already sized
    // relative to the center of [width, height].
    node.x = radius * Math.cos(angle - Math.PI / 2)
    node.y = radius * Math.sin(angle - Math.PI / 2)
  } else if (orientation === "horizontal") {
    // d3 tree with size([height, width]): d.x = vertical pos, d.y = horizontal pos
    node.x = d.y as number
    node.y = d.x as number
  } else {
    // Vertical: d.x = horizontal, d.y = vertical
    node.x = d.x as number
    node.y = d.y as number
  }

  // Set bounding box around the point (used by hit testing and transitions)
  const r = 5
  node.x0 = node.x - r
  node.x1 = node.x + r
  node.y0 = node.y - r
  node.y1 = node.y + r
  node.width = r * 2
  node.height = r * 2
}

function setRectPositions(
  node: RealtimeNode,
  d: any
): void {
  node.x0 = d.x0
  node.x1 = d.x1
  node.y0 = d.y0
  node.y1 = d.y1
  node.x = (d.x0 + d.x1) / 2
  node.y = (d.y0 + d.y1) / 2
  node.width = d.x1 - d.x0
  node.height = d.y1 - d.y0
}

function setCirclePositions(
  node: RealtimeNode,
  d: any
): void {
  const r = d.r ?? 0
  node.x = d.x
  node.y = d.y
  // Set bounding box to enclosing square of the circle
  node.x0 = d.x - r
  node.x1 = d.x + r
  node.y0 = d.y - r
  node.y1 = d.y + r
  node.width = r * 2
  node.height = r * 2
  // Store radius on the node for buildScene
  ;(node as any).__radius = r
}

// ── Scene building functions ──────────────────────────────────────────────

function buildTreeScene(
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

    // For radial layout, offset to center of chart
    if (isRadial) {
      nx += cx
      ny += cy
    }

    const userStyle = nodeStyleFn(node)
    const style: Style = {
      fill: userStyle.fill || "#4d430c",
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

    // Generate cubic bezier path
    const pathD = generateTreeEdgePath(sx, sy, tx, ty, orientation)

    const userStyle = edgeStyleFn(edge)
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

      // Position label based on orientation
      let x: number
      let y: number
      let anchor: "start" | "middle" | "end"

      if (isRadial) {
        // Radial: position label outward from center
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
        // Horizontal tree: label to the right of leaf nodes, left of root
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
        // Vertical tree: label below
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

function buildRectScene(
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

  const depthPalette = [
    "#e8d5b7", "#b8d4e3", "#d4e3b8", "#e3c4d4",
    "#d4d4e3", "#e3d4b8", "#b8e3d4", "#e3b8b8"
  ]

  for (const node of nodes) {
    const w = node.x1 - node.x0
    const h = node.y1 - node.y0
    if (w <= 0 || h <= 0) continue

    const userStyle = nodeStyleFn(node)
    let fill = userStyle.fill || "#4d430c"

    // Color by depth if enabled
    if (config.colorByDepth && node.depth !== undefined) {
      fill = depthPalette[node.depth % depthPalette.length]
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

    for (const node of nodes) {
      const w = node.x1 - node.x0
      const h = node.y1 - node.y0
      if (w <= 0 || h <= 0) continue

      // Only label leaf nodes by default (for treemap), or all for partition
      const isLeaf = !(node.data?.children && node.data.children.length > 0)
      const isPartition = config.chartType === "partition"

      if (!isLeaf && !isPartition) continue

      const text = labelFn ? labelFn(node) : node.id
      if (!text) continue

      // Skip labels for very small cells
      if (w < 30 || h < 16) continue

      labels.push({
        x: node.x0 + w / 2,
        y: node.y0 + h / 2,
        text: String(text),
        anchor: "middle",
        baseline: "middle",
        fontSize: Math.min(11, Math.max(8, Math.min(w, h) / 6))
      })
    }
  }

  return { sceneNodes, sceneEdges: [], labels }
}

function buildCircleScene(
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

  const depthPalette = [
    "#e8d5b7", "#b8d4e3", "#d4e3b8", "#e3c4d4",
    "#d4d4e3", "#e3d4b8", "#b8e3d4", "#e3b8b8"
  ]

  for (const node of nodes) {
    const r = (node as any).__radius ?? 5
    if (r <= 0) continue

    const userStyle = nodeStyleFn(node)
    let fill = userStyle.fill || "#4d430c"

    // Color by depth if enabled
    if (config.colorByDepth && node.depth !== undefined) {
      fill = depthPalette[node.depth % depthPalette.length]
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

      // Only label nodes with sufficient radius
      if (r < 15) continue

      // Leaf nodes: centered label. Parent nodes: top-center label.
      const isLeaf = !(node.data?.children && node.data.children.length > 0)

      labels.push({
        x: node.x,
        y: isLeaf ? node.y : node.y - r + 14,
        text: String(text),
        anchor: "middle",
        baseline: isLeaf ? "middle" : "hanging",
        fontSize: Math.min(11, Math.max(8, r / 3)),
        fill: isLeaf ? undefined : "#000",
        stroke: isLeaf ? undefined : "#fff",
        strokeWidth: isLeaf ? undefined : 3,
        paintOrder: isLeaf ? undefined : "stroke"
      })
    }
  }

  return { sceneNodes, sceneEdges: [], labels }
}

// ── Edge path generation ──────────────────────────────────────────────────

/**
 * Generate a cubic bezier path string for a tree/cluster edge.
 * Uses different curve strategies based on tree orientation.
 */
function generateTreeEdgePath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  orientation: string
): string {
  if (orientation === "horizontal") {
    // Horizontal: parent on left, child on right
    const midX = (sx + tx) / 2
    return `M ${sx},${sy} C ${midX},${sy} ${midX},${ty} ${tx},${ty}`
  } else if (orientation === "radial") {
    // Radial: use a simple quadratic curve through the midpoint
    const midX = (sx + tx) / 2
    const midY = (sy + ty) / 2
    return `M ${sx},${sy} Q ${midX},${sy} ${midX},${midY} T ${tx},${ty}`
  } else {
    // Vertical (default): parent on top, child on bottom
    const midY = (sy + ty) / 2
    return `M ${sx},${sy} C ${sx},${midY} ${tx},${midY} ${tx},${ty}`
  }
}

// ── Utility helpers ───────────────────────────────────────────────────────

function resolveChildrenAccessor(
  accessor: string | ((d: any) => any[]) | undefined
): ((d: any) => any[]) | undefined {
  if (!accessor) return undefined
  if (typeof accessor === "function") return accessor
  return (d: any) => d[accessor]
}

function resolveNodeId(
  d: any,
  config: NetworkPipelineConfig,
  index: number
): string {
  const accessor = config.nodeIDAccessor
  if (typeof accessor === "function") {
    return String(accessor(d.data))
  }
  if (typeof accessor === "string" && d.data[accessor] !== undefined) {
    return String(d.data[accessor])
  }
  // Fallback: use name, id, or index
  if (d.data.name !== undefined) return String(d.data.name)
  if (d.data.id !== undefined) return String(d.data.id)
  return `node-${index}`
}

function resolveLabelFn(
  nodeLabel: string | ((d: any) => string) | undefined
): ((d: any) => string) | null {
  if (!nodeLabel) return null
  if (typeof nodeLabel === "function") return nodeLabel
  return (d: any) => d.data?.[nodeLabel] || d[nodeLabel] || d.id
}

function resolveDefaultNodeSize(
  nodeSize: number | string | ((d: any) => number) | undefined
): number {
  if (typeof nodeSize === "number") return nodeSize
  return 5
}
