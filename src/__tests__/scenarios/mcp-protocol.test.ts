import type { Datum } from "../../components/charts/shared/datumTypes"
/**
 * MCP protocol compliance tests.
 *
 * Spawns the MCP server as a child process and exercises the full
 * JSON-RPC 2.0 round-trip over stdio for every registered tool, plus
 * a Streamable HTTP smoke test for session initialization.
 *
 * These tests validate:
 *   - Server responds to `initialize` with capabilities
 *   - `tools/list` returns all 6 registered tools
 *   - `resources/list` and `prompts/list` expose AI context surfaces
 *   - Each tool responds to `tools/call` with correct result shape
 *   - Error cases return `isError: true`
 *   - Invalid methods return JSON-RPC error
 */

import { spawn, type ChildProcess } from "child_process"
import * as net from "net"
import * as path from "path"

const SERVER_PATH = path.resolve(__dirname, "../../../ai/dist/mcp-server.js")
const HTTP_START_RETRIES = 3

// ── Helpers ──────────────────────────────────────────────────────────

/** Spawn the MCP server process. */
function spawnServer(): ChildProcess {
  return spawn("node", [SERVER_PATH], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "test" },
  })
}

/** Spawn the MCP server process in Streamable HTTP mode. */
function spawnHTTPServer(port: number): ChildProcess {
  return spawn("node", [SERVER_PATH, "--http", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "test" },
  })
}

/** Reserve an open port long enough to avoid hard-coding one in tests. */
function getOpenPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not determine open port")))
        return
      }
      server.close(() => resolve(address.port))
    })
  })
}

/** Wait for the HTTP server startup log before sending requests. */
function waitForHTTPServer(proc: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    let stderr = ""

    const cleanup = () => {
      clearTimeout(timeout)
      proc.stderr!.off("data", onData)
      proc.off("exit", onExit)
    }

    const onData = (chunk: Buffer) => {
      stderr += chunk.toString()
      if (stderr.includes("Semiotic MCP server (HTTP) listening")) {
        cleanup()
        resolve()
      }
    }

    const onExit = (code: number | null) => {
      cleanup()
      reject(new Error(`HTTP server exited with code ${code}: ${stderr}`))
    }

    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`Timeout waiting for HTTP server startup: ${stderr}`))
    }, 10000)

    proc.stderr!.on("data", onData)
    proc.on("exit", onExit)
  })
}

function parseSSEJSON(text: string): any {
  const events = text.split(/\r?\n\r?\n/)
  for (const event of events) {
    const data = event
      .split(/\r?\n/)
      .filter(line => line.startsWith("data:"))
      .map(line => line.replace(/^data:\s?/, ""))
      .join("\n")
    if (data) return JSON.parse(data)
  }
  throw new Error(`No SSE data line found: ${text}`)
}

function parseHTTPRPCBody(text: string, contentType: string | null): any {
  if (!text) return undefined
  if (contentType?.includes("application/json")) return JSON.parse(text)
  if (contentType?.includes("text/event-stream")) return parseSSEJSON(text)

  try {
    return JSON.parse(text)
  } catch {
    return parseSSEJSON(text)
  }
}

function waitForProcessExit(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (proc.exitCode !== null || proc.signalCode !== null) {
      resolve()
      return
    }

    let settled = false

    const cleanup = () => {
      clearTimeout(graceTimeout)
      clearTimeout(forceTimeout)
      proc.off("exit", onExit)
    }

    const onExit = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }

    const graceTimeout = setTimeout(() => {
      if (proc.exitCode !== null || proc.signalCode !== null) return
      try {
        proc.kill("SIGKILL")
      } catch {
        // The process may have exited between the state check and kill call.
      }
    }, 1000)

    const forceTimeout = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }, 5000)

    proc.once("exit", onExit)
  })
}

