import { describe, expect, it, vi } from "vitest"
import { AtlasEvaluationClient } from "./workerClient"

const port = () =>
  ({
    onmessage: null,
    onerror: null,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  }) as unknown as Worker
const options = { size: 1000 as const, witnessLimit: 5 }

describe("Atlas evaluation worker publication", () => {
  it("terminates superseded work and ignores its late result", () => {
    const workers = [port(), port()]
    const createWorker = vi.fn().mockReturnValueOnce(workers[0]).mockReturnValueOnce(workers[1])
    const receive = vi.fn()
    const client = new AtlasEvaluationClient(createWorker)
    const oldGeneration = client.request(options, receive)
    const generation = client.request({ ...options, size: 10000 }, receive)
    expect(workers[0].terminate).toHaveBeenCalledOnce()
    workers[0].onmessage!({
      data: { generation: oldGeneration, ok: true, result: "old" },
    } as MessageEvent)
    expect(receive).not.toHaveBeenCalled()
    workers[1].onmessage!({ data: { generation, ok: true, result: "current" } } as MessageEvent)
    expect(receive).toHaveBeenCalledExactlyOnceWith({ generation, ok: true, result: "current" })
    expect(workers[1].terminate).toHaveBeenCalledOnce()
  })

  it("does not publish after cancellation or accept a mismatched generation", () => {
    const worker = port()
    const receive = vi.fn()
    const client = new AtlasEvaluationClient(() => worker)
    const generation = client.request(options, receive)
    worker.onmessage!({ data: { generation: generation + 1, ok: true } } as MessageEvent)
    expect(receive).not.toHaveBeenCalled()
    client.cancel()
    worker.onmessage!({ data: { generation, ok: true } } as MessageEvent)
    expect(receive).not.toHaveBeenCalled()
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  it("reports a worker failure and permits another attempt", () => {
    const worker = port()
    const receive = vi.fn()
    const client = new AtlasEvaluationClient(() => worker)
    const generation = client.request(options, receive)
    worker.onerror!({ message: "failed to prepare" } as ErrorEvent)
    expect(receive).toHaveBeenCalledExactlyOnceWith({
      generation,
      ok: false,
      message: "failed to prepare",
    })
    expect(client.request(options, receive)).toBeGreaterThan(generation)
    client.cancel()
  })
})
