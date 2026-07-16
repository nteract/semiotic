/** Focused HTTP health-route coverage, separate from the broad MCP protocol suite. */
import { spawn, type ChildProcess } from "child_process"
import { existsSync } from "fs"
import * as http from "http"
import * as net from "net"
import * as path from "path"
import { afterEach, describe, expect, it } from "vitest"

const SERVER_PATH = path.resolve(__dirname, "../../../ai/dist/mcp-server.js")
const REQUIRED_BUNDLES = [
  SERVER_PATH,
  path.resolve(__dirname, "../../../dist/semiotic-ai.min.js"),
  path.resolve(__dirname, "../../../dist/geo.min.js"),
  path.resolve(__dirname, "../../../dist/server.min.js"),
]
const SERVER_DEPS_READY = REQUIRED_BUNDLES.every(existsSync)

function openPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      server.close(() => {
        if (!address || typeof address === "string") reject(new Error("Could not determine an open HTTP port"))
        else resolve(address.port)
      })
    })
  })
}

function waitForStart(proc: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    let stderr = ""
    const cleanup = () => {
      clearTimeout(timeout)
      proc.stderr?.off("data", onData)
      proc.off("exit", onExit)
    }
    const onData = (chunk: Buffer) => {
      stderr += chunk.toString()
      if (stderr.includes('"event":"service_started"')) {
        cleanup()
        resolve()
      }
    }
    const onExit = (code: number | null) => {
      cleanup()
      reject(new Error(`MCP HTTP server exited before startup (${code}): ${stderr}`))
    }
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error("Timed out waiting for MCP HTTP server startup"))
    }, 10_000)
    proc.stderr?.on("data", onData)
    proc.once("exit", onExit)
  })
}

async function start(): Promise<{ port: number; proc: ChildProcess }> {
  const port = await openPort()
  const proc = spawn("node", [SERVER_PATH, "--http", "--port", String(port)], {
    stdio: ["ignore", "ignore", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "test",
      MCP_ALLOWED_HOSTS: "",
      MCP_ALLOWED_ORIGINS: "",
      SEMIOTIC_DEPLOYMENT_CHANNEL: "",
      SEMIOTIC_GIT_SHA: "",
      SEMIOTIC_BUILD_ID: "",
      SEMIOTIC_BUILD_TIME: "",
    },
  })
  await waitForStart(proc)
  return { port, proc }
}

function stop(proc: ChildProcess | undefined): Promise<void> {
  return new Promise((resolve) => {
    if (!proc || proc.exitCode !== null || proc.signalCode !== null) return resolve()
    const timeout = setTimeout(() => {
      proc.kill("SIGKILL")
      resolve()
    }, 3_000)
    proc.once("exit", () => {
      clearTimeout(timeout)
      resolve()
    })
    proc.kill("SIGTERM")
  })
}

function request(port: number, pathname: string, headers: Record<string, string> = {}) {
  return new Promise<{ body: unknown; headers: http.IncomingHttpHeaders; status: number }>((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path: pathname, headers }, (res) => {
      let text = ""
      res.setEncoding("utf8")
      res.on("data", (chunk) => { text += chunk })
      res.on("end", () => {
        resolve({ body: JSON.parse(text), headers: res.headers, status: res.statusCode ?? 0 })
      })
    })
    req.on("error", reject)
    req.end()
  })
}

describe.skipIf(!SERVER_DEPS_READY)("MCP HTTP health route", () => {
  let proc: ChildProcess | undefined

  afterEach(async () => {
    await stop(proc)
    proc = undefined
  })

  it("returns health JSON for bare and query-string requests without entering MCP transport", async () => {
    const server = await start()
    proc = server.proc

    const health = await request(server.port, "/health")
    const healthWithQuery = await request(server.port, "/health?probe=1", {
      Accept: "text/plain",
      "MCP-Protocol-Version": "unsupported-probe-version",
      Authorization: "Bearer not-the-server-token",
    })
    const body = health.body as Record<string, unknown>

    expect(health.status).toBe(200)
    expect(healthWithQuery.status).toBe(200)
    expect(healthWithQuery.body).toEqual(health.body)
    expect(health.headers["content-type"]).toContain("application/json")
    expect(health.headers["access-control-allow-origin"]).toBe("*")
    expect(health.headers["mcp-protocol-version"]).toBeDefined()
    expect(health.headers["mcp-session-id"]).toBeUndefined()
    expect(healthWithQuery.headers["mcp-session-id"]).toBeUndefined()
    expect(body).toMatchObject({
      status: "ok",
      name: "semiotic-mcp",
      transport: "streamable-http",
      mode: "stateless",
    })
    expect(String(body.version)).toMatch(/^\d+\.\d+\.\d+/)
  })
})
