#!/usr/bin/env node
/**
 * Capability-descriptor coverage check.
 *
 * Every HOC chart listed in `ai/capabilities.json` should either:
 *   (a) have a colocated `Foo.capability.ts` descriptor registered in
 *       `src/components/ai/chartCapabilities.ts`, or
 *   (b) appear in the deliberate-exclusion list at the bottom of this file
 *       (with a reason — realtime, custom-layout, multi-chart).
 *
 * Drift in either direction is a CI error.
 *
 * Rationale lives in `docs/strategy/chart-capability-layer.md` §
 * "Phase 2.6 — Capability coverage CI".
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "..")

const errors = []
const note = (msg) => errors.push(msg)

// 1. Load the chart inventory from the existing capabilities.json
const capabilitiesPath = path.join(repoRoot, "ai", "capabilities.json")
const inventory = JSON.parse(fs.readFileSync(capabilitiesPath, "utf8"))
const allCharts = Object.keys(inventory.charts ?? {}).sort()

// 2. Read the capability registry source and extract the components it imports.
const registryPath = path.join(
  repoRoot,
  "src",
  "components",
  "ai",
  "chartCapabilities.ts"
)
const registrySrc = fs.readFileSync(registryPath, "utf8")
const importedCapabilities = new Set()
const importRe =
  /import\s+\{\s*(\w+Capability)\s*\}\s+from\s+"[^"]+\/(\w+)\.capability"/g
let match
while ((match = importRe.exec(registrySrc)) !== null) {
  const componentName = match[2]
  importedCapabilities.add(componentName)
}

// 3. Deliberate exclusions — kept in sync with the comment block in chartCapabilities.ts.
//    Only includes charts that are in ai/capabilities.json. Custom-layout charts
//    (XY/Ordinal/NetworkCustomChart) and LinkedCharts aren't in capabilities.json
//    because they don't fit the standard chart-spec model.
const DELIBERATELY_EXCLUDED = new Map([
  [
    "RealtimeLineChart",
    "realtime — streaming source, static suggestion engine doesn't apply"
  ],
  ["RealtimeHistogram", "realtime — streaming source"],
  ["TemporalHistogram", "realtime sibling — streaming source"],
  ["RealtimeSwarmChart", "realtime"],
  ["RealtimeWaterfallChart", "realtime"],
  ["RealtimeHeatmap", "realtime"],
  ["ScatterplotMatrix", "multi-chart composition — data shape is a tuple"]
])

// 4. Cross-check
const missing = []
const unexpectedExclusion = []
for (const chart of allCharts) {
  const hasCapability = importedCapabilities.has(chart)
  const isExcluded = DELIBERATELY_EXCLUDED.has(chart)
  if (!hasCapability && !isExcluded) {
    missing.push(chart)
  }
  if (hasCapability && isExcluded) {
    unexpectedExclusion.push(chart)
  }
}

// 5. Charts in exclusion list but not in inventory (typo guard)
const inventorySet = new Set(allCharts)
const phantomExclusions = []
for (const chart of DELIBERATELY_EXCLUDED.keys()) {
  if (!inventorySet.has(chart)) phantomExclusions.push(chart)
}

// 6. Capability files that aren't imported (orphans)
const colocatedFiles = []
const chartDirs = ["xy", "ordinal", "network", "geo"]
for (const dir of chartDirs) {
  const dirPath = path.join(repoRoot, "src", "components", "charts", dir)
  if (!fs.existsSync(dirPath)) continue
  for (const file of fs.readdirSync(dirPath)) {
    if (file.endsWith(".capability.ts")) {
      const componentName = file.replace(".capability.ts", "")
      colocatedFiles.push(componentName)
    }
  }
}
const orphanFiles = colocatedFiles.filter((c) => !importedCapabilities.has(c))

if (missing.length) {
  note(
    `Charts in ai/capabilities.json without a registered capability descriptor:\n  ${missing.join(", ")}\n  Either add a *.capability.ts file and register it in src/components/ai/chartCapabilities.ts, or add an entry to DELIBERATELY_EXCLUDED in this script with a reason.`
  )
}
if (unexpectedExclusion.length) {
  note(
    `Charts that have a registered capability AND appear in DELIBERATELY_EXCLUDED:\n  ${unexpectedExclusion.join(", ")}\n  Remove them from one or the other.`
  )
}
if (phantomExclusions.length) {
  note(
    `DELIBERATELY_EXCLUDED entries that don't match any chart in ai/capabilities.json (typo?):\n  ${phantomExclusions.join(", ")}`
  )
}
if (orphanFiles.length) {
  note(
    `Capability descriptor files on disk but not imported by the registry:\n  ${orphanFiles.join(", ")}`
  )
}

if (errors.length) {
  console.error("❌ Capability coverage check failed:\n")
  for (const e of errors) console.error("  - " + e + "\n")
  process.exit(1)
}

const coveredCount = allCharts.length - DELIBERATELY_EXCLUDED.size
console.log(
  `✅ Capability coverage: ${importedCapabilities.size} descriptors registered, ${coveredCount} covered charts, ${DELIBERATELY_EXCLUDED.size} deliberate exclusions, ${allCharts.length} charts total.`
)
