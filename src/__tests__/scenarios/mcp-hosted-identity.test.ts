/**
 * Hosted-MCP identity and rendered public-profile regressions.
 *
 * This stays separate from the broad protocol suite so its many protocol
 * fixture tests remain within the repository's test-file size policy.
 */
import { spawn, type ChildProcess } from "child_process"
import { existsSync, readFileSync } from "fs"
import * as net from "net"
import * as path from "path"
import { afterEach, describe, expect, it } from "vitest"

const ROOT = path.resolve(__dirname, "../../..")
const SERVER_PATH = path.join(ROOT, "ai/dist/mcp-server.js")
const PACKAGE_VERSION = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")).version
const REQUIRED_BUNDLES = [
  SERVER_PATH,
  path.join(ROOT, "dist/semiotic-ai.min.js"),
  path.join(ROOT, "dist/geo.min.js"),
  path.join(ROOT, "dist/server.min.js"),
]
const SERVER_DEPS_READY = REQUIRED_BUNDLES.every(existsSync)

if (!SERVER_DEPS_READY && process.env.CI) {
  throw new Error(`MCP hosted identity tests require built artifacts: ${REQUIRED_BUNDLES.filter((file) => !existsSync(file)).join(", ")}`)
}

function getOpenPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      server.close(() => {
        if (!address || typeof address === "string") {
          reject(new Error("Could not determine an open HTTP port"))
        } else {
          resolve(address.port)
        }
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
      reject(new Error(`MCP HTTP server exited before startup (${code})`))
    }
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error("Timed out waiting for MCP HTTP server startup"))
    }, 10_000)
    proc.stderr?.on("data", onData)
    proc.once("exit", onExit)
  })
}

function stop(proc: ChildProcess | undefined): Promise<void> {
  return new Promise((resolve) => {
    if (!proc || proc.exitCode !== null || proc.signalCode !== null) {
      resolve()
      return
    }
    const timeout = setTimeout(() => {
      try {
        proc.kill("SIGKILL")
      } catch {
        // It may have exited immediately before the force-stop attempt.
      }
      resolve()
    }, 3_000)
    proc.once("exit", () => {
      clearTimeout(timeout)
      resolve()
    })
    proc.kill("SIGTERM")
  })
}

async function start(
  env: NodeJS.ProcessEnv = {},
  args: string[] = [],
): Promise<{ port: number; proc: ChildProcess }> {
  const port = await getOpenPort()
  const proc = spawn("node", [SERVER_PATH, "--http", "--port", String(port), ...args], {
    stdio: ["ignore", "ignore", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "test",
      MCP_ALLOWED_HOSTS: "",
      MCP_ALLOWED_ORIGINS: "",
      MCP_AUTH_TOKEN: "",
      MCP_SUPPORTED_PROTOCOL_VERSIONS: "",
      SEMIOTIC_DEPLOYMENT_CHANNEL: "",
      SEMIOTIC_GIT_SHA: "",
      SEMIOTIC_BUILD_ID: "",
      SEMIOTIC_BUILD_TIME: "",
      ...env,
    },
  })
  await waitForStart(proc)
  return { port, proc }
}