async function sendHTTPRPC(port: number, message: Datum, sessionId?: string): Promise<{
  body?: any
  response: Response
  text: string
}> {
  const response = await fetch(`http://127.0.0.1:${port}`, {
    method: "POST",
    headers: {
      "Accept": "application/json, text/event-stream",
      "Content-Type": "application/json",
      ...(sessionId ? { "mcp-session-id": sessionId } : {}),
    },
    body: JSON.stringify(message),
  })
  const text = await response.text()
  return {
    body: parseHTTPRPCBody(text, response.headers.get("content-type")),
    response,
    text,
  }
}

async function spawnReadyHTTPServer(): Promise<{ proc: ChildProcess; port: number }> {
  let lastError: unknown

  for (let attempt = 0; attempt < HTTP_START_RETRIES; attempt++) {
    const port = await getOpenPort()
    const proc = spawnHTTPServer(port)
    try {
      await waitForHTTPServer(proc)
      return { proc, port }
    } catch (err) {
      lastError = err
      proc.kill("SIGTERM")
      await waitForProcessExit(proc)
    }
  }

  throw lastError
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
      expect(result.result.capabilities.resources).toBeDefined()
      expect(result.result.capabilities.prompts).toBeDefined()
    } finally {
      freshProc.kill("SIGTERM")
    }
  })

  it("tools/list returns all registered tools", async () => {
    const result = await sendRequest(proc, "tools/list", {}, "list-1")

    expect(result.result).toBeDefined()
    const toolNames = result.result.tools.map((t: { name: string }) => t.name).sort()
    expect(toolNames).toEqual([
      "applyTheme",
      "auditAccessibility",
      "diagnoseConfig",
      "getSchema",
      "groundChart",
      "interrogateChart",
      "proposeChartVariants",
      "renderChart",
      "renderInteractiveChart",
      "repairChartConfig",
      "reportIssue",
      "suggestChart",
      "suggestCharts",
      "suggestDashboard",
      "suggestStreamCharts",
      "suggestStretchCharts",
    ])
  })

  it("resources/list exposes AI instruction resources", async () => {
    const result = await sendRequest(proc, "resources/list", {}, "resources-list")

    expect(result.result).toBeDefined()
    const uris = result.result.resources.map((r: { uri: string }) => r.uri).sort()
    expect(uris).toEqual([
      "semiotic://behavior-contracts",
      "semiotic://components",
      "semiotic://examples",
      "semiotic://schema",
      "semiotic://system-prompt",
      "ui://semiotic/chart-widget.html",
    ])
  })

  it("resources/read returns the component index", async () => {
    const result = await sendRequest(proc, "resources/read", {
      uri: "semiotic://components",
    }, "resources-read-components")

    expect(result.result).toBeDefined()
    const text = result.result.contents[0].text
    // Parse and assert the invariant `renderable + browserOnly === total`
    // rather than pinning exact counts — the resource shape is the contract,
    // not the specific component total (which drifts as charts are added).
    const componentIndex = JSON.parse(text)
    expect(componentIndex.totalComponents).toBeGreaterThan(0)
    expect(componentIndex.renderableComponents).toBeGreaterThan(0)
    expect(componentIndex.browserOnlyComponents).toBeGreaterThanOrEqual(0)
    expect(componentIndex.renderableComponents + componentIndex.browserOnlyComponents)
      .toBe(componentIndex.totalComponents)
    // Spot-check a representative component so regressions in category/
    // renderable wiring still fail visibly.
    expect(text).toContain('"name": "GaugeChart"')
    expect(text).toContain('"category": "ordinal"')
  })

  it("resources/read returns behavior contracts", async () => {
    const result = await sendRequest(proc, "resources/read", {
      uri: "semiotic://behavior-contracts",
    }, "resources-read-behavior-contracts")

    expect(result.result).toBeDefined()
    const parsed = JSON.parse(result.result.contents[0].text)
    const ids = parsed.contracts.map((contract: { id: string }) => contract.id)
    expect(ids).toContain("color.category-precedence")
    expect(ids).toContain("streaming.push-mode-data")
    expect(ids).toContain("props.required-combinations")
  })

  it("resources/read returns the ChatGPT Apps chart widget", async () => {
    const result = await sendRequest(proc, "resources/read", {
      uri: "ui://semiotic/chart-widget.html",
    }, "resources-read-chart-widget")

    expect(result.result).toBeDefined()
    const content = result.result.contents[0]
    expect(content.mimeType).toBe("text/html;profile=mcp-app")
    expect(content.text).toContain("ui/notifications/tool-result")
    expect(content.text).toContain("Rendered Semiotic chart")
    expect(content._meta.ui.prefersBorder).toBe(true)
    expect(content._meta.ui.csp.connectDomains).toEqual([])
    expect(content._meta["openai/widgetDescription"]).toContain("Semiotic chart")
  })

  it("prompts/list exposes chart build and debug workflows", async () => {
    const result = await sendRequest(proc, "prompts/list", {}, "prompts-list")

    expect(result.result).toBeDefined()
    const promptNames = result.result.prompts.map((p: { name: string }) => p.name).sort()
    expect(promptNames).toEqual([
      "build-semiotic-chart",
      "debug-semiotic-chart",
    ])
  })

  it("prompts/get returns an actionable chart workflow", async () => {
    const result = await sendRequest(proc, "prompts/get", {
      name: "build-semiotic-chart",
      arguments: {
        intent: "trend",
        dataDescription: "monthly revenue rows with month, revenue, and region fields",
      },
    }, "prompts-get-build")

    expect(result.result).toBeDefined()
    expect(result.result.messages[0].role).toBe("user")
    const text = result.result.messages[0].content.text
    expect(text).toContain("suggestChart")
    expect(text).toContain("getSchema")
    expect(text).toContain("renderChart")
    expect(text).toContain("semiotic://system-prompt")
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
    expect(text).toContain("CandlestickChart [renderable]")
    expect(text).toContain("GaugeChart [renderable]")
    expect(text).toContain("LikertChart [renderable]")
    expect(text).toContain("SwimlaneChart [renderable]")
    expect(text).toContain("semiotic://behavior-contracts")
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
    expect(text).toContain("Behavior contracts")
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
    expect(result.result.structuredContent.ok).toBe(true)
    expect(result.result.structuredContent.suggestions[0].component).toBe("BarChart")
  })

  it("suggestChart with empty data returns error", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "suggestChart",
      arguments: { data: [] },
    }, "suggest-err")

    expect(result.result.isError).toBe(true)
  })

  it("proposeChartVariants returns ranked variant proposals", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "proposeChartVariants",
      arguments: {
        component: "LineChart",
        data: [
          { month: 1, revenue: 10 },
          { month: 2, revenue: 15 },
          { month: 3, revenue: 12 },
          { month: 4, revenue: 20 },
          { month: 5, revenue: 24 },
        ],
        intent: "trend",
        maxResults: 4,
      },
    }, "variants-line")

    expect(result.result).toBeDefined()
    expect(result.result.isError).toBeFalsy()
    const text = result.result.content[0].text
    expect(text).toContain("variant proposal")
    expect(text).toContain("LineChart")
    const proposals = result.result.structuredContent.proposals
    expect(Array.isArray(proposals)).toBe(true)
    expect(proposals.length).toBeGreaterThan(0)
    expect(proposals[0].proposal.id).toMatch(/^LineChart:/)
    expect(proposals[0].score.fit).toBeGreaterThan(0)
    expect(proposals[0].props.data).toHaveLength(5)
  })

  it("suggestChart filters recommendations by capability constraint", async () => {
    // Numeric x/y → ranks Scatterplot first by default. Demanding
    // SSR support drops nothing (Scatterplot supports SSR). Demanding
    // a constraint no XY chart satisfies should drop them all and
    // surface the filteredOut list.
    const result = await sendRequest(proc, "tools/call", {
      name: "suggestChart",
      arguments: {
        data: [
          { x: 1, y: 10 },
          { x: 2, y: 20 },
          { x: 3, y: 15 },
        ],
        capabilities: { push: true, ssr: true },
      },
    }, "suggest-cap-1")

    expect(result.result.isError).toBeFalsy()
    const sc = result.result.structuredContent
    expect(sc.ok).toBe(true)
    // Scatterplot satisfies push + ssr — should be in the filtered set.
    expect(sc.suggestions.some((s: any) => s.component === "Scatterplot")).toBe(true)
    expect(sc.capabilities).toEqual({ push: true, ssr: true })
  })

  it("suggestChart rejects unknown capability keys at the MCP schema layer", async () => {
    // The zod schema is `.strict()`, so an unknown key causes the
    // MCP framework to return a JSON-RPC error rather than silently
    // strip the key (which would mask the cjs-level validation).
    const result = await sendRequest(proc, "tools/call", {
      name: "suggestChart",
      arguments: {
        data: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
        capabilities: { wibble: true },
      },
    }, "suggest-cap-strict")

    // Either a JSON-RPC error (zod rejected) OR a tool-level error
    // (cjs validator caught it). Both are valid fail-closed shapes;
    // the assertion only requires that the unknown key didn't get
    // silently dropped + processed as an empty constraint set.
    const errored = result.error != null || result.result?.isError === true
    expect(errored).toBe(true)
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

  it("renderChart appends a render-evidence block", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "renderChart",
      arguments: {
        component: "BarChart",
        props: {
          title: "Evidence Check",
          data: [
            { category: "A", value: 10 },
            { category: "B", value: 20 },
          ],
          categoryAccessor: "category",
          valueAccessor: "value",
          width: 300,
          height: 200,
          annotations: [{ type: "y-threshold", value: 15, label: "target" }],
        },
      },
    }, "render-evidence")

    expect(result.result.isError).toBeFalsy()
    const evidenceBlock = result.result.content.find((c: { text: string }) =>
      c.text.startsWith("Render evidence:\n")
    )
    expect(evidenceBlock).toBeDefined()
    const evidence = JSON.parse(evidenceBlock.text.replace(/^Render evidence:\n/, ""))
    expect(evidence.empty).toBe(false)
    expect(evidence.markCounts.rect).toBeGreaterThanOrEqual(2)
    expect(evidence.annotationCount).toBe(1)
    expect(evidence.accessibleName).toBe("Evidence Check")
    const allTicks = evidence.axes.flatMap((a: { tickLabels: string[] }) => a.tickLabels)
    expect(allTicks).toContain("A")
    expect(allTicks).toContain("B")
  })

  it("renderChart works for a newly repaired registry component", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "renderChart",
      arguments: {
        component: "GaugeChart",
        props: {
          value: 72,
          min: 0,
          max: 100,
          width: 240,
          height: 180,
          thresholds: [
            { value: 50, color: "#2ca02c", label: "ok" },
            { value: 80, color: "#f0ad4e", label: "warn" },
            { value: 100, color: "#d62728", label: "crit" },
          ],
        },
      },
    }, "render-gauge")

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

  it("renderInteractiveChart returns a ChatGPT Apps widget payload", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "renderInteractiveChart",
      arguments: {
        component: "BarChart",
        props: {
          title: "Revenue by Region",
          data: [
            { region: "North", revenue: 10 },
            { region: "South", revenue: 18 },
          ],
          categoryAccessor: "region",
          valueAccessor: "revenue",
          width: 320,
          height: 220,
        },
      },
    }, "render-app-chart")

    expect(result.result).toBeDefined()
    expect(result.result.isError).toBeFalsy()
    expect(result.result.content[0].text).toContain("interactive ChatGPT Apps widget")
    expect(result.result.structuredContent.component).toBe("BarChart")
    expect(result.result.structuredContent.title).toBe("Revenue by Region")
    expect(result.result.structuredContent.datumCount).toBe(2)
    expect(result.result.structuredContent.evidence).toBeTruthy()
    expect(result.result._meta.svg).toContain("<svg")
    expect(result.result._meta.props.data).toHaveLength(2)
  })

  it("renderInteractiveChart advertises its Apps SDK widget template", async () => {
    const result = await sendRequest(proc, "tools/list", {}, "list-app-render-shape")

    const tools = result.result.tools as Array<{ name: string; _meta?: Record<string, any>; annotations?: Record<string, unknown> }>
    const render = tools.find((t) => t.name === "renderInteractiveChart")!
    expect(render._meta?.ui).toEqual({ resourceUri: "ui://semiotic/chart-widget.html" })
    expect(render._meta?.["openai/outputTemplate"]).toBe("ui://semiotic/chart-widget.html")
    expect(render.annotations?.readOnlyHint).toBe(true)
    expect(render.annotations?.destructiveHint).toBe(false)
  })

  it("renderChart is strict about data: HOCs without a data prop fail to render", async () => {
    // Push-mode is a *guidance* concept (diagnoseConfig accepts usageMode='push'),
    // not a rendering concept. renderChart can never push data later — it produces
    // a single static SVG snapshot — so a HOC config that omits data must fail
    // here regardless of how an agent thinks about the chart's lifecycle.
    const result = await sendRequest(proc, "tools/call", {
      name: "renderChart",
      arguments: {
        component: "LineChart",
        props: { xAccessor: "x", yAccessor: "y" },
      },
    }, "render-strict-no-data")

    expect(result.result.isError).toBe(true)
    expect(result.result.content[0].text).toContain('"data" is required for LineChart')
  })

  it("renderChart does not advertise a usageMode parameter (only diagnoseConfig does)", async () => {
    // The split-contract design: diagnoseConfig is for guidance and accepts
    // usageMode; renderChart is for static snapshots and does not. Lock that
    // down by inspecting the advertised input schema so it can't drift.
    const result = await sendRequest(proc, "tools/list", {}, "list-render-shape")

    const tools = result.result.tools as Array<{ name: string; inputSchema?: { properties?: Record<string, unknown> } }>
    const render = tools.find((t) => t.name === "renderChart")!
    const diagnose = tools.find((t) => t.name === "diagnoseConfig")!
    expect(Object.keys(render.inputSchema?.properties ?? {})).not.toContain("usageMode")
    expect(Object.keys(diagnose.inputSchema?.properties ?? {})).toContain("usageMode")
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
    expect(text).toContain('"data" is required for LineChart')
  })

  it("diagnoseConfig usageMode=push allows omitted data for ref-based HOCs", async () => {
    const result = await sendRequest(proc, "tools/call", {
      name: "diagnoseConfig",
      arguments: {
        component: "LineChart",
        usageMode: "push",
        props: { xAccessor: "x", yAccessor: "y" },
      },
    }, "diag-push")

    expect(result.result).toBeDefined()
    expect(result.result.isError).toBeFalsy()
    const text = result.result.content[0].text
    expect(text).toContain("Usage mode: push")
    expect(text).not.toContain('"data" is required for LineChart')
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

describe("MCP HTTP transport smoke", () => {
  let proc: ChildProcess | undefined
  let port: number

  beforeEach(async () => {
    const server = await spawnReadyHTTPServer()
    proc = server.proc
    port = server.port
  })

  afterEach(() => {
    proc?.kill("SIGTERM")
    proc = undefined
  })

  it("initializes a Streamable HTTP session and lists tools", async () => {
    const init = await sendHTTPRPC(port, {
      jsonrpc: "2.0",
      id: "http-init",
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" },
      },
    })

    expect(init.response.status).toBe(200)
    expect(init.body.result.serverInfo.name).toBe("semiotic")

    const sessionId = init.response.headers.get("mcp-session-id")
    expect(sessionId).toMatch(/^semiotic-/)

    const initialized = await sendHTTPRPC(port, {
      jsonrpc: "2.0",
      method: "notifications/initialized",
    }, sessionId!)
    expect(initialized.response.status).toBe(202)

    const tools = await sendHTTPRPC(port, {
      jsonrpc: "2.0",
      id: "http-tools",
      method: "tools/list",
      params: {},
    }, sessionId!)

    expect(tools.response.status).toBe(200)
    const names = tools.body.result.tools.map((tool: { name: string }) => tool.name)
    expect(names).toContain("getSchema")
    expect(names).toContain("suggestChart")
    expect(names).toContain("renderChart")
  })
})
