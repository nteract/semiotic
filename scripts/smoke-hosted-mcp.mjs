#!/usr/bin/env node
/**
 * Smoke test a deployed Semiotic public MCP server without printing chart
 * payloads, SVG, request bodies, or response bodies by default.
 *
 * Usage:
 *   node scripts/smoke-hosted-mcp.mjs \
 *     --endpoint https://service.example.com \
 *     --expected-channel nightly \
 *     --expected-sha "$COMMIT_SHA" \
 *     --expected-build-id "$BUILD_ID"
 *
 * The endpoint can also be supplied as MCP_SMOKE_ENDPOINT. Cloud Build's
 * COMMIT_SHA and BUILD_ID environment variables are used when explicit
 * expected-value flags are omitted.
 */
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const PUBLIC_TOOL_NAMES = [
  "auditChart",
  "createChart",
  "explainChart",
  "getChartSchema",
  "improveChart",
]
const DEFAULT_TIMEOUT_MS = 180_000
const DEFAULT_RETRY_INTERVAL_MS = 2_000
const DEFAULT_PROTOCOL_VERSION = "2025-06-18"

class SmokeFailure extends Error {
  constructor(step, message, { status } = {}) {
    super(message)
    this.name = "SmokeFailure"
    this.step = step
    this.status = status
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function normalizeSha(value) {
  return stringValue(value)?.toLowerCase() ?? null
}

function redactEndpoint(value) {
  const endpoint = new URL(value)
  endpoint.username = ""
  endpoint.password = ""
  endpoint.search = ""
  endpoint.hash = ""
  return endpoint.toString().replace(/\/$/, "")
}

function usage() {
  return [
    "Usage: node scripts/smoke-hosted-mcp.mjs --endpoint URL [options]",
    "",
    "Options:",
    "  --endpoint URL                 Hosted MCP base URL (or MCP_SMOKE_ENDPOINT)",
    "  --expected-channel CHANNEL     Expected deployment channel (default: nightly)",
    "  --expected-sha SHA             Expected full Git commit SHA (or COMMIT_SHA)",
    "  --expected-build-id ID         Expected Cloud Build ID (or BUILD_ID)",
    `  --timeout-ms MS                Overall readiness timeout (default: ${DEFAULT_TIMEOUT_MS})`,
    `  --retry-interval-ms MS         Health readiness retry interval (default: ${DEFAULT_RETRY_INTERVAL_MS})`,
    "  --verbose                      Print truncated raw responses for debugging",
    "  --help                         Show this help",
  ].join("\n")
}

function readOptionValue(argv, index, option) {
  const value = argv[index + 1]
  if (!value || value.startsWith("--")) {
    throw new SmokeFailure("arguments", `${option} requires a value`)
  }
  return value
}

function readPositiveInteger(value, option) {
  if (!/^\d+$/.test(value)) {
    throw new SmokeFailure("arguments", `${option} must be a positive integer`)
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new SmokeFailure("arguments", `${option} must be a positive integer`)
  }
  return parsed
}

function parseArgs(argv, env = process.env) {
  const values = {}
  let verbose = false
  let help = false

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === "--verbose") {
      verbose = true
      continue
    }
    if (argument === "--help" || argument === "-h") {
      help = true
      continue
    }

    const match = /^(--[a-z-]+)=(.*)$/.exec(argument)
    const option = match?.[1] ?? argument
    const inlineValue = match?.[2]
    if (!["--endpoint", "--expected-channel", "--expected-sha", "--expected-build-id", "--timeout-ms", "--retry-interval-ms"].includes(option)) {
      throw new SmokeFailure("arguments", `unknown option ${argument}`)
    }
    const value = inlineValue ?? readOptionValue(argv, index, option)
    if (inlineValue === undefined) index += 1
    values[option] = value
  }

  if (help) return { help: true }

  const endpoint = values["--endpoint"]
    ?? env.MCP_SMOKE_ENDPOINT
    ?? env.SEMIOTIC_MCP_ENDPOINT
    ?? env.MCP_ENDPOINT
  if (!stringValue(endpoint)) {
    throw new SmokeFailure("arguments", "--endpoint (or MCP_SMOKE_ENDPOINT) is required")
  }

