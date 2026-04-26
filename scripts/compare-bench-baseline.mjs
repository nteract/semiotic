#!/usr/bin/env node
/**
 * Run benchmarks and compare against `benchmarks/setup/baseline.json`.
 *
 * Designed to fail PRs that introduce >FAIL_THRESHOLD perf regressions
 * on any individual benchmark, with a warning band below that. Tolerance
 * is generous because shared GitHub runners have meaningful variance —
 * the goal is to catch real regressions (e.g. 68ms → 5000ms), not noise.
 */
import { execSync } from "node:child_process"
import { readFileSync, existsSync } from "node:fs"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const baselinePath = join(repoRoot, "benchmarks/setup/baseline.json")

// Per-benchmark slowdown thresholds. Means: a single benchmark that's
// >FAIL_PCT% slower than baseline fails the run; >WARN_PCT% logs a warning
// but doesn't fail. Improvements log but never fail.
const FAIL_PCT = 30
const WARN_PCT = 15
// Floor for tiny absolute means (sub-millisecond benchmarks). A 30% jump
// on a 0.05ms benchmark is 0.015ms — almost always noise. Skip the gate
// for benchmarks faster than this.
const MIN_MEAN_MS = 0.5

if (!existsSync(baselinePath)) {
  console.error(`✗ no baseline at ${baselinePath}`)
  console.error("  Generate one via `npm run bench:baseline` and commit it.")
  process.exit(2)
}

const baseline = JSON.parse(readFileSync(baselinePath, "utf8"))
console.log(`▶ comparing against baseline ${baseline.git_commit} (${new Date(baseline.timestamp).toLocaleString()})`)

const tmpJson = join(tmpdir(), `semiotic-bench-${Date.now()}.json`)
execSync(`npx vitest bench --run --outputJson="${tmpJson}"`, {
  cwd: repoRoot,
  stdio: "inherit",
})

const raw = JSON.parse(readFileSync(tmpJson, "utf8"))
const current = {}
for (const file of raw.files || []) {
  for (const group of file.groups || []) {
    for (const b of group.benchmarks || []) {
      current[b.name] = b.mean
    }
  }
}

const fails = []
const warns = []
const improvements = []
const skipped = []

for (const name of Object.keys(baseline.benchmarks)) {
  const baseMean = baseline.benchmarks[name].mean
  const currMean = current[name]
  if (typeof currMean !== "number") {
    skipped.push(`${name}: baseline has it but current run produced no result`)
    continue
  }
  if (baseMean < MIN_MEAN_MS) {
    // Skip noise-prone sub-ms benchmarks rather than fire false positives.
    continue
  }
  const pct = ((currMean - baseMean) / baseMean) * 100
  const row = { name, baseMean, currMean, pct }
  if (pct >= FAIL_PCT) fails.push(row)
  else if (pct >= WARN_PCT) warns.push(row)
  else if (pct <= -WARN_PCT) improvements.push(row)
}

const newBenchmarks = Object.keys(current).filter((n) => !(n in baseline.benchmarks))

console.log("")
console.log("📊 Bench comparison vs baseline")
console.log("=".repeat(60))
const fmt = (row) => `  ${row.name}: ${row.baseMean.toFixed(2)}ms → ${row.currMean.toFixed(2)}ms (${row.pct >= 0 ? "+" : ""}${row.pct.toFixed(1)}%)`

if (improvements.length > 0) {
  console.log(`✨ improvements (${improvements.length}):`)
  for (const r of improvements) console.log(fmt(r))
}
if (warns.length > 0) {
  console.log(`⚠ warnings (${warns.length}, >${WARN_PCT}% slower):`)
  for (const r of warns) console.log(fmt(r))
}
if (fails.length > 0) {
  console.log(`🔴 regressions (${fails.length}, >${FAIL_PCT}% slower — gate fail):`)
  for (const r of fails) console.log(fmt(r))
}
if (skipped.length > 0) {
  console.log(`ℹ skipped (${skipped.length}):`)
  for (const s of skipped) console.log(`  ${s}`)
}
if (newBenchmarks.length > 0) {
  console.log(`ℹ new benchmarks not in baseline (${newBenchmarks.length}):`)
  for (const n of newBenchmarks) console.log(`  ${n}`)
}

if (fails.length > 0) {
  console.log("")
  console.log("To accept the regression as the new baseline, run:")
  console.log("  npm run bench:baseline")
  console.log("…and commit benchmarks/setup/baseline.json.")
  process.exit(1)
}
console.log(`✅ no regressions over ${FAIL_PCT}% threshold`)
