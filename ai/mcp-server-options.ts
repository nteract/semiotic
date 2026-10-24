/**
 * Network defaults for the MCP HTTP transport.
 *
 * A host is intentionally resolved separately from the server setup so the
 * safety-critical default can be exercised without starting the full MCP
 * process (and its native rendering dependencies).
 */
import type { McpToolProfile } from "./mcp-build-info"

export const DEFAULT_HTTP_HOST = "127.0.0.1"

export class McpStartupOptionsError extends Error {
  constructor(public readonly code: string) {
    super(code)
  }
}

/** Parse explicit configuration strictly; an invalid profile must never widen access. */
export function resolveMcpServerOptions(
  args: readonly string[],
  env: { MCP_HOST?: string; MCP_TOOL_PROFILE?: string } = process.env
): { httpMode: boolean; profile: McpToolProfile; port: number; host: string } {
  const values = new Map<string, string>()
  let httpMode = false
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === "--http") {
      if (httpMode) throw new McpStartupOptionsError("duplicate_http_option")
      httpMode = true
      continue
    }
    const separator = argument.indexOf("=")
    const flag = separator < 0 ? argument : argument.slice(0, separator)
    if (!["--host", "--port", "--profile"].includes(flag)) {
      throw new McpStartupOptionsError("unknown_startup_option")
    }
    if (values.has(flag)) {
      throw new McpStartupOptionsError(`duplicate_${flag.slice(2)}_option`)
    }
    const value = separator < 0 ? args[++index] : argument.slice(separator + 1)
    if (!value?.trim() || value.startsWith("--")) {
      throw new McpStartupOptionsError(`missing_${flag.slice(2)}_value`)
    }
    values.set(flag, value)
  }

  const profile = values.get("--profile") ?? env.MCP_TOOL_PROFILE ?? "developer"
  if (profile !== "public" && profile !== "developer") {
    throw new McpStartupOptionsError("invalid_tool_profile")
  }
  const portValue = values.get("--port") ?? "3001"
  const port = Number(portValue)
  if (!/^\d+$/.test(portValue) || !Number.isSafeInteger(port) || port > 65535) {
    throw new McpStartupOptionsError("invalid_http_port")
  }
  return { httpMode, profile, port, host: resolveHTTPListenHost(args, env) }
}

function getFlagValue(
  args: readonly string[],
  flag: string
): string | undefined {
  const inlinePrefix = `${flag}=`
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument.startsWith(inlinePrefix))
      return argument.slice(inlinePrefix.length)
    if (argument !== flag) continue

    const next = args[index + 1]
    return next && !next.startsWith("--") ? next : undefined
  }
  return undefined
}

/**
 * Resolve the HTTP bind host. Node's `server.listen(port)` binds to an
 * unspecified address (typically all interfaces), so callers must always pass
 * this result to `listen`. A non-loopback address is possible only through an
 * explicit CLI flag or `MCP_HOST` environment variable.
 */
export function resolveHTTPListenHost(
  args: readonly string[],
  env: { MCP_HOST?: string | undefined } = process.env
): string {
  return (
    getFlagValue(args, "--host")?.trim() ||
    env.MCP_HOST?.trim() ||
    DEFAULT_HTTP_HOST
  )
}
