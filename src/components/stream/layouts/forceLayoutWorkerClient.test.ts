import { afterEach, describe, expect, it } from "vitest"
import {
  _resetSharedForceLayoutSessionForTest,
  ForceLayoutWorkerSession,
  runForceLayoutWorker,
  shouldUseForceWorker,
  type ForceWorkerRequest
} from "./forceLayoutWorkerClient"

class MockWorker {
  static instances: MockWorker[] = []
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  terminated = false
  messages: unknown[] = []

  constructor() {
    MockWorker.instances.push(this)
  }

  postMessage(request: unknown): void {
    this.messages.push(request)
  }

  terminate(): void {
    this.terminated = true
  }
}

const originalWorker = globalThis.Worker

afterEach(() => {
  _resetSharedForceLayoutSessionForTest()
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

  it("reuses a long-lived worker across layouts and does not terminate on success", async () => {
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: MockWorker
    })
    const first = runForceLayoutWorker({
      kind: "normalized",
      nodes: [{ id: "a" }],
      edges: [],
      options: {}
    })
    const worker = MockWorker.instances[0]
    expect(MockWorker.instances).toHaveLength(1)
    const firstMsg = worker.messages[0] as { requestId: number; request: ForceWorkerRequest }
    expect(firstMsg.requestId).toBe(1)
    worker.onmessage?.({
      data: { requestId: firstMsg.requestId, positions: { a: { x: 0.5, y: 0.5 } } }
    } as MessageEvent)

    await expect(first).resolves.toEqual({
      positions: { a: { x: 0.5, y: 0.5 } }
    })
    expect(worker.terminated).toBe(false)

    const second = runForceLayoutWorker({
      kind: "normalized",
      nodes: [{ id: "b" }],
      edges: [],
      options: {}
    })
    // Same shared session → same Worker instance
    expect(MockWorker.instances).toHaveLength(1)
    const secondMsg = worker.messages[1] as { requestId: number }
    worker.onmessage?.({
      data: { requestId: secondMsg.requestId, positions: { b: { x: 0.1, y: 0.2 } } }
    } as MessageEvent)
    await expect(second).resolves.toEqual({
      positions: { b: { x: 0.1, y: 0.2 } }
    })
    expect(worker.terminated).toBe(false)
  })

  it("rejects with AbortError when cancelled without terminating the session", async () => {
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
    expect(worker.terminated).toBe(false)
  })

  it("ForceLayoutWorkerSession can be terminated explicitly", async () => {
    Object.defineProperty(globalThis, "Worker", {
      configurable: true,
      value: MockWorker
    })
    const session = new ForceLayoutWorkerSession()
    const worker = MockWorker.instances[0]
    const promise = session.request({
      kind: "normalized",
      nodes: [{ id: "a" }],
      edges: [],
      options: {}
    })
    session.terminate()
    await expect(promise).rejects.toThrow(/terminated/i)
    expect(worker.terminated).toBe(true)
  })
})
