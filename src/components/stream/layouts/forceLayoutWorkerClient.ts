import type { GraphEdge, GraphNode, Point } from "../../recipes/networkAnalysis"
import type { ForceLayoutOptions } from "../../recipes/forceLayout"
import type {
  NetworkPipelineConfig,
  RealtimeEdge,
  RealtimeNode
} from "../networkTypes"
import { resolveNodeSizeFn } from "./forceLayoutPlugin"
import { commonJsWorkerModuleUrl } from "../workerModuleUrl"
import {
  ModuleWorkerSession,
  createSharedWorkerSessionHolder,
  moduleWorkerErrorFromPayload,
  parseModuleWorkerErrorField,
} from "../moduleWorkerSession"

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
    seed?: number
  }
  size: [number, number]
}

export type ForceWorkerRequest =
  | NormalizedForceWorkerRequest
  | FrameForceWorkerRequest

export interface ForceWorkerResponse {
  positions: Record<string, Point>
}

interface ForceWorkerWireResponse {
  requestId?: number
  positions?: Record<string, Point>
  error?: { message: string; name?: string; stack?: string }
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

export function createForceLayoutWorker(): Worker {
  // Keep the literal ESM URL expression for Vite/Webpack worker-asset
  // discovery. tsup's CJS output has no import.meta.url, so resolve from the
  // emitted CJS filename there instead.
  const workerUrl = typeof import.meta.url === "string" && import.meta.url
    ? new URL("./forceLayoutWorker.js", import.meta.url)
    : commonJsWorkerModuleUrl("forceLayoutWorker.js")
  return new Worker(workerUrl, {
    type: "module",
    name: "semiotic-force-layout"
  })
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
      forceStrength: config.forceStrength,
      seed: config.seed
    },
    size
  }
}

/**
 * Long-lived force-layout worker session. Built on {@link ModuleWorkerSession}
 * so request-id / abort / terminate plumbing is shared with ProcessSankey.
 */
export class ForceLayoutWorkerSession {
  private readonly session: ModuleWorkerSession<ForceWorkerRequest, ForceWorkerResponse>

  constructor(worker: Worker = createForceLayoutWorker()) {
    this.session = new ModuleWorkerSession({
      name: "Force layout",
      createWorker: () => worker,
      terminateOnAbort: true,
      parseMessage: (data) => {
        const response = data as ForceWorkerWireResponse
        const { requestId, error } = parseModuleWorkerErrorField(response)
        if (error) {
          return {
            requestId,
            ok: false as const,
            error: moduleWorkerErrorFromPayload(error),
          }
        }
        return {
          requestId,
          ok: true as const,
          payload: { positions: response.positions ?? {} },
        }
      },
    })
  }

  get isDead(): boolean {
    return this.session.isDead
  }

  request(
    request: ForceWorkerRequest,
    signal?: AbortSignal,
  ): Promise<ForceWorkerResponse> {
    return this.session.request(request, signal)
  }

  terminate(): void {
    this.session.terminate()
  }
}

const sharedForceLayoutSession = createSharedWorkerSessionHolder(
  () => new ForceLayoutWorkerSession(),
)

/** Test helper: drop the shared session so the next call creates a fresh Worker. */
export function _resetSharedForceLayoutSessionForTest(): void {
  sharedForceLayoutSession.resetForTest()
}

/**
 * Run a force layout on a reused worker session.
 * Prefer this over constructing a new Worker per layout.
 */
export function runForceLayoutWorker(
  request: ForceWorkerRequest,
  signal?: AbortSignal,
): Promise<ForceWorkerResponse> {
  if (!canUseForceWorker()) {
    return Promise.reject(new Error("Web Workers are unavailable"))
  }
  return sharedForceLayoutSession.get().request(request, signal)
}
