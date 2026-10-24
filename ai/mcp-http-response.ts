import type { IncomingMessage, ServerResponse } from "node:http"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { ReadableStream } from "node:stream/web"
import type { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { resolveMcpToolOutputLimit } from "./mcp-tool-output-limits"

/** SDK HTTP rejections bypass Transport.send; bound them before writing headers. */
export async function capMcpHttpErrorResponse(
  response: Response,
  maximum = resolveMcpToolOutputLimit()
): Promise<Response> {
  if (response.status < 400 || !response.body) return response

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let observedBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      observedBytes += value.byteLength
      if (observedBytes > maximum) {
        await reader.cancel()
        const headers = new Headers(response.headers)
        headers.delete("Content-Length")
        headers.delete("Content-Encoding")
        headers.delete("ETag")
        headers.set("Content-Type", "application/json")
        // Like tool errors, this fixed-size control response remains deliverable
        // even when the configured ceiling cannot hold the error itself.
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32000,
              message: "Error response exceeds MCP_MAX_TOOL_OUTPUT_BYTES.",
              data: {
                code: "OUTPUT_LIMIT_EXCEEDED",
                maximumBytes: maximum,
                observedBytes
              }
            }
          }),
          { status: response.status, statusText: response.statusText, headers }
        )
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return new Response(Buffer.concat(chunks), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  })
}

/** Adapt our parsed, stateless POST requests through the SDK's public Web API. */
export async function handleMcpHttpRequest(
  transport: WebStandardStreamableHTTPServerTransport,
  req: IncomingMessage,
  res: ServerResponse,
  parsedBody: unknown,
  signal: AbortSignal
): Promise<void> {
  const headers = new Headers()
  for (let index = 0; index < req.rawHeaders.length; index += 2) {
    headers.append(req.rawHeaders[index], req.rawHeaders[index + 1])
  }
  const request = new Request(
    new URL(req.url || "/", `http://${req.headers.host || "localhost"}`),
    { method: req.method, headers, signal }
  )
  const response = await capMcpHttpErrorResponse(
    await transport.handleRequest(request, { parsedBody })
  )
  res.writeHead(response.status, Object.fromEntries(response.headers))
  if (response.body) {
    await pipeline(
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>),
      res,
      { signal }
    )
  } else {
    res.end()
  }
}