  let endpointUrl
  try {
    endpointUrl = new URL(endpoint)
  } catch {
    throw new SmokeFailure("arguments", "--endpoint must be an absolute HTTP(S) URL")
  }
  if (endpointUrl.protocol !== "https:" && endpointUrl.protocol !== "http:") {
    throw new SmokeFailure("arguments", "--endpoint must use HTTP or HTTPS")
  }

  const timeoutMs = readPositiveInteger(
    values["--timeout-ms"] ?? env.MCP_SMOKE_TIMEOUT_MS ?? String(DEFAULT_TIMEOUT_MS),
    "--timeout-ms",
  )
  const retryIntervalMs = readPositiveInteger(
    values["--retry-interval-ms"] ?? env.MCP_SMOKE_RETRY_INTERVAL_MS ?? String(DEFAULT_RETRY_INTERVAL_MS),
    "--retry-interval-ms",
  )

  return {
    endpoint: endpointUrl,
    expectedChannel: stringValue(values["--expected-channel"] ?? env.SEMIOTIC_DEPLOYMENT_CHANNEL) ?? "nightly",
    expectedSha: normalizeSha(values["--expected-sha"] ?? env.SEMIOTIC_GIT_SHA ?? env.COMMIT_SHA),
    expectedBuildId: stringValue(values["--expected-build-id"] ?? env.SEMIOTIC_BUILD_ID ?? env.BUILD_ID),
    timeoutMs,
    retryIntervalMs,
    verbose,
    protocolVersion: stringValue(env.MCP_SMOKE_PROTOCOL_VERSION) ?? DEFAULT_PROTOCOL_VERSION,
  }
}

function endpointPath(endpoint, pathname) {
  return new URL(pathname, endpoint).toString()
}

function sleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds))
}

function truncate(value, maximum = 4_096) {
  return value.length <= maximum ? value : `${value.slice(0, maximum)}… [truncated]`
}

function parseSseJson(text) {
  for (const event of text.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.replace(/^data:\s?/, ""))
      .join("\n")
    if (data) return JSON.parse(data)
  }
  throw new Error("response did not contain an SSE data event")
}

function parseJsonResponse(text, contentType) {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    if (contentType?.includes("text/event-stream")) return parseSseJson(text)
    throw new Error("response was not valid JSON")
  }
}

function verboseResponse(options, step, response, text) {
  if (!options.verbose) return
  console.log(`[verbose] ${step}: HTTP ${response.status}`)
  if (text) console.log(`[verbose] ${step} body: ${truncate(text)}`)
}

async function request(options, step, pathname, init = {}, deadline = Date.now() + options.timeoutMs) {
  const remainingMs = deadline - Date.now()
  if (remainingMs <= 0) throw new SmokeFailure(step, `${step} exceeded the overall timeout`)

  const requestTimeoutMs = Math.max(1, Math.min(30_000, remainingMs))
  let response
  try {
    response = await fetch(endpointPath(options.endpoint, pathname), {
      ...init,
      signal: AbortSignal.timeout(requestTimeoutMs),
    })
  } catch {
    throw new SmokeFailure(step, `${step} could not reach the hosted service`)
  }

  let text
  try {
    text = await response.text()
  } catch {
    throw new SmokeFailure(step, `${step} response could not be read`)
  }
  verboseResponse(options, step, response, text)

  let body
  try {
    body = parseJsonResponse(text, response.headers.get("content-type"))
  } catch {
    // A new Cloud Run revision can briefly return a proxy-generated non-JSON
    // 5xx response before the application is ready. Preserve the status so
    // the health readiness loop can retry only those transient failures.
    throw new SmokeFailure(step, `${step} returned malformed JSON`, {
      status: response.status,
    })
  }
  return { response, body, text }
}

function requireStatus(step, response, status) {
  if (response.status !== status) {
    throw new SmokeFailure(step, `${step} returned HTTP ${response.status}; expected ${status}`)
  }
}

function requireRecord(step, value, name) {
  if (!isRecord(value)) throw new SmokeFailure(step, `${step} returned no ${name} object`)
  return value
}

function requireString(step, value, name) {
  const result = stringValue(value)
  if (!result) throw new SmokeFailure(step, `${step} returned no ${name}`)
  return result
}

