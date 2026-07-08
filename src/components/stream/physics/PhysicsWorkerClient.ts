import type {
  PhysicsPipelineConfig,
  PhysicsPipelineSnapshot,
  PhysicsQueuedSpawn,
  PhysicsSpawnPacingOptions
} from "./PhysicsPipelineStore"
import {
  createPhysicsWorkerConfig,
  isPhysicsWorkerPacingSupported,
  type PhysicsWorkerCommand,
  type PhysicsWorkerFrame,
  type PhysicsWorkerRequest,
  type PhysicsWorkerResponse,
  type PhysicsWorkerResponsePayload
} from "./PhysicsWorkerProtocol"

interface PendingPhysicsWorkerRequest {
  cleanup: () => void
  reject: (error: Error) => void
  resolve: (payload: PhysicsWorkerResponsePayload) => void
}

export function canUsePhysicsWorker(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined"
}

export function createPhysicsWorker(): Worker {
  return new Worker(new URL("./physicsWorker.js", import.meta.url), {
    type: "module",
    name: "semiotic-physics"
  })
}

function abortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Physics worker request aborted", "AbortError")
  }
  const error = new Error("Physics worker request aborted")
  error.name = "AbortError"
  return error
}

function responseError(response: Extract<PhysicsWorkerResponse, { ok: false }>) {
  const error = new Error(response.error.message)
  error.name = response.error.name ?? "Error"
  if (response.error.stack) error.stack = response.error.stack
  return error
}

export class PhysicsWorkerSession {
  private nextRequestId = 1
  private pending = new Map<number, PendingPhysicsWorkerRequest>()
  private worker: Worker

  constructor(worker: Worker = createPhysicsWorker()) {
    this.worker = worker
    this.worker.onmessage = (event: MessageEvent<PhysicsWorkerResponse>) => {
      const response = event.data
      const pending = this.pending.get(response.requestId)
      if (!pending) return
      this.pending.delete(response.requestId)
      pending.cleanup()
      if (response.ok) pending.resolve(response.payload)
      else pending.reject(responseError(response))
    }
    this.worker.onerror = (event: ErrorEvent) => {
      this.rejectAll(new Error(event.message || "Physics worker failed"))
      this.worker.terminate()
    }
  }

  request(
    command: PhysicsWorkerCommand,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerResponsePayload> {
    if (signal?.aborted) return Promise.reject(abortError())

    const requestId = this.nextRequestId
    this.nextRequestId += 1
    const request: PhysicsWorkerRequest = { command, requestId }

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
        this.worker.postMessage(request)
      } catch (error) {
        this.pending.delete(requestId)
        cleanup()
        reject(error)
      }
    })
  }

  async init(
    config?: PhysicsPipelineConfig,
    initialSpawns?: PhysicsQueuedSpawn[],
    initialSpawnPacing?: PhysicsSpawnPacingOptions,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerFrame> {
    if (!isPhysicsWorkerPacingSupported(initialSpawnPacing)) {
      throw new TypeError(
        "Physics worker spawn pacing only supports string time accessors"
      )
    }
    const payload = await this.request(
      {
        type: "init",
        config: createPhysicsWorkerConfig(config),
        initialSpawns,
        initialSpawnPacing
      },
      signal
    )
    if (payload.type !== "frame") {
      throw new Error("Physics worker returned a non-frame init response")
    }
    return payload.frame
  }

  async restore(
    snapshot: PhysicsPipelineSnapshot,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerFrame> {
    const payload = await this.request({ type: "restore", snapshot }, signal)
    if (payload.type !== "frame") {
      throw new Error("Physics worker returned a non-frame restore response")
    }
    return payload.frame
  }

  async initFromSnapshot(
    config: PhysicsPipelineConfig | undefined,
    snapshot: PhysicsPipelineSnapshot,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerFrame> {
    const payload = await this.request(
      {
        type: "init",
        config: createPhysicsWorkerConfig(config),
        snapshot
      },
      signal
    )
    if (payload.type !== "frame") {
      throw new Error("Physics worker returned a non-frame init response")
    }
    return payload.frame
  }

  async enqueue(
    spawns: PhysicsQueuedSpawn[],
    pacing?: PhysicsSpawnPacingOptions,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerFrame> {
    if (!isPhysicsWorkerPacingSupported(pacing)) {
      throw new TypeError(
        "Physics worker spawn pacing only supports string time accessors"
      )
    }
    const payload = await this.request(
      { type: "enqueue", spawns, pacing },
      signal
    )
    if (payload.type !== "frame") {
      throw new Error("Physics worker returned a non-frame enqueue response")
    }
    return payload.frame
  }

  async tick(
    deltaSeconds: number,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerFrame> {
    const payload = await this.request(
      { type: "tick", deltaSeconds },
      signal
    )
    if (payload.type !== "frame") {
      throw new Error("Physics worker returned a non-frame tick response")
    }
    return payload.frame
  }

  async settle(
    maxSteps?: number,
    signal?: AbortSignal
  ): Promise<PhysicsWorkerFrame> {
    const payload = await this.request({ type: "settle", maxSteps }, signal)
    if (payload.type !== "frame") {
      throw new Error("Physics worker returned a non-frame settle response")
    }
    return payload.frame
  }

  async snapshot(signal?: AbortSignal): Promise<PhysicsPipelineSnapshot> {
    const payload = await this.request({ type: "snapshot" }, signal)
    if (payload.type !== "snapshot") {
      throw new Error("Physics worker returned a non-snapshot response")
    }
    return payload.snapshot
  }

  async remove(
    ids: string[],
    signal?: AbortSignal
  ): Promise<{ frame: PhysicsWorkerFrame; removed: string[] }> {
    const payload = await this.request({ type: "remove", ids }, signal)
    if (payload.type !== "removed") {
      throw new Error("Physics worker returned a non-remove response")
    }
    return { frame: payload.frame, removed: payload.removed }
  }

  terminate(): void {
    this.rejectAll(new Error("Physics worker terminated"))
    this.worker.terminate()
  }

  private rejectAll(error: Error): void {
    for (const [requestId, pending] of this.pending) {
      this.pending.delete(requestId)
      pending.cleanup()
      pending.reject(error)
    }
  }
}
