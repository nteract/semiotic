#!/usr/bin/env node
/**
 * Check benchmark results against saved baselines.
 * Fails if any benchmark regresses >25% vs baseline.
 *
 * Usage (once vitest bench supports JSON output):
 *   npx vitest bench --reporter=json --outputFile=bench-results.json
 *   node scripts/check-bench-regression.js bench-results.json
 *
 * To update baselines after intentional changes:
 *   cp bench-results.json benchmarks/setup/baseline.json
 *
 * NOTE: As of vitest 4.x, `--reporter=json` does not work with `vitest bench`.
 * This script is ready for when upstream support lands. Until then, benchmarks
 * run in CI for visibility only (--reporter=verbose). The existing
 * scripts/save-baseline.js and scripts/compare-baseline.js use hardcoded values
 * and the same benchmarks/setup/baseline.json path.
 */

const fs = require("fs")
const path = require("path")

const THRESHOLD = 0.25 // 25% regression threshold
const BASELINE_PATH = path.join(__dirname, "..", "benchmarks", "setup", "baseline.json")
const resultsPath = process.argv[2]

if (!resultsPath) {
  console.error("Usage: node scripts/check-bench-regression.js <results.json>")
  process.exit(1)
}

if (!fs.existsSync(BASELINE_PATH)) {
  console.log("No baseline file found at benchmarks/setup/baseline.json")
  console.log("Saving current results as baseline...")
  fs.copyFileSync(resultsPath, BASELINE_PATH)
  console.log("Baseline saved. Future runs will compare against this.")
  process.exit(0)
}

let results, baselines
try {
  results = JSON.parse(fs.readFileSync(resultsPath, "utf8"))
  baselines = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"))
} catch (e) {
  console.error("Failed to parse JSON:", e.message)
  process.exit(1)
}

// Extract benchmark entries: vitest bench JSON has testResults[].assertionResults[]
// Each has { fullName, benchmark: { hz } }
function extractBenchmarks(data) {
  const map = new Map()
  const testResults = data.testResults || []
  for (const file of testResults) {
    for (const test of file.assertionResults || []) {
      if (test.benchmark && test.benchmark.hz) {
        map.set(test.fullName, test.benchmark.hz)
      }
    }
  }
  return map
}

const currentMap = extractBenchmarks(results)
const baselineMap = extractBenchmarks(baselines)

if (currentMap.size === 0) {
  console.log("No benchmark results found in", resultsPath)
  process.exit(0)
}

let regressions = 0
let improvements = 0
let unchanged = 0

console.log("\nBenchmark comparison (current vs baseline):\n")

for (const [name, currentHz] of currentMap) {
  const baselineHz = baselineMap.get(name)
  if (!baselineHz) {
    console.log(`  NEW  ${name}: ${currentHz.toFixed(0)} ops/s`)
    continue
  }

  const change = (currentHz - baselineHz) / baselineHz
  const pct = (change * 100).toFixed(1)
  const arrow = change > 0 ? "↑" : change < 0 ? "↓" : "="

  if (change < -THRESHOLD) {
    console.log(`  FAIL ${name}: ${currentHz.toFixed(0)} ops/s (${pct}% ${arrow} from ${baselineHz.toFixed(0)})`)
    regressions++
  } else if (change > THRESHOLD) {
    console.log(`  FAST ${name}: ${currentHz.toFixed(0)} ops/s (${pct}% ${arrow} from ${baselineHz.toFixed(0)})`)
    improvements++
  } else {
    console.log(`    OK ${name}: ${currentHz.toFixed(0)} ops/s (${pct}% ${arrow})`)
    unchanged++
  }
}

console.log(`\nSummary: ${unchanged} stable, ${improvements} faster, ${regressions} regressions`)

if (regressions > 0) {
  console.error(`\n${regressions} benchmark(s) regressed >25%. Fix the regression or update baselines:`)
  console.error("  npx vitest bench --reporter=json --outputFile=bench-results.json")
  console.error("  cp bench-results.json benchmarks/setup/baseline.json")
  process.exit(1)
}

console.log("\nAll benchmarks within threshold.")
