import { isIP } from "node:net"

/** Forwarded addresses are trusted only when the operator declares proxy hops. */
export function resolveMcpTrustedProxyHops(value: string | undefined): number {
  if (value === undefined || value === "") return 0
  if (!/^\d+$/.test(value) || Number(value) > 32) {
    throw new Error("MCP_TRUSTED_PROXY_HOPS must be an integer from 0 to 32")
  }
  return Number(value)
}

function normalizeAddress(value: string | undefined): string | undefined {
  if (!value || !isIP(value)) return undefined
  if (isIP(value) === 4) return value
  // URL canonicalization collapses equivalent IPv6 spellings. Map IPv4-mapped
  // IPv6 addresses to the same key as their IPv4 representation.
  const [address, scope] = value.split("%")
  const normalized = new URL(`http://[${address}]/`).hostname.slice(1, -1)
  const mapped = /^::ffff:([a-f0-9]+):([a-f0-9]+)$/.exec(normalized)
  if (!mapped) return scope ? `${normalized}%${scope}` : normalized
  const high = Number.parseInt(mapped[1], 16)
  const low = Number.parseInt(mapped[2], 16)
  return [high >>> 8, high & 255, low >>> 8, low & 255].join(".")
}

export function mcpClientKey(
  remoteAddress: string | undefined,
  forwardedFor: string | string[] | undefined,
  trustedProxyHops = 0
): string {
  const socketKey = normalizeAddress(remoteAddress) ?? "unknown"
  if (!trustedProxyHops || typeof forwardedFor !== "string") return socketKey
  const addresses = forwardedFor.split(",").map((address) => address.trim())
  if (addresses.length < trustedProxyHops) return socketKey
  const trustedChain = addresses.slice(-trustedProxyHops).map(normalizeAddress)
  if (trustedChain.some((address) => !address)) return socketKey
  return trustedChain[0]!
}
