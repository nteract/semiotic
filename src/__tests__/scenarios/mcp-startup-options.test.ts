import type { ChildProcess } from "node:child_process"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"
import {
  getOpenPort,
  waitForHTTPServer,
  waitForProcessExit
} from "./mcpHttpServerHarness"
import type { ListedMcpTool, JsonRpcResponse } from "./mcpProtocolTypes"

const publicTools = [
  "auditChart",
  "createChart",
  "explainChart",
  "getChartSchema",
  "improveChart"
]

describe("shipped MCP startup configuration", () => {
  let proc: ChildProcess | undefined
  afterEach(async () => {
    proc?.kill("SIGTERM")
    if (proc) await waitForProcessExit(proc)
    proc = undefined
  })

  it.each([
    {
      label: "equals CLI",
      args: ["--profile=public"],
      env: {},
      profile: "public"
    },
    {
      label: "separated CLI",
      args: ["--profile", "public"],
      env: {},
      profile: "public"
    },
    {
      label: "environment",
      args: [],
      env: { MCP_TOOL_PROFILE: "public" },
      profile: "public"
    },
    { label: "absent profile", args: [], env: {}, profile: "developer" },
    {
      label: "CLI precedence",
      args: ["--profile=public"],
      env: { MCP_TOOL_PROFILE: "typo" },
      profile: "public"
    },
    {
      label: "explicit developer",
      args: ["--profile=developer"],
      env: { MCP_TOOL_PROFILE: "public" },
      profile: "developer"
    }
  ])(
    "enumerates the resolved stdio surface for $label",
    async ({ args, env, profile }) => {
      proc = spawnServer(args, { MCP_TOOL_PROFILE: undefined, ...env })
      await initializeServer(proc)
      const listed = await sendRequest(proc, "tools/list")
      const names = (listed.result.tools as ListedMcpTool[])
        .map(({ name }) => name)
        .sort()
      if (profile === "public") expect(names).toEqual(publicTools)
      else expect(names).toContain("renderChart")
      const identity = await sendRequest(proc, "resources/read", {
        uri: "semiotic://build-info"
      })
      expect(JSON.parse(identity.result.contents[0].text).toolProfile).toBe(
        profile
      )
    }
  )

  it("honors equals-form HTTP port and profile and rejects developer-only dispatch", async () => {
    const port = await getOpenPort()
    proc = spawnServer(["--http", `--port=${port}`, "--profile=public"], {
      MCP_HOST: "127.0.0.1",
      MCP_ALLOWED_HOSTS: "",
      MCP_ALLOWED_ORIGINS: "",
      MCP_AUTH_TOKEN: ""
    })
    await waitForHTTPServer(proc)
    async function rpc(method: string, params = {}) {
      const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream"
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: method, method, params })
      })
      expect(response.status).toBe(200)
      return (await response.json()) as JsonRpcResponse
    }
    const tools = await rpc("tools/list")
    expect(
      (tools.result.tools as ListedMcpTool[]).map(({ name }) => name).sort()
    ).toEqual(publicTools)
    const resources = await rpc("resources/list")
    expect(resources.result.resources).toContainEqual(
      expect.objectContaining({ uri: "semiotic://build-info" })
    )
    const rejected = await rpc("tools/call", {
      name: "renderChart",
      arguments: { component: "BarChart", props: {} }
    })
    expect(rejected.error ?? rejected.result.isError).toBeTruthy()
  })

  for (const mode of ["stdio", "http"] as const) {
    it.each([
      {
        label: "invalid CLI profile",
        args: ["--profile=private-value"],
        env: {}
      },
      { label: "missing CLI value", args: ["--profile"], env: {} },
      {
        label: "invalid environment profile",
        args: [],
        env: { MCP_TOOL_PROFILE: "private-value" }
      },
      { label: "mistyped option", args: ["--profiles=public"], env: {} },
      { label: "invalid port", args: ["--port=4000oops"], env: {} }
    ])(`fails closed in ${mode} for $label`, async ({ args, env }) => {
      proc = spawnServer([...(mode === "http" ? ["--http"] : []), ...args], {
        MCP_TOOL_PROFILE: undefined,
        ...env
      })
      let stdout = ""
      let stderr = ""
      proc.stdout!.on("data", (chunk: Buffer) => {
        stdout += chunk.toString()
      })
      proc.stderr!.on("data", (chunk: Buffer) => {
        stderr += chunk.toString()
      })
      await vi.waitFor(() => expect(proc!.exitCode).toBe(1), { timeout: 4000 })
      expect(stdout).toBe("")
      expect(stderr).toContain('"event":"service_fatal"')
      expect(stderr).not.toContain("private-value")
      expect(stderr).not.toContain('"event":"service_started"')
    })
  }
})
