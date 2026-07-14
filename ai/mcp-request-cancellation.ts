import type * as http from "http"

/**
 * Create the abort signal used by one stateless MCP HTTP request.
 *
 * Node emits IncomingMessage `close` after a normal request body is consumed,
 * so that event is only a cancellation signal while the body is incomplete.
 * Once a complete body is accepted, a client can still disconnect before the
 * response finishes; ServerResponse `close` covers that separate path.
 */
export function createMcpRequestCancellationSignal(
  req: http.IncomingMessage,
  res: http.ServerResponse
): AbortSignal {
  const controller = new AbortController()
  const abort = () => controller.abort()

  req.once("aborted", abort)
  req.once("close", () => {
    if (!req.complete) abort()
  })
  res.once("close", () => {
    if (!res.writableFinished) abort()
  })

  return controller.signal
}
