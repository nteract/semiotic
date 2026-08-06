#!/usr/bin/env node
/**
 * Comprehensive AI reference coverage gate.
 *
 * Verifies that every chart in the Chart Spec Registry is mentioned in
 * `ai/reference.md`, the on-demand reference shipped with the package.
 * Schema/validation parity used to live here too; that's now
 * construction-guaranteed by the Chart Spec Registry (`check:chart-specs`),
 * so this script focuses solely on doc coverage — the one piece the registry
 * doesn't cover.
 *
 * Run: node scripts/check-ai-reference-coverage.js
 * Exit 0 = every component documented, 1 = drift detected.
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
let exitCode = 0

function warn(msg) {
  console.log(`  ⚠ ${msg}`)
  exitCode = 1
}

function info(msg) {
  console.log(`  ✓ ${msg}`)
}

console.log("\n[1/2] Parsing the Chart Spec Registry...")
// VALIDATION_MAP is generated from CHART_SPECS. Walk the per-family source
// registry instead of parsing generated runtime data so this coverage gate
// reports the canonical chart catalog directly.
const chartSpecsIndexPath = path.join(ROOT, "src", "components", "charts", "shared", "chartSpecs.ts")
const chartSpecsDir = path.join(ROOT, "src", "components", "charts", "shared")
const chartSpecComponents = new Set()
try {
  const indexSrc = fs.readFileSync(chartSpecsIndexPath, "utf-8")
  for (const fileMatch of indexSrc.matchAll(/from\s+"\.\/(chartSpecs\w+)"/g)) {
    const specSrc = fs.readFileSync(path.join(chartSpecsDir, `${fileMatch[1]}.ts`), "utf-8")
    for (const m of specSrc.matchAll(/^\s{2}(\w+):\s*\{/gm)) {
      const name = m[1]
      if (name[0] === name[0].toUpperCase()) chartSpecComponents.add(name)
    }
  }
  info(`${chartSpecComponents.size} components found in CHART_SPECS`)
} catch (e) {
  warn(`Could not parse chartSpecs.ts or its chartSpecs*.ts modules: ${e.message}`)
}

console.log("\n[2/2] Scanning ai/reference.md...")
const referencePath = path.join(ROOT, "ai", "reference.md")
const referenceComponents = new Set()
try {
  const md = fs.readFileSync(referencePath, "utf-8")
  for (const m of md.matchAll(/\*\*(\w+)\*\*/g)) {
    const name = m[1]
    if (
      name[0] === name[0].toUpperCase() &&
      name.length > 3 &&
      !["Props", "Summary", "Test", "Usage", "Quick", "Start", "Common", "Charts", "Layout", "Composition", "Views", "Network", "Realtime", "Ordinal", "IMPORTANT"].includes(name)
    ) {
      referenceComponents.add(name)
    }
  }
  info(`${referenceComponents.size} component names found in ai/reference.md`)
} catch (e) {
  warn(`Could not read ai/reference.md: ${e.message}`)
}

console.log("\n── Cross-reference ──────────────────────────────")
for (const name of chartSpecComponents) {
  if (!referenceComponents.has(name)) {
    warn(`"${name}" is in CHART_SPECS but not documented in ai/reference.md`)
  }
}
// Case-insensitive suffix match catches PascalCase geo components like
// `ChoroplethMap` / `FlowMap` / `ProportionalSymbolMap` that the
// previous all-lowercase `endsWith("map")` quietly skipped.
const CHART_SUFFIXES = ["chart", "plot", "diagram", "pack", "map", "treemap", "scatterplot"]
for (const name of referenceComponents) {
  if (!chartSpecComponents.has(name)) {
    const lower = name.toLowerCase()
    if (CHART_SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
      warn(`"${name}" is in ai/reference.md but missing from CHART_SPECS`)
    }
  }
}

console.log("")
if (exitCode === 0) {
  console.log("✓ ai/reference.md covers every CHART_SPECS component.\n")
} else {
  console.log("✗ AI reference drift detected. Update ai/reference.md or CHART_SPECS to re-sync.\n")
}
process.exit(exitCode)
