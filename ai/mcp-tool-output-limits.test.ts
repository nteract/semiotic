import {
  capMcpToolResult,
  DEFAULT_MCP_MAX_TOOL_OUTPUT_BYTES,
  resolveMcpToolOutputLimit
} from "./mcp-tool-output-limits"

describe("MCP complete tool output limit", () => {
  it("retains the exact successful payload at the UTF-8 byte boundary", () => {
    const result = {
      content: [{ type: "text", text: "😀 complete recommendation" }],
      structuredContent: { props: { data: [{ name: "original", value: 2 }] } }
    }
    const bytes = Buffer.byteLength(JSON.stringify(result))
    expect(capMcpToolResult(result, bytes)).toBe(result)
    expect(capMcpToolResult(result, bytes - 1)).toMatchObject({
      isError: true,
      structuredContent: { code: "OUTPUT_LIMIT_EXCEEDED", observedBytes: bytes }
    })
  })

  it.each(["content", "structuredContent", "_meta"])(
    "counts %s and never returns a partial payload or echoed input",
    (field) => {
      const result = capMcpToolResult(
        { [field]: "private-value".repeat(1000) },
        1024
      )
      expect(result).toMatchObject({
        isError: true,
        structuredContent: { code: "OUTPUT_LIMIT_EXCEEDED", maximumBytes: 1024 }
      })
      expect(JSON.stringify(result)).not.toContain("private-value")
      expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThan(512)
    }
  )

  it("returns a bounded control error even when the cap is smaller than that error", () => {
    const result = capMcpToolResult(
      { content: [{ type: "text", text: "x" }] },
      1
    )
    expect(result).toMatchObject({ isError: true })
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThan(512)
  })

  it("accepts positive integer configuration and rejects malformed overrides", () => {
    expect(
      resolveMcpToolOutputLimit({ MCP_MAX_TOOL_OUTPUT_BYTES: "4096" })
    ).toBe(4096)
    for (const value of [
      undefined,
      "",
      "-1",
      "0",
      "1.5",
      "4096oops",
      "Infinity"
    ]) {
      expect(
        resolveMcpToolOutputLimit({ MCP_MAX_TOOL_OUTPUT_BYTES: value })
      ).toBe(DEFAULT_MCP_MAX_TOOL_OUTPUT_BYTES)
    }
  })
})
