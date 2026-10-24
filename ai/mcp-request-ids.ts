import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js"
import type { RequestId } from "@modelcontextprotocol/sdk/types.js"

const PREFIX = "semiotic:request:"
const encode = (id: RequestId) => PREFIX + JSON.stringify(id)

function decode(id: RequestId): RequestId {
  if (typeof id !== "string" || !id.startsWith(PREFIX)) return id
  try {
    const value: unknown = JSON.parse(id.slice(PREFIX.length))
    if (typeof value === "string" || typeof value === "number") return value
  } catch {
    // IDs not produced by this adapter retain their original identity.
  }
  return id
}

/**
 * Give the SDK truthy client request IDs while preserving exact wire identity.
 * Encode every client ID so numeric/string IDs and prefix-like input cannot
 * collide. The reversible encoding needs no retained per-request bookkeeping.
 */
export function withMcpRequestIds(inner: Transport): Transport {
  const wrapped: Transport = {
    start: async () => {
      inner.onclose = () => wrapped.onclose?.()
      inner.onerror = (error) => wrapped.onerror?.(error)
      inner.onmessage = (message, extra) => {
        if ("method" in message && "id" in message) {
          wrapped.onmessage?.({ ...message, id: encode(message.id) }, extra)
        } else if (
          "method" in message &&
          message.method === "notifications/cancelled" &&
          (typeof message.params?.requestId === "number" ||
            typeof message.params?.requestId === "string")
        ) {
          wrapped.onmessage?.(
            {
              ...message,
              params: {
                ...message.params,
                requestId: encode(message.params.requestId)
              }
            },
            extra
          )
        } else {
          // Responses to server-originated requests use the SDK's own IDs.
          wrapped.onmessage?.(message, extra)
        }
      }
      await inner.start()
    },
    send: (message, options) =>
      inner.send(
        ("result" in message || "error" in message) && message.id !== undefined
          ? { ...message, id: decode(message.id) }
          : message,
        options?.relatedRequestId !== undefined
          ? { ...options, relatedRequestId: decode(options.relatedRequestId) }
          : options
      ),
    close: () => inner.close(),
    get sessionId() {
      return inner.sessionId
    },
    setProtocolVersion: (version) => inner.setProtocolVersion?.(version)
  }
  return wrapped
}
