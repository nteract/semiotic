// @vitest-environment node

import { capMcpHttpErrorResponse } from "./mcp-http-response"

describe("MCP direct HTTP error limits", () => {
  it("preserves exact UTF-8 error bytes at the boundary, status, and headers", async () => {
    const text = JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Invalid 😀 request" }
    })
    const bytes = Buffer.byteLength(text)
    const makeResponse = () =>
      new Response(text, {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": String(bytes),
          "Retry-After": "1"
        }
      })
    const exact = await capMcpHttpErrorResponse(makeResponse(), bytes)
    expect(await exact.text()).toBe(text)
    expect(exact.status).toBe(400)
    expect(exact.headers.get("Content-Length")).toBe(String(bytes))
    expect(exact.headers.get("Retry-After")).toBe("1")

    const limited = await capMcpHttpErrorResponse(makeResponse(), bytes - 1)
    expect(limited.status).toBe(400)
    expect(limited.headers.has("Content-Length")).toBe(false)
    expect(limited.headers.get("Retry-After")).toBe("1")
    expect(await limited.json()).toMatchObject({
      error: {
        data: {
          code: "OUTPUT_LIMIT_EXCEEDED",
          maximumBytes: bytes - 1,
          observedBytes: bytes
        }
      }
    })
  })

  it("stops consuming streamed errors at the cap and drops stale body headers", async () => {
    let reads = 0
    const cancel = vi.fn()
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          reads++
          controller.enqueue(Buffer.from("private-value".repeat(30)))
        },
        cancel
      },
      { highWaterMark: 0 }
    )
    const response = await capMcpHttpErrorResponse(
      new Response(body, {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "Content-Length": "10000",
          "Content-Encoding": "identity",
          ETag: "original-body",
          "Retry-After": "5"
        }
      }),
      1024
    )
    const text = await response.text()
    expect(reads).toBe(3)
    expect(cancel).toHaveBeenCalledOnce()
    expect(response.status).toBe(500)
    expect(Buffer.byteLength(text)).toBeLessThanOrEqual(1024)
    expect(text).not.toContain("private-value")
    expect(response.headers.get("Content-Type")).toBe("application/json")
    expect(response.headers.get("Retry-After")).toBe("5")
    for (const header of ["Content-Length", "Content-Encoding", "ETag"]) {
      expect(response.headers.has(header)).toBe(false)
    }
  })

  it("leaves successful discovery and empty notification responses untouched", async () => {
    for (const response of [
      new Response(JSON.stringify({ result: { tools: "x".repeat(2000) } })),
      new Response(null, { status: 202 }),
      new Response(null, { status: 204 })
    ]) {
      expect(await capMcpHttpErrorResponse(response, 1024)).toBe(response)
      expect(response.bodyUsed).toBe(false)
    }
  })

  it("returns a fixed control error for a ceiling too small to hold it", async () => {
    const response = await capMcpHttpErrorResponse(
      new Response("private-value", { status: 415 }),
      1
    )
    const text = await response.text()
    expect(response.status).toBe(415)
    expect(text).not.toContain("private-value")
    expect(Buffer.byteLength(text)).toBeLessThan(512)
    expect(JSON.parse(text).error.data.code).toBe("OUTPUT_LIMIT_EXCEEDED")
  })
})
