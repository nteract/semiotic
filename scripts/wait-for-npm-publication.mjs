#!/usr/bin/env node
import { execFile } from "node:child_process"
import { readFileSync } from "node:fs"
import { setTimeout as sleep } from "node:timers/promises"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const REGISTRY = "https://registry.npmjs.org"
const TRANSIENT_CODES = new Set([
  "E404",
  "ETARGET",
  "E408",
  "E429",
  "E500",
  "E502",
  "E503",
  "E504",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT"
])

export async function readNpmPublication({
  packageName,
  version,
  timeoutMs,
  exec = execFileAsync
}) {
  let stdout
  try {
    ;({ stdout } = await exec(
      "npm",
      [
        "view",
        `${packageName}@${version}`,
        "--json",
        `--registry=${REGISTRY}`,
        "--prefer-online",
        "--offline=false",
        "--fetch-retries=0",
        `--fetch-timeout=${timeoutMs}`
      ],
      { timeout: timeoutMs, maxBuffer: 1024 * 1024 }
    ))
  } catch (error) {
    let detail
    try {
      detail = JSON.parse(error.stdout)?.error
    } catch {
      /* npm can fail before producing JSON. */
    }
    const code = detail?.code ?? (error.killed ? "ETIMEDOUT" : error.code)
    const reason = detail?.summary ?? error.stderr?.trim() ?? error.message
    if (TRANSIENT_CODES.has(code))
      return { pending: `${code}: ${reason}`, code }
    throw new Error(`npm registry query failed (${code}): ${reason}`, {
      cause: error
    })
  }
  // Invalid successful responses are errors, not evidence of propagation.
  return { manifest: JSON.parse(stdout) }
}

export async function waitForNpmPublication({
  packageName,
  version,
  expectedIntegrity,
  timeoutMs = 15 * 60_000,
  intervalMs = 15_000,
  read = readNpmPublication,
  now = Date.now,
  pause = sleep,
  log = console.log
}) {
  if (
    !packageName ||
    !version ||
    !/^sha512-\S+$/.test(expectedIntegrity ?? "")
  ) {
    throw new Error(
      "Package name, version and expected sha512 integrity are required"
    )
  }
  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0 ||
    !Number.isFinite(intervalMs) ||
    intervalMs <= 0
  ) {
    throw new Error("Publication timeout and interval must be positive")
  }
  const deadline = now() + timeoutMs
  let lastStatus = "no registry response"
  log(
    `Waiting up to ${timeoutMs / 1000}s for ${packageName}@${version} on ${REGISTRY}`
  )
  while (now() < deadline) {
    const result = await read({
      packageName,
      version,
      timeoutMs: Math.min(10_000, deadline - now())
    })
    if (result.manifest) {
      const manifest = result.manifest
      if (manifest.name !== packageName || manifest.version !== version) {
        throw new Error(
          `Registry returned an unexpected package identity for ${packageName}@${version}`
        )
      }
      const dist = manifest.dist ?? {}
      if (dist.integrity && dist.integrity !== expectedIntegrity) {
        throw new Error(
          `Published package integrity does not match the immutable release artifact\nExpected: ${expectedIntegrity}\nPublished: ${dist.integrity}`
        )
      }
      const nonempty = (value) =>
        Array.isArray(value) ? value.length > 0 : Boolean(value)
      if (
        dist.integrity &&
        nonempty(dist.signatures) &&
        nonempty(dist.attestations)
      ) {
        log(
          `Verified ${packageName}@${version}: exact integrity, registry signatures and provenance`
        )
        return manifest
      }
      lastStatus =
        "version is visible; waiting for integrity, signatures and provenance metadata"
    } else {
      lastStatus = result.pending ?? "version is not yet visible"
    }
    const remaining = deadline - now()
    log(
      `${lastStatus} (${Math.max(0, Math.ceil(remaining / 1000))}s remaining)`
    )
    if (remaining > 0) await pause(Math.min(intervalMs, remaining))
  }
  throw new Error(
    `npm publication was not ready after ${timeoutMs / 1000}s. Last registry status: ${lastStatus}. ` +
      "An accepted upload may still be processing; check registry availability before retrying publication."
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    if (
      process.argv.length !== 4 ||
      process.argv[2] !== "--expected-integrity"
    ) {
      throw new Error(
        "Usage: node scripts/wait-for-npm-publication.mjs --expected-integrity sha512-…"
      )
    }
    const { name, version } = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8")
    )
    await waitForNpmPublication({
      packageName: name,
      version,
      expectedIntegrity: process.argv[3]
    })
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
