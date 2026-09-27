import {
  hierarchy as d3Hierarchy,
  tree as d3Tree,
  cluster as d3Cluster,
  treemap as d3Treemap,
  pack as d3Pack,
  partition as d3Partition,
  treemapBinary,
  type HierarchyNode,
  type HierarchyRectangularNode,
  type HierarchyCircularNode,
  type HierarchyPointNode,
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
import type { Style } from "../types"
import { resolveChildrenAccessor, resolveNodeId, resolveHierarchySum, uniqueHierarchyIds } from "./hierarchyUtils"
import {
  buildTreeScene,
  buildRectScene,
  buildCircleScene,
} from "./hierarchySceneBuilders"
import type { Datum } from "../../charts/shared/datumTypes"
import { registerLayoutPlugin } from "./registry"

type HierarchyLayoutType = "tree" | "cluster" | "treemap" | "circlepack" | "partition"

/**
 * Hierarchy layout plugin — handles tree, cluster, treemap, circlepack, and partition layouts.
 *
 * Uses d3-hierarchy for all layout computations. This plugin is `hierarchical: true`,
 * meaning the input data is a single root node object rather than flat nodes+edges arrays.
 *
 * The hierarchy root is passed via `config.__hierarchyRoot`, set by the store
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
    // `config.__hierarchyRoot` is declared on `NetworkPipelineConfig`
    // as `unknown` for the same reason: the root shape is set by the
    // store before the plugin runs, and the children accessor is
    // user-controlled. d3Hierarchy's first argument accepts any
    // root datum.
    const hierarchyRoot = config.__hierarchyRoot as Datum | undefined
    if (!hierarchyRoot) return

    const layoutType = config.chartType as HierarchyLayoutType
    const childrenAccessor = resolveChildrenAccessor(config.childrenAccessor)
    // Build d3 hierarchy from the root data
    const root = d3Hierarchy<Datum>(hierarchyRoot, childrenAccessor)
    // Resolve IDs before sorting so measure changes preserve node identity.
    const sourceNodes: HierarchyNode<Datum>[] = []
    root.eachBefore((node) => sourceNodes.push(node))
    const ids = uniqueHierarchyIds(sourceNodes.map((node, i) => resolveNodeId(node, config, i)))
    // sum assigns a numeric value to every node, including missing measures.
    root.sum(resolveHierarchySum(config.hierarchySum))
      .sort((a, b) => b.value! - a.value!)

    const [width, height] = size

    // Run the appropriate layout algorithm
    switch (layoutType) {
      case "tree":
      case "cluster":
        computeTreeLayout(root, config, width, height)
        break
      case "treemap":
      case "partition":
        computeRectLayout(root, config, width, height)
        break
      case "circlepack":
        computeCirclepackLayout(root, config, width, height)
        break
    }

    // Flatten the hierarchy into nodes and edges arrays
    const descendants = root.descendants()

    // Clear and repopulate nodes array
    nodes.length = 0
    edges.length = 0

    // One map preserves source-order identity and resolves parent/child endpoints.
    const nodeMap = new Map(sourceNodes.map((d, i) => {
      const node: RealtimeNode = {
        id: ids[i],
        x: 0,
        y: 0,
        x0: 0,
        x1: 0,
        y0: 0,
        y1: 0,
        width: 0,
        height: 0,
        value: d.value!,
        depth: d.depth,
        data: d.data,
        createdByFrame: true
      }

      return [d, node] as const
    }))

    for (const d of descendants) {
      const node = nodeMap.get(d)!

      // Set positions based on layout type. After `layout(root)`
      // runs, the descendants carry the layout-specific extension
      // fields (`x`/`y` for tree/cluster's `HierarchyPointNode`,
      // `x0`/`x1`/`y0`/`y1` for treemap/partition's
      // `HierarchyRectangularNode`, `r` for circlepack's
      // `HierarchyCircularNode`). The cast threads the right shape
      // through without `any` — the `layoutType` discriminant is
      // load-bearing here.
      if (layoutType === "tree" || layoutType === "cluster") {
        setTreePositions(node, d as HierarchyPointNode<Datum>, config)
      } else if (layoutType === "treemap" || layoutType === "partition") {
        setRectPositions(node, d as HierarchyRectangularNode<Datum>)
      } else if (layoutType === "circlepack") {
        setCirclePositions(node, d as HierarchyCircularNode<Datum>)
      }

      // Retain the d3 parent chain for default tooltip breadcrumbs.
      // `__hierarchyNode` is typed `unknown` on RealtimeNode because
      // the layout-specific shape (rectangular / circular / point)
      // varies; downstream readers narrow as needed.
      node.__hierarchyNode = d

      nodes.push(node)
    }

    // Build parent-child edges (for tree/cluster; treemap/circlepack/partition have no edges)
    if (layoutType === "tree" || layoutType === "cluster") {
      for (const d of descendants) {
        if (d.parent) {
          const sourceNode = nodeMap.get(d.parent)!
          const targetNode = nodeMap.get(d)!
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
    const nodeStyleFn = config.nodeStyle || ((): Style => ({}))
    const edgeStyleFn = config.edgeStyle || ((): Style => ({}))

    switch (layoutType) {
      case "tree":
      case "cluster":
        return buildTreeScene(nodes, edges, config, size, nodeStyleFn, edgeStyleFn)
      case "treemap":
      case "partition":
        return buildRectScene(nodes, config, nodeStyleFn)
      case "circlepack":
        return buildCircleScene(nodes, config, nodeStyleFn)
      default:
        return { sceneNodes: [], sceneEdges: [], labels: [] }
    }
  }
}

// ── Layout computation functions ──────────────────────────────────────────

function computeTreeLayout(
  root: HierarchyNode<Datum>,
  config: NetworkPipelineConfig,
  width: number,
  height: number
): void {
  const orientation = config.treeOrientation || "vertical"
  const layout = config.chartType === "cluster" ? d3Cluster<Datum>() : d3Tree<Datum>()

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

function computeRectLayout(
  root: HierarchyNode<Datum>,
  config: NetworkPipelineConfig,
  width: number,
  height: number
): void {
  const isTreemap = config.chartType === "treemap"
  const layout = isTreemap
    ? d3Treemap<Datum>().tile(treemapBinary)
    : d3Partition<Datum>()
  layout.size([width, height]).padding(config.padding ?? (isTreemap ? 4 : 1))

  if ("paddingTop" in layout && config.paddingTop! > 0) {
    layout.paddingTop(config.paddingTop!)
  }

  layout(root)
}

function computeCirclepackLayout(
  root: HierarchyNode<Datum>,
  config: NetworkPipelineConfig,
  width: number,
  height: number
): void {
  const padding = config.padding ?? 4

  const layout = d3Pack<Datum>()
    .size([width, height])
    .padding(padding)

  // d3's automatic radius normalization divides by zero if all leaves are zero,
  // including hierarchies whose only positive contributions belong to parents.
  if (!root.leaves().some((leaf) => leaf.value)) {
    layout.radius(() => 0).padding(0)
  }
  layout(root)
}

// ── Position setting helpers ──────────────────────────────────────────────

function setTreePositions(
  node: RealtimeNode,
  d: HierarchyPointNode<Datum>,
  config: NetworkPipelineConfig
): void {
  const orientation = config.treeOrientation || "vertical"

  if (orientation === "radial") {
    // Convert polar coordinates to cartesian
    const angle = d.x
    const radius = d.y
    // Compute Cartesian coordinates — the layout is already sized
    // relative to the center of [width, height].
    node.x = radius * Math.cos(angle - Math.PI / 2)
    node.y = radius * Math.sin(angle - Math.PI / 2)
  } else if (orientation === "horizontal") {
    // d3 tree with size([height, width]): d.x = vertical pos, d.y = horizontal pos
    node.x = d.y
    node.y = d.x
  } else {
    // Vertical: d.x = horizontal, d.y = vertical
    node.x = d.x
    node.y = d.y
  }

  // Set bounding box around the point (used by hit testing and transitions)
  setPointBounds(node, 5)
}

function setRectPositions(
  node: RealtimeNode,
  d: HierarchyRectangularNode<Datum>
): void {
  node.x0 = d.x0
  node.y0 = d.y0
  // A zero-valued subtree can receive a full rectangle from d3's degenerate
  // binary split. Retain its topology record without inventing visible area.
  node.x1 = node.value ? d.x1 : d.x0
  node.y1 = node.value ? d.y1 : d.y0
  node.x = (node.x0 + node.x1) / 2
  node.y = (node.y0 + node.y1) / 2
  node.width = node.x1 - node.x0
  node.height = node.y1 - node.y0
}

function setCirclePositions(
  node: RealtimeNode,
  d: HierarchyCircularNode<Datum>
): void {
  const r = d.r ?? 0
  node.x = d.x
  node.y = d.y
  // Set bounding box to enclosing square of the circle
  setPointBounds(node, r)
  // Store radius on the node for buildScene
  node.__radius = r
}

function setPointBounds(node: RealtimeNode, r: number): void {
  node.x0 = node.x - r
  node.x1 = node.x + r
  node.y0 = node.y - r
  node.y1 = node.y + r
  node.width = r * 2
  node.height = r * 2
}

registerLayoutPlugin("tree", hierarchyLayoutPlugin)
registerLayoutPlugin("cluster", hierarchyLayoutPlugin)
registerLayoutPlugin("treemap", hierarchyLayoutPlugin)
registerLayoutPlugin("circlepack", hierarchyLayoutPlugin)
registerLayoutPlugin("partition", hierarchyLayoutPlugin)
