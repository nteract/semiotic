import { commonJsWorkerModuleUrl } from "../../../stream/workerModuleUrl"
import type { BuildScenesInput, BuildScenesResult } from "./buildScenes"
import type { ProcessSankeyLayout } from "./algorithm"
import type { ProcessSankeyLayoutConfig } from "./streamingLayout"
import { scaleTime } from "d3-scale"
import type { Datum } from "../../shared/datumTypes"

export type ProcessSankeyLayoutExecution = "auto" | "worker" | "sync"

/**
 * Serializable worker request — no functions or React nodes.
 * Author `__raw` datums are included when structured-cloneable so
 * declarative styleRules / label priority resolve identically to sync.
 */
export interface ProcessSankeyWorkerRequest {
  input: Omit<BuildScenesInput, "colorOf" | "styleRules" | "labelPriorityAccessor" | "colorBy" | "valueAccessor"> & {
    /** Declarative styleRules only. Function when/style force main-thread. */
    styleRules?: BuildScenesInput["styleRules"]
    /** String field form only; functions force main-thread. */
    labelPriorityAccessor?: string
    colorBy?: string
    valueAccessor?: string
  }
  colorById: Record<string, string>
  fallbackPalette: string[]
}

export interface ProcessSankeyWorkerResponse {
  layout: ProcessSankeyLayout | null
  layoutConfig: ProcessSankeyLayoutConfig
  issues: BuildScenesResult["issues"]
  warnings: BuildScenesResult["warnings"]
  domain: [number, number]
  timelineExtent: number
}

interface WireRequest {
  requestId: number
  request: ProcessSankeyWorkerRequest
}

interface WireResponse {
  requestId?: number
  layout?: ProcessSankeyWorkerResponse["layout"] & { sides?: [string, unknown][] | Map<string, unknown> }
  layoutConfig?: ProcessSankeyLayoutConfig
  issues?: BuildScenesResult["issues"]
  warnings?: BuildScenesResult["warnings"]
  domain?: [number, number]
  timelineExtent?: number
  error?: { message: string; name?: string; stack?: string }
}

interface Pending {
  cleanup: () => void
  reject: (error: Error) => void
  resolve: (payload: ProcessSankeyWorkerResponse) => void
}

/**
 * Default cost threshold for `execution: "auto"`.
 * Dense rivers (≈100 nodes × packing×ordering) sit well above this;
 * small docs demos stay on the main thread.
 */
export const DEFAULT_PROCESS_SANKEY_WORKER_THRESHOLD = 50_000

export function estimateProcessSankeyLayoutCost(
  nodeCount: number,
  edgeCount: number,
  packing: "off" | "reuse" = "reuse",
  laneOrder: string = "crossing-min",
): number {
  const packingFactor = packing === "reuse" ? 80 : 1
  const orderFactor = laneOrder && laneOrder !== "insertion" ? 40 : 1
  return (
    nodeCount * nodeCount * packingFactor +
    edgeCount * edgeCount * orderFactor +
    (nodeCount + edgeCount) * 10
  )
}

export function shouldUseProcessSankeyWorker(
  execution: ProcessSankeyLayoutExecution,
  nodeCount: number,
  edgeCount: number,
  packing: "off" | "reuse" = "reuse",
  laneOrder: string = "crossing-min",
  threshold = DEFAULT_PROCESS_SANKEY_WORKER_THRESHOLD,
): boolean {
  if (execution === "sync") return false
  if (execution === "worker") return true
  return estimateProcessSankeyLayoutCost(nodeCount, edgeCount, packing, laneOrder) >= threshold
}

export function canUseProcessSankeyWorker(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined"
}

export function createProcessSankeyLayoutWorker(): Worker {
  const workerUrl =
    typeof import.meta.url === "string" && import.meta.url
      ? new URL("./processSankeyLayoutWorker.js", import.meta.url)
      : commonJsWorkerModuleUrl("processSankeyLayoutWorker.js")
  return new Worker(workerUrl, {
    type: "module",
    name: "semiotic-process-sankey-layout",
  })
}

function abortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("ProcessSankey layout aborted", "AbortError")
  }
  const error = new Error("ProcessSankey layout aborted")
  error.name = "AbortError"
  return error
}

function reviveLayout(layout: WireResponse["layout"]): ProcessSankeyLayout | null {
  if (!layout) return null
  const sidesEntries = layout.sides
  const sides =
    sidesEntries instanceof Map
      ? (sidesEntries as ProcessSankeyLayout["sides"])
      : new Map(
          Array.isArray(sidesEntries)
            ? (sidesEntries as [string, ProcessSankeyLayout["sides"] extends Map<string, infer V> ? V : never][])
            : [],
        )
  return { ...layout, sides } as ProcessSankeyLayout
}

/**
 * Long-lived ProcessSankey layout worker session. One Worker is reused across
 * layouts so module parse + startup cost is paid once per page.
 */
export class ProcessSankeyLayoutWorkerSession {
  private nextRequestId = 1
  private pending = new Map<number, Pending>()
  private worker: Worker
  private dead = false

