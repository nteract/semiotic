import type { IncomingMessage } from "http"
import { PassThrough } from "stream"
import { createMcpUploadAdmission, DEFAULT_MCP_MAX_CONCURRENT_UPLOADS, resolveMcpUploadLimit } from "./mcp-upload-admission"

function request() {
  return new PassThrough() as unknown as IncomingMessage & PassThrough
}

describe("MCP upload admission", () => {
  afterEach(() => vi.useRealTimers())

  it.each([undefined, "", "0", "-1", "1.5", "16uploads", "Infinity", "9007199254740992"])(
    "uses a bounded default for an invalid upload limit (%s)", (value) => {
      expect(resolveMcpUploadLimit({ MCP_MAX_CONCURRENT_UPLOADS: value })).toBe(DEFAULT_MCP_MAX_CONCURRENT_UPLOADS)
    }
  )

  it("accepts a configured upload limit independently of execution limits", () => {
    expect(resolveMcpUploadLimit({ MCP_MAX_CONCURRENT_UPLOADS: "3", MCP_MAX_CONCURRENT_REQUESTS: "1" })).toBe(3)
  })

  it.each([
    ["success", undefined],
    ["invalid_json", 400],
    ["oversize", 413],
    ["timeout", 408],
    ["abort", 400],
    ["stream_error", 400]
  ] as const)("releases admission after %s without queuing excess bodies", async (outcome, status) => {
    vi.useFakeTimers()
    const admission = createMcpUploadAdmission(1)
    const first = request()
    const reading = admission.readBody(first, 8, 100)
    first.write("{")
    const rejected = request()
    expect(await admission.readBody(rejected, 8, 100)).toMatchObject({
      ok: false, status: 429, reason: "request_upload_concurrency"
    })
    expect(rejected.listenerCount("data")).toBe(0)

    if (outcome === "success") first.end("}")
    if (outcome === "invalid_json") first.end("!")
    if (outcome === "oversize") first.write("x".repeat(9))
    if (outcome === "timeout") await vi.advanceTimersByTimeAsync(100)
    if (outcome === "abort") first.destroy()
    if (outcome === "stream_error") first.destroy(new Error("socket parser error"))
    expect(await reading).toMatchObject(status ? { ok: false, status } : { ok: true, body: {} })

    const recovered = request()
    const recovery = admission.readBody(recovered, 8, 100)
    recovered.end('{"ok":1}')
    expect(await recovery).toMatchObject({ ok: true, body: { ok: 1 } })
    expect(vi.getTimerCount()).toBe(0)
    first.destroy()
    rejected.destroy()
    recovered.destroy()
  })
})
