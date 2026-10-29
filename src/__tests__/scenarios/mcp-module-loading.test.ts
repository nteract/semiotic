import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"
import { spawnReadyHTTPServer, waitForProcessExit } from "./mcpHttpServerHarness"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

const observer = path.resolve(
  __dirname,
  "../../../ai/__fixtures__/mcp-module-load-trace.cjs"
)
const props = {
  data: [{ category: "A", value: 2 }],
  categoryAccessor: "category",
  valueAccessor: "value"
}

describe("MCP optional rendering dependencies", () => {
  it.each([
    ["developer", "stdio"],
    ["public", "http"]
  ] as const)(
    "keeps slow DOM loading within the whole deadline, outside SVG work, for %s over %s",
    async (profile, transport) => {
      const directory = mkdtempSync(path.join(tmpdir(), "mcp-cold-dom-"))
      const trace = path.join(directory, "jsdom-pids")
      writeFileSync(trace, "")
      const env = {
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require ${JSON.stringify(observer)}`,
        SEMIOTIC_TEST_MODULE_TRACE: trace,
        // Exceeds the unchanged default 3-second SVG processing ceiling.
        SEMIOTIC_TEST_DOM_LOAD_DELAY_MS: "3100"
      }
      const args = ["--profile", profile]
      const http = transport === "http" ? await spawnReadyHTTPServer(env, args) : null
      const server = http?.proc ?? spawnServer(args, env)
      const client = new Client({ name: "cold-dom-startup", version: "1.0" })
      try {
        const request = {
          name: profile === "public" ? "createChart" : "renderInteractiveChart",
          arguments: { component: "BarChart", props, data: props.data }
        }
        let result
        if (http) {
          await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${http.port}/mcp`)))
          result = await client.callTool(request)
        } else {
          await initializeServer(server)
          result = (await sendRequest(server, "tools/call", request)).result
        }
        expect(result.isError, JSON.stringify(result.structuredContent?.code)).not.toBe(true)
        expect(result._meta?.svg).toContain("data-semiotic-widget-svg")
        const loadedBy = readFileSync(trace, "utf8").trim().split("\n").map(Number)
        expect(loadedBy.length).toBeGreaterThan(0)
        expect(loadedBy.every((pid) => pid > 0 && pid !== server.pid)).toBe(true)
      } finally {
        await client.close()
        server.kill("SIGTERM")
        await waitForProcessExit(server)
        rmSync(directory, { recursive: true, force: true })
      }
    },
    20_000
  )

  it.each([
    ["DOM loading", { SEMIOTIC_TEST_DOM_LOAD_DELAY_MS: "3100", MCP_MAX_OPERATION_MS: "2500" }, "Tool operation"],
    ["SVG parsing", { SEMIOTIC_TEST_DOM_PARSE_DELAY_MS: "3100" }, "interactive SVG sanitization"]
  ] as const)(
    "still terminates slow %s under its execution deadline",
    async (_label, overrides, stage) => {
      const directory = mkdtempSync(path.join(tmpdir(), "mcp-dom-deadline-"))
      const trace = path.join(directory, "jsdom-pids")
      writeFileSync(trace, "")
      const server = spawnServer(["--profile", "public"], {
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require ${JSON.stringify(observer)}`,
        SEMIOTIC_TEST_MODULE_TRACE: trace,
        ...overrides
      })
      try {
        await initializeServer(server)
        const { result } = await sendRequest(server, "tools/call", {
          name: "createChart",
          arguments: { component: "BarChart", data: props.data, props }
        })
        expect(result).toMatchObject({
          isError: true,
          structuredContent: { code: "MCP_RENDER_TIMEOUT" }
        })
        expect(result.content[0].text).toContain(`${stage} exceeded`)
        expect(result._meta?.svg).toBeUndefined()
      } finally {
        server.kill("SIGTERM")
        await waitForProcessExit(server)
        rmSync(directory, { recursive: true, force: true })
      }
    },
    15_000
  )

  it.each(["developer", "public"])(
    "loads the DOM only in the %s widget operation, never in the protocol process",
    async (profile) => {
      const directory = mkdtempSync(path.join(tmpdir(), "mcp-module-loading-"))
      const trace = path.join(directory, "jsdom-pids")
      writeFileSync(trace, "")
      const server = spawnServer(["--profile", profile], {
        NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require ${JSON.stringify(observer)}`,
        SEMIOTIC_TEST_MODULE_TRACE: trace
      })
      try {
        await initializeServer(server)
        const schema = await sendRequest(server, "tools/call", {
          name: profile === "public" ? "getChartSchema" : "getSchema",
          arguments: { component: "BarChart" }
        })
        expect(schema.result.isError).not.toBe(true)
        expect(schema.result.content[0].text).toContain("BarChart")
        if (profile === "developer") {
          const rendered = await sendRequest(server, "tools/call", {
            name: "renderChart",
            arguments: { component: "BarChart", props }
          })
          expect(rendered.result.isError).not.toBe(true)
          expect(rendered.result.content[0].text).toContain("<svg")
        }
        expect(readFileSync(trace, "utf8")).toBe("")

        const widget = await sendRequest(server, "tools/call", {
          name: profile === "public" ? "createChart" : "renderInteractiveChart",
          arguments: { component: "BarChart", props, data: props.data }
        })
        expect(widget.result.isError).not.toBe(true)
        expect(widget.result._meta?.svg).toContain("<svg")
        const loadedBy = readFileSync(trace, "utf8")
          .trim()
          .split("\n")
          .map(Number)
        expect(loadedBy.length).toBeGreaterThan(0)
        expect(loadedBy.every((pid) => pid > 0 && pid !== server.pid)).toBe(
          true
        )
      } finally {
        server.kill("SIGTERM")
        await waitForProcessExit(server)
        rmSync(directory, { recursive: true, force: true })
      }
    },
    20_000
  )
})
