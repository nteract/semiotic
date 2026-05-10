#!/usr/bin/env node
/**
 * Generate `ai/capabilities.json` from the chartSpecs capability
 * matrix. The CJS chart-suggestion path (`ai/chartSuggestions.cjs`)
 * loads this JSON to filter recommendations by capability — without
 * it, the suggestion logic can't reason over `supportsPush`,
 * `supportsLinkedHover`, etc.
 *
 * Usage: node scripts/generate-capabilities-json.mjs
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseCapabilityMatrix } from "./lib/capabilityMatrix.mjs"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, "..")
const OUT = path.join(ROOT, "ai/capabilities.json")

const entries = parseCapabilityMatrix()

// Emit as `{ ChartName: { …capability flags } }` for O(1) lookup
// keyed by chart name. The CJS suggestion path looks up the chart
// it's about to recommend, so name-keyed is the right shape.
const byName = {}
for (const e of entries) {
  byName[e.name] = {
    category: e.category,
    supportsLegend: e.legend,
    supportsSelection: e.selection,
    supportsLinkedHover: e.linkedHover,
    supportsPush: e.push,
    supportsSSR: e.ssr,
    colorModel: e.colorModel,
    layoutMode: e.layoutMode,
    specialFeatures: e.features,
  }
}

const output = {
  // Generated marker — guards against hand-edits and sets reader
  // expectations. The `__source` mirrors the convention in
  // `ai/schema.json`.
  __generated: true,
  __source: "src/components/charts/shared/chartSpecs.ts",
  charts: byName,
}

fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n")
console.log(`✅ wrote ${OUT}`)
console.log(`   ${entries.length} chart(s) indexed`)
