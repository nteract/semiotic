import type {
  NetworkPipelineConfig,
  RealtimeEdge,
  RealtimeNode
} from "../networkTypes"
import { resolveNodeSizeFn } from "./forceLayoutNodeSize"
import { resolveForceEdgeWeight } from "./forceLayoutEdgeWeight"
import type { SimulationNodeDatum } from "d3-force"

export type ForceLayoutExecution = "auto" | "worker" | "sync"

export interface FrameForceWorkerRequest {
  kind: "frame"
  nodes: RealtimeNode[]
  edges: RealtimeEdge[]
  config: {
    chartType: "force"
    iterations?: number
    forceStrength?: number
    seed?: number
    __previousPositions?: Map<string, { x: number; y: number }>
  }
  size: [number, number]
}

export const DEFAULT_FORCE_WORKER_THRESHOLD = 40_000

export function shouldUseForceWorker(
  execution: ForceLayoutExecution,
  nodeCount: number,
  edgeCount: number,
  iterations: number,
  threshold = DEFAULT_FORCE_WORKER_THRESHOLD
): boolean {
  if (execution === "sync") return false
  if (execution === "worker") return true
  return iterations * (nodeCount + edgeCount) >= threshold
}

export function canUseForceWorker(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined"
}

export function createFrameForceWorkerRequest(
  nodes: RealtimeNode[],
  edges: RealtimeEdge[],
  config: NetworkPipelineConfig,
  size: [number, number],
  previousPositions?: Map<string, { x: number; y: number }> | null
): FrameForceWorkerRequest {
  const radiusOf = resolveNodeSizeFn(config.nodeSize, config.nodeSizeRange, nodes)
  const serializedNodes: RealtimeNode[] = nodes.map((node) => {
    const simulationNode = node as RealtimeNode & SimulationNodeDatum
    const previous = previousPositions?.get(node.id)
    const x = node.x !== 0 || node.y !== 0 ? node.x : previous?.x ?? 0
    const y = node.x !== 0 || node.y !== 0 ? node.y : previous?.y ?? 0
    return {
      id: node.id,
      x,
      y,
      vx: simulationNode.vx,
      vy: simulationNode.vy,
      x0: 0,
      x1: 0,
      y0: 0,
      y1: 0,
      width: 0,
      height: 0,
      value: node.value,
      __forceRadius: radiusOf(node)
    }
  })
  const serializedEdges: RealtimeEdge[] = edges.map((edge) => {
    const source =
      typeof edge.source === "string" ? edge.source : edge.source.id
    const target =
      typeof edge.target === "string" ? edge.target : edge.target.id
    return {
      source,
      target,
      value: edge.value,
      y0: 0,
      y1: 0,
      sankeyWidth: 0,
      data: { weight: resolveForceEdgeWeight(edge) }
    }
  })

  return {
    kind: "frame",
    nodes: serializedNodes,
    edges: serializedEdges,
    config: {
      chartType: "force",
      iterations: config.iterations,
      forceStrength: config.forceStrength,
      seed: config.seed,
      __previousPositions: previousPositions ?? config.__previousPositions
    },
    size
  }
}
