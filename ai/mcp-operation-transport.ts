import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"
import {
  capMcpToolResult,
  resolveMcpToolOutputLimit
} from "./mcp-tool-output-limits"
import { inspectMcpOutputLimit } from "./mcp-render-output-limits"
import {
  formatMcpOperationLimitError,
  inspectMcpOperationInput,
  type McpOperationLimits
} from "./mcp-operation-limits"

/** Bound tool arguments before SDK parsing and results before transport serialization. */
export function withMcpOperationLimits(
  inner: Transport,
  limits: McpOperationLimits,
  maxOutputBytes = resolveMcpToolOutputLimit()
): Transport {
  let closed = false
  const wrapped: Transport = {
    start: async () => {
      inner.onclose = () => {
        if (closed) return
        closed = true
        wrapped.onclose?.()
      }
      inner.onerror = (error) => wrapped.onerror?.(error)
      inner.onmessage = (message, extra) => {
        if (
          "method" in message &&
          message.method === "tools/call" &&
          "id" in message
        ) {
          const checked = inspectMcpOperationInput(
            message.params?.arguments,
            limits
          )
          if (!checked.ok) {
            void inner
              .send(
                {
                  jsonrpc: "2.0",
                  id: message.id,
                  error: {
                    code: -32602,
                    message: formatMcpOperationLimitError(checked)
                  }
                },
                { relatedRequestId: message.id }
              )
              .catch((error) => wrapped.onerror?.(error))
            return
          }
        }
        wrapped.onmessage?.(message, extra)
      }
      await inner.start()
    },
    send: (message, options) => {
      // CallToolResult carries a content array; discovery and resource results
      // use other shapes. This also covers SDK errors before handler dispatch,
      // without retaining per-request state across cancellation or disconnects.
      if ("result" in message && Array.isArray(message.result.content)) {
        return inner.send(
          {
            ...message,
            result: capMcpToolResult(message.result, maxOutputBytes)
          },
          options
        )
      }
      if ("error" in message) {
        const limit = inspectMcpOutputLimit(message.error, maxOutputBytes)
        if (!limit.ok) {
          return inner.send(
            {
              ...message,
              error: {
                code: message.error.code,
                message: "Error response exceeds MCP_MAX_TOOL_OUTPUT_BYTES.",
                data: {
                  code: "OUTPUT_LIMIT_EXCEEDED",
                  maximumBytes: limit.maximum,
                  observedBytes: limit.observed
                }
              }
            },
            options
          )
        }
      }
      return inner.send(message, options)
    },
    close: () => inner.close(),
    get sessionId() {
      return inner.sessionId
    },
    setProtocolVersion: (version) => inner.setProtocolVersion?.(version)
  }
  return wrapped
}
