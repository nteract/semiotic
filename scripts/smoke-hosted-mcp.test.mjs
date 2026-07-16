/**
 * Run: node --test scripts/smoke-hosted-mcp.test.mjs
 *
 * This suite uses a tiny local HTTP fixture. It deliberately exercises the
 * smoke script as a child process rather than depending on a Google Cloud
 * service or on a built Semiotic runtime.
 */
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import * as http from "node:http"
import { once } from "node:events"
import { describe, it } from "node:test"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const smokeScript = resolve(__dirname, "smoke-hosted-mcp.mjs")
const COMMIT_SHA = "0123456789abcdef0123456789abcdef01234567"
const OTHER_SHA = "89abcdef0123456789abcdef0123456789abcdef"
const LONG_UPPERCASE_SHA = "ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789"
const BUILD_ID = "local-smoke-build-123"

function json(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers })
  res.end(JSON.stringify(body))
}

function fixtureIdentity(options) {
  const commitSha = options.commitSha ?? (options.wrongSha ? OTHER_SHA : COMMIT_SHA)
  return {
    channel: options.wrongChannel ? "stable" : "nightly",
    packageVersion: "3.8.2",
    surfaceVersion: "3.8.2-ai",
    commitSha,
    shortCommitSha: commitSha.slice(0, 7),
    buildId: options.wrongBuildId ? "another-build" : BUILD_ID,
    builtAt: "2026-07-13T12:34:56.000Z",
    toolProfile: "public",
    nodeVersion: "v22.0.0",
  }
}

function healthBody(options) {
  const identity = fixtureIdentity(options)
  const { shortCommitSha, toolProfile, nodeVersion, ...healthIdentity } = identity
  return {
    status: "ok",
    name: "semiotic-mcp",
    version: "3.8.2",
    transport: "streamable-http",
    mode: "stateless",
    ...healthIdentity,
  }
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result }
}

function readRequest(req) {
  return new Promise((resolveRead, reject) => {
    let text = ""
    req.setEncoding("utf8")
    req.on("data", (chunk) => { text += chunk })
    req.on("end", () => resolveRead(text))
    req.on("error", reject)
  })
}

async function createFixture(options = {}) {
  let healthRequests = 0
  const server = http.createServer(async (req, res) => {
    const pathname = new URL(req.url || "/", "http://fixture.invalid").pathname

    if (req.method === "GET" && pathname === "/health") {
      healthRequests += 1
      if (options.healthStatus) {
        json(res, options.healthStatus, { error: "fixture health unavailable" })
        return
      }
      if (healthRequests <= (options.malformedHealthFailures ?? 0)) {
        res.writeHead(503, { "Content-Type": "text/html" })
        res.end("revision is starting")
        return
      }
      if (healthRequests <= (options.healthFailures ?? 0)) {
        json(res, 503, { status: "starting" })
        return
      }
      json(res, 200, healthBody(options))
      return
    }

    if (pathname === "/mcp" && req.method === "GET") {
      json(res, 405, { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null }, {
        Allow: "POST, OPTIONS",
      })
      return
    }

    if (pathname !== "/mcp" || req.method !== "POST") {
      json(res, 404, { error: "Not found" })
      return
    }

    let message
    try {
      message = JSON.parse(await readRequest(req))
    } catch {
      json(res, 400, { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null })
      return
    }

    if (options.malformedMcp) {
      json(res, 200, { id: message.id, result: {} })
      return
    }

    const identity = fixtureIdentity(options)
    if (message.method === "initialize") {
      json(res, 200, rpcResult(message.id, {
        protocolVersion: options.unsupportedProtocolVersion ? "2099-01-01" : "2025-06-18",
        serverInfo: {
          name: identity.channel === "nightly" ? "semiotic-nightly" : "semiotic",
          version: identity.channel === "nightly"
            ? `3.8.2-nightly+${identity.shortCommitSha}`
            : "3.8.2",
        },
        capabilities: {},
      }), { "MCP-Protocol-Version": "2025-06-18" })
      return
    }

    if (message.method === "tools/list") {
      const names = ["auditChart", "createChart", "explainChart", "getChartSchema", "improveChart"]
      if (options.missingTool) names.pop()
      json(res, 200, rpcResult(message.id, { tools: names.map((name) => ({ name })) }))
      return
    }

    if (message.method === "resources/list") {
      json(res, 200, rpcResult(message.id, {
        resources: [{ uri: "semiotic://build-info", name: "Semiotic build information" }],
      }))
      return
    }

    if (message.method === "resources/read") {
      json(res, 200, rpcResult(message.id, {
        contents: [{
          uri: "semiotic://build-info",
          mimeType: "application/json",
          text: JSON.stringify(identity),
        }],
      }))
      return
    }

    if (message.method === "tools/call" && message.params?.name === "createChart") {
      if (options.cancelledRender) {
        json(res, 200, rpcResult(message.id, {
          isError: true,
          content: [{ type: "text", text: "MCP_RENDER_CANCELLED" }],
          structuredContent: { status: "blocked" },
        }))
        return
      }
      json(res, 200, rpcResult(message.id, {
        content: [{ type: "text", text: "Rendered hosted smoke chart." }],
        structuredContent: {
          status: "render-proven",
          render: { evidence: { markCounts: { rect: 2 }, empty: false } },
        },
        _meta: { svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' },
      }))
      return
    }

    if (message.method === "tools/call" && message.params?.name === "getChartSchema") {
      json(res, 200, rpcResult(message.id, {
        content: [{ type: "text", text: "BarChart schema" }],
        structuredContent: { component: "BarChart" },
      }))
      return
    }

    json(res, 200, {
      jsonrpc: "2.0",
      id: message.id,
      error: { code: -32601, message: "Method not found" },
    })
  })

  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  const address = server.address()
  assert.ok(address && typeof address !== "string")

  return {
    endpoint: `http://127.0.0.1:${address.port}`,
    async close() {
      server.closeAllConnections?.()
      await new Promise((resolveClose, rejectClose) => {
        server.close((error) => error ? rejectClose(error) : resolveClose())
      })
    },
  }
}

function runSmoke(endpoint, args = []) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [
      smokeScript,
      "--endpoint", endpoint,
      "--expected-channel", "nightly",
      "--expected-sha", COMMIT_SHA,
      "--expected-build-id", BUILD_ID,
      "--timeout-ms", "300",
      "--retry-interval-ms", "10",
      ...args,
    ], {
      cwd: repoRoot,
      env: {
        ...process.env,
        COMMIT_SHA: "",
        BUILD_ID: "",
        SEMIOTIC_GIT_SHA: "",
        SEMIOTIC_BUILD_ID: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => { stdout += chunk })
    child.stderr.on("data", (chunk) => { stderr += chunk })
    child.once("error", reject)
    child.once("close", (code) => resolveRun({ code, stdout, stderr }))
  })
}