function requireExactString(step, actual, expected, name, normalizer = (value) => value) {
  const actualString = requireString(step, actual, name)
  if (normalizer(actualString) !== normalizer(expected)) {
    throw new SmokeFailure(step, `${step} ${name} did not match the expected deployment`)
  }
  return actualString
}

function validIsoTimestamp(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value) && Number.isFinite(Date.parse(value))
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function assertBuildIdentity(step, value, options, { requireShortSha = false, requireProfile = false } = {}) {
  const identity = requireRecord(step, value, "build identity")
  requireExactString(step, identity.channel, options.expectedChannel, "channel")
  const packageVersion = requireString(step, identity.packageVersion, "packageVersion")
  const surfaceVersion = requireString(step, identity.surfaceVersion, "surfaceVersion")
  const commitSha = requireString(step, identity.commitSha, "commitSha")
  const buildId = requireString(step, identity.buildId, "buildId")
  const builtAt = requireString(step, identity.builtAt, "builtAt")

  if (!/^[0-9a-f]{40,128}$/i.test(commitSha)) {
    throw new SmokeFailure(step, `${step} commitSha was not a full Git SHA`)
  }
  if (!validIsoTimestamp(builtAt)) {
    throw new SmokeFailure(step, `${step} builtAt was not an ISO UTC timestamp`)
  }
  if (options.expectedSha) {
    requireExactString(step, commitSha, options.expectedSha, "commitSha", (item) => item.toLowerCase())
  }
  if (options.expectedBuildId) {
    requireExactString(step, buildId, options.expectedBuildId, "buildId")
  }
  if (requireShortSha) {
    const shortCommitSha = requireExactString(step, identity.shortCommitSha, commitSha.slice(0, 7), "shortCommitSha", (item) => item.toLowerCase())
    if (shortCommitSha.length < 7 || shortCommitSha.length > commitSha.length) {
      throw new SmokeFailure(step, `${step} shortCommitSha had an invalid length`)
    }
  }
  if (requireProfile) {
    requireExactString(step, identity.toolProfile, "public", "toolProfile")
  }

  return { packageVersion, surfaceVersion, commitSha, buildId, builtAt }
}

function assertJsonRpcResult(step, body, expectedId) {
  const message = requireRecord(step, body, "JSON-RPC response")
  if (message.jsonrpc !== "2.0") {
    throw new SmokeFailure(step, `${step} returned a malformed MCP JSON-RPC response`)
  }
  if (message.id !== expectedId) {
    throw new SmokeFailure(step, `${step} returned a mismatched JSON-RPC id`)
  }
  if (Object.hasOwn(message, "error")) {
    throw new SmokeFailure(step, `${step} returned a JSON-RPC error`)
  }
  return requireRecord(step, message.result, "JSON-RPC result")
}

function hasString(value, needle) {
  if (typeof value === "string") return value.includes(needle)
  if (Array.isArray(value)) return value.some((item) => hasString(item, needle))
  if (isRecord(value)) return Object.values(value).some((item) => hasString(item, needle))
  return false
}

function hasSvg(value) {
  if (typeof value === "string") return /<svg(?:\s|>)/i.test(value)
  if (Array.isArray(value)) return value.some(hasSvg)
  if (isRecord(value)) return Object.values(value).some(hasSvg)
  return false
}

function hasEvidence(value) {
  if (Array.isArray(value)) return value.some(hasEvidence)
  if (!isRecord(value)) return false
  if (Object.hasOwn(value, "evidence")) {
    const evidence = value.evidence
    if (isRecord(evidence) && Object.keys(evidence).length > 0) return true
    if (typeof evidence === "string" && evidence.trim()) return true
  }
  return Object.values(value).some(hasEvidence)
}

function hasCanonicalRenderProof(value) {
  if (!isRecord(value)) return false
  const structuredContent = value.structuredContent
  return isRecord(structuredContent) && isRecord(structuredContent.render) && hasEvidence(structuredContent.render)
}

function createRpcRequest(id, method, params) {
  return { jsonrpc: "2.0", id, method, params }
}

async function callRpc(options, step, id, method, params, protocolVersion, deadline) {
  const { response, body } = await request(options, step, "/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      "MCP-Protocol-Version": protocolVersion,
    },
    body: JSON.stringify(createRpcRequest(id, method, params)),
  }, deadline)
  requireStatus(step, response, 200)
  return { result: assertJsonRpcResult(step, body, id), response }
}

