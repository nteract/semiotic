import type { IncomingMessage, ServerResponse } from "http"
import { readMcpJsonBody } from "./mcp-http-body"

export const DEFAULT_MCP_MAX_CONCURRENT_UPLOADS = 16

export function resolveMcpUploadLimit(
  env: Record<string, string | undefined> = process.env
): number {
  const parsed = Number(env.MCP_MAX_CONCURRENT_UPLOADS)
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MCP_MAX_CONCURRENT_UPLOADS
}

/** Admit immediately or reject; never retain a queue of unread request bodies. */
export function createMcpUploadAdmission(maxConcurrentUploads: number) {
  let activeUploads = 0
  return {
    async readBody(req: IncomingMessage, maxBytes: number, timeoutMs: number) {
      if (activeUploads >= maxConcurrentUploads) {
        req.pause()
        return {
          ok: false as const,
          status: 429 as const,
          code: -32000 as const,
          message: "Request upload limit exceeded",
          reason: "request_upload_concurrency" as const
        }
      }
      activeUploads += 1
      try {
        return await readMcpJsonBody(req, maxBytes, timeoutMs)
      } finally {
        // Parsing owns this slot. Execution starts only after it is released,
        // including when the body reader fails or the client disconnects.
        activeUploads -= 1
      }
    }
  }
}

/** Flush the rejection, then close instead of draining an untrusted body. */
export function closeMcpRequestAfterResponse(req: IncomingMessage, res: ServerResponse): void {
  req.pause()
  res.setHeader("Connection", "close")
  // A client can abort between rejection and response completion. No body
  // reader owns that error for requests rejected before upload admission.
  const onError = () => {}
  req.on("error", onError)
  req.once("close", () => req.removeListener("error", onError))
  res.once("finish", () => req.destroy())
}
