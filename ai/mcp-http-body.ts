import type { IncomingMessage } from "http"

export const DEFAULT_MCP_BODY_TIMEOUT_MS = 10_000

export type McpBodyResult =
  | { ok: true; body: unknown; bodyBytes: number }
  | {
      ok: false
      status: 400 | 408 | 413
      code: -32600
      message: string
      reason:
        | "request_body_too_large"
        | "request_body_timeout"
        | "invalid_json"
        | "request_stream_error"
    }

/** Bound both memory and elapsed time before reserving tool execution capacity. */
export function readMcpJsonBody(
  req: IncomingMessage,
  maxBytes: number,
  timeoutMs: number
): Promise<McpBodyResult> {
  return new Promise((resolve) => {
    let size = 0
    let done = false
    const chunks: Buffer[] = []
    const finish = (result: McpBodyResult) => {
      if (done) return
      done = true
      clearTimeout(timer)
      chunks.length = 0
      req.removeListener("data", onData)
      req.removeListener("end", onEnd)
      // Keep the error handler until close: aborting a partial upload emits an
      // error after aborted. The caller writes its response before destroying it.
      if (!result.ok) req.pause()
      resolve(result)
    }
    const onData = (chunk: Buffer) => {
      size += chunk.length
      if (size > maxBytes) {
        finish({
          ok: false,
          status: 413,
          code: -32600,
          message: "Request body too large",
          reason: "request_body_too_large"
        })
      } else {
        chunks.push(chunk)
      }
    }
    const onEnd = () => {
      const raw = Buffer.concat(chunks).toString("utf-8")
      try {
        finish({
          ok: true,
          body: raw ? JSON.parse(raw) : undefined,
          bodyBytes: size
        })
      } catch {
        finish({
          ok: false,
          status: 400,
          code: -32600,
          message: "Invalid JSON body",
          reason: "invalid_json"
        })
      }
    }
    const onError = () =>
      finish({
        ok: false,
        status: 400,
        code: -32600,
        message: "Request stream error",
        reason: "request_stream_error"
      })
    const timer = setTimeout(
      () =>
        finish({
          ok: false,
          status: 408,
          code: -32600,
          message: "Request body timed out",
          reason: "request_body_timeout"
        }),
      timeoutMs
    )
    timer.unref()
    req.on("data", onData)
    req.once("end", onEnd)
    req.once("error", onError)
    req.once("close", () => {
      if (!done) onError()
      req.removeListener("error", onError)
    })
  })
}
