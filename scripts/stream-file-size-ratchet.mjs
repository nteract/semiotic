#!/usr/bin/env node
/**
 * Advisory size-drift report for the high-cost stream hosts and stores.
 *
 * The versioned baseline makes changes visible during M1 consolidation. It
 * intentionally has no max size and source drift never produces a nonzero
 * exit status. Treat growth as a prompt to extract shared policy when that is
 * the clearer design, not as an automatic reason to split a coherent module.
 *
 * Usage:
 *   node scripts/stream-file-size-ratchet.mjs
 *   node scripts/stream-file-size-ratchet.mjs --write
 *   node scripts/stream-file-size-ratchet.mjs --json
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(__dirname, "..")
export const STREAM_FILE_SIZE_BASELINE_PATH = resolve(
  REPO_ROOT,
  "benchmarks/setup/stream-file-size-baseline.json"
)
export const STREAM_FILE_SIZE_BASELINE_KIND =
  "semiotic-stream-file-size-advisory"
const STREAM_PATH_PREFIX = "src/components/stream/"

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value)
}

/** Count physical lines, matching the existing source-size gate. */
export function countPhysicalLines(contents) {
  if (contents.length === 0) return 0
  let lines = 0
  for (let index = 0; index < contents.length; index += 1) {
    if (contents[index] === 10) lines += 1
  }
  return contents[contents.length - 1] === 10 ? lines : lines + 1
}

export function validateStreamFileSizeBaseline(baseline) {
  const errors = []
  if (!isPlainObject(baseline)) return ["baseline must be an object"]

  if (baseline.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1")
  }
  if (baseline.baselineKind !== STREAM_FILE_SIZE_BASELINE_KIND) {
    errors.push(`baselineKind must be ${STREAM_FILE_SIZE_BASELINE_KIND}`)
  }
  if (typeof baseline.capturedAt !== "string" || baseline.capturedAt.length === 0) {
    errors.push("capturedAt must be a non-empty string")
  }
  if (baseline.policy?.mode !== "advisory") {
    errors.push("policy.mode must be advisory")
  }
  if (!Array.isArray(baseline.files) || baseline.files.length === 0) {
    errors.push("files must be a non-empty array")
    return errors
  }

  const paths = new Set()
  for (const [index, entry] of baseline.files.entries()) {
    const label = `files[${index}]`
    if (!isPlainObject(entry)) {
      errors.push(`${label} must be an object`)
      continue
    }
    if (typeof entry.path !== "string" || !entry.path.startsWith(STREAM_PATH_PREFIX)) {
      errors.push(`${label}.path must stay inside ${STREAM_PATH_PREFIX}`)
    } else if (paths.has(entry.path)) {
      errors.push(`${label}.path is duplicated: ${entry.path}`)
    } else {
      paths.add(entry.path)
    }
    if (!isNonNegativeInteger(entry.lines)) {
      errors.push(`${label}.lines must be a non-negative integer`)
    }
    if (!isNonNegativeInteger(entry.bytes)) {
      errors.push(`${label}.bytes must be a non-negative integer`)
    }
  }
  return errors
}

export function collectStreamFileSizes(
  baseline,
  { repoRoot = REPO_ROOT } = {}
) {
  const files = []
  const unavailable = []
  for (const entry of baseline.files) {
    const fullPath = resolve(repoRoot, entry.path)
    if (!existsSync(fullPath)) {
      unavailable.push(entry.path)
      continue
    }
    const contents = readFileSync(fullPath)
    files.push({
      path: entry.path,
      lines: countPhysicalLines(contents),
      bytes: contents.length,
    })
  }
  return { files, unavailable }
}

export function compareStreamFileSizeBaseline(baseline, currentFiles) {
  const currentByPath = new Map(currentFiles.map((entry) => [entry.path, entry]))
  const growth = []
  const reductions = []
  const unchanged = []

  for (const recorded of baseline.files) {
    const current = currentByPath.get(recorded.path)
    if (!current) continue
    const lineDelta = current.lines - recorded.lines
    const byteDelta = current.bytes - recorded.bytes
    const change = { path: recorded.path, recorded, current, lineDelta, byteDelta }
    if (lineDelta > 0 || byteDelta > 0) {
      growth.push(change)
    } else if (lineDelta < 0 || byteDelta < 0) {
      reductions.push(change)
    } else {
      unchanged.push(change)
    }
  }

  return { growth, reductions, unchanged }
}

