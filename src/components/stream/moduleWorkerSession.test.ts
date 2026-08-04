import { afterEach, describe, expect, it, vi } from "vitest"
import {
  ModuleWorkerSession,
  createSharedWorkerSessionHolder,
  moduleWorkerErrorFromPayload,
  parseModuleWorkerErrorField,
} from "./moduleWorkerSession"

type FakeWorker = Worker & {
  messages: unknown[]
  triggerMessage: (data: unknown) => void
  triggerError: (message: string) => void
}

function createFakeWorker(): FakeWorker {
  const messages: unknown[] = []
  let onmessage: ((event: MessageEvent) => void) | null = null
  let onerror: ((event: ErrorEvent) => void) | null = null
  return {
    messages,
    postMessage(data: unknown) {
      messages.push(data)
    },
    terminate: vi.fn(),
    set onmessage(handler: ((event: MessageEvent) => void) | null) {
      onmessage = handler
    },
    get onmessage() {
      return onmessage
    },
    set onerror(handler: ((event: ErrorEvent) => void) | null) {
      onerror = handler
    },
    get onerror() {
      return onerror
    },
    triggerMessage(data: unknown) {
      onmessage?.({ data } as MessageEvent)
    },
    triggerError(message: string) {
      onerror?.({ message } as ErrorEvent)
    },
  } as unknown as FakeWorker
}

describe("ModuleWorkerSession", () => {
  afterEach(() => {
    vi.restoreAllMocks()
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
    expect(worker.messages).toHaveLength(1)
    const msg = worker.messages[0] as { requestId: number; request: { n: number } }
    expect(msg.requestId).toBe(1)
    expect(msg.request).toEqual({ n: 21 })

    worker.triggerMessage({ requestId: 1, doubled: 42 })
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
    worker.triggerMessage({
      requestId: 1,
      error: { message: "boom", name: "LayoutError" },
    })
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

    worker.triggerMessage({ doubled: 2 })

    await expect(first).resolves.toEqual({ doubled: 2 })
    await secondRejection
  })

  it("createSharedWorkerSessionHolder reuses until reset", () => {
    let created = 0
    const holder = createSharedWorkerSessionHolder(() => {
      created += 1
      return {
        isDead: false,
        terminate: vi.fn(),
        id: created,
      }
    })
    const a = holder.get()
    const b = holder.get()
    expect(a).toBe(b)
    expect(created).toBe(1)
    holder.resetForTest()
    const c = holder.get()
    expect(c).not.toBe(a)
    expect(created).toBe(2)
  })
})
