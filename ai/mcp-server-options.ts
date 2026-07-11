/**
 * Network defaults for the MCP HTTP transport.
 *
 * A host is intentionally resolved separately from the server setup so the
 * safety-critical default can be exercised without starting the full MCP
 * process (and its native rendering dependencies).
 */
export const DEFAULT_HTTP_HOST = "127.0.0.1"

function getFlagValue(args: readonly string[], flag: string): string | undefined {
  const inlinePrefix = `${flag}=`
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument.startsWith(inlinePrefix)) return argument.slice(inlinePrefix.length)
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
  env: { MCP_HOST?: string | undefined } = process.env,
): string {
  return getFlagValue(args, "--host")?.trim() || env.MCP_HOST?.trim() || DEFAULT_HTTP_HOST
}