  constructor(worker: Worker = createProcessSankeyLayoutWorker()) {
    this.worker = worker
    this.worker.onmessage = (event: MessageEvent<WireResponse>) => {
      const response = event.data
      const requestId = response.requestId
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
      pending.resolve({
        layout: reviveLayout(response.layout),
        layoutConfig: response.layoutConfig ?? { bands: [], ribbons: [], showLabels: true },
        issues: response.issues ?? [],
        warnings: response.warnings ?? [],
        domain: response.domain ?? [0, 1],
        timelineExtent: response.timelineExtent ?? 0,
      })
    }
    this.worker.onerror = (event: ErrorEvent) => {
      this.rejectAll(new Error(event.message || "ProcessSankey layout worker failed"))
      this.terminate()
    }
  }

  get isDead(): boolean {
    return this.dead
  }

  request(
    request: ProcessSankeyWorkerRequest,
    signal?: AbortSignal,
  ): Promise<ProcessSankeyWorkerResponse> {
    if (this.dead) {
      return Promise.reject(new Error("ProcessSankey layout worker session is closed"))
    }
    if (signal?.aborted) return Promise.reject(abortError())

    const requestId = this.nextRequestId
    this.nextRequestId += 1
    const wire: WireRequest = { requestId, request }

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
    this.rejectAll(new Error("ProcessSankey layout worker terminated"))
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

let sharedSession: ProcessSankeyLayoutWorkerSession | null = null

function getSharedSession(): ProcessSankeyLayoutWorkerSession {
  if (!sharedSession || sharedSession.isDead) {
    sharedSession = new ProcessSankeyLayoutWorkerSession()
  }
  return sharedSession
}

/** Test helper: drop the shared session so the next call creates a fresh Worker. */
export function _resetSharedProcessSankeyLayoutSessionForTest(): void {
  if (sharedSession) {
    try {
      sharedSession.terminate()
    } catch {
      /* ignore */
    }
    sharedSession = null
  }
}

export function runProcessSankeyLayoutWorker(
  request: ProcessSankeyWorkerRequest,
  signal?: AbortSignal,
): Promise<ProcessSankeyWorkerResponse> {
  if (!canUseProcessSankeyWorker()) {
    return Promise.reject(new Error("Web Workers are unavailable"))
  }
  if (signal?.aborted) return Promise.reject(abortError())
  return getSharedSession().request(request, signal)
}

/**
 * Re-attach host-side raw datums after a worker layout (workers strip them).
 * Rebuilds the time scale on the main thread.
 */
export function reattachProcessSankeySceneDatums(
  response: ProcessSankeyWorkerResponse,
  rawNodeById: ReadonlyMap<string, Datum>,
  rawEdgeById: ReadonlyMap<string, Datum>,
): BuildScenesResult {
  const bands = (response.layoutConfig.bands ?? []).map((band) => ({
    ...band,
    rawDatum: rawNodeById.get(band.id) ?? ({ id: band.id } as Datum),
  }))
  const ribbons = (response.layoutConfig.ribbons ?? []).map((ribbon) => ({
    ...ribbon,
    rawDatum: rawEdgeById.get(ribbon.id) ?? ({ id: ribbon.id } as Datum),
  }))
  const xScale = scaleTime()
    .domain(response.domain)
    .range([0, response.timelineExtent])
  return {
    layout: response.layout,
    layoutConfig: {
      bands,
      ribbons,
      showLabels: response.layoutConfig.showLabels,
    },
    issues: response.issues,
    warnings: response.warnings,
    xScale,
  }
}

/**
 * True when styleRules contain non-serializable predicate/style functions.
 * Those force the main-thread path. Declarative thresholds are worker-safe
 * when author `__raw` datums are cloned onto the wire request.
 */
export function processSankeyStyleRulesNeedMainThread(
  styleRules: BuildScenesInput["styleRules"] | undefined,
): boolean {
  if (!styleRules || styleRules.length === 0) return false
  for (const rule of styleRules) {
    if (typeof rule.when === "function") return true
    if (typeof rule.style === "function") return true
  }
  return false
}

/**
 * True when any ProcessSankey input cannot cross the worker boundary without
 * changing layout/style/validation semantics. Forces the main-thread path.
 */
export function processSankeyNeedsMainThread(
  input: Pick<
    BuildScenesInput,
    "styleRules" | "labelPriorityAccessor" | "colorBy" | "valueAccessor"
  >,
): boolean {
  if (processSankeyStyleRulesNeedMainThread(input.styleRules)) return true
  // Function accessors cannot structured-clone; label density would diverge.
  if (typeof input.labelPriorityAccessor === "function") return true
  // Function colorBy/valueAccessor only affect styleRules rule context.
  // Colors themselves are precomputed into colorById on the main thread.
  if (input.styleRules && input.styleRules.length > 0) {
    if (typeof input.colorBy === "function") return true
    if (typeof input.valueAccessor === "function") return true
  }
  return false
}
