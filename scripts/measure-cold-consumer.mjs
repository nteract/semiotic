#!/usr/bin/env node
/* global console, process */
/**
 * Generate or check the packed cold-consumer named-import baseline.
 *
 * Usage (after `npm run dist:prod`):
 *   node scripts/measure-cold-consumer.mjs --write
 *   node scripts/measure-cold-consumer.mjs --check
 *   node scripts/measure-cold-consumer.mjs --print
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  REPO_ROOT,
  measurePackedColdConsumerImports,
  renderReadmeBlock,
  replaceMarkerBlock,
  serializeReport,
} from "./lib/cold-consumer-measurement.mjs"

const args = new Set(process.argv.slice(2))
const write = args.has("--write")
const check = args.has("--check")
const print = args.has("--print")
const baselinePath = resolve(REPO_ROOT, "benchmarks/setup/cold-consumer-imports.json")
const readmePath = resolve(REPO_ROOT, "README.md")

if ([write, check, print].filter(Boolean).length > 1) {
  throw new Error("Use one of --write, --check, or --print")
}

const report = await measurePackedColdConsumerImports()
const reportText = serializeReport(report)
const readmeBlock = renderReadmeBlock(report)

if (print || (!write && !check)) {
  console.log(reportText)
  process.exit(0)
}

const readme = readFileSync(readmePath, "utf8")
const nextReadme = replaceMarkerBlock(readme, readmeBlock)
if (nextReadme == null) {
  throw new Error("README.md is missing the cold-consumer measurement marker block")
}

if (write) {
  writeFileSync(baselinePath, reportText)
  writeFileSync(readmePath, nextReadme)
  console.log(`✓ wrote ${baselinePath.slice(REPO_ROOT.length + 1)}`)
  console.log("✓ wrote README.md cold-consumer measurement block")
  process.exit(0)
}

const stale = []
if (!existsSync(baselinePath) || readFileSync(baselinePath, "utf8") !== reportText) {
  stale.push("benchmarks/setup/cold-consumer-imports.json")
}
if (nextReadme !== readme) stale.push("README.md")

if (stale.length > 0) {
  console.error("✗ packed cold-consumer measurements are stale:")
  for (const filePath of stale) console.error(`  - ${filePath}`)
  console.error("\nRebuild and regenerate with:")
  console.error("  npm run dist:prod && npm run docs:cold-consumer")
  process.exit(1)
}

console.log(`✓ packed cold-consumer named-import baseline is current (${report.measurements.length} public exports)`)
