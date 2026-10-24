import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"
import {
  formatMcpOperationLimitError,
  inspectMcpOperationInput,
  type McpOperationLimits
} from "./mcp-operation-limits"

/** Reject oversized tool arguments before SDK schema parsing on either transport. */
export function withMcpOperationLimits(
  inner: Transport,
  limits: McpOperationLimits
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
    send: (message, options) => inner.send(message, options),
    close: () => inner.close(),
    get sessionId() {
      return inner.sessionId
    },
    setProtocolVersion: (version) => inner.setProtocolVersion?.(version)
  }
  return wrapped
}
