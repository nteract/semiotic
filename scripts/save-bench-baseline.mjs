#!/usr/bin/env node
/**
 * Capture the current bench run as the regression baseline.
 *
 * Run after merging an intentional perf change. Writes
 * `benchmarks/setup/baseline.json` with one row per benchmark name and
 * its observed mean (ms) and sample count. Commit the file alongside the perf change so
 * `npm run bench:compare` has something to compare against in CI.
 */
import { execSync } from "node:child_process"
import { writeFileSync, readFileSync, rmSync } from "node:fs"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"
import {
  collectVitestBenchmarks,
  printBenchmarkValidationErrors,
} from "./lib/bench-results.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

// `--output=<path>` overrides the destination so callers (e.g. the
// PR-vs-main orchestrator) can write to a temp file without disturbing
// the committed baseline.
const outArg = process.argv.find((a) => a.startsWith("--output="))
const baselinePath = outArg
  ? resolve(process.cwd(), outArg.slice("--output=".length))
  : join(repoRoot, "benchmarks/setup/baseline.json")

const tmpJson = join(tmpdir(), `semiotic-bench-${Date.now()}.json`)
console.log(`▶ running benchmarks → ${tmpJson}`)
execSync(`npx vitest bench --run --outputJson="${tmpJson}"`, {
  cwd: repoRoot,
  stdio: "inherit",
})

let raw
try {
  raw = JSON.parse(readFileSync(tmpJson, "utf8"))
} finally {
  // Don't leak the captured-output JSON to the OS temp dir — it can be
  // megabytes per run and accumulates across CI/local invocations.
  try { rmSync(tmpJson, { force: true }) } catch { /* best-effort */ }
}

const { benchmarks, errors } = collectVitestBenchmarks(raw)
if (errors.length > 0) {
  printBenchmarkValidationErrors(errors)
  console.error("Benchmark baseline was not written because the capture is incomplete.")
  process.exit(1)
}

let gitCommit = "unknown"
try {
  gitCommit = execSync("git rev-parse --short HEAD", { cwd: repoRoot, encoding: "utf8" }).trim()
} catch { /* noop */ }

const baseline = {
  timestamp: new Date().toISOString(),
  git_commit: gitCommit,
  node_version: process.version,
  benchmarks,
}

writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n")
console.log(`✅ wrote ${Object.keys(benchmarks).length} benchmarks → ${baselinePath.replace(repoRoot + "/", "")}`)
