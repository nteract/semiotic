import type { AtlasWorkloadOptions } from "../../../../../scripts/network-atlas/workloads"
import type { AtlasEvaluationResponse } from "./prepare"

type WorkerPort = Pick<Worker, "onmessage" | "onerror" | "postMessage" | "terminate">

/** Cancel CPU work by terminating its worker; a late response cannot publish. */
export class AtlasEvaluationClient {
  private generation = 0
  private worker?: WorkerPort

  constructor(private readonly createWorker: () => WorkerPort) {}

  request(options: AtlasWorkloadOptions, receive: (response: AtlasEvaluationResponse) => void) {
    this.cancel()
    const generation = this.generation
    try {
      const worker = this.createWorker()
      this.worker = worker
      const publish = (response: AtlasEvaluationResponse) => {
        if (this.worker !== worker || response.generation !== this.generation) return
        this.worker = undefined
        worker.terminate()
        receive(response)
      }
      worker.onmessage = (event: MessageEvent<AtlasEvaluationResponse>) => publish(event.data)
      worker.onerror = (event) =>
        publish({ generation, ok: false, message: event.message || "Atlas worker failed" })
      worker.postMessage({ generation, options })
    } catch (error) {
      this.cancel()
      receive({ generation, ok: false, message: String(error) })
    }
    return generation
  }

  cancel() {
    this.generation += 1
    this.worker?.terminate()
    this.worker = undefined
  }
}
