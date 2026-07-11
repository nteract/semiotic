/**
 * Run: node --test scripts/risk-weighted-coverage.test.mjs
 */
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { analyzeRiskWeightedCoverage, summarizeCoverageEntry } from "./lib/risk-weighted-coverage.mjs"

function coverageEntry({ statements = [1], functions = [1], branches = [[1, 1]], lines = [1] } = {}) {
  const statementMap = Object.fromEntries(lines.map((line, index) => [index, {
    start: { line, column: 0 },
    end: { line, column: 1 },
  }]))
  const statementCounts = Object.fromEntries(statements.map((count, index) => [index, count]))
  const functionCounts = Object.fromEntries(functions.map((count, index) => [index, count]))
  const branchCounts = Object.fromEntries(branches.map((counts, index) => [index, counts]))
  return { statementMap, s: statementCounts, f: functionCounts, b: branchCounts }
}

function completeRiskMap() {
  return {
    "/repo/src/components/stream/PipelineStore.ts": coverageEntry(),
    "/repo/src/components/stream/layouts/forceLayoutWorker.js": coverageEntry(),
    "/repo/src/components/charts/custom/XYCustomChart.tsx": coverageEntry(),
    "/repo/src/components/stream/CanvasHitTester.ts": coverageEntry(),
    "/repo/src/components/charts/network/processSankey/algorithm.ts": coverageEntry(),
    "/repo/src/components/Tooltip/Tooltip.tsx": coverageEntry(),
  }
}

describe("risk-weighted coverage", () => {
  it("counts a source line as covered when any statement on that line runs", () => {
    const summary = summarizeCoverageEntry(coverageEntry({
      statements: [0, 1],
      lines: [4, 4],
    }))

    assert.deepEqual(summary.lines, { total: 1, covered: 1, pct: 100 })
  })

  it("reports a passing weighted score when every designated risk area is covered", () => {
    const report = analyzeRiskWeightedCoverage(completeRiskMap(), { repoRoot: "/repo" })

    assert.equal(report.productionFiles, 6)
    assert.equal(report.errors.length, 0)
    assert.equal(report.weighted.branches.pct, 100)
    assert.equal(report.defaultProduction.files, 1)
    assert.deepEqual(
      report.riskAreas.map((area) => area.files),
      [1, 1, 1, 1, 1],
    )
  })

  it("fails the focused branch floor when lifecycle coverage regresses", () => {
    const coverage = completeRiskMap()
    coverage["/repo/src/components/stream/PipelineStore.ts"] = coverageEntry({
      branches: [[0, 0]],
    })

    const report = analyzeRiskWeightedCoverage(coverage, { repoRoot: "/repo" })

    assert.equal(
      report.errors.some((error) => error.includes("stream lifecycle and invalidation") && error.includes("branch coverage")),
      true,
    )
  })

  it("fails closed when a named risk area disappears from the denominator", () => {
    const coverage = completeRiskMap()
    delete coverage["/repo/src/components/stream/layouts/forceLayoutWorker.js"]

    const report = analyzeRiskWeightedCoverage(coverage, { repoRoot: "/repo" })

    assert.equal(
      report.errors.includes('risk area "worker protocol and startup" does not match any production coverage files'),
      true,
    )
  })
})
