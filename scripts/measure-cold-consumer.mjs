#!/usr/bin/env node
/* global console, process */
/**
 * Generate or check the packed cold-consumer named-import baseline.
 *
 * Usage (after `npm run dist:prod`):
 *   node scripts/measure-cold-consumer.mjs --write
 *   node scripts/measure-cold-consumer.mjs --check
 *   node scripts/measure-cold-consumer.mjs --print
 *   node scripts/measure-cold-consumer.mjs --check --tarball path/to/semiotic.tgz
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  REPO_ROOT,
  compareColdConsumerReports,
  measurePackedColdConsumerImports,
  readmeMarkerBlockError,
  renderReadmeBlock,
  replaceMarkerBlock,
  serializeReport,
  validateColdConsumerReport,
} from "./lib/cold-consumer-measurement.mjs"

const rawArgs = process.argv.slice(2)
const tarball = optionValue(rawArgs, "--tarball")
const args = new Set(rawArgs.filter((arg) => arg !== "--tarball" && arg !== tarball))
const write = args.has("--write")
const check = args.has("--check")
const print = args.has("--print")
const baselinePath = resolve(REPO_ROOT, "benchmarks/setup/cold-consumer-imports.json")
const readmePath = resolve(REPO_ROOT, "README.md")

if ([...args].some((arg) => !["--write", "--check", "--print"].includes(arg))) {
  throw new Error("Usage: node scripts/measure-cold-consumer.mjs [--write|--check|--print] [--tarball <path>]")
}
if ([write, check, print].filter(Boolean).length > 1) {
  throw new Error("Use one of --write, --check, or --print")
}

const baseline = check ? readBaselineReport(baselinePath) : null
const report = await measurePackedColdConsumerImports({ tarball })
const reportText = serializeReport(report)

if (print || (!write && !check)) {
  console.log(reportText)
  process.exit(0)
}

const readme = readFileSync(readmePath, "utf8")
const markerError = readmeMarkerBlockError(readme)
if (markerError) throw new Error(`README.md ${markerError}`)

const readmeBlock = renderReadmeBlock(write ? report : baseline)
const nextReadme = replaceMarkerBlock(readme, readmeBlock)
if (nextReadme == null) {
  throw new Error("README.md has an invalid cold-consumer measurement marker block")
}

if (write) {
  writeFileSync(baselinePath, reportText)
  writeFileSync(readmePath, nextReadme)
  console.log(`✓ wrote ${baselinePath.slice(REPO_ROOT.length + 1)}`)
  console.log("✓ wrote README.md cold-consumer measurement block")
  process.exit(0)
}

const comparison = compareColdConsumerReports(baseline, report)
const stale = []
if (!comparison.current) {
  stale.push("benchmarks/setup/cold-consumer-imports.json")
}
if (nextReadme !== readme) stale.push("README.md")

if (stale.length > 0) {
  console.error("✗ packed cold-consumer measurements are stale:")
  for (const filePath of stale) console.error(`  - ${filePath}`)
  if (comparison.structuralErrors.length > 0) {
    console.error("\nExact measurement-contract differences:")
    for (const error of comparison.structuralErrors) console.error(`  - ${error}`)
  }
  if (comparison.sizeDeltas.length > 0) {
    console.error("\nByte differences outside the supported runner variance:")
    for (const difference of comparison.sizeDeltas) {
      console.error(`  - ${formatSizeDifference(difference)}`)
    }
  }
  if (nextReadme !== readme) {
    console.error("\nREADME.md does not match the committed cold-consumer baseline.")
  }
  console.error(
    `\nCurrent runner: ${process.platform}/${process.arch}; Node ${process.version}; esbuild ${report.method.bundler.version}`,
  )
  console.error("\nFor an intentional contract or size change, rebuild and regenerate with:")
  console.error("  npm run dist:prod && npm run docs:cold-consumer")
  process.exit(1)
}

console.log(`✓ packed cold-consumer named-import baseline is current (${report.measurements.length} public exports)`)

function readBaselineReport(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(
      "Missing benchmarks/setup/cold-consumer-imports.json. Run `npm run dist:prod && npm run docs:cold-consumer` to create it.",
    )
  }

  let baseline
  try {
    baseline = JSON.parse(readFileSync(filePath, "utf8"))
  } catch (error) {
    throw new Error(
      `Could not parse benchmarks/setup/cold-consumer-imports.json: ${error.message}`,
      { cause: error },
    )
  }

  const errors = validateColdConsumerReport(baseline, "baseline")
  if (errors.length > 0) {
    throw new Error(
      `Invalid benchmarks/setup/cold-consumer-imports.json:\n${errors.map((error) => `  - ${error}`).join("\n")}`,
    )
  }
  return baseline
}

function formatSizeDifference({ importPath, symbol, metric, baselineBytes, currentBytes, delta, tolerance }) {
  const signedDelta = delta >= 0 ? `+${delta}` : String(delta)
  const percentage = baselineBytes === 0 ? "n/a" : `${((delta / baselineBytes) * 100).toFixed(3)}%`
  return `${importPath} (${symbol}) ${metric}: ${baselineBytes} B → ${currentBytes} B (${signedDelta} B, ${percentage}; allowed ±${tolerance} B)`
}

function optionValue(args, option) {
  const index = args.indexOf(option)
  if (index === -1) return null
  const value = args[index + 1]
  if (!value || value.startsWith("--") || args.indexOf(option, index + 1) !== -1) {
    throw new Error(`Missing value for ${option}`)
  }
  return value
}
