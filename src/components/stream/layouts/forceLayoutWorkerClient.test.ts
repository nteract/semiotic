import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { waitFor } from "@testing-library/react"
import { forceLayoutAsync } from "../../recipes/forceLayoutAsync"
import { forceLayout } from "../../recipes/forceLayout"
import {
  createFrameForceWorkerRequest,
  shouldUseForceWorker,
  type ForceWorkerRequest
} from "./forceLayoutWorkerClient"
import type { NetworkPipelineConfig, RealtimeNode } from "../networkTypes"

const MockWorker = vi.fn(class {
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  postMessage = vi.fn<(request: { requestId: number; request: ForceWorkerRequest }) => void>()
  terminate = vi.fn()
})

let workerClient: typeof import("./forceLayoutWorkerClient")
beforeEach(async () => {
  vi.resetModules()
  MockWorker.mockClear()
  workerClient = await import("./forceLayoutWorkerClient")
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe("force layout worker client", () => {
  it("loads the async recipe transport on demand and falls back after a cached failure", async () => {
    vi.stubGlobal("Worker", MockWorker)
    const nodes = [{ id: "a" }]
    const first = forceLayoutAsync(nodes, [], { execution: "worker", iterations: 1 })
    await waitFor(() => expect(MockWorker.mock.instances).toHaveLength(1))
    const worker = MockWorker.mock.instances[0]
    worker.onmessage?.({ data: { requestId: 1, positions: { a: { x: 2, y: 3 } } } } as MessageEvent)
    await expect(first).resolves.toEqual({ a: { x: 2, y: 3 } })
    const next = forceLayoutAsync(nodes, [], { execution: "worker", iterations: 1 })
    await waitFor(() => expect(worker.postMessage).toHaveBeenCalledTimes(2))
    worker.onerror?.({ message: "load failed" } as ErrorEvent)
    const expected = forceLayout(nodes, [], { iterations: 1 })
    await expect(next).resolves.toEqual(expected)
    await expect(forceLayoutAsync(nodes, [], { execution: "worker", iterations: 1 })).resolves.toEqual(expected)
    expect(MockWorker.mock.instances).toHaveLength(1)
  })

  it("uses estimated work for automatic execution", () => {
    expect(shouldUseForceWorker("sync", 1000, 1000, 300)).toBe(false)
    expect(shouldUseForceWorker("worker", 1, 0, 1)).toBe(true)
    expect(shouldUseForceWorker("auto", 20, 20, 100)).toBe(false)
    expect(shouldUseForceWorker("auto", 100, 100, 300)).toBe(true)
  })

  it("keeps a serializable frame seed in the worker request", () => {
    const nodes: RealtimeNode[] = [{
      id: "a", x: 0, y: 0, x0: 0, x1: 0, y0: 0, y1: 0,
      width: 0, height: 0, value: 0
    }]
    const config: NetworkPipelineConfig = { chartType: "force", seed: 42 }
    const request = createFrameForceWorkerRequest(nodes, [], config, [100, 100])
    expect(request.config.seed).toBe(42)
  })

  it("reuses a long-lived worker across layouts and does not terminate on success", async () => {
    vi.stubGlobal("Worker", MockWorker)
    const first = workerClient.runForceLayoutWorker({
      kind: "normalized",
      nodes: [{ id: "a" }],
      edges: [],
      options: {}
    })
    const worker = MockWorker.mock.instances[0]
    expect(MockWorker.mock.instances).toHaveLength(1)
    const firstMsg = worker.postMessage.mock.calls[0][0] as { requestId: number; request: ForceWorkerRequest }
    expect(firstMsg.requestId).toBe(1)
    worker.onmessage?.({
      data: { requestId: firstMsg.requestId, positions: { a: { x: 0.5, y: 0.5 } } }
    } as MessageEvent)

    await expect(first).resolves.toEqual({
      positions: { a: { x: 0.5, y: 0.5 } }
    })
    expect(worker.terminate).not.toHaveBeenCalled()

    const second = workerClient.runForceLayoutWorker({
      kind: "normalized",
      nodes: [{ id: "b" }],
      edges: [],
      options: {}
    })
    // Same shared session → same Worker instance
    expect(MockWorker.mock.instances).toHaveLength(1)
    const secondMsg = worker.postMessage.mock.calls[1][0] as { requestId: number }
    worker.onmessage?.({
      data: { requestId: secondMsg.requestId, positions: { b: { x: 0.1, y: 0.2 } } }
    } as MessageEvent)
    await expect(second).resolves.toEqual({
      positions: { b: { x: 0.1, y: 0.2 } }
    })
    expect(worker.terminate).not.toHaveBeenCalled()
  })

  it("rejects with AbortError and terminates CPU work when cancelled", async () => {
    vi.stubGlobal("Worker", MockWorker)
    const controller = new AbortController()
    const promise = workerClient.runForceLayoutWorker(
      {
        kind: "normalized",
        nodes: [{ id: "a" }],
        edges: [],
        options: {}
      },
      controller.signal
    )
    const worker = MockWorker.mock.instances[0]
    controller.abort()

    await expect(promise).rejects.toMatchObject({ name: "AbortError" })
    expect(worker.terminate).toHaveBeenCalledOnce()

    const next = workerClient.runForceLayoutWorker({
      kind: "normalized",
      nodes: [{ id: "b" }],
      edges: [],
      options: {}
    })
    const replacement = MockWorker.mock.instances[1]
    expect(replacement).toBeDefined()
    const nextMessage = replacement.postMessage.mock.calls[0][0] as { requestId: number }
    replacement.onmessage?.({
      data: { requestId: nextMessage.requestId, positions: { b: { x: 0, y: 0 } } }
    } as MessageEvent)
    await expect(next).resolves.toEqual({ positions: { b: { x: 0, y: 0 } } })
  })

  it("does not terminate unrelated concurrent force-layout requests", async () => {
    vi.stubGlobal("Worker", MockWorker)
    const controller = new AbortController()
    const first = workerClient.runForceLayoutWorker(
      {
        kind: "normalized",
        nodes: [{ id: "a" }],
        edges: [],
        options: {}
      },
      controller.signal
    )
    const second = workerClient.runForceLayoutWorker({
      kind: "normalized",
      nodes: [{ id: "b" }],
      edges: [],
      options: {}
    })
    const worker = MockWorker.mock.instances[0]
    const firstMessage = worker.postMessage.mock.calls[0][0] as { requestId: number }
    const secondMessage = worker.postMessage.mock.calls[1][0] as { requestId: number }

    controller.abort()
    await expect(first).rejects.toMatchObject({ name: "AbortError" })
    expect(worker.terminate).not.toHaveBeenCalled()

    // A late response for the cancelled request is ignored, while the other
    // chart's queued request retains its normal request-id resolution.
    worker.onmessage?.({
      data: { requestId: firstMessage.requestId, positions: { a: { x: 1, y: 1 } } }
    } as MessageEvent)
    worker.onmessage?.({
      data: { requestId: secondMessage.requestId, positions: { b: { x: 2, y: 3 } } }
    } as MessageEvent)
    await expect(second).resolves.toEqual({ positions: { b: { x: 2, y: 3 } } })
    expect(worker.terminate).not.toHaveBeenCalled()
  })

  it("ForceLayoutWorkerSession can be terminated explicitly", async () => {
    vi.stubGlobal("Worker", MockWorker)
    const session = new workerClient.ForceLayoutWorkerSession()
    const worker = MockWorker.mock.instances[0]
    const promise = session.request({
      kind: "normalized",
      nodes: [{ id: "a" }],
      edges: [],
      options: {}
    })
    session.terminate()
    await expect(promise).rejects.toThrow(/terminated/i)
    expect(worker.terminate).toHaveBeenCalledOnce()
  })
})

it.each(["constructor", "load", "malformed"])("caches force worker %s failures for the module lifetime", async (failure) => {
  if (failure === "constructor") {
    MockWorker.mockImplementationOnce(function () { throw new Error("blocked") })
  }
  vi.stubGlobal("Worker", MockWorker)
  const request: ForceWorkerRequest = { kind: "normalized", nodes: [{ id: "a" }], edges: [], options: {} }
  const first = workerClient.runForceLayoutWorker(request)
  const rejected = expect(first).rejects.toThrow()
  if (failure === "load") MockWorker.mock.instances[0].onerror?.({ message: "load failed" } as ErrorEvent)
  if (failure === "malformed") MockWorker.mock.instances[0].onmessage?.({ data: {} } as MessageEvent)
  await rejected
  await expect(workerClient.runForceLayoutWorker(request)).rejects.toThrow()
  expect(MockWorker).toHaveBeenCalledOnce()
})
