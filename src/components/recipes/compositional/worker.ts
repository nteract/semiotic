import type {
  AsyncLayoutEngine,
  LayoutRequest,
  SolvedCompositionalLayout
} from "./types"
import { compositionalDagEngine } from "./runtime"

export type CompositionalWorkerMessage =
  | { type: "solve"; request: LayoutRequest }
  | { type: "cancel"; requestId: string }
  | { type: "result"; requestId: string; solved: SolvedCompositionalLayout }
  | { type: "error"; requestId: string; message: string }

export interface CompositionalWorkerPort {
  postMessage(message: CompositionalWorkerMessage): void
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<CompositionalWorkerMessage>) => void
  ): void
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<CompositionalWorkerMessage>) => void
  ): void
}

type FailureEvents = {
  addEventListener?(type: string, listener: (event: Event) => void): void
  removeEventListener?(type: string, listener: (event: Event) => void): void
}

/**
 * Application-owned worker. Request IDs must be unique for this engine's
 * lifetime. A Worker's `error` or a port's `messageerror` rejects every
 * pending request with `REVISION_WORKER_FAILED`, so a controller keeps its
 * accepted layout instead of waiting for a response that cannot arrive.
 */
export function createCompositionalWorkerEngine(
  port: CompositionalWorkerPort,
  engine: Pick<
    AsyncLayoutEngine,
    "id" | "version" | "capabilities"
  > = compositionalDagEngine
): AsyncLayoutEngine & { dispose(): void } {
  const pending = new Map<
    string,
    {
      resolve: (solved: SolvedCompositionalLayout) => void
      reject: (error: Error) => void
      clean: () => void
    }
  >()
  const usedRequestIds = new Set<string>()
  let disposed = false
  const cancelRemote = (requestId: string) => {
    try {
      port.postMessage({ type: "cancel", requestId })
    } catch {
      // Local cancellation must settle even if the worker transport is gone.
    }
  }
  const onMessage = ({ data }: MessageEvent<CompositionalWorkerMessage>) => {
    if (data.type !== "result" && data.type !== "error") return
    const entry = pending.get(data.requestId)
    if (!entry) return
    entry.clean()
    pending.delete(data.requestId)
    if (data.type === "result") entry.resolve(data.solved)
    else entry.reject(new Error(data.message))
  }
  const failAll = (message: string) => {
    for (const entry of pending.values()) {
      entry.clean()
      entry.reject(new Error(`REVISION_WORKER_FAILED: ${message}`))
    }
    pending.clear()
  }
  // Ports without these events never deliver them; a port that ignores the
  // event type delivers messages here, which carry no failure type.
  const onFailure = (event: Event) => {
    if (event?.type === "messageerror")
      failAll("A worker message could not be deserialized.")
    else if (event?.type === "error")
      failAll((event as ErrorEvent).message || "The worker reported an error.")
  }
  const failures = port as unknown as FailureEvents
  port.addEventListener("message", onMessage)
  failures.addEventListener?.("error", onFailure)
  failures.addEventListener?.("messageerror", onFailure)
  return {
    ...engine,
    layout(request, signal) {
      return new Promise((resolve, reject) => {
        if (disposed || signal?.aborted) {
          reject(new Error("REVISION_CANCELLED"))
          return
        }
        if (usedRequestIds.has(request.requestId)) {
          reject(
            new Error(
              "REVISION_REQUEST_ID: request IDs must be unique for the engine's lifetime."
            )
          )
          return
        }
        usedRequestIds.add(request.requestId)
        const cancel = () => {
          pending.delete(request.requestId)
          signal?.removeEventListener("abort", cancel)
          reject(new Error("REVISION_CANCELLED"))
          cancelRemote(request.requestId)
        }
        pending.set(request.requestId, {
          resolve,
          reject,
          clean: () => signal?.removeEventListener("abort", cancel)
        })
        signal?.addEventListener("abort", cancel, { once: true })
        try {
          port.postMessage({ type: "solve", request })
        } catch (error) {
          pending.delete(request.requestId)
          signal?.removeEventListener("abort", cancel)
          reject(error)
        }
      })
    },
    dispose() {
      disposed = true
      port.removeEventListener("message", onMessage)
      failures.removeEventListener?.("error", onFailure)
      failures.removeEventListener?.("messageerror", onFailure)
      for (const [requestId, entry] of pending) {
        entry.clean()
        entry.reject(new Error("REVISION_CANCELLED"))
        cancelRemote(requestId)
      }
      pending.clear()
      usedRequestIds.clear()
    }
  }
}

/** Install inside a worker. Cancellation is cooperative; the host always guards stale results. */
export function installCompositionalWorker(
  port: CompositionalWorkerPort,
  engine: AsyncLayoutEngine = compositionalDagEngine
): () => void {
  const active = new Map<string, AbortController>()
  const onMessage = ({ data }: MessageEvent<CompositionalWorkerMessage>) => {
    if (data.type === "cancel") {
      active.get(data.requestId)?.abort()
      return
    }
    if (data.type !== "solve") return
    const request = data.request,
      controller = new AbortController()
    active.get(request.requestId)?.abort()
    active.set(request.requestId, controller)
    void Promise.resolve()
      .then(() => engine.layout(request, controller.signal))
      .then((solved) => {
        if (!controller.signal.aborted)
          port.postMessage({
            type: "result",
            requestId: request.requestId,
            solved
          })
      })
      // Covers a failed solve and a result that cannot be posted.
      .catch((error) => {
        if (controller.signal.aborted) return
        try {
          port.postMessage({
            type: "error",
            requestId: request.requestId,
            message:
              error instanceof Error ? error.message : "Worker layout failed."
          })
        } catch {
          // The port is gone; the host's own failure handling applies.
        }
      })
      .finally(() => {
        if (active.get(request.requestId) === controller)
          active.delete(request.requestId)
      })
  }
  port.addEventListener("message", onMessage)
  return () => {
    port.removeEventListener("message", onMessage)
    active.forEach((controller) => controller.abort())
    active.clear()
  }
}
