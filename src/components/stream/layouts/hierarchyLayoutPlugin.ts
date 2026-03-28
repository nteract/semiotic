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
  NetworkLabel,
  RealtimeNode,
  RealtimeEdge
} from "../networkTypes"
import { resolveChildrenAccessor, resolveNodeId, resolveDefaultNodeSize } from "./hierarchyUtils"
import {
  buildTreeScene,
  buildRectScene,
  buildCircleScene,
} from "./hierarchySceneBuilders"

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
    root.sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0))

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
      (node as any).__hierarchyNode = d

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
  const layout = d3Tree()

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
  const layout = d3Cluster()

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

  const layout = d3Treemap()
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

  const layout = d3Pack()
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
  const layout = d3Partition()
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

