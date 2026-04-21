import type { Datum } from "../../components/charts/shared/datumTypes"
/**
 * MCP protocol compliance tests.
 *
 * Spawns the MCP server as a child process and exercises the full
 * JSON-RPC 2.0 round-trip over stdio for every registered tool.
 *
 * These tests validate:
 *   - Server responds to `initialize` with capabilities
 *   - `tools/list` returns all 6 registered tools
 *   - Each tool responds to `tools/call` with correct result shape
 *   - Error cases return `isError: true`
 *   - Invalid methods return JSON-RPC error
 */

import { spawn, type ChildProcess } from "child_process"
import * as path from "path"

const SERVER_PATH = path.resolve(__dirname, "../../../ai/dist/mcp-server.js")

// ── Helpers ──────────────────────────────────────────────────────────

/** Spawn the MCP server process. */
function spawnServer(): ChildProcess {
  return spawn("node", [SERVER_PATH], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "test" },
  })
}

/** Send a JSON-RPC request and wait for the response. */
function sendRequest(
  proc: ChildProcess,
  method: string,
  params: Datum = {},
  id: string | number = 1
): Promise<any> {
  return new Promise((resolve, reject) => {
    let buffer = ""

    const cleanup = () => {
      clearTimeout(timeout)
      proc.stdout!.off("data", onData)
      proc.off("exit", onExit)
    }

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString()
      // MCP stdio transport sends newline-delimited JSON
      const lines = buffer.split("\n")
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim()
        if (!line) continue
        try {
          const msg = JSON.parse(line)
          if (msg.id === id) {
            cleanup()
            resolve(msg)
          }
        } catch {
          // Ignore non-JSON lines (e.g., log output)
        }
      }
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines[lines.length - 1]
    }

    const onExit = (code: number | null) => {
      cleanup()
      reject(new Error(`Process exited with code ${code} before responding to ${method}`))
    }

    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`Timeout waiting for response to ${method}`))
    }, 10000)

    proc.stdout!.on("data", onData)
    proc.on("exit", onExit)

    const request = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params,
    })
    proc.stdin!.write(request + "\n")
  })
}

/** Send initialize + initialized handshake, return the initialize result. */
async function initializeServer(proc: ChildProcess): Promise<any> {
  const initResult = await sendRequest(proc, "initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "test-client", version: "1.0.0" },
  }, "init-1")

  // Send initialized notification (no response expected)
  proc.stdin!.write(JSON.stringify({
    jsonrpc: "2.0",
    method: "notifications/initialized",
  }) + "\n")

  return initResult
}

// ── Tests ────────────────────────────────────────────────────────────

