import type { ChildProcess } from "node:child_process"
import { setTimeout as delay } from "node:timers/promises"
import {
  spawnReadyHTTPServer,
  waitForProcessExit
} from "./mcpHttpServerHarness"
import { initializeServer, sendRequest, spawnServer } from "./mcpStdioHarness"

const slowChart = {
  component: "ForceDirectedGraph",
  props: {
    nodes: Array.from({ length: 80 }, (_, id) => ({ id: String(id) })),
    edges: Array.from({ length: 79 }, (_, id) => ({
      source: String(id),
      target: String(id + 1)
    })),
    iterations: 1_000_000,
    width: 300,
    height: 200
  }
}

describe("shipped MCP execution boundaries", () => {
  let proc: ChildProcess | undefined
  let port: number
  afterEach(async () => {
    proc?.kill("SIGTERM")
    if (proc) await waitForProcessExit(proc)
    proc = undefined
  })

  async function startHTTP(env: NodeJS.ProcessEnv = {}, args: string[] = []) {
    const server = await spawnReadyHTTPServer(env, args)
    proc = server.proc
    port = server.port
  }

  async function call(
    name: string,
    args: Record<string, unknown>,
    signal?: AbortSignal
  ) {
    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args }
      })
    })
    return { status: response.status, body: await response.json() }
  }

  it("interrupts a real layout, serves health probes during execution, and recovers", async () => {
    await startHTTP({
      MCP_MAX_RENDER_WORK_MS: "200",
      MCP_MAX_OPERATION_MS: "3000"
    })
    const started = performance.now()
    let complete = false
    const render = call("renderChart", slowChart).finally(() => {
      complete = true
    })
    let probes = 0
    while (!complete) {
      const health = await fetch(`http://127.0.0.1:${port}/health`, {
        signal: AbortSignal.timeout(1000)
      })
      expect(health.status).toBe(200)
      await health.text()
      probes++
      await delay(30)
    }
    const result = await render
    expect(result.status).toBe(200)
    expect(result.body.result).toMatchObject({
      isError: true,
      structuredContent: { code: "MCP_RENDER_TIMEOUT" }
    })
    expect(performance.now() - started).toBeLessThan(4000)
    expect(probes).toBeGreaterThan(2)
    const recovered = await call("renderChart", {
      component: "BarChart",
      props: { data: [{ category: "A", value: 2 }] }
    })
    expect(recovered.body.result.isError).not.toBe(true)
    expect(
      recovered.body.result.content.some((item: { text?: string }) =>
        item.text?.startsWith("Render evidence:")
      )
    ).toBe(true)
  }, 10000)

  it("releases execution capacity when an HTTP client disconnects", async () => {
    await startHTTP({
      MCP_MAX_CONCURRENT_OPERATIONS: "1",
      MCP_MAX_RENDER_WORK_MS: "10000",
      MCP_MAX_OPERATION_MS: "15000"
    })
    const controller = new AbortController()
    const render = call("renderChart", slowChart, controller.signal).catch(
      (error) => error
    )
    await delay(400)
    controller.abort()
    await render
    // Capacity is released on child exit, not when abort() returns locally.
    // Require recovery well before the original 10-second render deadline.
    const recoveryDeadline = performance.now() + 2000
    for (;;) {
      const recovered = await call("getSchema", { component: "BarChart" })
      if (
        recovered.body.result.structuredContent?.code !== "MCP_OPERATION_BUSY"
      ) {
        expect(recovered.body.result.isError).not.toBe(true)
        expect(recovered.body.result.content[0].text).toContain("BarChart")
        break
      }
      expect(performance.now()).toBeLessThan(recoveryDeadline)
      await delay(25)
    }
  }, 10000)

  it("applies the same whole-operation deadline to public createChart", async () => {
    await startHTTP({ MCP_MAX_OPERATION_MS: "1" }, ["--profile", "public"])
    const result = await call("createChart", {
      data: [{ category: "A", value: 2 }],
      component: "BarChart"
    })
    expect(result.body.result).toMatchObject({
      isError: true,
      structuredContent: { code: "MCP_RENDER_TIMEOUT" }
    })
  })

  it("bounds PNG allocation before rasterization", async () => {
    await startHTTP({ MCP_MAX_RASTER_PIXELS: "1" })
    const result = await call("renderChart", {
      component: "BarChart",
      format: "png",
      props: { data: [{ category: "A", value: 2 }], width: 300, height: 200 }
    })
    expect(result.body.result).toMatchObject({ isError: true })
    expect(result.body.result.content[0].text).toContain("pixel limit")
  }, 10000)

  it("returns normal PNG output from the isolated process", async () => {
    await startHTTP()
    const result = await call("renderChart", {
      component: "BarChart",
      format: "png",
      props: { data: [{ category: "A", value: 2 }], width: 300, height: 200 }
    })
    expect(result.body.result.isError).not.toBe(true)
    const image = result.body.result.content[0]
    expect(image).toMatchObject({ type: "image", mimeType: "image/png" })
    expect(Buffer.from(image.data, "base64").subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
  }, 10000)

  it("cancels stdio tool execution while keeping the protocol available", async () => {
    proc = spawnServer([], {
      MCP_MAX_CONCURRENT_OPERATIONS: "1",
      MCP_MAX_RENDER_WORK_MS: "10000",
      MCP_MAX_OPERATION_MS: "15000"
    })
    await initializeServer(proc)
    proc.stdin!.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "cancel-me",
        method: "tools/call",
        params: { name: "renderChart", arguments: slowChart }
      }) + "\n"
    )
    await delay(400)
    const listed = await sendRequest(proc, "tools/list", {}, "during-render")
    expect(listed.result.tools.length).toBeGreaterThan(0)
    proc.stdin!.write(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/cancelled",
        params: { requestId: "cancel-me", reason: "test cancellation" }
      }) + "\n"
    )
    await delay(50)
    const recovered = await sendRequest(
      proc,
      "tools/call",
      { name: "getSchema", arguments: { component: "BarChart" } },
      "after-cancel"
    )
    expect(recovered.result.isError).not.toBe(true)
    expect(recovered.result.content[0].text).toContain("BarChart")
  }, 10000)

  it("rejects oversized stdio lines before parsing and accepts the next request", async () => {
    proc = spawnServer([], { MCP_MAX_BODY_BYTES: "512" })
    await initializeServer(proc)
    const output: string[] = []
    const collect = (chunk: Buffer) => output.push(chunk.toString())
    proc.stdout!.on("data", collect)
    proc.stdin!.write(
      JSON.stringify({
        jsonrpc: "2.0",
        id: "oversized",
        method: "tools/call",
        params: { name: "getSchema", arguments: { extra: "x".repeat(2048) } }
      }) + "\n"
    )
    const valid = await sendRequest(proc, "tools/list", {}, "after-oversized")
    proc.stdout!.off("data", collect)
    expect(valid.result.tools.length).toBeGreaterThan(0)
    const messages = output
      .join("")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line))
    expect(messages).toContainEqual({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32600,
        message: expect.stringContaining("MCP_MAX_BODY_BYTES")
      }
    })
  }, 10000)

  it.each([
    ["MCP_MAX_ROWS", { rows: [1, 2, 3] }],
    ["MCP_MAX_CELLS", { a: 1, b: 2, c: 3 }],
    ["MCP_MAX_NESTING_DEPTH", { a: { b: { c: {} } } }]
  ] as const)(
    "enforces %s before stdio tool schema parsing",
    async (limit, args) => {
      proc = spawnServer([], { [limit]: "2" })
      await initializeServer(proc)
      const result = await sendRequest(
        proc,
        "tools/call",
        { name: "getSchema", arguments: args },
        "over-limit"
      )
      expect(result.error).toMatchObject({
        code: -32602,
        message: expect.stringContaining(limit)
      })
      const valid = await sendRequest(
        proc,
        "tools/call",
        { name: "getSchema", arguments: { component: "BarChart" } },
        "valid"
      )
      expect(valid.result.isError).not.toBe(true)
    },
    10000
  )
})