export function createStreamFileSizeBaseline(files, capturedAt = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    baselineKind: STREAM_FILE_SIZE_BASELINE_KIND,
    capturedAt,
    policy: {
      mode: "advisory",
      reviewGuidance:
        "Report drift in the tracked stream hosts and stores. Review growth for duplicated scheduling or aggregation policy; do not impose a new hard file-size ceiling from this baseline.",
    },
    files: [...files].sort((a, b) => a.path.localeCompare(b.path)),
  }
}

export function formatStreamFileSizeReport(comparison, unavailable = []) {
  const lines = []
  if (comparison.growth.length === 0 && comparison.reductions.length === 0 && unavailable.length === 0) {
    return "✓ stream file-size advisory baseline matches exactly."
  }

  if (comparison.growth.length > 0) {
    lines.push(`⚠ ${comparison.growth.length} stream file-size growth signal${comparison.growth.length === 1 ? "" : "s"} (advisory):`)
    for (const change of comparison.growth) {
      lines.push(`  ${signed(change.lineDelta)} lines, ${signed(change.byteDelta)} bytes  ${change.path}`)
    }
  }
  if (comparison.reductions.length > 0) {
    lines.push(`✓ ${comparison.reductions.length} stream file-size reduction${comparison.reductions.length === 1 ? "" : "s"}:`)
    for (const change of comparison.reductions) {
      lines.push(`  ${signed(change.lineDelta)} lines, ${signed(change.byteDelta)} bytes  ${change.path}`)
    }
  }
  if (unavailable.length > 0) {
    lines.push(`⚠ ${unavailable.length} tracked stream source file${unavailable.length === 1 ? " is" : "s are"} unavailable:`)
    for (const path of unavailable) lines.push(`  ${path}`)
  }
  lines.push("Review growth for shared scheduling or aggregation extraction. This report is advisory and exits successfully for source drift.")
  return lines.join("\n")
}

export function readStreamFileSizeBaseline(
  baselinePath = STREAM_FILE_SIZE_BASELINE_PATH
) {
  if (!existsSync(baselinePath)) {
    throw new Error(`Missing ${relative(REPO_ROOT, baselinePath)}. Restore it or run the baseline writer after adding the tracked sources.`)
  }
  try {
    return JSON.parse(readFileSync(baselinePath, "utf8"))
  } catch (error) {
    throw new Error(`Could not parse ${relative(REPO_ROOT, baselinePath)}: ${error.message}`)
  }
}

function parseArguments(rawArgs) {
  const allowed = new Set(["--write", "--json", "--help"])
  const unknown = rawArgs.filter((arg) => !allowed.has(arg))
  if (unknown.length > 0) {
    throw new Error(`Unknown argument${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}`)
  }
  return {
    write: rawArgs.includes("--write"),
    json: rawArgs.includes("--json"),
    help: rawArgs.includes("--help"),
  }
}

export function runStreamFileSizeRatchet(rawArgs = process.argv.slice(2)) {
  const options = parseArguments(rawArgs)
  if (options.help) {
    process.stdout.write("Usage: node scripts/stream-file-size-ratchet.mjs [--write] [--json]\n")
    return 0
  }

  const baseline = readStreamFileSizeBaseline()
  const errors = validateStreamFileSizeBaseline(baseline)
  if (errors.length > 0) {
    throw new Error(`Invalid ${relative(REPO_ROOT, STREAM_FILE_SIZE_BASELINE_PATH)}:\n${errors.map((error) => `  - ${error}`).join("\n")}`)
  }

  const current = collectStreamFileSizes(baseline)
  if (options.write) {
    if (current.unavailable.length > 0) {
      throw new Error(`Cannot refresh the baseline while tracked sources are unavailable:\n${current.unavailable.map((path) => `  - ${path}`).join("\n")}`)
    }
    const next = createStreamFileSizeBaseline(current.files)
    writeFileSync(STREAM_FILE_SIZE_BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`)
    const output = { action: "wrote", baseline: next }
    process.stdout.write(options.json ? `${JSON.stringify(output, null, 2)}\n` : `✓ wrote ${relative(REPO_ROOT, STREAM_FILE_SIZE_BASELINE_PATH)}\n`)
    return 0
  }

  const comparison = compareStreamFileSizeBaseline(baseline, current.files)
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ baseline, comparison, unavailable: current.unavailable }, null, 2)}\n`)
  } else {
    process.stdout.write(`${formatStreamFileSizeReport(comparison, current.unavailable)}\n`)
  }
  return 0
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  try {
    process.exitCode = runStreamFileSizeRatchet()
  } catch (error) {
    console.error(`✗ stream file-size advisory baseline failed to run: ${error.message}`)
    process.exitCode = 1
  }
}
