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

// Two-tier gate, tuned so CI runner variance doesn't trip false positives
// while real regressions still fail the build:
//
//   1. CATASTROPHIC_PCT — a single benchmark this much slower fails on its
//      own. Real regressions like the historical 68ms→5000ms case (+7300%)
//      blow past this; isolated runner-noise spikes (we've observed +40%
//      on sub-3ms benchmarks even on identical code) don't.
//   2. WARN_PCT + FAIL_GROUP_COUNT — many simultaneous warnings indicate a
//      systemic regression touching a family of benchmarks, which is what
//      most real perf regressions look like. A code change that hurts the
//      scene builder, for example, typically slows 5+ scene benchmarks.
//
// Improvements always log but never fail.
const CATASTROPHIC_PCT = 100  // single-benchmark hard fail
const WARN_PCT = 25           // counts toward systemic-regression detection
const FAIL_GROUP_COUNT = 5    // ≥N warnings simultaneously = systemic fail
// Floor for tiny absolute means (sub-millisecond benchmarks). A 30% jump
// on a 0.05ms benchmark is 0.015ms — almost always noise. Skip the gate
// for benchmarks faster than this.
const MIN_MEAN_MS = 1

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

const catastrophic = []  // single-benchmark hard fails
const warns = []         // count toward systemic-regression detection
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
  if (pct >= CATASTROPHIC_PCT) catastrophic.push(row)
  else if (pct >= WARN_PCT) warns.push(row)
  else if (pct <= -WARN_PCT) improvements.push(row)
}

const newBenchmarks = Object.keys(current).filter((n) => !(n in baseline.benchmarks))
const systemic = warns.length >= FAIL_GROUP_COUNT

console.log("")
console.log("📊 Bench comparison vs baseline")
console.log("=".repeat(60))
const fmt = (row) => `  ${row.name}: ${row.baseMean.toFixed(2)}ms → ${row.currMean.toFixed(2)}ms (${row.pct >= 0 ? "+" : ""}${row.pct.toFixed(1)}%)`

if (improvements.length > 0) {
  console.log(`✨ improvements (${improvements.length}):`)
  for (const r of improvements) console.log(fmt(r))
}
if (warns.length > 0) {
  const label = systemic
    ? `${warns.length}, >${WARN_PCT}% slower — systemic regression (≥${FAIL_GROUP_COUNT}) — gate fail`
    : `${warns.length}, >${WARN_PCT}% slower — informational, single-benchmark warnings tolerated`
  console.log(`⚠ warnings (${label}):`)
  for (const r of warns) console.log(fmt(r))
}
if (catastrophic.length > 0) {
  console.log(`🔴 catastrophic regressions (${catastrophic.length}, >${CATASTROPHIC_PCT}% slower — gate fail):`)
  for (const r of catastrophic) console.log(fmt(r))
}
if (skipped.length > 0) {
  console.log(`ℹ skipped (${skipped.length}):`)
  for (const s of skipped) console.log(`  ${s}`)
}
if (newBenchmarks.length > 0) {
  console.log(`ℹ new benchmarks not in baseline (${newBenchmarks.length}):`)
  for (const n of newBenchmarks) console.log(`  ${n}`)
}

if (catastrophic.length > 0 || systemic) {
  console.log("")
  console.log("To accept this as the new baseline locally, run:")
  console.log("  npm run bench:baseline")
  console.log("(CI doesn't read baseline.json — the gate compares PR vs main on the same hardware.)")
  process.exit(1)
}
console.log(`✅ no catastrophic regressions; ${warns.length}/${FAIL_GROUP_COUNT} systemic-warning quota`)
