import {
  DEFAULT_HTTP_HOST,
  resolveHTTPListenHost,
  resolveMcpServerOptions
} from "./mcp-server-options"

describe("MCP startup options", () => {
  it("preserves the documented defaults only when options are absent", () => {
    expect(resolveMcpServerOptions([], {})).toEqual({
      httpMode: false,
      profile: "developer",
      port: 3001,
      host: DEFAULT_HTTP_HOST
    })
  })

  it.each([
    ["--http", "--profile", "public", "--port", "4000", "--host", "::1"],
    ["--http", "--profile=public", "--port=4000", "--host=::1"]
  ])("accepts separated and equals forms: %j", (...args) => {
    expect(
      resolveMcpServerOptions(args, {
        MCP_TOOL_PROFILE: "invalid",
        MCP_HOST: "0.0.0.0"
      })
    ).toEqual({
      httpMode: true,
      profile: "public",
      port: 4000,
      host: "::1"
    })
  })

  it("uses a valid environment profile and preserves ephemeral port zero", () => {
    expect(
      resolveMcpServerOptions(["--port=0"], { MCP_TOOL_PROFILE: "public" })
    ).toMatchObject({ profile: "public", port: 0 })
    expect(
      resolveMcpServerOptions([], { MCP_TOOL_PROFILE: "developer" })
    ).toMatchObject({ profile: "developer" })
  })

  it.each(["pubic", "Public", "", " ", "developer-extra"])(
    "rejects invalid profile %j instead of exposing developer tools",
    (profile) => {
      expect(() =>
        resolveMcpServerOptions([`--profile=${profile}`], {})
      ).toThrow()
      expect(() =>
        resolveMcpServerOptions([], { MCP_TOOL_PROFILE: profile })
      ).toThrow("invalid_tool_profile")
    }
  )

  it.each([
    ["--profile"],
    ["--profile", "--http"],
    ["--port"],
    ["--host"],
    ["--profile=public", "--profile=developer"],
    ["--port=4000", "--port=5000"],
    ["--http", "--http"],
    ["--profiles=public"],
    ["--http=true"],
    ["unexpected"]
  ])("rejects incomplete, ambiguous, and unknown arguments: %j", (...args) => {
    expect(() =>
      resolveMcpServerOptions(args, { MCP_TOOL_PROFILE: "public" })
    ).toThrow()
  })

  it.each(["4000oops", "12.5", "-1", "65536", "Infinity", "1e3", " 4000 "])(
    "rejects invalid port %s rather than binding a different port",
    (port) => {
      expect(() => resolveMcpServerOptions([`--port=${port}`], {})).toThrow(
        "invalid_http_port"
      )
    }
  )
})

describe("MCP HTTP listen host", () => {
  it("uses loopback when neither a CLI flag nor environment override is present", () => {
    expect(resolveHTTPListenHost([], {})).toBe(DEFAULT_HTTP_HOST)
  })

  it("allows a deliberate environment override", () => {
    expect(resolveHTTPListenHost([], { MCP_HOST: "0.0.0.0" })).toBe("0.0.0.0")
  })

  it("gives an explicit --host flag precedence over MCP_HOST", () => {
    expect(
      resolveHTTPListenHost(["--host", "0.0.0.0"], { MCP_HOST: "127.0.0.1" })
    ).toBe("0.0.0.0")
    expect(resolveHTTPListenHost(["--host=::1"], { MCP_HOST: "0.0.0.0" })).toBe(
      "::1"
    )
  })

  it("does not turn a missing or blank --host value into a public bind", () => {
    expect(resolveHTTPListenHost(["--host"], {})).toBe(DEFAULT_HTTP_HOST)
    expect(resolveHTTPListenHost(["--host", "   "], {})).toBe(DEFAULT_HTTP_HOST)
  })
})