function isRetryableHealthStatus(status) {
  return status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504
}

async function waitForReadyHealth(options, deadline) {
  let attempts = 0
  let lastStatus = null
  while (Date.now() < deadline) {
    attempts += 1
    try {
      const { response, body } = await request(options, "health", "/health", {}, deadline)
      lastStatus = response.status
      if (response.status === 200) {
        const identity = assertBuildIdentity("health", body, options)
        return { identity, attempts }
      }
      if (!isRetryableHealthStatus(response.status)) {
        throw new SmokeFailure("health", `health returned HTTP ${response.status}; expected 200`)
      }
    } catch (error) {
      if (error instanceof SmokeFailure && error.step === "health") {
        const retryableStatus = error.status != null && isRetryableHealthStatus(error.status)
        const retryableNetworkFailure = /could not reach|exceeded the overall timeout/.test(error.message)
        if (!retryableStatus && !retryableNetworkFailure) throw error
      }
      if (Date.now() >= deadline) break
    }

    const remainingMs = deadline - Date.now()
    if (remainingMs <= 0) break
    await sleep(Math.min(options.retryIntervalMs, remainingMs))
  }
  const status = lastStatus == null ? "unavailable" : `HTTP ${lastStatus}`
  throw new SmokeFailure("health", `health did not become ready before timeout (${status})`)
}

function parseBuildInfoResource(step, result) {
  const contents = result.contents
  if (!Array.isArray(contents)) {
    throw new SmokeFailure(step, `${step} returned no resource contents`)
  }
  const content = contents.find((item) => isRecord(item) && item.uri === "semiotic://build-info")
  if (!content) throw new SmokeFailure(step, `${step} did not return semiotic://build-info`)
  const text = stringValue(content.text)
  if (!text) throw new SmokeFailure(step, `${step} returned no JSON build-info content`)
  try {
    return JSON.parse(text)
  } catch {
    throw new SmokeFailure(step, `${step} returned malformed build-info JSON`)
  }
}

function assertNightlyInitialize(step, result, identity, requestedProtocolVersion) {
  const protocolVersion = requireString(step, result.protocolVersion, "protocolVersion")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(protocolVersion)) {
    throw new SmokeFailure(step, `${step} returned an unsupported protocol version format`)
  }
  // The smoke request explicitly asks for a released MCP protocol revision.
  // Echoing that revision proves the hosted server supports the client
  // contract, rather than merely returning another date-shaped string.
  requireExactString(
    step,
    protocolVersion,
    requestedProtocolVersion,
    "protocolVersion",
  )
  const serverInfo = requireRecord(step, result.serverInfo, "serverInfo")
  requireExactString(step, serverInfo.name, "semiotic-nightly", "serverInfo.name")
  const version = requireString(step, serverInfo.version, "serverInfo.version")
  const expectedSuffix = `-nightly+${identity.commitSha.slice(0, 7)}`
  if (!new RegExp(`^\\d+\\.\\d+\\.\\d+${escapeRegex(expectedSuffix)}$`, "i").test(version)) {
    throw new SmokeFailure(step, `${step} serverInfo.version did not identify the nightly commit`)
  }
  return protocolVersion
}

