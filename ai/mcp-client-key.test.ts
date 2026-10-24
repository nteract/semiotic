import { mcpClientKey, resolveMcpTrustedProxyHops } from "./mcp-client-key"

describe("MCP client identity", () => {
  it("uses the socket address and ignores forwarded headers by default", () => {
    expect(mcpClientKey("192.0.2.1", "198.51.100.1")).toBe("192.0.2.1")
    expect(mcpClientKey("::ffff:192.0.2.1", undefined)).toBe("192.0.2.1")
    expect(mcpClientKey("0:0:0:0:0:ffff:c000:201", undefined)).toBe("192.0.2.1")
    expect(mcpClientKey("0:0:0:0:0:0:0:1", undefined)).toBe("::1")
    expect(mcpClientKey("fe80::1%en0", undefined)).toBe("fe80::1%en0")
    expect(mcpClientKey(undefined, "198.51.100.1")).toBe("unknown")
  })

  it("uses only the explicitly trusted rightmost proxy hops", () => {
    expect(mcpClientKey("127.0.0.1", "spoofed, 192.0.2.1", 1)).toBe("192.0.2.1")
    expect(
      mcpClientKey("127.0.0.1", "spoofed, 192.0.2.1, 198.51.100.1", 2)
    ).toBe("192.0.2.1")
    expect(mcpClientKey("127.0.0.1", "spoofed, ::ffff:c000:201", 1)).toBe(
      "192.0.2.1"
    )
  })

  it.each([
    undefined,
    ["192.0.2.1"],
    "",
    "not-an-ip",
    "192.0.2.1",
    "192.0.2.1, garbage"
  ])(
    "falls back to the socket for missing or invalid trusted hops: %j",
    (header) => {
      expect(mcpClientKey("127.0.0.1", header, 2)).toBe("127.0.0.1")
    }
  )

  it("requires explicit, bounded proxy configuration", () => {
    expect(resolveMcpTrustedProxyHops(undefined)).toBe(0)
    expect(resolveMcpTrustedProxyHops("")).toBe(0)
    expect(resolveMcpTrustedProxyHops("2")).toBe(2)
    for (const value of ["-1", "1junk", "1.5", "33", "Infinity"]) {
      expect(() => resolveMcpTrustedProxyHops(value)).toThrow(
        "MCP_TRUSTED_PROXY_HOPS"
      )
    }
  })
})
