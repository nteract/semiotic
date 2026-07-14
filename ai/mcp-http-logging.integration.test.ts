import { spawn, type ChildProcess } from "child_process"
import { existsSync } from "fs"
import * as http from "http"
import * as net from "net"
import * as path from "path"
import { describe, expect, it } from "vitest"

const SERVER_PATH = path.resolve(__dirname, "dist/mcp-server.js")
const REQUIRED_BUNDLES = [
  SERVER_PATH,
  path.resolve(__dirname, "../dist/semiotic-ai.min.js"),
  path.resolve(__dirname, "../dist/geo.min.js"),
  path.resolve(__dirname, "../dist/server.min.js"),
]
const SERVER_DEPS_READY = REQUIRED_BUNDLES.every(existsSync)

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

function spawnHTTPServer(port: number): ChildProcess {
  return spawn("node", [SERVER_PATH, "--http", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
    // The test exercises the default observable policy deterministically even
    // when a developer has configured a quieter local MCP process.
    env: { ...process.env, NODE_ENV: "test", MCP_LOG_LEVEL: "info" },
  })
}

function waitForLogEvent(
  proc: ChildProcess,
  event: string,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let buffer = ""
    const cleanup = () => {
      clearTimeout(timeout)
      proc.stderr!.off("data", onData)
      proc.off("exit", onExit)
    }
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        try {
          const record = JSON.parse(line) as Record<string, unknown>
          if (record.event === event) {
            cleanup()
            resolve(record)
            return
          }
        } catch {
          // Never include a nonconforming line in an assertion or error: this
          // suite's job is to prove the server's own process output is safe.
        }
      }
    }
    const onExit = (code: number | null) => {
      cleanup()
      reject(new Error(`MCP server exited with code ${code} before ${event}`))
    }
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error(`Timed out waiting for MCP log event ${event}`))
    }, 10_000)
    proc.stderr!.on("data", onData)
    proc.on("exit", onExit)
  })
}

function requestJson(
  port: number,
  pathName: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const text = JSON.stringify(body)
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: pathName,
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
        ...headers,
      },
    }, (res) => {
      let responseText = ""
      res.setEncoding("utf8")
      res.on("data", (chunk) => { responseText += chunk })
      res.on("end", () => {
        let responseBody: unknown
        try {
          responseBody = responseText ? JSON.parse(responseText) : undefined
        } catch {
          responseBody = responseText
        }
        resolve({ status: res.statusCode ?? 0, body: responseBody })
      })
    })
    req.on("error", reject)
    req.end(text)
  })
}

function stop(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (proc.exitCode !== null || proc.signalCode !== null) {
      resolve()
      return
    }
    const timeout = setTimeout(() => {
      try {
        proc.kill("SIGKILL")
      } catch {
        // The process may have ended while the timeout was queued.
      }
      resolve()
    }, 5_000)
    proc.once("exit", () => {
      clearTimeout(timeout)
      resolve()
    })
    proc.kill("SIGTERM")
  })
}

describe.skipIf(!SERVER_DEPS_READY)("MCP HTTP metadata-only logging", () => {
  it("renders a completed stateless tools/call request without cancelling it", async () => {
    const port = await getOpenPort()
    const proc = spawnHTTPServer(port)

    try {
      await waitForLogEvent(proc, "service_started")
      const rendered = await requestJson(port, "/mcp", {
        jsonrpc: "2.0",
        id: "render-completes",
        method: "tools/call",
        params: {
          name: "renderChart",
          arguments: {
            component: "BarChart",
            props: {
              data: [
                { category: "North", value: 8 },
                { category: "South", value: 13 },
              ],
              categoryAccessor: "category",
              valueAccessor: "value",
            },
          },
        },
      }, {
        "MCP-Protocol-Version": "2025-03-26",
      })

      const response = JSON.stringify(rendered.body)
      expect(rendered.status).toBe(200)
      expect(response).toContain("<svg")
      expect(response).toContain("Render evidence:")
      expect(response).not.toContain("MCP_RENDER_CANCELLED")
    } finally {
      await stop(proc)
    }
  })

  it("redacts a live rejected request and emits bounded completion metadata", async () => {
    const port = await getOpenPort()
    const proc = spawnHTTPServer(port)

    try {
      const startup = await waitForLogEvent(proc, "service_started")
      expect(startup).toMatchObject({
        schema: "semiotic-mcp-log/v1",
        severity: "INFO",
        metadata: { retentionDays: 30 },
      })

      const secret = "mcp-log-secret-must-not-escape"
      const rejectedLog = waitForLogEvent(proc, "request_rejected")
      const rejected = await requestJson(port, `/mcp?token=${secret}`, {
        jsonrpc: "2.0",
        id: secret,
        method: "initialize",
        params: { secret, nested: { chartData: [{ value: secret }] } },
      }, {
        Accept: "text/plain",
        Authorization: `Bearer ${secret}`,
        Cookie: `session=${secret}`,
        "X-Api-Key": secret,
        "MCP-Protocol-Version": secret,
      })
      const rejectedRecord = await rejectedLog

      expect(rejected.status).toBe(406)
      expect(JSON.stringify(rejectedRecord)).not.toContain(secret)
      expect(Buffer.byteLength(JSON.stringify(rejectedRecord), "utf8")).toBeLessThanOrEqual(1024)
      expect(rejectedRecord).toMatchObject({
        event: "request_rejected",
        severity: "WARN",
        metadata: {
          method: "POST",
          route: "/mcp",
          status: 406,
          reason: "unsupported_accept",
        },
      })
      expect(rejectedRecord.metadata).not.toHaveProperty("headers")
      expect(rejectedRecord.metadata).not.toHaveProperty("body")
      expect(rejectedRecord.metadata).not.toHaveProperty("payload")

      const completionLog = waitForLogEvent(proc, "request_completed")
      const completed = await requestJson(port, "/", {
        jsonrpc: "2.0",
        id: secret,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: secret, version: "1.0.0" },
        },
      })
      const completionRecord = await completionLog

      expect(completed.status).toBe(200)
      expect(JSON.stringify(completionRecord)).not.toContain(secret)
      expect(completionRecord).toMatchObject({
        event: "request_completed",
        severity: "INFO",
        metadata: {
          method: "POST",
          route: "/",
          status: 200,
          bodyBytes: expect.any(Number),
          durationMs: expect.any(Number),
        },
      })
    } finally {
      await stop(proc)
    }
  })
})
