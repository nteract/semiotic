import type { ChildProcess } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"
import {
  spawnReadyHTTPServer,
  waitForProcessExit
} from "./mcpHttpServerHarness"
import type { JsonRpcResponse } from "./mcpProtocolTypes"

const observer = path.resolve(
  __dirname,
  "../../../ai/__fixtures__/mcp-ipc-size-trace.cjs"
)

describe("shipped MCP complete response limits", () => {
  let proc: ChildProcess | undefined
  let directory: string | undefined
  afterEach(async () => {
    proc?.kill("SIGTERM")
    if (proc) await waitForProcessExit(proc)
    if (directory) rmSync(directory, { recursive: true, force: true })
    proc = undefined
    directory = undefined
  })

  for (const mode of ["stdio", "http"] as const) {
    it.each(["developer", "public"])(
      `bounds a non-render %s tool on ${mode} and retains protocol access`,
      async (profile) => {
        const env = { MCP_MAX_TOOL_OUTPUT_BYTES: "1024" }
        let rpc: (
          method: string,
          params?: Record<string, unknown>
        ) => Promise<JsonRpcResponse>
        if (mode === "stdio") {
          proc = spawnServer([`--profile=${profile}`], env)
          await initializeServer(proc)
          rpc = (method, params = {}) => sendRequest(proc!, method, params)
        } else {
          const started = await spawnReadyHTTPServer(env, [
            `--profile=${profile}`
          ])
          proc = started.proc
          rpc = async (method, params = {}) => {
            const response = await fetch(
              `http://127.0.0.1:${started.port}/mcp`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json, text/event-stream"
                },
                body: JSON.stringify({
                  jsonrpc: "2.0",
                  id: method,
                  method,
                  params
                })
              }
            )
            expect(response.status).toBe(200)
            return (await response.json()) as JsonRpcResponse
          }
        }
        const response = await rpc("tools/call", {
          name: profile === "public" ? "getChartSchema" : "getSchema",
          arguments: { component: "BarChart" }
        })
        expect(response.result).toMatchObject({
          isError: true,
          structuredContent: {
            code: "OUTPUT_LIMIT_EXCEEDED",
            maximumBytes: 1024
          }
        })
        expect(Buffer.byteLength(JSON.stringify(response.result))).toBeLessThan(
          1024
        )
        expect(response.result.structuredContent.observedBytes).toBeGreaterThan(
          1024
        )
        // These errors come from SDK dispatch, before any isolated handler.
        const dispatchError = await rpc("tools/call", {
          name: "private-value".repeat(1000),
          arguments: {}
        })
        expect(dispatchError.result).toMatchObject({
          isError: true,
          structuredContent: { code: "OUTPUT_LIMIT_EXCEEDED" }
        })
        expect(JSON.stringify(dispatchError)).not.toContain("private-value")
        const tools = await rpc("tools/list")
        expect(tools.result.tools.length).toBe(profile === "public" ? 5 : 24)
      }
    )
  }

  it("stops recommendation amplification before IPC and preserves complete small configurations", async () => {
    directory = mkdtempSync(path.join(tmpdir(), "mcp-ipc-size-"))
    const trace = path.join(directory, "sizes.jsonl")
    writeFileSync(trace, "")
    proc = spawnServer(["--profile=developer"], {
      MCP_MAX_TOOL_OUTPUT_BYTES: undefined,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require ${JSON.stringify(observer)}`,
      SEMIOTIC_TEST_IPC_TRACE: trace
    })
    await initializeServer(proc)
    const data = Array.from({ length: 5000 }, (_, i) => ({
      category: `Region ${i % 10}`,
      value: i,
      segment: `Group ${i % 3}`
    }))
    const response = await sendRequest(proc, "tools/call", {
      name: "suggestCharts",
      arguments: { data }
    })
    expect(response.result).toMatchObject({
      isError: true,
      structuredContent: {
        code: "OUTPUT_LIMIT_EXCEEDED",
        maximumBytes: 2 * 1024 * 1024
      }
    })
    expect(JSON.stringify(response.result)).not.toContain("Region")
    const smallData = data.slice(0, 3)
    const recovered = await sendRequest(proc, "tools/call", {
      name: "suggestCharts",
      arguments: { data: smallData }
    })
    expect(recovered.result.isError).not.toBe(true)
    expect(
      recovered.result.structuredContent.suggestions.length
    ).toBeGreaterThan(0)
    expect(
      recovered.result.structuredContent.suggestions[0].props.data
    ).toEqual(smallData)
    const sent = readFileSync(trace, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { pid: number; bytes: number })
    expect(sent).toHaveLength(2)
    expect(
      sent.every(
        ({ pid, bytes }) => pid !== proc!.pid && bytes <= 2 * 1024 * 1024
      )
    ).toBe(true)
  }, 15000)
})
