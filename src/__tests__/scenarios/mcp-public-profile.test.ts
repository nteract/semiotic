import type { Datum } from "../../components/charts/shared/datumTypes"
import type { JsonRpcResponse } from "./mcpProtocolTypes"
import { spawn, type ChildProcess } from "child_process"
import { existsSync } from "fs"
import * as path from "path"

const SERVER_PATH = path.resolve(__dirname, "../../../ai/dist/mcp-server.js")
const REQUIRED_BUNDLES = [
  SERVER_PATH,
  path.resolve(__dirname, "../../../dist/semiotic-ai.min.js"),
  path.resolve(__dirname, "../../../dist/geo.min.js"),
  path.resolve(__dirname, "../../../dist/server.min.js"),
]
const SERVER_DEPS_READY = REQUIRED_BUNDLES.every(existsSync)

function spawnPublicServer(): ChildProcess {
  return spawn("node", [SERVER_PATH, "--profile", "public"], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "test",
      SEMIOTIC_DEPLOYMENT_CHANNEL: "",
      SEMIOTIC_GIT_SHA: "",
      SEMIOTIC_BUILD_ID: "",
      SEMIOTIC_BUILD_TIME: "",
    },
  })
}

function sendRequest(
  proc: ChildProcess,
  method: string,
  params: Datum = {},
  id: string | number = 1,
): Promise<JsonRpcResponse> {
  return new Promise((resolve, reject) => {
    let buffer = ""
    const cleanup = () => {
      clearTimeout(timeout)
      proc.stdout!.off("data", onData)
      proc.off("exit", onExit)
    }
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split("\n")
      for (let index = 0; index < lines.length - 1; index++) {
        const line = lines[index].trim()
        if (!line) continue
        try {
          const message = JSON.parse(line)
          if (message.id === id) {
            cleanup()
            resolve(message)
          }
        } catch {
          // Ignore log output from the child process.
        }
      }
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
    proc.stdin!.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`)
  })
}

async function initializePublicServer(proc: ChildProcess, name: string, id: string) {
  return sendRequest(proc, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name, version: "1.0.0" },
  }, id)
}

describe.skipIf(!SERVER_DEPS_READY)("MCP public tool profile", () => {
  it("exposes the five task-oriented public tools", async () => {
    const publicProc = spawnPublicServer()
    try {
      await initializePublicServer(publicProc, "semiotic-public-profile-test", "public-profile-initialize")
      const result = await sendRequest(publicProc, "tools/list", {}, "public-profile-tools")
      expect(result.result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual([
        "auditChart", "createChart", "explainChart", "getChartSchema", "improveChart",
      ])
    } finally {
      publicProc.kill()
    }
  })

  it("returns schema-shaped structured content for every getChartSchema outcome", async () => {
    const publicProc = spawnPublicServer()
    try {
      await initializePublicServer(publicProc, "semiotic-public-schema-test", "public-schema-initialize")
      const list = await sendRequest(publicProc, "tools/call", { name: "getChartSchema", arguments: {} }, "public-schema-list")
      expect(list.result.isError).not.toBe(true)
      expect(list.result.structuredContent).toMatchObject({
        status: "component-list", surfaceVersion: expect.any(String),
        availableComponents: expect.arrayContaining([expect.objectContaining({ name: "BarChart", renderable: true })]),
      })
      const component = await sendRequest(publicProc, "tools/call", { name: "getChartSchema", arguments: { component: "BarChart" } }, "public-schema-component")
      expect(component.result.isError).not.toBe(true)
      expect(component.result.structuredContent).toMatchObject({
        status: "component-schema", component: "BarChart", renderable: true, surfaceVersion: expect.any(String),
        accessibility: {
          directProps: expect.objectContaining({ title: expect.any(Object), description: expect.any(Object), summary: expect.any(Object), accessibleTable: expect.any(Object) }),
          chartContainer: expect.objectContaining({ component: "ChartContainer", describeProp: "describe", navigableProp: "navigable" }),
        },
      })
      const unknown = await sendRequest(publicProc, "tools/call", { name: "getChartSchema", arguments: { component: "UnknownChart" } }, "public-schema-unknown")
      expect(unknown.result.isError).toBe(true)
      expect(unknown.result.structuredContent).toMatchObject({
        status: "unknown-component", component: "UnknownChart", surfaceVersion: expect.any(String), availableComponents: expect.any(Array),
      })
    } finally {
      publicProc.kill()
    }
  })

  it("keeps improveChart repairs schema-valid and returns accessibility prose separately", async () => {
    const publicProc = spawnPublicServer()
    try {
      await initializePublicServer(publicProc, "semiotic-public-improve-test", "public-improve-initialize")
      const result = await sendRequest(publicProc, "tools/call", {
        name: "improveChart",
        arguments: {
          component: "BarChart",
          props: {
            data: [{ quarter: "Q1", revenue: 12 }, { quarter: "Q2", revenue: 18 }, { quarter: "Q3", revenue: 15 }, { quarter: "Q4", revenue: 24 }],
            categoryAccessor: "quarter", valueAccessor: "revenue",
          },
          intent: "compare quarterly revenue and clearly communicate that Q4 is highest",
        },
      }, "public-improve-chart")
      expect(result.result.isError).not.toBe(true)
      expect(result.result.structuredContent.repair).not.toHaveProperty("summary")
      expect(result.result.structuredContent.repair).not.toHaveProperty("description")
      expect(result.result.structuredContent.accessibilityRecommendation).toMatchObject({
        location: "direct-component-props",
        props: { description: "BarChart comparing revenue by quarter.", summary: "Q4 is highest at 24. Use arrow keys to move between chart marks." },
      })
    } finally {
      publicProc.kill()
    }
  })

  it("creates only renderable charts without echoing bulk data", async () => {
    const publicProc = spawnPublicServer()
    try {
      await initializePublicServer(publicProc, "semiotic-public-create-test", "public-create-initialize")
      const rows = [{ category: "A", value: 2 }, { category: "B", value: 3 }]
      const created = await sendRequest(publicProc, "tools/call", { name: "createChart", arguments: { data: rows, intent: "compare-categories" } }, "public-create-chart")
      expect(created.result.isError).not.toBe(true)
      expect(created.result.structuredContent).toMatchObject({ status: "render-proven", dataRowCount: 2 })
      expect(created.result.structuredContent.props.data).toBeUndefined()
      expect(created.result.structuredContent.suggestion.props.data).toBeUndefined()
      const trendRows = [{ time: 1, value: 2 }, { time: 2, value: 4 }, { time: 3, value: 3 }]
      const browserOnly = await sendRequest(publicProc, "tools/call", { name: "createChart", arguments: { data: trendRows, intent: "trend", component: "BigNumber" } }, "public-create-browser-only")
      expect(browserOnly.result.isError).toBe(true)
      expect(browserOnly.result.structuredContent.status).toBe("no-suggestion")
      expect(browserOnly.result.structuredContent.suggestions).not.toContainEqual(expect.objectContaining({ component: "BigNumber" }))
      expect(browserOnly.result.structuredContent.suggestions.every((suggestion: { props: Record<string, unknown> }) => suggestion.props.data === undefined)).toBe(true)
    } finally {
      publicProc.kill()
    }
  })
})
