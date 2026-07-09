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

interface ForceWorkerWireRequest {
  requestId: number
  request: ForceWorkerRequest
}

interface ForceWorkerWireResponse {
  requestId?: number
  positions?: Record<string, Point>
  error?: { message: string; name?: string; stack?: string }
}

interface PendingForceWorkerRequest {
  cleanup: () => void
  reject: (error: Error) => void
  resolve: (payload: ForceWorkerResponse) => void
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
  return new Worker(new URL("./forceLayoutWorker.js", import.meta.url), {
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

/**
 * Long-lived force-layout worker session. Mirrors PhysicsWorkerSession:
 * one Worker is reused across layouts so module parse + startup cost is
 * paid once per page, not once per graph re-layout.
 */
export class ForceLayoutWorkerSession {
  private nextRequestId = 1
  private pending = new Map<number, PendingForceWorkerRequest>()
  private worker: Worker
  private dead = false

  constructor(worker: Worker = createForceLayoutWorker()) {
    this.worker = worker
    this.worker.onmessage = (event: MessageEvent<ForceWorkerWireResponse>) => {
      const response = event.data
      const requestId = response.requestId
      // Back-compat: one-shot workers that omit requestId resolve the
      // oldest pending request (at most one in that protocol).
      const pending =
        requestId != null
          ? this.pending.get(requestId)
          : this.pending.values().next().value
      if (!pending) return
      if (requestId != null) this.pending.delete(requestId)
      else this.pending.clear()
      pending.cleanup()
      if (response.error) {
        const error = new Error(response.error.message)
        error.name = response.error.name ?? "Error"
        if (response.error.stack) error.stack = response.error.stack
        pending.reject(error)
        return
      }
      pending.resolve({ positions: response.positions ?? {} })
    }
    this.worker.onerror = (event: ErrorEvent) => {
      this.rejectAll(new Error(event.message || "Force layout worker failed"))
      this.terminate()
    }
  }

  get isDead(): boolean {
    return this.dead
  }

  request(
    request: ForceWorkerRequest,
    signal?: AbortSignal
  ): Promise<ForceWorkerResponse> {
    if (this.dead) {
      return Promise.reject(new Error("Force layout worker session is closed"))
    }
    if (signal?.aborted) return Promise.reject(abortError())

    const requestId = this.nextRequestId
    this.nextRequestId += 1
    const wire: ForceWorkerWireRequest = { requestId, request }

    return new Promise((resolve, reject) => {
      const onAbort = () => {
        this.pending.delete(requestId)
        signal?.removeEventListener("abort", onAbort)
        reject(abortError())
      }
      const cleanup = () => signal?.removeEventListener("abort", onAbort)
      this.pending.set(requestId, { cleanup, reject, resolve })
      signal?.addEventListener("abort", onAbort, { once: true })

      try {
        this.worker.postMessage(wire)
      } catch (error) {
        this.pending.delete(requestId)
        cleanup()
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  terminate(): void {
    if (this.dead) return
    this.dead = true
    this.rejectAll(new Error("Force layout worker terminated"))
    this.worker.terminate()
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.cleanup()
      pending.reject(error)
    }
    this.pending.clear()
  }
}

/** Shared session for the package-level `runForceLayoutWorker` helper. */
let sharedSession: ForceLayoutWorkerSession | null = null

function getSharedForceLayoutSession(): ForceLayoutWorkerSession {
  if (!sharedSession || sharedSession.isDead) {
    sharedSession = new ForceLayoutWorkerSession()
  }
  return sharedSession
}

/** Test helper: drop the shared session so the next call creates a fresh Worker. */
export function _resetSharedForceLayoutSessionForTest(): void {
  if (sharedSession) {
    try {
      sharedSession.terminate()
    } catch {
      /* ignore */
    }
    sharedSession = null
  }
}

/**
 * Run a force layout on a reused worker session.
 * Prefer this over constructing a new Worker per layout.
 */
export function runForceLayoutWorker(
  request: ForceWorkerRequest,
  signal?: AbortSignal
): Promise<ForceWorkerResponse> {
  if (!canUseForceWorker()) {
    return Promise.reject(new Error("Web Workers are unavailable"))
  }
  if (signal?.aborted) return Promise.reject(abortError())

  return getSharedForceLayoutSession().request(request, signal)
}
