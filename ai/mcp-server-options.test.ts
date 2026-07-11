import { DEFAULT_HTTP_HOST, resolveHTTPListenHost } from "./mcp-server-options"

describe("MCP HTTP listen host", () => {
  it("uses loopback when neither a CLI flag nor environment override is present", () => {
    expect(resolveHTTPListenHost([], {})).toBe(DEFAULT_HTTP_HOST)
  })

  it("allows a deliberate environment override", () => {
    expect(resolveHTTPListenHost([], { MCP_HOST: "0.0.0.0" })).toBe("0.0.0.0")
  })

  it("gives an explicit --host flag precedence over MCP_HOST", () => {
    expect(resolveHTTPListenHost(["--host", "0.0.0.0"], { MCP_HOST: "127.0.0.1" })).toBe("0.0.0.0")
    expect(resolveHTTPListenHost(["--host=::1"], { MCP_HOST: "0.0.0.0" })).toBe("::1")
  })

  it("does not turn a missing or blank --host value into a public bind", () => {
    expect(resolveHTTPListenHost(["--host"], {})).toBe(DEFAULT_HTTP_HOST)
    expect(resolveHTTPListenHost(["--host", "   "], {})).toBe(DEFAULT_HTTP_HOST)
  })
})
