import {
  sankeyCircular,
  sankeyLeft,
  sankeyRight,
  sankeyCenter,
  sankeyJustify
} from "d3-sankey-circular"
import type { TopologyStore } from "./TopologyStore"
import type { RealtimeNode, RealtimeEdge } from "./types"

const sankeyOrientHash: Record<string, any> = {
  left: sankeyLeft,
  right: sankeyRight,
  center: sankeyCenter,
  justify: sankeyJustify
}

export interface SankeyLayoutConfig {
  orient: "justify" | "left" | "right" | "center"
  direction: "right" | "down"
  iterations: number
  nodePaddingRatio: number
  nodeWidth: number
  size: [number, number]
}

/**
 * Run a full d3-sankey-circular layout on the topology store's data.
 *
 * This wraps the same sankeyCircular used by the static SankeyDiagram,
 * adapted for the mutable data structures in TopologyStore.
 */
export function fullSankeyRelayout(
  store: TopologyStore,
  config: SankeyLayoutConfig
): void {
  const { nodes, edges } = store.getLayoutData()

  if (nodes.length === 0) return

  // Resolve edges: ensure source/target are string IDs for d3-sankey
  // d3-sankey-circular will resolve them to node objects internally
  const sankeyNodes = nodes.map((n) => ({ ...n }))
  const nodeMap = new Map(sankeyNodes.map((n) => [n.id, n]))

  const sankeyEdges = edges.map((e) => ({
    ...e,
    source: typeof e.source === "string" ? e.source : e.source.id,
    target: typeof e.target === "string" ? e.target : e.target.id
  }))

  let frameExtent: [[number, number], [number, number]]
  if (config.direction === "down") {
    frameExtent = [[0, 0], [config.size[1], config.size[0]]]
  } else {
    frameExtent = [[0, 0], [config.size[0], config.size[1]]]
  }

  const sankey = sankeyCircular()
    .extent(frameExtent)
    .links(sankeyEdges)
    .nodes(sankeyNodes)
    .nodeAlign(sankeyOrientHash[config.orient] || sankeyJustify)
    .nodeId((d: any) => d.id)
    .nodeWidth(config.nodeWidth)
    .iterations(config.iterations)

  if (sankey.nodePaddingRatio) {
    sankey.nodePaddingRatio(config.nodePaddingRatio)
  }

  // Execute layout
  sankey()

  // Write computed positions back to the store's nodes
  for (const sn of sankeyNodes) {
    const original = store.nodes.get(sn.id)
    if (original) {
      original.x0 = sn.x0
      original.x1 = sn.x1
      original.y0 = sn.y0
      original.y1 = sn.y1
      original.value = sn.value
      original.depth = sn.depth
      original.sourceLinks = sn.sourceLinks
      original.targetLinks = sn.targetLinks
    }
  }

  // Write computed positions back to the store's edges
  for (const se of sankeyEdges) {
    const src = se.source as any
    const tgt = se.target as any
    const sourceId = typeof src === "object" && src !== null ? src.id : String(src)
    const targetId = typeof tgt === "object" && tgt !== null ? tgt.id : String(tgt)
    const key = `${sourceId}\0${targetId}`
    const original = store.edges.get(key)
    if (original) {
      original.y0 = (se as any).y0
      original.y1 = (se as any).y1
      original.sankeyWidth = (se as any).width ?? 0
      original.circular = !!(se as any).circular
      original.circularPathData = (se as any).circularPathData

      // Resolve source/target to node references
      original.source = store.nodes.get(sourceId)!
      original.target = store.nodes.get(targetId)!
    }
  }
}

/**
 * Heuristic placement for a new node between relayouts.
 * Places it at the rightmost column (horizontal) or bottom (vertical).
 */
export function heuristicPlaceNode(
  node: RealtimeNode,
  store: TopologyStore,
  config: SankeyLayoutConfig
): void {
  // Find max x1 across existing nodes
  let maxX1 = 0
  let maxY1 = 0
  for (const n of store.nodes.values()) {
    if (n === node) continue
    if (n.x1 > maxX1) maxX1 = n.x1
    if (n.y1 > maxY1) maxY1 = n.y1
  }

  if (config.direction === "down") {
    node.x0 = 0
    node.x1 = config.nodeWidth
    node.y0 = maxY1 + 10
    node.y1 = node.y0 + 30
  } else {
    node.x0 = maxX1 + 20
    node.x1 = node.x0 + config.nodeWidth
    node.y0 = 0
    node.y1 = 30
  }

  node.width = node.x1 - node.x0
  node.height = node.y1 - node.y0
  node.x = node.x0 + node.width / 2
  node.y = node.y0 + node.height / 2
}

/**
 * Interpolation helpers for smooth layout transitions.
 */
export function interpolateNodePositions(
  nodes: RealtimeNode[],
  t: number
): void {
  for (const n of nodes) {
    if (n._prevX0 !== undefined) {
      const it = Math.min(t, 1)
      n.x0 = n._prevX0 + (n.x0 - n._prevX0) * it
      n.x1 = n._prevX1! + (n.x1 - n._prevX1!) * it
      n.y0 = n._prevY0! + (n.y0 - n._prevY0!) * it
      n.y1 = n._prevY1! + (n.y1 - n._prevY1!) * it
      n.width = n.x1 - n.x0
      n.height = n.y1 - n.y0
      n.x = n.x0 + n.width / 2
      n.y = n.y0 + n.height / 2
    }
  }
}

export function interpolateEdgePositions(
  edges: RealtimeEdge[],
  t: number
): void {
  for (const e of edges) {
    if (e._prevY0 !== undefined) {
      const it = Math.min(t, 1)
      e.y0 = e._prevY0 + (e.y0 - e._prevY0) * it
      e.y1 = e._prevY1! + (e.y1 - e._prevY1!) * it
      e.sankeyWidth = e._prevSankeyWidth! + (e.sankeyWidth - e._prevSankeyWidth!) * it
    }
  }
}
