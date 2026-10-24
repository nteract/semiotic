import { inspectMcpOutputLimit } from "./mcp-render-output-limits"

export const DEFAULT_MCP_MAX_TOOL_OUTPUT_BYTES = 2 * 1024 * 1024

export function resolveMcpToolOutputLimit(env = process.env): number {
  const maximum = Number(env.MCP_MAX_TOOL_OUTPUT_BYTES)
  return Number.isSafeInteger(maximum) && maximum > 0
    ? maximum
    : DEFAULT_MCP_MAX_TOOL_OUTPUT_BYTES
}

/** Bound the complete result before child-to-parent IPC or transport serialization. */
export function capMcpToolResult<T>(
  result: T,
  maximum = resolveMcpToolOutputLimit()
) {
  const limit = inspectMcpOutputLimit(result, maximum)
  if (limit.ok) return result
  // A fixed-size control error is returned even when a configured cap is too
  // small to hold the error itself. Never echo or truncate the original result.
  return {
    content: [
      {
        type: "text" as const,
        text: "Tool output exceeds MCP_MAX_TOOL_OUTPUT_BYTES. Reduce input data or the number of requested results, or increase the configured response limit."
      }
    ],
    isError: true,
    structuredContent: {
      code: "OUTPUT_LIMIT_EXCEEDED",
      maximumBytes: limit.maximum,
      observedBytes: limit.observed
    }
  }
}
