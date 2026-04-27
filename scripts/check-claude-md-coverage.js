#!/usr/bin/env node
/**
 * CLAUDE.md coverage gate.
 *
 * Verifies that every chart in `VALIDATION_MAP` is mentioned in `CLAUDE.md`,
 * the prompt the AI assistant ships into agent contexts. Schema/validation
 * parity used to live here too; that's now construction-guaranteed by the
 * Chart Spec Registry (`check:chart-specs`), so this script focuses solely
 * on doc coverage — the one piece the registry doesn't cover.
 *
 * Run: node scripts/check-claude-md-coverage.js
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

console.log("\n[1/2] Parsing validationMap.ts VALIDATION_MAP...")
const validatePath = path.join(ROOT, "src", "components", "charts", "shared", "validationMap.ts")
const validationComponents = new Set()
try {
  const src = fs.readFileSync(validatePath, "utf-8")
  for (const m of src.matchAll(/^\s{2}(\w+):\s*\{/gm)) {
    const name = m[1]
    if (name[0] === name[0].toUpperCase()) validationComponents.add(name)
  }
  info(`${validationComponents.size} components found in VALIDATION_MAP`)
} catch (e) {
  warn(`Could not parse validationMap.ts: ${e.message}`)
}

console.log("\n[2/2] Scanning CLAUDE.md...")
const claudePath = path.join(ROOT, "CLAUDE.md")
const claudeComponents = new Set()
try {
  const md = fs.readFileSync(claudePath, "utf-8")
  for (const m of md.matchAll(/\*\*(\w+)\*\*/g)) {
    const name = m[1]
    if (
      name[0] === name[0].toUpperCase() &&
      name.length > 3 &&
      !["Props", "Summary", "Test", "Usage", "Quick", "Start", "Common", "Charts", "Layout", "Composition", "Views", "Network", "Realtime", "Ordinal", "IMPORTANT"].includes(name)
    ) {
      claudeComponents.add(name)
    }
  }
  info(`${claudeComponents.size} component names found in CLAUDE.md`)
} catch (e) {
  warn(`Could not read CLAUDE.md: ${e.message}`)
}

console.log("\n── Cross-reference ──────────────────────────────")
for (const name of validationComponents) {
  if (!claudeComponents.has(name)) {
    warn(`"${name}" is in VALIDATION_MAP but not documented in CLAUDE.md`)
  }
}
// Case-insensitive suffix match catches PascalCase geo components like
// `ChoroplethMap` / `FlowMap` / `ProportionalSymbolMap` that the
// previous all-lowercase `endsWith("map")` quietly skipped.
const CHART_SUFFIXES = ["chart", "plot", "diagram", "pack", "map", "treemap", "scatterplot"]
for (const name of claudeComponents) {
  if (!validationComponents.has(name)) {
    const lower = name.toLowerCase()
    if (CHART_SUFFIXES.some((suffix) => lower.endsWith(suffix))) {
      warn(`"${name}" is in CLAUDE.md but missing from VALIDATION_MAP`)
    }
  }
}

console.log("")
if (exitCode === 0) {
  console.log("✓ CLAUDE.md covers every VALIDATION_MAP component.\n")
} else {
  console.log("✗ CLAUDE.md drift detected. Update CLAUDE.md or VALIDATION_MAP to re-sync.\n")
}
process.exit(exitCode)
