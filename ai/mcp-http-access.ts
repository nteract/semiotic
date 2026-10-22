import { isIP } from "net"

interface HttpAccessEnvironment {
  MCP_ALLOWED_HOSTS?: string
  MCP_ALLOWED_ORIGINS?: string
}

interface HostAuthority {
  hostname: string
  port?: number
}

function parseHost(value: string): HostAuthority | undefined {
  // Parse an authority, not a URL: userinfo, paths, extra colons, lists, and
  // whitespace must not turn a forged header into an allowed hostname.
  const match = /^(\[[^\]]+\]|[a-z0-9._-]+)(?::([0-9]+))?$/i.exec(value)
  if (!match || match[0] !== value) return undefined
  let hostname = match[1].toLowerCase()
  if (hostname.startsWith("[")) {
    if (isIP(hostname.slice(1, -1)) !== 6) return undefined
    try {
      hostname = new URL(`http://${hostname}`).hostname.slice(1, -1)
    } catch {
      // isIP accepts zone identifiers that URL rejects. Untrusted headers
      // must fail the access check rather than escape the request handler.
      return undefined
    }
  }
  const port = match[2] === undefined ? undefined : Number(match[2])
  if (
    port !== undefined &&
    (!Number.isInteger(port) || port < 1 || port > 65535)
  )
    return undefined
  return { hostname, port }
}

function parseOrigin(value: string): string | undefined {
  // Only a single HTTP(S) origin is meaningful here. In particular, an opaque
  // "null" origin or a wildcard must never grant a public page access.
  const match = /^(https?):\/\/(.+)$/i.exec(value)
  if (!match || match[0] !== value || !parseHost(match[2])) return undefined
  try {
    return new URL(value).origin
  } catch {
    return undefined
  }
}

function entries(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/** Origin and DNS-rebinding checks apply before routing, CORS, or body reads. */
export function createMcpHttpAccessPolicy(
  listenHost: string,
  env: HttpAccessEnvironment = process.env
) {
  const configuredHosts = entries(env.MCP_ALLOWED_HOSTS)
  const host = listenHost.toLowerCase()
  // An all-interface bind is not an allowlist of public DNS names. Hosted
  // deployments and tunnels must explicitly name the hosts they serve. A
  // `localhost` bind serves the loopback addresses that name resolves to.
  const defaults =
    host === "0.0.0.0" || host === "::" || host === "localhost"
      ? ["127.0.0.1", "localhost", "::1"]
      : [
          host,
          ...(host === "::1" || (isIP(host) === 4 && host.startsWith("127."))
            ? ["localhost"]
            : [])
        ]
  const hosts = (configuredHosts.length ? configuredHosts : defaults).map(
    (entry) => {
      const parsed = parseHost(isIP(entry) === 6 ? `[${entry}]` : entry)
      if (!parsed)
        throw new Error(
          "MCP_ALLOWED_HOSTS must contain hostnames or IP authorities"
        )
      return parsed
    }
  )
  const origins = new Set(
    entries(env.MCP_ALLOWED_ORIGINS).map((entry) => {
      const parsed = parseOrigin(entry)
      if (!parsed)
        throw new Error(
          "MCP_ALLOWED_ORIGINS must contain explicit HTTP(S) origins"
        )
      return parsed
    })
  )

  return {
    allowsHost(value: string | undefined): boolean {
      const parsed = value === undefined ? undefined : parseHost(value)
      return (
        parsed !== undefined &&
        hosts.some(
          (allowed) =>
            parsed.hostname === allowed.hostname &&
            (allowed.port === undefined ||
              parsed.port === allowed.port ||
              // Clients omit a scheme's default port, and a TLS proxy hides
              // the scheme, so a portless Host matches an 80 or 443 entry.
              (parsed.port === undefined &&
                (allowed.port === 80 || allowed.port === 443)))
        )
      )
    },
    allowsOrigin(value: string | undefined): boolean {
      if (value === undefined) return true // Native MCP clients omit Origin.
      const parsed = parseOrigin(value)
      return parsed !== undefined && origins.has(parsed)
    }
  }
}
