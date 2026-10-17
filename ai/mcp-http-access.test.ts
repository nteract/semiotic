import { createMcpHttpAccessPolicy } from "./mcp-http-access"

describe("MCP HTTP access policy", () => {
  it("allows the bind address and localhost without granting browser access", () => {
    const policy = createMcpHttpAccessPolicy("127.0.0.1", {})
    expect(policy.allowsHost("127.0.0.1:3001")).toBe(true)
    expect(policy.allowsHost("LOCALHOST:3001")).toBe(true)
    expect(policy.allowsOrigin(undefined)).toBe(true)
    for (const origin of [
      "https://example.com",
      "http://localhost:3001",
      "null",
      "",
      "*"
    ])
      expect(policy.allowsOrigin(origin)).toBe(false)
  })

  it.each(["0.0.0.0", "::"])(
    "keeps Host validation when binding to %s",
    (host) => {
      const policy = createMcpHttpAccessPolicy(host, {})
      expect(policy.allowsHost("localhost:3001")).toBe(true)
      expect(policy.allowsHost("[::1]:3001")).toBe(true)
      expect(policy.allowsHost("evil.example:3001")).toBe(false)
      expect(policy.allowsHost("192.0.2.10:3001")).toBe(false)
    }
  )

  it("limits a custom bind address to that address", () => {
    const policy = createMcpHttpAccessPolicy("192.0.2.10", {})
    expect(policy.allowsHost("192.0.2.10:3001")).toBe(true)
    expect(policy.allowsHost("127.0.0.1:3001")).toBe(false)
    expect(policy.allowsHost("evil.example")).toBe(false)
  })

  it("supports IPv6 loopback and explicit IPv6 authorities", () => {
    const local = createMcpHttpAccessPolicy("::1", {})
    expect(local.allowsHost("[::1]:3001")).toBe(true)
    expect(local.allowsHost("[0:0:0:0:0:0:0:1]:3001")).toBe(true)
    expect(local.allowsHost("localhost:3001")).toBe(true)
    expect(local.allowsHost("[::2]:3001")).toBe(false)
    const hosted = createMcpHttpAccessPolicy("::", {
      MCP_ALLOWED_HOSTS: "[2001:db8::1]:443, ::1"
    })
    expect(hosted.allowsHost("[2001:db8::1]:443")).toBe(true)
    expect(hosted.allowsHost("[2001:db8::1]:444")).toBe(false)
    expect(hosted.allowsHost("[::1]:3001")).toBe(true)
  })

  it.each(["fe80::1%eth0", "fe80::1%25eth0", "fe80::1%1", "::1%lo0"])(
    "rejects scoped IPv6 %s without throwing from either header parser",
    (address) => {
      const policy = createMcpHttpAccessPolicy("::1", {
        MCP_ALLOWED_ORIGINS: "http://[::1]:3001"
      })
      const authority = `[${address}]:3001`
      expect(policy.allowsHost(authority)).toBe(false)
      expect(policy.allowsOrigin(`http://${authority}`)).toBe(false)
      expect(() =>
        createMcpHttpAccessPolicy("::1", {
          MCP_ALLOWED_HOSTS: authority
        })
      ).toThrow("MCP_ALLOWED_HOSTS")
      expect(() =>
        createMcpHttpAccessPolicy("::1", {
          MCP_ALLOWED_ORIGINS: `http://${authority}`
        })
      ).toThrow("MCP_ALLOWED_ORIGINS")
    }
  )

  it("uses explicit hosts instead of the local defaults and respects explicit ports", () => {
    const policy = createMcpHttpAccessPolicy("127.0.0.1", {
      MCP_ALLOWED_HOSTS: " api.example, tunnel.example:443 "
    })
    expect(policy.allowsHost("API.EXAMPLE:3001")).toBe(true)
    expect(policy.allowsHost("tunnel.example:443")).toBe(true)
    expect(policy.allowsHost("tunnel.example:80")).toBe(false)
    expect(policy.allowsHost("tunnel.example")).toBe(false)
    expect(policy.allowsHost("localhost:3001")).toBe(false)
  })

  it.each([
    undefined,
    "",
    "evil.example",
    "localhost.evil.example:3001",
    "localhost:3001:evil",
    "localhost:",
    "localhost:65536",
    "localhost:0",
    "localhost:abc",
    "localhost,evil.example",
    "localhost@evil.example",
    "localhost/path",
    "localhost?query",
    "localhost#fragment",
    "localhost\\evil",
    " localhost ",
    "local%68ost",
    "::1",
    "[not-ipv6]:3001"
  ])("rejects an untrusted or malformed Host: %s", (value) => {
    expect(createMcpHttpAccessPolicy("127.0.0.1", {}).allowsHost(value)).toBe(
      false
    )
  })

  it("matches explicit browser origins by scheme, hostname, and port", () => {
    const policy = createMcpHttpAccessPolicy("127.0.0.1", {
      MCP_ALLOWED_ORIGINS:
        " https://trusted.example, http://localhost:5173, http://[::1]:5173 "
    })
    expect(policy.allowsOrigin("https://trusted.example")).toBe(true)
    expect(policy.allowsOrigin("http://localhost:5173")).toBe(true)
    expect(policy.allowsOrigin("http://[::1]:5173")).toBe(true)
    expect(policy.allowsOrigin(undefined)).toBe(true)
    for (const origin of [
      "http://trusted.example",
      "https://trusted.example:444",
      "http://localhost:5174",
      "https://trusted.example.evil",
      "https://trusted.example@evil.example",
      "https://trusted.example/path",
      "https://trusted.example/",
      "https://trusted.example?x=1",
      "https://trusted.example, https://evil.example",
      "https://trusted.example https://evil.example",
      "null",
      "",
      "*"
    ])
      expect(policy.allowsOrigin(origin)).toBe(false)
  })

  it("treats whitespace-only allowlists as the safe defaults", () => {
    const policy = createMcpHttpAccessPolicy("127.0.0.1", {
      MCP_ALLOWED_HOSTS: " , ",
      MCP_ALLOWED_ORIGINS: " , "
    })
    expect(policy.allowsHost("localhost:3001")).toBe(true)
    expect(policy.allowsHost("evil.example")).toBe(false)
    expect(policy.allowsOrigin("https://evil.example")).toBe(false)
  })

  it.each([
    "*",
    "null",
    "https://trusted.example/path",
    "https://user@trusted.example"
  ])("fails closed for invalid configured origin %s", (origin) => {
    expect(() =>
      createMcpHttpAccessPolicy("127.0.0.1", { MCP_ALLOWED_ORIGINS: origin })
    ).toThrow("MCP_ALLOWED_ORIGINS")
  })

  it.each(["*", "https://trusted.example", "localhost:invalid"])(
    "fails closed for invalid configured host %s",
    (host) => {
      expect(() =>
        createMcpHttpAccessPolicy("127.0.0.1", { MCP_ALLOWED_HOSTS: host })
      ).toThrow("MCP_ALLOWED_HOSTS")
    }
  )
})
