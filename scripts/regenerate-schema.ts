/**
 * Re-baseline `ai/schema.json` from the chart-spec registry.
 *
 * For every chart registered in `chartSpecs.ts`, this script regenerates
 * its tool entry from `generateSchemaToolEntry`. Charts not yet in the
 * registry keep their existing canonical entries unchanged. New charts
 * present in `CHART_SPECS` but missing from the existing schema are
 * appended at the end of the tools array (so a fresh registry entry is
 * one regeneration away from a green `check:chart-specs`). The result is
 * written back to `ai/schema.json`.
 *
 * Run via `npm run docs:chart-specs:schema`.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { CHART_SPECS, composeProps } from "../src/components/charts/shared/chartSpecs"
// .mjs file imported from .ts works under tsx
// @ts-expect-error — generators emit `any`-typed schema fragments
import { generateSchemaToolEntry } from "./lib/chart-specs-generators.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const schemaPath = join(repoRoot, "ai/schema.json")

interface SchemaTool {
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: Record<string, unknown>
      required: string[]
    }
  }
}

interface Schema {
  $schema?: string
  name?: string
  version?: string
  description?: string
  tools: SchemaTool[]
}

const existing: Schema = JSON.parse(readFileSync(schemaPath, "utf8"))

let regeneratedCount = 0
let preservedCount = 0
const seen = new Set<string>()
const nextTools: SchemaTool[] = existing.tools.map((tool) => {
  const spec = CHART_SPECS[tool.function.name]
  if (!spec) {
    preservedCount++
    return tool
  }
  seen.add(tool.function.name)
  const composed = composeProps(spec)
  regeneratedCount++
  return generateSchemaToolEntry(spec, composed) as SchemaTool
})

// Append registry entries that the existing schema doesn't have yet, in
// CHART_SPECS insertion order. Lets a brand-new chart land via a single
// `npm run docs:chart-specs:schema` pass instead of a manual stub edit.
let appendedCount = 0
for (const [name, spec] of Object.entries(CHART_SPECS)) {
  if (seen.has(name)) continue
  const composed = composeProps(spec)
  nextTools.push(generateSchemaToolEntry(spec, composed) as SchemaTool)
  appendedCount++
}

const next: Schema = { ...existing, tools: nextTools }
writeFileSync(schemaPath, JSON.stringify(next, null, 2) + "\n", "utf8")

const appendedNote = appendedCount > 0 ? `, appended ${appendedCount} new entries` : ""
console.log(`✅ regenerated ${regeneratedCount} entries from CHART_SPECS, preserved ${preservedCount} canonical entries${appendedNote}`)
console.log("   review: git diff ai/schema.json")
