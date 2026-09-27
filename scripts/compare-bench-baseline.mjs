#!/usr/bin/env node
/**
 * Run benchmarks and compare against `benchmarks/setup/baseline.json`.
 *
 * Fail on large absolute and relative regressions, either individually or
 * across a group of benchmarks. Smaller slowdowns remain visible as warnings.
 */
import { execSync } from "node:child_process"
import { readFileSync, existsSync, rmSync } from "node:fs"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"
import {
  collectCapturedBenchmarks,
  collectVitestBenchmarks,
  exactBenchmarkMembershipErrors,
  printBenchmarkValidationErrors,
} from "./lib/bench-results.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")

// `--baseline=<path>` and `--current=<path>` let the PR-vs-main orchestrator
// compare two captured runs without re-running benches inline. Useful for
// CI flows where main's baseline is captured fresh in the same run on the
// same hardware (apples-to-apples).
const argFor = (name) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`))
  return a ? resolve(process.cwd(), a.slice(`--${name}=`.length)) : null
}
const baselinePath = argFor("baseline") || join(repoRoot, "benchmarks/setup/baseline.json")
const currentPath = argFor("current")

// Percentage-only gates overstate small absolute changes: 2ms → 5ms is
// +150%, but adds only 3ms. Require BOTH relative and absolute growth for
// either failure tier. These are gate budgets, not proof that a slowdown is
// noise: keep smaller changes visible for review, including related cases.
const CATASTROPHIC_PCT = 100
const CATASTROPHIC_DELTA_MS = 10
const WARN_PCT = 25
const SYSTEMIC_DELTA_MS = 5
const FAIL_GROUP_COUNT = 5
// Skip relative reporting only while BOTH means remain sub-millisecond.
// A previously tiny benchmark must still fail if it becomes very slow.
const MIN_MEAN_MS = 1

if (!existsSync(baselinePath)) {
  console.error(`✗ no baseline at ${baselinePath}`)
  console.error("  Generate one via `npm run bench:baseline` and commit it.")
  process.exit(2)
}

const baselineCapture = JSON.parse(readFileSync(baselinePath, "utf8"))
const baselineResult = collectCapturedBenchmarks(baselineCapture, `baseline ${baselinePath}`)
if (baselineResult.errors.length > 0) {
  printBenchmarkValidationErrors(baselineResult.errors)
  process.exit(2)
}
const baseline = baselineResult.benchmarks
console.log(`▶ comparing against baseline ${baselineCapture.git_commit} (${new Date(baselineCapture.timestamp).toLocaleString()})`)

// Either consume a pre-captured `--current` JSON (PR-vs-main orchestrator)
// or run vitest bench inline. Both paths produce the same `current` shape:
// `{ [benchmarkName]: { mean, sampleCount, unit } }`.
let currentResult

if (currentPath) {
  if (!existsSync(currentPath)) {
    console.error(`✗ --current path does not exist: ${currentPath}`)
    process.exit(2)
  }
  // The orchestrator passes the output of save-bench-baseline.mjs which is
  // a `{ benchmarks: { [name]: { mean, sampleCount, unit } } }` object, not Vitest's raw
  // JSON. Handle both shapes.
  const captured = JSON.parse(readFileSync(currentPath, "utf8"))
  if (captured.benchmarks && !captured.files) {
    currentResult = collectCapturedBenchmarks(captured, `current capture ${currentPath}`)
  } else {
    currentResult = collectVitestBenchmarks(captured, `current Vitest output ${currentPath}`)
  }
} else {
  const tmpJson = join(tmpdir(), `semiotic-bench-${Date.now()}.json`)
  execSync(`npx vitest bench --run --outputJson="${tmpJson}"`, {
    cwd: repoRoot,
    stdio: "inherit",
  })
  let raw
  try {
    raw = JSON.parse(readFileSync(tmpJson, "utf8"))
  } finally {
    try { rmSync(tmpJson, { force: true }) } catch { /* best-effort */ }
  }
  currentResult = collectVitestBenchmarks(raw)
}

if (currentResult.errors.length > 0) {
  printBenchmarkValidationErrors(currentResult.errors)
  process.exit(2)
}
const current = currentResult.benchmarks

const membershipErrors = exactBenchmarkMembershipErrors(baseline, current)
if (membershipErrors.length > 0) {
  printBenchmarkValidationErrors(membershipErrors)
  console.error("Benchmark comparison stopped because baseline membership is not exact.")
  process.exit(1)
}

const catastrophic = []  // single-benchmark hard fails
const warns = []         // only sufficiently large deltas count toward systemic failure
const improvements = []
const belowNoiseFloor = []

for (const name of Object.keys(baseline)) {
  const baseMean = baseline[name].mean
  const currMean = current[name].mean
  if (baseMean < MIN_MEAN_MS && currMean < MIN_MEAN_MS) {
    // These values are still validated and membership-checked above. They are
    // simply outside the relative-performance threshold due to runner noise.
    belowNoiseFloor.push({ name, baseMean, currMean })
    continue
  }
  const delta = currMean - baseMean
  const pct = (delta / baseMean) * 100
  const row = { name, baseMean, currMean, pct, delta }
  if (pct >= CATASTROPHIC_PCT && delta >= CATASTROPHIC_DELTA_MS) catastrophic.push(row)
  else if (pct >= WARN_PCT) warns.push(row)
  else if (pct <= -WARN_PCT) improvements.push(row)
}

const systemicWarnings = warns.filter((row) => row.delta >= SYSTEMIC_DELTA_MS)
const systemic = systemicWarnings.length >= FAIL_GROUP_COUNT

console.log("")
console.log("📊 Bench comparison vs baseline")
console.log("=".repeat(60))
const fmt = (row) => `  ${row.name}: ${row.baseMean.toFixed(2)}ms → ${row.currMean.toFixed(2)}ms (${row.pct >= 0 ? "+" : ""}${row.pct.toFixed(1)}%, ${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(2)}ms)`

if (improvements.length > 0) {
  console.log(`✨ improvements (${improvements.length}):`)
  for (const r of improvements) console.log(fmt(r))
}
if (warns.length > 0) {
  console.log(`⚠ warnings (${warns.length}, ≥${WARN_PCT}% slower; ${systemicWarnings.length} add ≥${SYSTEMIC_DELTA_MS}ms toward systemic gate):`)
  for (const r of warns) {
    console.log(fmt(r) + (r.delta < SYSTEMIC_DELTA_MS ? " — informational" : ""))
  }
}
if (systemic) {
  console.log(`🔴 systemic regression (${systemicWarnings.length} warnings add ≥${SYSTEMIC_DELTA_MS}ms; limit ≥${FAIL_GROUP_COUNT}) — gate fail`)
}
if (catastrophic.length > 0) {
  console.log(`🔴 catastrophic regressions (${catastrophic.length}, ≥${CATASTROPHIC_PCT}% slower and ≥${CATASTROPHIC_DELTA_MS}ms added — gate fail):`)
  for (const r of catastrophic) console.log(fmt(r))
}
if (belowNoiseFloor.length > 0) {
  console.log(
    `ℹ ${belowNoiseFloor.length} benchmarks have both means below the ${MIN_MEAN_MS}ms ` +
    "relative-regression floor (validity and membership checked).",
  )
}

if (catastrophic.length > 0 || systemic) {
  console.log("")
  console.log("To accept this as the new baseline locally, run:")
  console.log("  npm run bench:baseline")
  console.log("(CI doesn't read baseline.json — the gate compares PR vs main on the same hardware.)")
  process.exit(1)
}
console.log(`✅ no catastrophic regressions; ${systemicWarnings.length}/${FAIL_GROUP_COUNT} systemic-warning quota (≥${SYSTEMIC_DELTA_MS}ms added each)`)
