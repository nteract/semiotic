import { afterEach, describe, expect, it } from "vitest"
import {
  runForceLayoutWorker,
  shouldUseForceWorker,
  type ForceWorkerRequest
} from "./forceLayoutWorkerClient"

class MockWorker {
  static instances: MockWorker[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  terminated = false

  constructor() {
    MockWorker.instances.push(this)
  }

  postMessage(_request: ForceWorkerRequest): void {}

  terminate(): void {
    this.terminated = true
  }
}

const originalWorker = globalThis.Worker

afterEach(() => {
  MockWorker.instances = []
  Object.defineProperty(globalThis, "Worker", {
    configurable: true,
    value: originalWorker
  })
})

describe("force layout worker client", () => {
  it("uses estimated work for automatic execution", () => {
    expect(shouldUseForceWorker("sync", 1000, 1000, 300)).toBe(false)
    expect(shouldUseForceWorker("worker", 1, 0, 1)).toBe(true)
    expect(shouldUseForceWorker("auto", 20, 20, 100)).toBe(false)
    expect(shouldUseForceWorker("auto", 100, 100, 300)).toBe(true)
  })

  it("resolves a worker response and terminates the worker", async () => {
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: MockWorker
    })
    const promise = runForceLayoutWorker({
      kind: "normalized",
      nodes: [{ id: "a" }],
      edges: [],
      options: {}
    })
    const worker = MockWorker.instances[0]
    worker.onmessage?.({
      data: { positions: { a: { x: 0.5, y: 0.5 } } }
    } as MessageEvent)

    await expect(promise).resolves.toEqual({
      positions: { a: { x: 0.5, y: 0.5 } }
    })
    expect(worker.terminated).toBe(true)
  })

  it("terminates and rejects with AbortError when cancelled", async () => {
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: MockWorker
    })
    const controller = new AbortController()
    const promise = runForceLayoutWorker(
      {
        kind: "normalized",
        nodes: [{ id: "a" }],
        edges: [],
        options: {}
      },
      controller.signal
    )
    const worker = MockWorker.instances[0]
    controller.abort()

    await expect(promise).rejects.toMatchObject({ name: "AbortError" })
    expect(worker.terminated).toBe(true)
  })
})

