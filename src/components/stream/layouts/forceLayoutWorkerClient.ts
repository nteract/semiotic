import type { GraphEdge, GraphNode, Point } from "../../recipes/networkAnalysis"
import type { ForceLayoutOptions } from "../../recipes/forceLayout"
import { commonJsWorkerModuleUrl } from "../workerModuleUrl"
import {
  ModuleWorkerSession,
  createSharedWorkerSessionHolder,
  moduleWorkerErrorFromPayload,
  parseModuleWorkerErrorField,
} from "../moduleWorkerSession"
import {
  canUseForceWorker,
  type FrameForceWorkerRequest,
} from "./forceLayoutWorkerPolicy"

export {
  canUseForceWorker,
  createFrameForceWorkerRequest,
  DEFAULT_FORCE_WORKER_THRESHOLD,
  shouldUseForceWorker,
  type ForceLayoutExecution,
  type FrameForceWorkerRequest,
} from "./forceLayoutWorkerPolicy"

export interface NormalizedForceWorkerRequest {
  kind: "normalized"
  nodes: GraphNode[]
  edges: GraphEdge[]
  options: Omit<ForceLayoutOptions, "nodeRadius">
  nodeRadii?: Record<string, number>
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

export function createForceLayoutWorker(): Worker {
  // Consumer bundlers need new URL directly inside new Worker to compile
  // the worker's imports, rather than copying it as an opaque file asset.
  if (typeof import.meta.url === "string" && import.meta.url) {
    return new Worker(new URL("./forceLayoutWorker.js", import.meta.url), {
      type: "module",
      name: "semiotic-force-layout"
    })
  }
  return new Worker(commonJsWorkerModuleUrl("forceLayoutWorker.js"), {
    type: "module",
    name: "semiotic-force-layout"
  })
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
