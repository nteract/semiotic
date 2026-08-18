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
const MCP_PROCESS_TEST_TIMEOUT_MS = 15_000

// The default profile would choose recordIndex as x because it is a monotonic
// numeric field. These hints make the intended x/y/category assignment
// explicit, and each protocol route must preserve them.
const PROFILE_HINT_ROWS = Array.from({ length: 6 }, (_, index) => ({
  recordIndex: 100 + index,
  period: index + 1,
  revenue: 20 + index * 5,
  segment: index % 2 ? "B" : "A",
}))

const PROFILE_HINTS = {
  identifiers: ["recordIndex"],
  fieldRoles: {
    period: "x",
    revenue: "y",
    segment: "category",
  },
} as const

function spawnServer(profile?: "public"): ChildProcess {
  return spawn("node", [SERVER_PATH, ...(profile ? ["--profile", profile] : [])], {
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
          // Ignore non-JSON logs emitted by the child process.
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
    }, 10_000)
    proc.stdout!.on("data", onData)
    proc.on("exit", onExit)
    proc.stdin!.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`)
  })
}

async function initializeServer(proc: ChildProcess, id: string) {
  const result = await sendRequest(proc, "initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "semiotic-profile-hints-test", version: "1.0.0" },
  }, id)
  proc.stdin!.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`)
  return result
}

function expectHintedProfile(profile: Datum) {
  expect(profile).toMatchObject({
    identifiers: ["recordIndex"],
    primary: { x: "period", y: "revenue", category: "segment" },
  })
}

function expectHintedLineProps(entries: Datum[]) {
  expect(entries.length).toBeGreaterThan(0)
  expect(entries).toEqual(expect.arrayContaining([
    expect.objectContaining({
      props: expect.objectContaining({ xAccessor: "period", yAccessor: "revenue" }),
    }),
  ]))
}

describe.skipIf(!SERVER_DEPS_READY)("MCP profile hint forwarding", () => {
  it("preserves profile hints through recommendation, repair, and variant tools", async () => {
    const proc = spawnServer()
    try {
      await initializeServer(proc, "profile-hints-internal-initialize")

      const dashboard = await sendRequest(proc, "tools/call", {
        name: "suggestDashboard",
        arguments: {
          data: PROFILE_HINT_ROWS,
          intents: ["trend"],
          maxPanels: 1,
          ...PROFILE_HINTS,
        },
      }, "profile-hints-dashboard")
      expect(dashboard.result.isError).toBeFalsy()
      expectHintedProfile(dashboard.result.structuredContent.profile)

      const stretch = await sendRequest(proc, "tools/call", {
        name: "suggestStretchCharts",
        arguments: {
          data: PROFILE_HINT_ROWS,
          intent: "trend",
          maxResults: 20,
          audience: {
            exposureLevel: 2,
            familiarity: { LineChart: 1 },
            targets: { LineChart: { direction: "increase" } },
          },
          ...PROFILE_HINTS,
        },
      }, "profile-hints-stretch")
      expect(stretch.result.isError).toBeFalsy()
      expectHintedLineProps(stretch.result.structuredContent.stretches
        .filter((entry: Datum) => entry.suggestion.component === "LineChart")
        .map((entry: Datum) => entry.suggestion))

      const repair = await sendRequest(proc, "tools/call", {
        name: "repairChartConfig",
        arguments: {
          component: "LineChart",
          data: PROFILE_HINT_ROWS,
          intent: "trend",
          ...PROFILE_HINTS,
        },
      }, "profile-hints-repair")
      expect(repair.result.isError).toBeFalsy()
      expect(repair.result.structuredContent.status).toBe("ok")
      expectHintedProfile(repair.result.structuredContent.profile)

      const variants = await sendRequest(proc, "tools/call", {
        name: "proposeChartVariants",
        arguments: {
          component: "LineChart",
          data: PROFILE_HINT_ROWS,
          intent: "trend",
          maxResults: 20,
          ...PROFILE_HINTS,
        },
      }, "profile-hints-variants")
      expect(variants.result.isError).toBeFalsy()
      expectHintedLineProps(variants.result.structuredContent.proposals
        .filter((entry: Datum) => entry.proposal.baseComponent === "LineChart"))
    } finally {
      proc.kill()
    }
  }, MCP_PROCESS_TEST_TIMEOUT_MS)

  it("preserves profile hints through public create and improve tools", async () => {
    const proc = spawnServer("public")
    try {
      await initializeServer(proc, "profile-hints-public-initialize")

      const created = await sendRequest(proc, "tools/call", {
        name: "createChart",
        arguments: {
          component: "LineChart",
          data: PROFILE_HINT_ROWS,
          intent: "trend",
          ...PROFILE_HINTS,
        },
      }, "profile-hints-create")
      expect(created.result.isError).not.toBe(true)
      expect(created.result.structuredContent).toMatchObject({
        status: "render-proven",
        component: "LineChart",
        suggestion: {
          props: { xAccessor: "period", yAccessor: "revenue" },
        },
      })

      const improved = await sendRequest(proc, "tools/call", {
        name: "improveChart",
        arguments: {
          component: "LineChart",
          props: {
            data: PROFILE_HINT_ROWS,
            xAccessor: "period",
            yAccessor: "revenue",
          },
          data: PROFILE_HINT_ROWS,
          intent: "trend",
          ...PROFILE_HINTS,
        },
      }, "profile-hints-improve")
      expect(improved.result.isError).not.toBe(true)
      expect(improved.result.structuredContent.repair.status).toBe("ok")
      expectHintedProfile(improved.result.structuredContent.repair.profile)
      expectHintedLineProps(improved.result.structuredContent.variants
        .filter((entry: Datum) => entry.proposal.baseComponent === "LineChart"))
    } finally {
      proc.kill()
    }
  }, MCP_PROCESS_TEST_TIMEOUT_MS)
})
