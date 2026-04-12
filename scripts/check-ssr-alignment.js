#!/usr/bin/env node
/**
 * Check SSR alignment — verifies that serverChartConfigs.ts covers all HOC
 * chart types and that key props are threaded through.
 *
 * Fails CI if:
 * 1. An HOC chart exists but has no SSR config entry
 * 2. An SSR config entry references a chart that doesn't exist as an HOC
 * 3. Checked key props (currently oSort and cornerRadius) are missing from
 *    SSR configs for charts that support them
 *
 * Usage:
 *   node scripts/check-ssr-alignment.js
 */

const fs = require("fs")
const path = require("path")

const ROOT = path.resolve(__dirname, "..")
const CHARTS_DIR = path.join(ROOT, "src/components/charts")
const SSR_CONFIGS = path.join(ROOT, "src/components/server/serverChartConfigs.ts")
const VALIDATION_MAP = path.join(ROOT, "src/components/charts/shared/validationMap.ts")

// ── 1. Discover HOC chart names ────────────────────────────────────────

const HOC_DIRS = ["xy", "ordinal", "network", "geo"]
const hocsOnDisk = new Set()

for (const dir of HOC_DIRS) {
  const fullDir = path.join(CHARTS_DIR, dir)
  if (!fs.existsSync(fullDir)) continue
  for (const file of fs.readdirSync(fullDir)) {
    if (file.endsWith(".test.tsx") || file.endsWith(".test.ts")) continue
    if (file === "index.ts" || file === "index.tsx") continue
    if (!file.endsWith(".tsx")) continue
    const name = file.replace(".tsx", "")
    hocsOnDisk.add(name)
  }
}

// ── 2. Extract SSR config chart names ──────────────────────────────────

const ssrSource = fs.readFileSync(SSR_CONFIGS, "utf8")
const ssrNames = new Set()
const configRegex = /^\s+(\w+):\s/gm
let match
while ((match = configRegex.exec(ssrSource))) {
  // Only lines like "  BarChart: barChart," in CHART_CONFIGS
  if (/^[A-Z]/.test(match[1])) {
    ssrNames.add(match[1])
  }
}

// ── 3. Extract validation map chart names ──────────────────────────────

const validationSource = fs.readFileSync(VALIDATION_MAP, "utf8")
const validationNames = new Set()
const valRegex = /^\s+(\w+):\s*\{/gm
while ((match = valRegex.exec(validationSource))) {
  if (/^[A-Z]/.test(match[1])) {
    validationNames.add(match[1])
  }
}

// ── 4. Charts that are intentionally SSR-excluded ──────────────────────

const SSR_EXCLUDED = new Set([
  // Composite/wrapper charts — not standalone renderable
  "ScatterplotMatrix", "MinimapChart", "MultiAxisLineChart", "QuadrantChart",
  // Realtime-only charts — no static representation
  "RealtimeLineChart", "RealtimeHistogram", "RealtimeSwarmChart",
  "RealtimeWaterfallChart", "RealtimeHeatmap",
  // Animated hierarchy — no static representation
  "OrbitDiagram",
  // Geo charts with complex state
  "FlowMap", "DistanceCartogram",
])

// ── 5. Check alignment ────────────────────────────────────────────────

const errors = []

// HOCs missing from SSR
for (const hoc of hocsOnDisk) {
  if (SSR_EXCLUDED.has(hoc)) continue
  if (!ssrNames.has(hoc)) {
    errors.push(`HOC "${hoc}" exists in src/components/charts/ but has no SSR config in serverChartConfigs.ts`)
  }
}

// SSR configs referencing non-existent HOCs
for (const name of ssrNames) {
  if (!hocsOnDisk.has(name) && name !== "Sparkline") {
    // Sparkline is SSR-only, not an HOC
    errors.push(`SSR config "${name}" has no matching HOC in src/components/charts/`)
  }
}

// Validation map missing entries for HOCs
for (const hoc of hocsOnDisk) {
  if (!validationNames.has(hoc)) {
    errors.push(`HOC "${hoc}" missing from validationMap.ts (validateProps won't recognize it)`)
  }
}

// ── 6. Check key prop threading in SSR configs ─────────────────────────

// Props that should be in SSR configs when they exist on the HOC
const PROP_CHECKS = [
  { prop: "oSort", charts: ["BarChart", "StackedBarChart", "GroupedBarChart"], label: "sort/oSort" },
  { prop: "cornerRadius", charts: ["PieChart", "DonutChart"], label: "cornerRadius" },
]

for (const { prop, charts, label } of PROP_CHECKS) {
  for (const chart of charts) {
    if (!ssrNames.has(chart)) continue
    // Find the config block for this chart
    const configBlockRegex = new RegExp(`const \\w+[^}]+${chart}`, "s")
    // Simpler: just check if the prop name appears near the chart name
    const chartIdx = ssrSource.indexOf(`  ${chart}:`)
    if (chartIdx === -1) continue
    // Look backwards to find the config variable
    const beforeChart = ssrSource.slice(Math.max(0, chartIdx - 500), chartIdx)
    const varMatch = beforeChart.match(/const (\w+): ChartConfig[^}]*$/s)
    if (!varMatch) continue
    const varName = varMatch[1]
    // Find the full config block
    const blockStart = ssrSource.indexOf(`const ${varName}:`)
    const blockEnd = ssrSource.indexOf("\n}", blockStart) + 2
    const block = ssrSource.slice(blockStart, blockEnd)
    if (!block.includes(prop) && !block.includes(`rest.${prop.replace("oSort", "sort")}`)) {
      errors.push(`SSR config for "${chart}" is missing "${label}" prop threading`)
    }
  }
}

// ── 7. Report ──────────────────────────────────────────────────────────

if (errors.length > 0) {
  console.error("\nSSR Alignment Check FAILED:\n")
  for (const err of errors) {
    console.error(`  ✗ ${err}`)
  }
  console.error(`\n${errors.length} issue(s) found.`)
  console.error("Fix these in src/components/server/serverChartConfigs.ts and/or validationMap.ts")
  process.exit(1)
} else {
  console.log("✅ SSR alignment check passed")
  console.log(`   ${hocsOnDisk.size} HOC charts on disk`)
  console.log(`   ${ssrNames.size} SSR configs (+ ${SSR_EXCLUDED.size} intentionally excluded)`)
  console.log(`   ${validationNames.size} validation map entries`)
}
