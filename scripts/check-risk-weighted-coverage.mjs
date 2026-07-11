#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { analyzeRiskWeightedCoverage } from "./lib/risk-weighted-coverage.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const args = process.argv.slice(2)
const jsonOnly = args.includes("--json")
const reportOnly = args.includes("--report-only")

function argumentValue(name, fallback) {
  const index = args.indexOf(name)
  if (index === -1) return fallback
  const value = args[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a path`)
  }
  return resolve(repoRoot, value)
}

function formatMetric(metric, value, floor) {
  const threshold = floor === undefined ? "" : ` (floor ${floor}%)`
  return `${metric.padEnd(10)} ${String(value.covered).padStart(6)}/${String(value.total).padEnd(6)} ${String(value.pct).padStart(6)}%${threshold}`
}

function markdownReport(report) {
  const rows = Object.entries(report.weighted)
    .map(([metric, value]) => `| ${metric} | ${value.covered}/${value.total} | ${value.pct}% | ${report.weightedFloors[metric]}% |`)
    .join("\n")
  const areas = report.riskAreas
    .map((area) => `| ${area.name} | ${area.weight}× | ${area.files} | ${area.coverage.branches.pct}% | ≥${area.branchFloor}% |`)
    .join("\n")
  const result = report.errors.length === 0 ? "passed" : "failed"

  return [
    `## Risk-weighted production coverage (${result})`,
    "",
    `${report.productionFiles} files under \`src/components\`; risk areas carry elevated weights while all other production files count once.`,
    "",
    "| Metric | Weighted covered/total | Coverage | Floor |",
    "| --- | ---: | ---: | ---: |",
    rows,
    "",
    "| Risk area | Weight | Files | Branch coverage | Floor |",
    "| --- | ---: | ---: | ---: | ---: |",
    areas,
    ...(report.errors.length === 0 ? [] : ["", "### Failures", "", ...report.errors.map((error) => `- ${error}`)]),
    "",
  ].join("\n")
}

function printReport(report) {
  console.log(`Risk-weighted production coverage (${report.productionFiles} files)`)
  for (const [metric, value] of Object.entries(report.weighted)) {
    console.log(formatMetric(metric, value, report.weightedFloors[metric]))
  }
  console.log("Risk areas (branch coverage):")
  for (const area of report.riskAreas) {
    console.log(`  ${area.name}: ${area.coverage.branches.pct}% (${area.files} files, ${area.weight}× weight, floor ${area.branchFloor}%)`)
  }
  console.log(`  ${report.defaultProduction.name}: ${report.defaultProduction.coverage.branches.pct}% (${report.defaultProduction.files} files, 1× weight)`)
}

function main() {
  const coveragePath = argumentValue("--coverage-file", "coverage/coverage-final.json")
  const reportPath = argumentValue("--report-file", "coverage/risk-weighted-summary.json")
  if (!existsSync(coveragePath)) {
    throw new Error(`coverage input not found: ${coveragePath}. Run npm run test:coverage first.`)
  }

  const coverageMap = JSON.parse(readFileSync(coveragePath, "utf8"))
  const report = analyzeRiskWeightedCoverage(coverageMap, { repoRoot })
  mkdirSync(dirname(reportPath), { recursive: true })
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)

  if (jsonOnly) console.log(JSON.stringify(report, null, 2))
  else printReport(report)

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdownReport(report)}\n`)
  }

  if (!reportOnly && report.errors.length > 0) {
    for (const error of report.errors) console.error(`✗ ${error}`)
    process.exitCode = 1
  }
}

try {
  main()
} catch (error) {
  console.error(`✗ Risk-weighted coverage gate failed: ${error.message}`)
  process.exitCode = 1
}
