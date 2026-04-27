/**
 * Re-baseline `ai/schema.json` from the chart-spec registry.
 *
 * For every chart registered in `chartSpecs.ts`, this script regenerates
 * its tool entry from `generateSchemaToolEntry`. Charts not yet in the
 * registry keep their existing canonical entries unchanged. The result is
 * written back to `ai/schema.json`.
 *
 * Run via `npm run docs:chart-specs:schema`. Phase 3a runs this once,
 * accepts the diff, and tightens the chart-specs round-trip test to
 * byte-for-byte schema equivalence.
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
const nextTools: SchemaTool[] = existing.tools.map((tool) => {
  const spec = CHART_SPECS[tool.function.name]
  if (!spec) {
    preservedCount++
    return tool
  }
  const composed = composeProps(spec)
  regeneratedCount++
  return generateSchemaToolEntry(spec, composed) as SchemaTool
})

const next: Schema = { ...existing, tools: nextTools }
writeFileSync(schemaPath, JSON.stringify(next, null, 2) + "\n", "utf8")

console.log(`✅ regenerated ${regeneratedCount} entries from CHART_SPECS, preserved ${preservedCount} canonical entries`)
console.log("   review: git diff ai/schema.json")
