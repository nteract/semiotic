import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  CHART_SPECS,
  PROP_BAGS,
  composeProps
} from "../../src/components/charts/shared/chartSpecs"
import { CHART_DEFINITIONS } from "../../src/components/charts/shared/chartDefinitions"
import { ORDINAL_CHART_DEFINITIONS } from "../../src/components/charts/shared/chartDefinitionsOrdinal"
import { NETWORK_CHART_DEFINITIONS } from "../../src/components/charts/shared/chartDefinitionsNetwork"
import { PHYSICS_CHART_DEFINITIONS } from "../../src/components/charts/shared/chartDefinitionsPhysics"
import { REALTIME_CHART_DEFINITIONS } from "../../src/components/charts/shared/chartDefinitionsRealtime"
import { XY_CHART_DEFINITIONS } from "../../src/components/charts/shared/chartDefinitionsXY"
import { generateBuiltInRecipeSchemaTools } from "../../src/components/ai/builtInChartRecipes"
import { generateFamilyRegistrations } from "./chart-definition-generators"
import {
  generateSchemaToolEntry,
  generateSchemaToolEntryFromChartDefinition,
  generateChartClinicMetadata,
  generateChartClinicMetadataModule,
  generateKnownChartComponentsModule,
  generateValidationMap,
  generateValidationMapModule
} from "./chart-specs-generators.mjs"

/** Generation entry inputs; their transitive imports also affect the outputs. */
export const CHART_SPEC_INPUTS = [
  "src/components/charts/shared/chartSpecs.ts",
  "src/components/charts/shared/chartDefinitions.ts",
  "src/components/ai/builtInChartRecipes.ts",
  "scripts/lib/chart-specs-generators.mjs",
  "scripts/lib/chart-definition-generators.ts",
  "scripts/lib/chart-spec-artifacts.ts",
  "ai/schema.json (preserved non-registry entries)",
  "ai/componentMetadata.cjs (authored regions)"
] as const

interface SchemaTool {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
    "x-semiotic-kind"?: "recipe"
  }
}

interface Schema {
  $schema?: string
  name?: string
  version?: string
  description?: string
  tools: SchemaTool[]
}

/** Construct every output before writing; check and regeneration use the same projection. */
export function buildChartSpecArtifacts(repoRoot: string) {
  const registrations: Record<string, string> = {}
  let metadata = readFileSync(
    join(repoRoot, "ai/componentMetadata.cjs"),
    "utf8"
  )
  for (const [family, definitions] of [
    ["xy", XY_CHART_DEFINITIONS],
    ["ordinal", ORDINAL_CHART_DEFINITIONS],
    ["network", NETWORK_CHART_DEFINITIONS],
    ["physics", PHYSICS_CHART_DEFINITIONS],
    ["realtime", REALTIME_CHART_DEFINITIONS]
  ] as const) {
    const expected = Object.keys(CHART_SPECS).filter(
      (name) => CHART_SPECS[name].category === family
    )
    if (
      expected.length !== Object.keys(definitions).length ||
      expected.some((name) => !(name in definitions))
    ) {
      throw new Error(
        `Every ${family} chart spec must have exactly one chart definition`
      )
    }
    const generated = generateFamilyRegistrations(family, definitions, metadata)
    Object.assign(registrations, generated)
    metadata = generated["ai/componentMetadata.cjs"]
  }
  const existing: Schema = JSON.parse(
    readFileSync(join(repoRoot, "ai/schema.json"), "utf8")
  )
  function generateToolForSpec(
    name: string,
    spec: (typeof CHART_SPECS)[string]
  ): SchemaTool {
    const definition = CHART_DEFINITIONS[name as keyof typeof CHART_DEFINITIONS]
    if (definition) {
      return generateSchemaToolEntryFromChartDefinition(definition)
    }
    return generateSchemaToolEntry(spec, composeProps(spec))
  }

  let regeneratedCount = 0
  let preservedCount = 0
  const seen = new Set<string>()
  const existingChartTools = existing.tools.filter(
    (tool) => tool.function["x-semiotic-kind"] !== "recipe"
  )
  const nextTools: SchemaTool[] = existingChartTools.map((tool) => {
    const spec = CHART_SPECS[tool.function.name]
    if (!spec) {
      preservedCount++
      return tool
    }
    seen.add(tool.function.name)
    regeneratedCount++
    return generateToolForSpec(tool.function.name, spec)
  })

  // Append registry entries that the existing schema doesn't have yet, in
  // CHART_SPECS insertion order. Lets a brand-new chart land via a single
  // `npm run docs:chart-specs:schema` pass instead of a manual stub edit.
  let appendedCount = 0
  for (const [name, spec] of Object.entries(CHART_SPECS)) {
    if (seen.has(name)) continue
    nextTools.push(generateToolForSpec(name, spec))
    appendedCount++
  }

  nextTools.push(...generateBuiltInRecipeSchemaTools())

  const validationMap = generateValidationMap(CHART_SPECS, composeProps)
  const files: Record<string, string> = {
    "ai/schema.json":
      JSON.stringify({ ...existing, tools: nextTools }, null, 2) + "\n",
    "src/components/charts/shared/validationMap.generated.ts":
      generateValidationMapModule(validationMap, CHART_SPECS, PROP_BAGS),
    "src/components/charts/shared/knownChartComponents.ts":
      generateKnownChartComponentsModule(CHART_SPECS, validationMap),
    "src/components/ai/chartClinicMetadata.generated.ts":
      generateChartClinicMetadataModule(
        generateChartClinicMetadata(CHART_SPECS, CHART_DEFINITIONS)
      ),
    ...registrations
  }
  return {
    files,
    validationMap,
    regeneratedCount,
    preservedCount,
    appendedCount
  }
}
