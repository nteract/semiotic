import { PassThrough } from "stream"
import type { IncomingMessage } from "http"
import { readMcpJsonBody } from "./mcp-http-body"

function request() {
  return new PassThrough() as unknown as IncomingMessage & PassThrough
}

describe("bounded MCP body reading", () => {
  afterEach(() => vi.useRealTimers())

  it("uses a total deadline even when more chunks arrive", async () => {
    vi.useFakeTimers()
    const req = request()
    const result = readMcpJsonBody(req, 100, 1000)
    req.write("{")
    await vi.advanceTimersByTimeAsync(900)
    req.write('"x":')
    await vi.advanceTimersByTimeAsync(100)
    expect(await result).toMatchObject({ ok: false, status: 408 })
    expect(req.listenerCount("data")).toBe(0)
    req.destroy()
  })

  it("cancels its deadline after parsing a complete body", async () => {
    vi.useFakeTimers()
    const req = request()
    const result = readMcpJsonBody(req, 100, 1000)
    req.end('{"x":1}')
    expect(await result).toEqual({ ok: true, body: { x: 1 }, bodyBytes: 7 })
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([
    [7, '{"x":1}', true, undefined],
    [6, '{"x":1}', false, 413],
    [100, '{"x":', false, 400],
    [100, "", true, undefined]
  ])(
    "enforces byte and JSON boundaries (%s bytes, %s)",
    async (maxBytes, body, ok, status) => {
      const req = request()
      const result = readMcpJsonBody(req, maxBytes as number, 1000)
      req.end(body as string)
      expect(await result).toMatchObject({ ok, ...(status ? { status } : {}) })
      req.destroy()
    }
  )

  it("settles aborted bodies and handles the subsequent stream error", async () => {
    vi.useFakeTimers()
    const req = request()
    const result = readMcpJsonBody(req, 100, 1000)
    req.write("{")
    req.destroy(new Error("client disconnected"))
    expect(await result).toMatchObject({
      ok: false,
      reason: "request_stream_error"
    })
    expect(vi.getTimerCount()).toBe(0)
  })
})
