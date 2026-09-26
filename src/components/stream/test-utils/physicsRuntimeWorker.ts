import { createPhysicsWorkerRuntime } from "../physics/PhysicsWorkerRuntime"
import type {
  PhysicsWorkerRequest,
  PhysicsWorkerResponse
} from "../physics/PhysicsWorkerProtocol"

// Run the actual worker command protocol while leaving scheduling deterministic.
export class RuntimeWorker {
  onerror: ((event: ErrorEvent) => void) | null = null
  onmessage: ((event: MessageEvent<PhysicsWorkerResponse>) => void) | null =
    null
  runtime = createPhysicsWorkerRuntime()
  terminated = false

  postMessage(request: PhysicsWorkerRequest): void {
    Promise.resolve().then(() => {
      if (this.terminated) return
      try {
        this.onmessage?.({
          data: {
            ok: true,
            payload: this.runtime.handle(request.command),
            requestId: request.requestId
          }
        } as MessageEvent<PhysicsWorkerResponse>)
      } catch (error) {
        this.onmessage?.({
          data: {
            error: {
              message: error instanceof Error ? error.message : String(error)
            },
            ok: false,
            requestId: request.requestId
          }
        } as MessageEvent<PhysicsWorkerResponse>)
      }
    })
  }

  terminate(): void {
    this.terminated = true
  }
}
