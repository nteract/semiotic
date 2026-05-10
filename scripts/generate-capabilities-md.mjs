#!/usr/bin/env node
/**
 * Generate `docs/capabilities.md` from the chartSpecs capability
 * matrix. Drop-in markdown table for docs nav + AI/MCP capability
 * surfacing. Re-run after adding a chart entry; commit the result.
 *
 * Usage: node scripts/generate-capabilities-md.mjs
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseCapabilityMatrix } from "./lib/capabilityMatrix.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..")

const OUT = path.join(ROOT, "docs/capabilities.md")

const entries = parseCapabilityMatrix()

const tick = (b) => (b ? "✓" : "—")
const fmtFeatures = (xs) =>
  xs.length === 0 ? "—" : xs.map((x) => `\`${x}\``).join(" ")

const lines = []
lines.push("# Chart Capability Matrix")
lines.push("")
lines.push("> Generated from `src/components/charts/shared/chartSpecs.ts`. Do not")
lines.push("> edit by hand — re-run `npm run docs:capabilities` after adding a")
lines.push("> chart and commit the output.")
lines.push("")
lines.push(`Last regen: ${new Date().toISOString().slice(0, 10)} · ${entries.length} charts indexed.`)
lines.push("")
lines.push("**Column key**")
lines.push("")
lines.push("- **Legend**: top-level `showLegend` renders a swatch column.")
lines.push("- **Sel**: consumes a named `selection` to dim/highlight marks.")
lines.push("- **Hover**: produces a `linkedHover` for cross-chart highlight.")
lines.push("- **Push**: exposes a ref handle (`ref.current.push(...)`).")
lines.push("- **SSR**: registered in `serverChartConfigs.ts` for `renderChart()`.")
lines.push("- **Color**: `categorical`, `sequential`, `threshold`, `continuous`, or `none`.")
lines.push("- **Layout**: `plugin` (built-in), `custom` (escape hatch), `synthetic` (no layout).")
lines.push("")

// Display labels for category headings. Plain capitalization
// (`xy → Xy`) is wrong for the family acronyms — keep the surface
// consistent with how the docs and CLAUDE.md refer to them.
const CATEGORY_DISPLAY_LABEL = {
  xy: "XY",
  ordinal: "Ordinal",
  network: "Network",
  geo: "Geo",
  realtime: "Realtime",
}

let lastCategory = null
for (const e of entries) {
  if (e.category !== lastCategory) {
    if (lastCategory !== null) lines.push("")
    const label = CATEGORY_DISPLAY_LABEL[e.category] ?? e.category
    lines.push(`## ${label}`)
    lines.push("")
    lines.push("| Chart | Legend | Sel | Hover | Push | SSR | Color | Layout | Features |")
    lines.push("|---|:-:|:-:|:-:|:-:|:-:|---|---|---|")
    lastCategory = e.category
  }
  lines.push(
    `| **${e.name}** | ${tick(e.legend)} | ${tick(e.selection)} | ` +
    `${tick(e.linkedHover)} | ${tick(e.push)} | ${tick(e.ssr)} | ` +
    `${e.colorModel} | ${e.layoutMode} | ${fmtFeatures(e.features)} |`,
  )
}

lines.push("")
lines.push("---")
lines.push("")
lines.push("## Aggregate counts")
lines.push("")
const total = entries.length
const counts = {
  legend: entries.filter((e) => e.legend).length,
  push: entries.filter((e) => e.push).length,
  ssr: entries.filter((e) => e.ssr).length,
  customLayout: entries.filter((e) => e.layoutMode === "custom").length,
  synthetic: entries.filter((e) => e.layoutMode === "synthetic").length,
}
lines.push(`- ${counts.legend}/${total} charts render a top-level legend.`)
lines.push(`- ${counts.push}/${total} charts expose a push API.`)
lines.push(`- ${counts.ssr}/${total} charts SSR via the \`renderChart()\` registry.`)
lines.push(`- ${counts.customLayout}/${total} charts use the customLayout escape hatch.`)
lines.push(`- ${counts.synthetic}/${total} charts use synthetic (no-layout) construction.`)
lines.push("")

fs.writeFileSync(OUT, lines.join("\n"))
console.log(`✅ wrote ${OUT}`)
console.log(`   ${entries.length} chart(s) indexed across ${new Set(entries.map((e) => e.category)).size} categories`)
