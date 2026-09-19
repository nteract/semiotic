#!/usr/bin/env node
/** Verify an immutable Registry version without relying on paginated search. */
import { appendFileSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
  }
  return value
}

export async function checkRegistryPublication(manifest, {
  mode = "verify",
  registryBase = "https://registry.modelcontextprotocol.io/v0.1",
  fetchImpl = fetch,
  now = Date.now,
  sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
  log = console.log,
  timeoutMs = 120_000,
  retryMs = 5_000,
} = {}) {
  if (!["preflight", "verify"].includes(mode)) throw new Error(`Unknown Registry check mode: ${mode}`)
  const url = `${registryBase}/servers/${encodeURIComponent(manifest.name)}/versions/${encodeURIComponent(manifest.version)}`
  const deadline = now() + timeoutMs
  let attempts = 0
  let lastFailure = "no response"
  while (now() < deadline) {
    attempts += 1
    let response
    let entry
    try {
      response = await fetchImpl(url, {
        headers: { accept: "application/json", "cache-control": "no-cache" },
        signal: AbortSignal.timeout(Math.min(10_000, Math.max(1, deadline - now()))),
      })
      if (response.ok) entry = await response.json()
    } catch (error) {
      lastFailure = error.message
    }
    if (entry) {
      if (JSON.stringify(canonical(entry.server)) !== JSON.stringify(canonical(manifest))) {
        throw new Error(`Registry metadata differs from server.json for ${manifest.name} v${manifest.version}; refusing to accept or republish it`)
      }
      const official = entry._meta?.["io.modelcontextprotocol.registry/official"]
      if (mode === "preflight" || (official?.status === "active" && official?.isLatest === true)) {
        return { entry, attempts, publishRequired: false }
      }
      lastFailure = `entry is not active and latest: ${JSON.stringify(official)}`
    } else if (response && !response.ok) {
      if (response.status === 404 && mode === "preflight") {
        return { entry: null, attempts, publishRequired: true }
      }
      lastFailure = `HTTP ${response.status}`
      if (![404, 408, 429].includes(response.status) && response.status < 500) {
        throw new Error(`Registry request failed: ${lastFailure} (${url})`)
      }
    } else if (response?.ok) {
      lastFailure = "invalid Registry response"
    }
    log(`Registry ${mode} attempt ${attempts}: ${lastFailure}; waiting for ${manifest.name} v${manifest.version}`)
    const remaining = deadline - now()
    if (remaining > 0) await sleep(Math.min(retryMs, remaining))
  }
  throw new Error(`Registry ${mode} did not complete within ${timeoutMs} ms after ${attempts} attempts (${url}): ${lastFailure}`)
}

async function main() {
  const mode = process.argv[2]
  if (!["preflight", "verify"].includes(mode)) {
    throw new Error("Usage: node scripts/check-mcp-registry-publication.mjs <preflight|verify>")
  }
  const manifest = JSON.parse(readFileSync("server.json", "utf8"))
  if (manifest.name !== process.env.EXPECTED_NAME || manifest.version !== process.env.EXPECTED_VERSION) {
    throw new Error("server.json must match EXPECTED_NAME and EXPECTED_VERSION")
  }
  const { entry, attempts, publishRequired } = await checkRegistryPublication(manifest, { mode })
  if (mode === "preflight") {
    appendFileSync(process.env.GITHUB_OUTPUT, `publish_required=${publishRequired}\n`)
    console.log(publishRequired ? "Exact Registry version is absent; publication required." : "Identical Registry version exists; verification only.")
    return
  }
  const official = entry._meta["io.modelcontextprotocol.registry/official"]
  const summary = {
    workflowCommit: process.env.GITHUB_SHA,
    registryVersion: entry.server.version,
    publicationStatus: official.status,
    npmPackageVersion: entry.server.packages.find((item) => item.registryType === "npm").version,
    stableRemoteUrl: entry.server.remotes.find((item) => item.type === "streamable-http").url,
    publicationTimestamp: official.publishedAt || official.updatedAt || null,
    outcome: process.env.PUBLISH_OUTCOME,
    verificationAttempts: attempts,
  }
  const json = `${JSON.stringify(summary, null, 2)}\n`
  writeFileSync(`${process.env.RUNNER_TEMP}/mcp-registry-after.json`, `${JSON.stringify(entry, null, 2)}\n`)
  writeFileSync(`${process.env.RUNNER_TEMP}/mcp-registry-publication-summary.json`, json)
  console.log(json)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main()
}
