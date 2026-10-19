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

/** Application-owned worker: no worker or optional optimizer is imported at initialization. */
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
  let disposed = false
  const onMessage = ({ data }: MessageEvent<CompositionalWorkerMessage>) => {
    if (data.type !== "result" && data.type !== "error") return
    const entry = pending.get(data.requestId)
    if (!entry) return
    entry.clean()
    pending.delete(data.requestId)
    if (data.type === "result") entry.resolve(data.solved)
    else entry.reject(new Error(data.message))
  }
  port.addEventListener("message", onMessage)
  return {
    ...engine,
    layout(request, signal) {
      return new Promise((resolve, reject) => {
        if (disposed || signal?.aborted) {
          reject(new Error("REVISION_CANCELLED"))
          return
        }
        if (pending.has(request.requestId)) {
          reject(
            new Error(
              "REVISION_REQUEST_ID: in-flight request IDs must be unique."
            )
          )
          return
        }
        const cancel = () => {
          pending.delete(request.requestId)
          signal?.removeEventListener("abort", cancel)
          port.postMessage({ type: "cancel", requestId: request.requestId })
          reject(new Error("REVISION_CANCELLED"))
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
      for (const [requestId, entry] of pending) {
        entry.clean()
        entry.reject(new Error("REVISION_CANCELLED"))
        port.postMessage({ type: "cancel", requestId })
      }
      pending.clear()
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
    void engine
      .layout(request, controller.signal)
      .then(
        (solved) => {
          if (!controller.signal.aborted)
            port.postMessage({
              type: "result",
              requestId: request.requestId,
              solved
            })
        },
        (error) => {
          if (!controller.signal.aborted)
            port.postMessage({
              type: "error",
              requestId: request.requestId,
              message:
                error instanceof Error ? error.message : "Worker layout failed."
            })
        }
      )
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
