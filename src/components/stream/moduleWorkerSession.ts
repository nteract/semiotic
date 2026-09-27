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
  /**
   * Terminate the worker when a request is aborted. Worker message handlers
   * cannot interrupt CPU-bound synchronous layout code, so termination is the
   * only cancellation mode that actually stops superseded work.
   */
  terminateOnAbort?: boolean
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
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Malformed worker response")
  const record = data as {
    requestId?: number
    error?: ModuleWorkerErrorPayload
  }
  if ((record.requestId !== undefined && (!Number.isInteger(record.requestId) || record.requestId < 1)) ||
      (record.error !== undefined && (!record.error || typeof record.error.message !== "string" ||
        [record.error.name, record.error.stack].some((value) => value !== undefined && typeof value !== "string")))) {
    throw new Error("Malformed worker response")
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
  /** Fatal transport/protocol failure; ordinary cancellation is not a failure. */
  failure: Error | null = null
  private readonly options: ModuleWorkerSessionOptions<TRequest, TResponse>

  constructor(options: ModuleWorkerSessionOptions<TRequest, TResponse>) {
    this.options = options
    this.worker = options.createWorker()
    this.worker.onmessage = (event: MessageEvent<unknown>) => {
      if (this.dead) return
      let parsed: ParsedModuleWorkerMessage<TResponse>
      try {
        parsed = this.options.parseMessage(event.data)
      } catch (error) {
        this.fail(error instanceof Error ? error : new Error(String(error)))
        return
      }
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
    this.worker.onmessageerror = () => {
      this.fail(new Error(`${this.options.name} worker response could not be deserialized`))
    }
    this.worker.onerror = (event: ErrorEvent) => {
      this.fail(
        new Error(event.message || `${this.options.name} worker failed`),
      )
    }
  }

  get isDead(): boolean {
    return this.dead
  }

  private fail(error: Error): void {
    if (this.dead) return
    this.failure = error
    this.rejectAll(error)
    this.terminate()
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
        const isOnlyPendingRequest = this.pending.size === 1
        this.pending.delete(requestId)
        signal?.removeEventListener("abort", onAbort)
        reject(makeAbortError(this.options.name))
        // Termination is the only way to interrupt synchronous CPU work, but
        // a shared worker may also be carrying requests for unrelated chart
        // instances. Only tear it down when the aborted request was the sole
        // pending consumer; otherwise discard this response and let the
        // remaining requests drain normally.
        if (this.options.terminateOnAbort && isOnlyPendingRequest) {
          this.terminate()
        }
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
  TSession extends { isDead: boolean; failure?: Error | null; terminate(): void },
>(create: () => TSession): {
  get: () => TSession
  readonly available: boolean
  resetForTest: () => void
} {
  let session: TSession | null = null
  let creationFailure: unknown = null
  return {
    get available() { return !creationFailure && !session?.failure },
    get: () => {
      if (creationFailure || session?.failure) throw creationFailure || session?.failure
      if (!session || session.isDead) {
        try { session = create() }
        catch (error) {
          creationFailure = error instanceof Error ? error : new Error(String(error))
          throw creationFailure
        }
      }
      return session
    },
    resetForTest: () => {
      creationFailure = null
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