async function json(port: number, pathname: string) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`)
  return { response, body: JSON.parse(await response.text()) }
}

async function rpc(port: number, id: string, method: string, params: Record<string, unknown>) {
  const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": "2025-06-18",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  })
  return { response, body: JSON.parse(await response.text()) }
}

describe.skipIf(!SERVER_DEPS_READY)("hosted MCP build identity", () => {
  let proc: ChildProcess | undefined

  afterEach(async () => {
    await stop(proc)
    proc = undefined
  })

  it("returns stable structured build identity from health and the resource", async () => {
    const server = await start()
    proc = server.proc

    const health = await json(server.port, "/health?probe=1")
    expect(health.response.status).toBe(200)
    expect(health.response.headers.get("content-type")).toContain("application/json")
    expect(health.body).toMatchObject({
      channel: "stable",
      packageVersion: PACKAGE_VERSION,
      surfaceVersion: `${PACKAGE_VERSION}-ai`,
    })

    const resource = await rpc(server.port, "stable-build-info", "resources/read", {
      uri: "semiotic://build-info",
    })
    expect(resource.response.status).toBe(200)
    expect(JSON.parse(resource.body.result.contents[0].text)).toMatchObject({
      channel: "stable",
      packageVersion: PACKAGE_VERSION,
      surfaceVersion: `${PACKAGE_VERSION}-ai`,
      toolProfile: "developer",
      nodeVersion: expect.stringMatching(/^v\d+\./),
    })
  })

  it("identifies a nightly public server and renders a complete stateless createChart call", async () => {
    const commitSha = "00db062e9ed42be02a9c4f59dbf8396ebd1712cd"
    const buildId = "nightly-build-123"
    const builtAt = "2026-07-13T12:34:56.000Z"
    const server = await start({
      SEMIOTIC_DEPLOYMENT_CHANNEL: "nightly",
      SEMIOTIC_GIT_SHA: commitSha,
      SEMIOTIC_BUILD_ID: buildId,
      SEMIOTIC_BUILD_TIME: builtAt,
    }, ["--profile", "public"])
    proc = server.proc

    const health = await json(server.port, "/health?probe=1")
    expect(health.response.status).toBe(200)
    expect(health.response.headers.get("content-type")).toContain("application/json")
    expect(health.body).toMatchObject({
      channel: "nightly",
      packageVersion: PACKAGE_VERSION,
      surfaceVersion: `${PACKAGE_VERSION}-ai`,
      commitSha,
      buildId,
      builtAt,
    })

    const initialize = await rpc(server.port, "nightly-initialize", "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "nightly-identity-test", version: "1.0.0" },
    })
    expect(initialize.response.status).toBe(200)
    expect(initialize.body.result).toMatchObject({
      protocolVersion: "2025-06-18",
      serverInfo: {
        name: "semiotic-nightly",
        version: `${PACKAGE_VERSION}-nightly+00db062`,
      },
    })

    const tools = await rpc(server.port, "nightly-tools", "tools/list", {})
    expect(tools.body.result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual([
      "auditChart",
      "createChart",
      "explainChart",
      "getChartSchema",
      "improveChart",
    ])

    const resources = await rpc(server.port, "nightly-resources", "resources/list", {})
    expect(resources.body.result.resources.map((resource: { uri: string }) => resource.uri))
      .toContain("semiotic://build-info")
    const buildInfo = await rpc(server.port, "nightly-build-info", "resources/read", {
      uri: "semiotic://build-info",
    })
    expect(JSON.parse(buildInfo.body.result.contents[0].text)).toMatchObject({
      channel: "nightly",
      packageVersion: PACKAGE_VERSION,
      surfaceVersion: `${PACKAGE_VERSION}-ai`,
      commitSha,
      shortCommitSha: "00db062",
      buildId,
      builtAt,
      toolProfile: "public",
      nodeVersion: expect.stringMatching(/^v\d+\./),
    })

    const created = await rpc(server.port, "nightly-create-chart", "tools/call", {
      name: "createChart",
      arguments: {
        data: [
          { category: "Alpha", value: 3 },
          { category: "Beta", value: 5 },
        ],
        intent: "compare-categories",
        props: { title: "Public HTTP categorical comparison" },
      },
    })
    expect(created.response.status).toBe(200)
    expect(created.body.result.isError).not.toBe(true)
    expect(created.body.result.structuredContent).toMatchObject({ status: "render-proven" })
    expect(JSON.stringify(created.body.result)).toContain("<svg")
    expect(JSON.stringify(created.body.result)).toContain("evidence")
    expect(JSON.stringify(created.body.result)).not.toContain("MCP_RENDER_CANCELLED")
  })
})
