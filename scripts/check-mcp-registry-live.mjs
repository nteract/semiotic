#!/usr/bin/env node
/**
 * Verify the stable hosted MCP identity before publishing another immutable npm
 * version. The post-publish workflow is the authority that publishes and
 * verifies the Registry entry for that new version.
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { assessStableHealth } from "./lib/mcp-registry-live.mjs"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const server = JSON.parse(readFileSync(resolve(root, "server.json"), "utf8"))
const registryBase = "https://registry.npmjs.org"
const healthTimeoutMs = 45_000
const healthRetryMs = 2_000
const args = process.argv.slice(2)
if (args.some((argument) => argument !== "--allow-stale-remote")) {
  throw new Error(`Unknown option(s): ${args.filter((argument) => argument !== "--allow-stale-remote").join(", ")}`)
}
const allowStaleRemote = args.includes("--allow-stale-remote")

if (
  !Array.isArray(server.remotes) ||
  server.remotes.length !== 1 ||
  server.remotes[0]?.type !== "streamable-http" ||
  typeof server.remotes[0]?.url !== "string"
) {
  throw new Error("server.json must contain exactly one Streamable HTTP remote")
}

const remoteUrl = new URL(server.remotes[0].url)
if (remoteUrl.protocol !== "https:") {
  throw new Error(`Stable MCP remote must use HTTPS: ${remoteUrl}`)
}
const healthUrl = new URL("/health", remoteUrl)

const publishedLatest = execFileSync(
  "npm",
  ["view", `${pkg.name}@latest`, "version", `--registry=${registryBase}`],
  {
    cwd: root,
    encoding: "utf8",
    timeout: 30_000,
    env: {
      ...process.env,
      npm_config_fetch_retries: "2",
      npm_config_fetch_timeout: "15000",
    },
  },
).trim()

if (!publishedLatest) throw new Error(`Could not resolve ${pkg.name}@latest from ${registryBase}`)

async function waitForStableHealth() {
  const deadline = Date.now() + healthTimeoutMs
  let attempts = 0
  let lastFailure = "no response"

  while (Date.now() < deadline) {
    attempts += 1
    try {
      const response = await fetch(healthUrl, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(Math.min(10_000, Math.max(1, deadline - Date.now()))),
      })
      if (!response.ok) {
        lastFailure = `HTTP ${response.status} ${response.statusText}`
      } else {
        const assessment = assessStableHealth(
          await response.json(),
          publishedLatest,
          { allowStaleRemote },
        )
        return { attempts, ...assessment }
      }
    } catch (error) {
      if (/channel must|invalid packageVersion|serves packageVersion|JSON object/.test(error.message)) {
        throw error
      }
      lastFailure = error instanceof Error ? error.message : String(error)
    }

    const remaining = deadline - Date.now()
    if (remaining > 0) {
      await new Promise((resolveSleep) => setTimeout(resolveSleep, Math.min(healthRetryMs, remaining)))
    }
  }

  throw new Error(
    `Stable MCP /health did not become ready after ${attempts} attempt(s): ${lastFailure}`,
  )
}

const health = await waitForStableHealth()
if (health.stale) {
  console.warn(
    `! pre-deploy allowance: stable MCP serves semiotic@${health.packageVersion}, ` +
      `while npm latest is ${pkg.name}@${publishedLatest}; target deployment and exact ` +
      "hosted smoke must complete before Registry publication",
  )
}

if (publishedLatest === pkg.version) {
  console.log(
    `✓ stable MCP /health identity is valid (packageVersion ${health.packageVersion}; ` +
      `attempts: ${health.attempts}); target Registry metadata will be verified or backfilled ` +
      "by the post-publish workflow",
  )
  process.exit(0)
}

if (health.stale) {
  console.log(
    `✓ stable MCP /health is valid but awaits deployment of ${pkg.name}@${publishedLatest} ` +
      `(attempts: ${health.attempts}); the post-publish workflow will publish and verify ` +
      `${server.name} v${pkg.version}`,
  )
} else {
  console.log(
    `✓ stable MCP /health serves current npm latest ` +
      `(${pkg.name}@${publishedLatest}; health attempts: ${health.attempts}); the ` +
      `post-publish workflow will publish and verify ${server.name} v${pkg.version}`,
  )
}
