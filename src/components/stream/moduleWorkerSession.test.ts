import { afterEach, describe, expect, it, vi } from "vitest"
import {
  ModuleWorkerSession,
  createSharedWorkerSessionHolder,
  moduleWorkerErrorFromPayload,
  parseModuleWorkerErrorField,
} from "./moduleWorkerSession"

type FakeWorker = Worker & {
  postMessage: ReturnType<typeof vi.fn<Worker["postMessage"]>>
  terminate: ReturnType<typeof vi.fn<Worker["terminate"]>>
}

function createFakeWorker(): FakeWorker {
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
    onmessageerror: null,
  } as unknown as FakeWorker
}

describe("ModuleWorkerSession", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it.each(["parse", "messageerror"])("rejects every pending request and retires a worker after %s failure", async (failure) => {
    const worker = createFakeWorker()
    const session = new ModuleWorkerSession({ name: "Test", createWorker: () => worker,
      parseMessage: () => { throw new Error("malformed response") } })
    const first = session.request({}), second = session.request({})
    const rejected = Promise.all([expect(first).rejects.toThrow(), expect(second).rejects.toThrow()])
    if (failure === "parse") worker.onmessage?.call(worker, new MessageEvent("message", { data: {} }))
    else worker.onmessageerror?.call(worker, new MessageEvent("messageerror"))
    await rejected
    expect(session.isDead).toBe(true)
    expect(worker.terminate).toHaveBeenCalledOnce()
  })

  it("assigns request ids and resolves matching responses", async () => {
    const worker = createFakeWorker()
    const session = new ModuleWorkerSession<{ n: number }, { doubled: number }>({
      name: "Test",
      createWorker: () => worker,
      parseMessage: (data) => {
        const d = data as {
          requestId?: number
          doubled?: number
          error?: { message: string }
        }
        if (d.error) {
          return {
            requestId: d.requestId,
            ok: false,
            error: moduleWorkerErrorFromPayload(d.error),
          }
        }
        return {
          requestId: d.requestId,
          ok: true,
          payload: { doubled: d.doubled ?? 0 },
        }
      },
    })

    const promise = session.request({ n: 21 })
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith({ requestId: 1, request: { n: 21 } })

    worker.onmessage?.call(worker, new MessageEvent("message", { data: { requestId: 1, doubled: 42 } }))
    await expect(promise).resolves.toEqual({ doubled: 42 })
  })

  it("rejects on worker error payload", async () => {
    const worker = createFakeWorker()
    const session = new ModuleWorkerSession<unknown, unknown>({
      name: "Test",
      createWorker: () => worker,
      parseMessage: (data) => {
        const { requestId, error } = parseModuleWorkerErrorField(data)
        if (error) {
          return { requestId, ok: false, error: moduleWorkerErrorFromPayload(error) }
        }
        return { requestId, ok: true, payload: data }
      },
    })

    const promise = session.request({})
    worker.onmessage?.call(worker, new MessageEvent("message", { data: {
      requestId: 1,
      error: { message: "boom", name: "LayoutError" },
    } }))
    await expect(promise).rejects.toMatchObject({
      message: "boom",
      name: "LayoutError",
    })
  })

  it("rejects unmatched concurrent requests when a response has no request id", async () => {
    const worker = createFakeWorker()
    const session = new ModuleWorkerSession<{ n: number }, { doubled: number }>({
      name: "Test",
      createWorker: () => worker,
      parseMessage: (data) => {
        const response = data as { requestId?: number; doubled: number }
        return {
          requestId: response.requestId,
          ok: true,
          payload: { doubled: response.doubled },
        }
      },
    })

    const first = session.request({ n: 1 })
    const second = session.request({ n: 2 })
    const secondRejection = expect(second).rejects.toThrow(
      "Test worker response missing requestId",
    )

    worker.onmessage?.call(worker, new MessageEvent("message", { data: { doubled: 2 } }))

    await expect(first).resolves.toEqual({ doubled: 2 })
    await secondRejection
  })

  it("createSharedWorkerSessionHolder reuses until reset", () => {
    const createSession = vi.fn(() => ({
        isDead: false,
        terminate: vi.fn(),
    }))
    const holder = createSharedWorkerSessionHolder(createSession)
    const a = holder.get()
    const b = holder.get()
    expect(a).toBe(b)
    expect(createSession).toHaveBeenCalledOnce()
    holder.reset()
    const c = holder.get()
    expect(c).not.toBe(a)
    expect(createSession).toHaveBeenCalledTimes(2)
    expect(a.terminate).toHaveBeenCalledOnce()
  })

  it("rejects request encoding failures without throwing or poisoning the session", async () => {
    const worker = createFakeWorker()
    const encodeRequest = vi.fn((requestId: number, request: number) => ({ requestId, request }))
      .mockImplementationOnce(() => { throw new Error("Cannot encode request") })
    const session = new ModuleWorkerSession({
      name: "Test", createWorker: () => worker, encodeRequest,
      parseMessage: (payload) => ({ ok: true, payload }),
    })
    await expect(session.request(1)).rejects.toThrow("Cannot encode request")
    expect(worker.postMessage).not.toHaveBeenCalled()
    const next = session.request(2)
    worker.onmessage?.call(worker, new MessageEvent("message", { data: 4 }))
    await expect(next).resolves.toBe(4)
    expect(session.failure).toBeNull()
  })

  it("retires an unresponsive worker and clears all request timers", async () => {
    vi.useFakeTimers()
    const worker = createFakeWorker()
    const session = new ModuleWorkerSession({
      name: "Test", createWorker: () => worker, requestTimeoutMs: 100,
      parseMessage: (payload) => ({ ok: true, payload }),
    })
    const first = expect(session.request(1)).rejects.toThrow("timed out")
    const second = expect(session.request(2)).rejects.toThrow("timed out")
    await vi.advanceTimersByTimeAsync(100)
    await Promise.all([first, second])
    expect(worker.terminate).toHaveBeenCalledOnce()
    expect(session.isDead).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([null, undefined])("uses the standard envelope when the encoder returns %s", async (encoded) => {
    const worker = createFakeWorker()
    const session = new ModuleWorkerSession({
      name: "Test", createWorker: () => worker,
      encodeRequest: () => encoded,
      parseMessage: (payload) => ({ ok: true, payload }),
    })
    const pending = session.request({ value: 42 })
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith({
      requestId: 1, request: { value: 42 }
    })
    worker.onmessage?.call(worker, new MessageEvent("message", { data: "done" }))
    await expect(pending).resolves.toBe("done")
  })
})