async function withFixture(options, callback) {
  const fixture = await createFixture(options)
  try {
    return await callback(fixture)
  } finally {
    await fixture.close()
  }
}

async function expectFailure(options, expression) {
  await withFixture(options, async (fixture) => {
    const result = await runSmoke(fixture.endpoint)
    assert.notEqual(result.code, 0, `expected smoke failure\n${result.stdout}\n${result.stderr}`)
    assert.match(`${result.stdout}${result.stderr}`, expression)
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /<svg/i)
  })
}

describe("smoke-hosted-mcp", () => {
  it("passes a complete public MCP contract after bounded health retries without printing SVG", async () => {
    await withFixture({ healthFailures: 2 }, async (fixture) => {
      const result = await runSmoke(fixture.endpoint, ["--timeout-ms", "1000"])
      assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`)
      assert.match(result.stdout, /hosted MCP smoke passed/)
      assert.match(result.stdout, /health attempts 3/)
      assert.match(result.stdout, /createChart/)
      assert.doesNotMatch(result.stdout, /<svg/i)
      assert.equal(result.stderr, "")
    })
  })

  it("accepts a case-insensitive full SHA longer than SHA-1", async () => {
    await withFixture({ commitSha: LONG_UPPERCASE_SHA }, async (fixture) => {
      const result = await runSmoke(fixture.endpoint, ["--expected-sha", LONG_UPPERCASE_SHA])
      assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`)
    })
  })

  it("retries a transient non-JSON readiness response without exposing it", async () => {
    await withFixture({ malformedHealthFailures: 1 }, async (fixture) => {
      const result = await runSmoke(fixture.endpoint, ["--timeout-ms", "1000"])
      assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`)
      assert.match(result.stdout, /health attempts 2/)
      assert.doesNotMatch(`${result.stdout}${result.stderr}`, /revision is starting/)
    })
  })

  it("prints raw responses only when --verbose is explicitly requested", async () => {
    await withFixture({}, async (fixture) => {
      const result = await runSmoke(fixture.endpoint, ["--verbose"])
      assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`)
      assert.match(result.stdout, /\[verbose\] createChart body:/)
      assert.match(result.stdout, /<svg/i)
    })
  })

  it("fails for a wrong Git SHA", () => expectFailure({ wrongSha: true }, /commitSha did not match/))
  it("fails for a wrong deployment channel", () => expectFailure({ wrongChannel: true }, /channel did not match/))
  it("fails for a wrong Cloud Build ID", () => expectFailure({ wrongBuildId: true }, /buildId did not match/))
  it("fails when a public tool is missing", () => expectFailure({ missingTool: true }, /exactly the five public tools/))
  it("fails when rendering is cancelled", () => expectFailure({ cancelledRender: true }, /MCP_RENDER_CANCELLED/))
  it("fails when health returns HTTP 404", () => expectFailure({ healthStatus: 404 }, /health returned HTTP 404/))
  it("fails when health returns HTTP 500", () => expectFailure({ healthStatus: 500 }, /health did not become ready before timeout/))
  it("fails for a malformed MCP response", () => expectFailure({ malformedMcp: true }, /malformed MCP JSON-RPC response/))
  it("fails when initialize does not advertise the requested supported protocol", () => expectFailure({ unsupportedProtocolVersion: true }, /protocolVersion did not match/))
})