export async function runHostedMcpSmoke(options) {
  const deadline = Date.now() + options.timeoutMs
  const checks = []

  const health = await waitForReadyHealth(options, deadline)
  checks.push("health")

  const healthz = await request(options, "healthz", "/healthz", {}, deadline)
  requireStatus("healthz", healthz.response, 200)
  assertBuildIdentity("healthz", healthz.body, options)
  checks.push("healthz")

  const mcpGet = await request(options, "mcp GET", "/mcp", {}, deadline)
  requireStatus("mcp GET", mcpGet.response, 405)
  const allowedMethods = (mcpGet.response.headers.get("allow") || "")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
  if (!allowedMethods.includes("POST") || !allowedMethods.includes("OPTIONS")) {
    throw new SmokeFailure("mcp GET", "mcp GET did not advertise Allow: POST, OPTIONS")
  }
  checks.push("mcp GET")

  const initialized = await callRpc(
    options,
    "initialize",
    "smoke-initialize",
    "initialize",
    {
      protocolVersion: options.protocolVersion,
      capabilities: {},
      clientInfo: { name: "semiotic-hosted-smoke", version: "1.0.0" },
    },
    options.protocolVersion,
    deadline,
  )
  const protocolVersion = assertNightlyInitialize(
    "initialize",
    initialized.result,
    health.identity,
    options.protocolVersion,
  )
  checks.push("initialize")

  const toolList = await callRpc(options, "tools/list", "smoke-tools-list", "tools/list", {}, protocolVersion, deadline)
  const tools = toolList.result.tools
  if (!Array.isArray(tools) || tools.some((tool) => !isRecord(tool) || !stringValue(tool.name))) {
    throw new SmokeFailure("tools/list", "tools/list returned malformed tools")
  }
  const toolNames = tools.map((tool) => tool.name).sort()
  if (JSON.stringify(toolNames) !== JSON.stringify([...PUBLIC_TOOL_NAMES].sort())) {
    throw new SmokeFailure("tools/list", "tools/list did not expose exactly the five public tools")
  }
  checks.push("tools/list")

  const resourceList = await callRpc(options, "resources/list", "smoke-resources-list", "resources/list", {}, protocolVersion, deadline)
  const resources = resourceList.result.resources
  if (!Array.isArray(resources) || !resources.some((resource) => isRecord(resource) && resource.uri === "semiotic://build-info")) {
    throw new SmokeFailure("resources/list", "resources/list did not include semiotic://build-info")
  }
  checks.push("resources/list")

  const buildInfoResponse = await callRpc(
    options,
    "resources/read",
    "smoke-build-info",
    "resources/read",
    { uri: "semiotic://build-info" },
    protocolVersion,
    deadline,
  )
  const buildInfo = parseBuildInfoResource("resources/read", buildInfoResponse.result)
  assertBuildIdentity("resources/read", buildInfo, options, { requireShortSha: true, requireProfile: true })
  checks.push("resources/read")

  const createChart = await callRpc(
    options,
    "createChart",
    "smoke-create-chart",
    "tools/call",
    {
      name: "createChart",
      arguments: {
        data: [
          { category: "Alpha", value: 3 },
          { category: "Beta", value: 5 },
        ],
        intent: "compare-categories",
        props: { title: "Hosted MCP smoke categorical comparison" },
      },
    },
    protocolVersion,
    deadline,
  )
  if (hasString(createChart.result, "MCP_RENDER_CANCELLED")) {
    throw new SmokeFailure("createChart", "createChart returned MCP_RENDER_CANCELLED")
  }
  if (createChart.result.isError === true) {
    throw new SmokeFailure("createChart", "createChart returned isError: true")
  }
  const structuredContent = requireRecord("createChart", createChart.result.structuredContent, "structuredContent")
  requireExactString("createChart", structuredContent.status, "render-proven", "status")
  if (!hasEvidence(createChart.result)) {
    throw new SmokeFailure("createChart", "createChart did not include render evidence")
  }
  if (!hasSvg(createChart.result) && !hasCanonicalRenderProof(createChart.result)) {
    throw new SmokeFailure("createChart", "createChart did not include an SVG or canonical render proof")
  }
  checks.push("createChart")

  const schema = await callRpc(
    options,
    "getChartSchema",
    "smoke-chart-schema",
    "tools/call",
    { name: "getChartSchema", arguments: { component: "BarChart" } },
    protocolVersion,
    deadline,
  )
  if (schema.result.isError === true) {
    throw new SmokeFailure("getChartSchema", "getChartSchema returned isError: true")
  }
  checks.push("getChartSchema")

  return { checks, healthAttempts: health.attempts, identity: health.identity }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  const result = await runHostedMcpSmoke(options)
  console.log(
    `✓ hosted MCP smoke passed: ${redactEndpoint(options.endpoint)} ` +
      `(channel ${options.expectedChannel}, health attempts ${result.healthAttempts})`,
  )
  console.log(`  checks: ${result.checks.join(", ")}`)
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (invokedAsScript) {
  main().catch((error) => {
    if (error instanceof SmokeFailure) {
      console.error(`✗ hosted MCP smoke failed at ${error.step}: ${error.message}`)
    } else {
      console.error("✗ hosted MCP smoke failed unexpectedly; rerun with --verbose for response details")
    }
    process.exitCode = 1
  })
}

export { SmokeFailure, parseArgs }
