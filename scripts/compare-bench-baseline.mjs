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
import { readFileSync, existsSync, rmSync } from "node:fs"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"

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

// Either consume a pre-captured `--current` JSON (PR-vs-main orchestrator)
// or run vitest bench inline. Both paths produce the same `current` shape:
// `{ [benchmarkName]: meanMs }`.
const current = {}
const collectCurrent = (raw) => {
  for (const file of raw.files || []) {
    for (const group of file.groups || []) {
      for (const b of group.benchmarks || []) {
        // Only record benchmarks vitest actually timed — siblings without a
        // mean (see comment in save-bench-baseline.mjs) would otherwise read
        // back as `undefined` and silently disable the gate for that name.
        if (Number.isFinite(b.mean)) current[b.name] = b.mean
      }
    }
  }
}

if (currentPath) {
  if (!existsSync(currentPath)) {
    console.error(`✗ --current path does not exist: ${currentPath}`)
    process.exit(2)
  }
  // The orchestrator passes the output of save-bench-baseline.mjs which is
  // a `{ benchmarks: { [name]: { mean, unit } } }` object, not vitest's raw
  // JSON. Handle both shapes.
  const captured = JSON.parse(readFileSync(currentPath, "utf8"))
  if (captured.benchmarks && !captured.files) {
    for (const [name, entry] of Object.entries(captured.benchmarks)) {
      if (Number.isFinite(entry?.mean)) current[name] = entry.mean
    }
  } else {
    collectCurrent(captured)
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
  collectCurrent(raw)
}

const fails = []
const warns = []
const improvements = []
const skipped = []

for (const name of Object.keys(baseline.benchmarks)) {
  const baseMean = baseline.benchmarks[name].mean
  const currMean = current[name]
  // Defensive guard: an incomplete baseline entry (mean missing/non-finite)
  // would otherwise silently disable the gate for that benchmark via NaN
  // comparison short-circuiting. Surface it explicitly instead.
  if (!Number.isFinite(baseMean)) {
    skipped.push(`${name}: baseline mean is missing or non-numeric — regenerate baseline`)
    continue
  }
  if (!Number.isFinite(currMean)) {
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
