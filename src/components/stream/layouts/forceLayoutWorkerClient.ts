import type { GraphEdge, GraphNode, Point } from "../../recipes/networkAnalysis"
import type { ForceLayoutOptions } from "../../recipes/forceLayout"
import type {
  NetworkPipelineConfig,
  RealtimeEdge,
  RealtimeNode
} from "../networkTypes"
import { resolveNodeSizeFn } from "./forceLayoutPlugin"

export type ForceLayoutExecution = "auto" | "worker" | "sync"

export interface NormalizedForceWorkerRequest {
  kind: "normalized"
  nodes: GraphNode[]
  edges: GraphEdge[]
  options: Omit<ForceLayoutOptions, "nodeRadius">
  nodeRadii?: Record<string, number>
}

export interface FrameForceWorkerRequest {
  kind: "frame"
  nodes: RealtimeNode[]
  edges: RealtimeEdge[]
  config: {
    chartType: "force"
    iterations?: number
    forceStrength?: number
  }
  size: [number, number]
}

export type ForceWorkerRequest =
  | NormalizedForceWorkerRequest
  | FrameForceWorkerRequest

export interface ForceWorkerResponse {
  positions: Record<string, Point>
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
    const previous = previousPositions?.get(node.id)
    const x = node.x !== 0 || node.y !== 0 ? node.x : previous?.x ?? 0
    const y = node.x !== 0 || node.y !== 0 ? node.y : previous?.y ?? 0
    return {
      id: node.id,
      x,
      y,
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
    const rawWeight = edge.data?.weight
    const weight =
      typeof rawWeight === "number" && Number.isFinite(rawWeight)
        ? rawWeight
        : edge.value
    return {
      source,
      target,
      value: edge.value,
      y0: 0,
      y1: 0,
      sankeyWidth: 0,
      // The plugin intentionally accepts duck-typed weighted edges.
      weight
    } as RealtimeEdge
  })

  return {
    kind: "frame",
    nodes: serializedNodes,
    edges: serializedEdges,
    config: {
      chartType: "force",
      iterations: config.iterations,
      forceStrength: config.forceStrength
    },
    size
  }
}

function abortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Force layout aborted", "AbortError")
  }
  const error = new Error("Force layout aborted")
  error.name = "AbortError"
  return error
}

export function runForceLayoutWorker(
  request: ForceWorkerRequest,
  signal?: AbortSignal
): Promise<ForceWorkerResponse> {
  if (!canUseForceWorker()) {
    return Promise.reject(new Error("Web Workers are unavailable"))
  }
  if (signal?.aborted) return Promise.reject(abortError())

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./forceLayoutWorker.js", import.meta.url),
      { type: "module", name: "semiotic-force-layout" }
    )

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort)
      worker.terminate()
    }
    const onAbort = () => {
      cleanup()
      reject(abortError())
    }

    worker.onmessage = (event: MessageEvent<ForceWorkerResponse>) => {
      cleanup()
      resolve(event.data)
    }
    worker.onerror = (event: ErrorEvent) => {
      cleanup()
      reject(new Error(event.message || "Force layout worker failed"))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
    try {
      worker.postMessage(request)
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}
