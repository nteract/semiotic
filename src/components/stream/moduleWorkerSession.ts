/**
 * Shared long-lived module-worker session for layout offload (force, ProcessSankey).
 *
 * One Worker is reused across requests so module parse + startup is paid once
 * per page. Callers supply wire parse / createWorker; this owns request ids,
 * abort wiring, and terminate/reject-all lifecycle.
 */

export interface ModuleWorkerErrorPayload {
  message: string
  name?: string
  stack?: string
}

export type ParsedModuleWorkerMessage<TResponse> =
  | { requestId?: number; ok: true; payload: TResponse }
  | { requestId?: number; ok: false; error: Error }

export interface ModuleWorkerSessionOptions<TRequest, TResponse> {
  /** Human-readable worker name (AbortError / terminate messages). */
  name: string
  createWorker: () => Worker
  /**
   * Map an `onmessage` payload into a success/error result.
   * `requestId` may be omitted for one-shot workers (oldest pending wins).
   */
  parseMessage: (data: unknown) => ParsedModuleWorkerMessage<TResponse>
  /**
   * Wrap a domain request for `postMessage`. Default: `{ requestId, request }`.
   */
  encodeRequest?: (requestId: number, request: TRequest) => unknown
}

interface Pending<TResponse> {
  cleanup: () => void
  reject: (error: Error) => void
  resolve: (payload: TResponse) => void
}

function makeAbortError(label: string): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException(`${label} aborted`, "AbortError")
  }
  const error = new Error(`${label} aborted`)
  error.name = "AbortError"
  return error
}

function errorFromPayload(payload: ModuleWorkerErrorPayload): Error {
  const error = new Error(payload.message)
  error.name = payload.name ?? "Error"
  if (payload.stack) error.stack = payload.stack
  return error
}

/**
 * Build a standard `{ requestId?, ok, error|payload }` parser for wire
 * responses that carry an optional `error` object and free-form success fields.
 */
export function parseModuleWorkerErrorField(
  data: unknown,
): { requestId?: number; error?: ModuleWorkerErrorPayload } {
  if (!data || typeof data !== "object") return {}
  const record = data as {
    requestId?: number
    error?: ModuleWorkerErrorPayload
  }
  return {
    requestId: record.requestId,
    error: record.error,
  }
}

export { errorFromPayload as moduleWorkerErrorFromPayload }

export class ModuleWorkerSession<TRequest, TResponse> {
  private nextRequestId = 1
  private pending = new Map<number, Pending<TResponse>>()
  private worker: Worker
  private dead = false
  private readonly options: ModuleWorkerSessionOptions<TRequest, TResponse>

  constructor(options: ModuleWorkerSessionOptions<TRequest, TResponse>) {
    this.options = options
    this.worker = options.createWorker()
    this.worker.onmessage = (event: MessageEvent<unknown>) => {
      const parsed = this.options.parseMessage(event.data)
      const requestId = parsed.requestId
      const pending =
        requestId != null
          ? this.pending.get(requestId)
          : this.pending.values().next().value
      if (!pending) return
      if (requestId != null) {
        this.pending.delete(requestId)
      } else {
        // A response without an id can only identify the oldest request. Do
        // not silently orphan any concurrent requests that cannot be matched.
        for (const other of this.pending.values()) {
          if (other === pending) continue
          other.cleanup()
          other.reject(new Error(`${this.options.name} worker response missing requestId`))
        }
        this.pending.clear()
      }
      pending.cleanup()
      if (!parsed.ok) {
        pending.reject(parsed.error)
        return
      }
      pending.resolve(parsed.payload)
    }
    this.worker.onerror = (event: ErrorEvent) => {
      this.rejectAll(
        new Error(event.message || `${this.options.name} worker failed`),
      )
      this.terminate()
    }
  }

  get isDead(): boolean {
    return this.dead
  }

  request(request: TRequest, signal?: AbortSignal): Promise<TResponse> {
    if (this.dead) {
      return Promise.reject(
        new Error(`${this.options.name} worker session is closed`),
      )
    }
    if (signal?.aborted) {
      return Promise.reject(makeAbortError(this.options.name))
    }

    const requestId = this.nextRequestId
    this.nextRequestId += 1
    const wire =
      this.options.encodeRequest?.(requestId, request) ??
      ({ requestId, request } as unknown)

    return new Promise((resolve, reject) => {
      const onAbort = () => {
        this.pending.delete(requestId)
        signal?.removeEventListener("abort", onAbort)
        reject(makeAbortError(this.options.name))
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
    this.rejectAll(new Error(`${this.options.name} worker terminated`))
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

/**
 * Lazy singleton holder for a session class that exposes `isDead` + `terminate`.
 */
export function createSharedWorkerSessionHolder<
  TSession extends { isDead: boolean; terminate(): void },
>(create: () => TSession): {
  get: () => TSession
  resetForTest: () => void
} {
  let session: TSession | null = null
  return {
    get: () => {
      if (!session || session.isDead) session = create()
      return session
    },
    resetForTest: () => {
      if (session) {
        try {
          session.terminate()
        } catch {
          /* ignore */
        }
        session = null
      }
    },
  }
}
