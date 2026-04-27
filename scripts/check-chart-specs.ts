/**
 * Chart-specs round-trip gate (direct check).
 *
 * Asserts every entry in `CHART_SPECS` produces the same shape as the
 * canonical `ai/schema.json`, `validationMap.ts`, and
 * `ai/componentMetadata.cjs` entries — and that the *name sets* across
 * the four sources match exactly. With the schema/validation parity
 * gates removed, this script is the single guarantee that a chart can't
 * land in one source while skipping the registry.
 *
 * Runs in milliseconds (no vitest spin-up), so it's safe to chain after
 * `npm run test` in release/prepublish without re-paying vitest startup.
 *
 * Run via `npm run check:chart-specs`. Drift can come from any of the
 * four sources, so fix accordingly:
 *   - schema drift  → edit `chartSpecs.ts`, then run
 *                      `npm run docs:chart-specs:schema` to refresh
 *                      `ai/schema.json` from the registry.
 *   - validationMap → edit `src/components/charts/shared/validationMap.ts`
 *                      to match the spec (the registry's `composeProps`
 *                      output is the source of truth).
 *   - componentMetadata
 *                   → edit `ai/componentMetadata.cjs` so the chart appears
 *                      under the bucket named by `spec.category`.
 */
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { isDeepStrictEqual } from "node:util"

import { CHART_SPECS, composeProps } from "../src/components/charts/shared/chartSpecs"
import { VALIDATION_MAP } from "../src/components/charts/shared/validationMap"
// @ts-expect-error — generators emit `any`-typed schema fragments
import {
  generateSchemaToolEntry,
  generateValidationMapEntry,
  generateMetadataEntry,
} from "./lib/chart-specs-generators.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const require = createRequire(import.meta.url)

interface SchemaTool {
  type: "function"
  function: {
    name: string
    description: string
    parameters: { type: "object"; properties: Record<string, unknown>; required: string[] }
  }
}
interface Schema { tools: SchemaTool[] }

const schema: Schema = JSON.parse(readFileSync(join(repoRoot, "ai/schema.json"), "utf8"))
const componentMetadata = require(join(repoRoot, "ai/componentMetadata.cjs")) as {
  COMPONENTS_BY_CATEGORY: Record<string, string[]>
}

const errors: string[] = []
const fail = (msg: string) => errors.push(msg)

// 1. Set parity across all four sources.
const registryNames = new Set(Object.keys(CHART_SPECS))
const schemaNames = new Set(schema.tools.map((t) => t.function.name))
const validationNames = new Set(Object.keys(VALIDATION_MAP))
const metadataNames = new Set(Object.values(componentMetadata.COMPONENTS_BY_CATEGORY).flat())

function diffSets(label: string, actual: Set<string>, expected: Set<string>) {
  const missing = [...expected].filter((n) => !actual.has(n)).sort()
  const extra = [...actual].filter((n) => !expected.has(n)).sort()
  if (missing.length) fail(`${label} is missing: ${missing.join(", ")}`)
  if (extra.length) fail(`${label} has unexpected entries: ${extra.join(", ")}`)
}

diffSets("ai/schema.json (vs CHART_SPECS)", schemaNames, registryNames)
diffSets("validationMap.ts (vs CHART_SPECS)", validationNames, registryNames)
diffSets("ai/componentMetadata.cjs (vs CHART_SPECS)", metadataNames, registryNames)

// 2. Per-chart structural equivalence.
let checked = 0
for (const [name, spec] of Object.entries(CHART_SPECS)) {
  const composed = composeProps(spec)

  const generatedSchema = generateSchemaToolEntry(spec, composed)
  const canonicalSchema = schema.tools.find((t) => t.function.name === name)
  if (!canonicalSchema) {
    fail(`${name}: missing from ai/schema.json (run \`npm run docs:chart-specs:schema\`)`)
  } else if (!isDeepStrictEqual(generatedSchema, canonicalSchema)) {
    fail(`${name}: schema entry drift (regenerate ai/schema.json)`)
  }

  const generatedValidation = generateValidationMapEntry(spec, composed)
  const canonicalValidation = VALIDATION_MAP[name]
  if (!canonicalValidation) {
    fail(`${name}: missing from VALIDATION_MAP`)
  } else {
    if (!isDeepStrictEqual(generatedValidation.required, canonicalValidation.required)) {
      fail(`${name}: validationMap.required drift`)
    }
    if (generatedValidation.dataShape !== canonicalValidation.dataShape) {
      fail(`${name}: validationMap.dataShape drift`)
    }
    if (!isDeepStrictEqual(generatedValidation.dataAccessors, canonicalValidation.dataAccessors)) {
      fail(`${name}: validationMap.dataAccessors drift`)
    }
    const genKeys = new Set(Object.keys(generatedValidation.props))
    const canKeys = new Set(Object.keys(canonicalValidation.props))
    if (!isDeepStrictEqual(genKeys, canKeys)) {
      const missing = [...canKeys].filter((k) => !genKeys.has(k))
      const extra = [...genKeys].filter((k) => !canKeys.has(k))
      fail(`${name}: validationMap prop set drift (missing: ${missing.join(",") || "—"}; extra: ${extra.join(",") || "—"})`)
    }
    for (const propName of genKeys) {
      const gen = generatedValidation.props[propName]
      const can = canonicalValidation.props[propName]
      if (!can) continue
      if (!isDeepStrictEqual(gen.type, can.type)) {
        fail(`${name}.${propName}: validationMap type drift`)
      }
      if (can.enum && !isDeepStrictEqual(gen.enum, [...can.enum])) {
        fail(`${name}.${propName}: validationMap enum drift`)
      }
    }
  }

  const generatedMetadata = generateMetadataEntry(spec)
  if (generatedMetadata.name !== name) {
    fail(`${name}: metadata name mismatch`)
  }
  const bucket = componentMetadata.COMPONENTS_BY_CATEGORY[spec.category]
  if (!bucket || !bucket.includes(name)) {
    fail(`${name}: componentMetadata bucket "${spec.category}" missing entry`)
  }

  checked++
}

if (errors.length) {
  console.error("\n✗ chart-specs drift detected:\n")
  for (const err of errors) console.error(`  - ${err}`)
  console.error(
    "\nFix:" +
      "\n  - schema drift           → edit chartSpecs.ts, then run `npm run docs:chart-specs:schema`" +
      "\n  - validationMap drift    → edit src/components/charts/shared/validationMap.ts to match composeProps()" +
      "\n  - componentMetadata drift → edit ai/componentMetadata.cjs to bucket the chart under spec.category\n",
  )
  process.exit(1)
}

console.log(`✅ chart-specs round-trip clean (${checked} charts; schema/validation/metadata in sync)`)