describe("MCP protocol round-trip", () => {
  let proc: ChildProcess

  beforeEach(async () => {
    proc = spawnServer()
    await initializeServer(proc)
  })

  afterEach(() => {
    proc.kill("SIGTERM")
  })

  it("initialize returns server info and capabilities", async () => {
    // We already initialized in beforeEach, spawn fresh for this test
    const freshProc = spawnServer()
    try {
      const result = await sendRequest(freshProc, "initialize", {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      }, "init-test")

      expect(result.result).toBeDefined()
      expect(result.result.serverInfo.name).toBe("semiotic")
      expect(result.result.capabilities.tools).toBeDefined()
    } finally {
      freshProc.kill("SIGTERM")
    }
  })

  it("tools/list returns all 6 tools", async () => {
    const result = await sendRequest(proc, "tools/list", {}, "list-1")

    expect(result.result).toBeDefined()
    const toolNames = result.result.tools.map((t: any) => t.name).sort()
    expect(toolNames).toEqual([
      "applyTheme",
      "diagnoseConfig",
      "getSchema",
      "renderChart",
      "reportIssue",
      "suggestChart",
    ])
  })

  it("getSchema without component lists all components", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "getSchema",
      arguments: {},
    }, "schema-1")

    expect(result.result).toBeDefined()
    expect(result.result.isError).toBeFalsy()
    const text = result.result.content[0].text
    expect(text).toContain("Available components")
    expect(text).toContain("LineChart")
    expect(text).toContain("BarChart")
  })

  it("getSchema with specific component returns schema", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "getSchema",
      arguments: { component: "BarChart" },
    }, "schema-2")

    expect(result.result).toBeDefined()
    expect(result.result.isError).toBeFalsy()
    const text = result.result.content[0].text
    expect(text).toContain("BarChart")
    expect(text).toContain("renderChart")
  })

  it("getSchema with unknown component returns error", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "getSchema",
      arguments: { component: "FakeChart" },
    }, "schema-err")

    expect(result.result.isError).toBe(true)
    expect(result.result.content[0].text).toContain("Unknown component")
  })

  it("suggestChart returns recommendations for tabular data", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "suggestChart",
      arguments: {
        data: [
          { category: "A", value: 10 },
          { category: "B", value: 20 },
          { category: "C", value: 30 },
        ],
      },
    }, "suggest-1")

    expect(result.result).toBeDefined()
    expect(result.result.isError).toBeFalsy()
    const text = result.result.content[0].text
    expect(text).toContain("BarChart")
  })

  it("suggestChart with empty data returns error", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "suggestChart",
      arguments: { data: [] },
    }, "suggest-err")

    expect(result.result.isError).toBe(true)
  })

  it("renderChart produces SVG output", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "renderChart",
      arguments: {
        component: "BarChart",
        props: {
          data: [
            { category: "A", value: 10 },
            { category: "B", value: 20 },
          ],
          categoryAccessor: "category",
          valueAccessor: "value",
          width: 300,
          height: 200,
        },
      },
    }, "render-1")

    expect(result.result).toBeDefined()
    expect(result.result.isError).toBeFalsy()
    const text = result.result.content[0].text
    expect(text).toContain("<svg")
    expect(text).toContain("</svg>")
  })

  it("renderChart with unknown component returns error", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "renderChart",
      arguments: { component: "NonExistent", props: {} },
    }, "render-err")

    expect(result.result.isError).toBe(true)
    expect(result.result.content[0].text).toContain("Unknown component")
  })

  it("renderChart with theme injects CSS variables", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "renderChart",
      arguments: {
        component: "BarChart",
        props: {
          data: [{ category: "A", value: 10 }],
          categoryAccessor: "category",
          valueAccessor: "value",
        },
        theme: { "--semiotic-bg": "#1a1a2e", "--semiotic-text": "#ededed" },
      },
    }, "render-theme")

    expect(result.result.isError).toBeFalsy()
    const text = result.result.content[0].text
    expect(text).toContain("--semiotic-bg: #1a1a2e")
    expect(text).toContain("--semiotic-text: #ededed")
  })

  it("diagnoseConfig detects missing data", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "diagnoseConfig",
      arguments: {
        component: "LineChart",
        props: { xAccessor: "x", yAccessor: "y" },
      },
    }, "diag-1")

    expect(result.result).toBeDefined()
    // Missing data should produce a diagnostic
    const text = result.result.content[0].text
    expect(text.length).toBeGreaterThan(0)
  })

  it("diagnoseConfig with valid config returns ok", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "diagnoseConfig",
      arguments: {
        component: "BarChart",
        props: {
          data: [{ category: "A", value: 10 }],
          categoryAccessor: "category",
          valueAccessor: "value",
          width: 400,
          height: 300,
        },
      },
    }, "diag-ok")

    expect(result.result).toBeDefined()
    expect(result.result.isError).toBeFalsy()
    expect(result.result.content[0].text).toContain("looks good")
  })

  it("reportIssue generates a GitHub URL", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "reportIssue",
      arguments: {
        title: "Bug: animation flicker",
        body: "Steps to reproduce...",
        labels: ["bug"],
      },
    }, "issue-1")

    expect(result.result).toBeDefined()
    expect(result.result.isError).toBeFalsy()
    const text = result.result.content[0].text
    expect(text).toContain("github.com/nteract/semiotic/issues/new")
    expect(text).toContain("animation+flicker")
  })

  it("applyTheme lists presets when no name given", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "applyTheme",
      arguments: {},
    }, "theme-list")

    expect(result.result).toBeDefined()
    expect(result.result.isError).toBeFalsy()
    const text = result.result.content[0].text
    expect(text).toContain("tufte")
    expect(text).toContain("dark")
  })

  it("applyTheme returns usage for a specific theme", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "applyTheme",
      arguments: { name: "tufte" },
    }, "theme-tufte")

    expect(result.result).toBeDefined()
    expect(result.result.isError).toBeFalsy()
    const text = result.result.content[0].text
    expect(text).toContain("ThemeProvider")
    expect(text).toContain('theme="tufte"')
  })

  it("applyTheme with unknown theme returns error", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "applyTheme",
      arguments: { name: "nonexistent" },
    }, "theme-err")

    expect(result.result.isError).toBe(true)
    expect(result.result.content[0].text).toContain("Unknown theme")
  })

  it("unknown method returns JSON-RPC error", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "nonExistentTool",
      arguments: {},
    }, "unknown-1")

    // MCP SDK returns an error for unknown tools
    expect(result.error || result.result?.isError).toBeTruthy()
  })
})
