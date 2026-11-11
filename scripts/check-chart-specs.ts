/**
 * Chart-specs round-trip gate (direct check).
 *
 * Asserts every entry in `CHART_SPECS` produces the same shape as the
 * canonical `ai/schema.json`, the generated runtime validation/Chart Clinic
 * maps, and `ai/componentMetadata.cjs` entries — and that the *name sets* across
 * downstream sources match exactly. With the schema/validation parity
 * gates removed, this script is the single guarantee that a chart can't
 * land in one source while skipping the registry.
 *
 * Runs in milliseconds (no vitest spin-up), so it's safe to chain after
 * `npm run test` in release/prepublish without re-paying vitest startup.
 *
 * Run via `npm run check:chart-specs`. Drift can come from the registry,
 * generated schema, or metadata buckets, so fix accordingly:
 *   - schema drift  → edit `chartSpecs.ts`, then run
 *                      `npm run docs:chart-specs:schema` to refresh
 *                      `ai/schema.json` from the registry.
 *   - validationMap → edit `chartSpecs.ts`, then run
 *                      `npm run docs:chart-specs:schema` to refresh the
 *                      generated runtime artifact.
 *   - componentMetadata
 *                   → regenerate XY/ordinal/network/physics/realtime registrations from their definitions;
 *                      edit `ai/componentMetadata.cjs` for other categories.
 */
import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { isDeepStrictEqual } from "node:util"
import { buildChartSpecArtifacts } from "./lib/chart-spec-artifacts"
import { loadPublicChartPropTypes } from "./lib/public-chart-prop-types"

import {
  findUndeclaredPublicProps,
  publicTypesRejectedBySpec,
  serializableRuntimeTypes,
  unsupportedPublicEnumValues
} from "./lib/public-chart-prop-parity"

import {
  CHART_SPECS,
  PROP_BAGS,
  composeProps
} from "../src/components/charts/shared/chartSpecs"
import { CHART_DEFINITIONS } from "../src/components/charts/shared/chartDefinitions"
import { VALIDATION_MAP } from "../src/components/charts/shared/validationMap"
import { KNOWN_CHART_COMPONENTS } from "../src/components/charts/shared/knownChartComponents"
import { generateBuiltInRecipeSchemaTools } from "../src/components/ai/builtInChartRecipes"
import {
  generateSchemaToolEntry,
  generateSchemaToolEntryFromChartDefinition,
  generateMetadataEntry
} from "./lib/chart-specs-generators.mjs"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..")
const require = createRequire(import.meta.url)
const sourceContractOnly = process.argv.includes("--source-contract-only")

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
    "x-semiotic-kind"?: "recipe"
  }
}
interface Schema {
  tools: SchemaTool[]
}

const schema: Schema = JSON.parse(
  readFileSync(join(repoRoot, "ai/schema.json"), "utf8")
)
const componentMetadata = require(
  join(repoRoot, "ai/componentMetadata.cjs")
) as {
  COMPONENTS_BY_CATEGORY: Record<string, string[]>
}
const errors: string[] = []
const fail = (msg: string) => errors.push(msg)

type SpecOnlyClassification = "server-only" | "compatibility"
interface SpecOnlyException {
  classification: SpecOnlyClassification
  reason: string
}

// Public React props that stay out of the serialized schema are no longer
// classified here. They are declared in the chart specs with `omitFromSchema`
// and a `runtimeOnly` reason (see chartSpecCore.ts), so `validateProps` and
// this parity check read one declaration; section 3 below verifies it.

interface PublicEnumValueException {
  classification: "compatibility"
  reason: string
  values: readonly string[]
}

const specOnly = (
  classification: SpecOnlyClassification,
  reason: string,
  props: string[]
): Record<string, SpecOnlyException> =>
  Object.fromEntries(props.map((prop) => [prop, { classification, reason }]))

const STATIC_FRAME_PROP =
  "renderChart forwards this setting to the static Stream Frame; the React wrapper exposes the equivalent only through frameProps."
const STATIC_CHROME_PROP =
  "The static renderer supports this chart chrome directly; the React wrapper intentionally owns a narrower composed-chart surface."
const SHARED_BAG_COMPAT =
  "Retained in the permissive serialized contract through a shared prop bag for backward compatibility; this chart has no corresponding React encoding."
const SERVER_ALIAS =
  "The serialized/server renderer supports this generic alias; the React wrapper exposes a chart-specific prop instead."

/**
 * Props accepted by serialized/server chart configs but intentionally absent
 * from the corresponding React wrapper. Keeping these exceptions adjacent to
 * the executable parity check makes the distinction reviewable: a server-only
 * field is not silently lumped together with a legacy compatibility alias.
 */
const SPEC_ONLY_PROP_EXCEPTIONS: Record<
  string,
  Record<string, SpecOnlyException>
> = {
  PieChart: specOnly("compatibility", SHARED_BAG_COMPAT, ["showGrid"]),
  DonutChart: specOnly("compatibility", SHARED_BAG_COMPAT, ["showGrid"]),
  GaugeChart: specOnly("compatibility", SHARED_BAG_COMPAT, [
    "showLegend",
    "legendInteraction",
    "legendPosition",
    "showGrid",
    "colorBy",
    "colorScheme"
  ]),
  FunnelChart: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, ["showGrid"]),
    ...specOnly("server-only", STATIC_CHROME_PROP, [
      "categoryLabel",
      "valueLabel",
      "showCategoryTicks"
    ])
  },
  RadarChart: {
    ...specOnly("server-only", STATIC_CHROME_PROP, [
      "categoryLabel",
      "valueLabel",
      "showCategoryTicks"
    ])
  },
  LikertChart: specOnly("compatibility", SHARED_BAG_COMPAT, ["colorBy"]),
  BumpChart: specOnly("server-only", SERVER_ALIAS, ["colorBy"]),
  AreaChart: specOnly("server-only", STATIC_FRAME_PROP, [
    "xScaleType",
    "yScaleType"
  ]),
  DifferenceChart: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, ["colorBy", "colorScheme"]),
    ...specOnly("server-only", STATIC_FRAME_PROP, ["xScaleType", "yScaleType"])
  },
  StackedAreaChart: specOnly("server-only", STATIC_FRAME_PROP, [
    "xScaleType",
    "yScaleType"
  ]),
  BubbleChart: specOnly("server-only", STATIC_FRAME_PROP, [
    "xScaleType",
    "yScaleType"
  ]),
  Heatmap: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, ["showGrid", "colorBy"]),
    ...specOnly("server-only", STATIC_FRAME_PROP, ["xScaleType", "yScaleType"])
  },
  WaterfallChart: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, ["colorBy", "colorScheme"]),
    ...specOnly("server-only", STATIC_FRAME_PROP, ["yScaleType"])
  },
  QuadrantChart: specOnly("server-only", STATIC_FRAME_PROP, [
    "xScaleType",
    "yScaleType"
  ]),
  MultiAxisLineChart: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, ["colorBy"]),
    ...specOnly("server-only", STATIC_FRAME_PROP, ["xScaleType", "yScaleType"])
  },
  CandlestickChart: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, [
      "showLegend",
      "legendInteraction",
      "legendPosition",
      "colorBy",
      "colorScheme"
    ]),
    ...specOnly("server-only", STATIC_FRAME_PROP, ["xScaleType", "yScaleType"])
  },
  ConnectedScatterplot: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, [
      "showLegend",
      "legendPosition",
      "colorBy",
      "colorScheme"
    ]),
    ...specOnly("server-only", STATIC_FRAME_PROP, ["xScaleType", "yScaleType"])
  },
  ScatterplotMatrix: specOnly("compatibility", SHARED_BAG_COMPAT, [
    "enableHover",
    "legendInteraction",
    "legendPosition",
    "annotations"
  ]),
  MinimapChart: specOnly("compatibility", SHARED_BAG_COMPAT, [
    "legendInteraction",
    "annotations"
  ]),
  ForceDirectedGraph: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, ["showGrid"]),
    ...specOnly("server-only", STATIC_CHROME_PROP, ["annotations"])
  },
  SankeyDiagram: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, ["showGrid"]),
    ...specOnly("server-only", STATIC_CHROME_PROP, ["annotations"])
  },
  ProcessSankey: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, [
      "legendInteraction",
      "showGrid"
    ]),
    ...specOnly("server-only", STATIC_CHROME_PROP, ["annotations"])
  },
  ChordDiagram: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, ["showGrid"]),
    ...specOnly("server-only", STATIC_CHROME_PROP, ["annotations"])
  },
  TreeDiagram: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, ["showGrid"]),
    ...specOnly("server-only", STATIC_CHROME_PROP, ["annotations"])
  },
  Treemap: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, ["showGrid"]),
    ...specOnly("server-only", STATIC_CHROME_PROP, ["annotations"])
  },
  CirclePack: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, ["showGrid"]),
    ...specOnly("server-only", STATIC_CHROME_PROP, ["annotations"])
  },
  OrbitDiagram: specOnly("compatibility", SHARED_BAG_COMPAT, ["showGrid"]),
  ChoroplethMap: specOnly("compatibility", SHARED_BAG_COMPAT, [
    "showGrid",
    "colorBy"
  ]),
  ProportionalSymbolMap: specOnly("compatibility", SHARED_BAG_COMPAT, [
    "showGrid"
  ]),
  FlowMap: {
    ...specOnly("compatibility", SHARED_BAG_COMPAT, ["showGrid"]),
    ...specOnly("server-only", SERVER_ALIAS, ["colorBy"])
  },
  DistanceCartogram: specOnly("compatibility", SHARED_BAG_COMPAT, [
    "legendInteraction",
    "showGrid"
  ]),
  CollisionSwarmChart: specOnly("server-only", SERVER_ALIAS, ["ballRadius"]),
  GauntletChart: specOnly("server-only", SERVER_ALIAS, [
    "colorBy",
    "ballRadius"
  ]),
  CrucibleChart: specOnly("server-only", SERVER_ALIAS, ["ballRadius"]),
  PacketFlowChart: specOnly("compatibility", SHARED_BAG_COMPAT, [
    "margin",
    "enableHover",
    "showLegend",
    "legendInteraction",
    "showGrid",
    "colorScheme"
  ]),
  ChainReactionChart: specOnly("compatibility", SHARED_BAG_COMPAT, [
    "size",
    "summary",
    "chartId",
    "emphasis",
    "colorBy",
    "ballRadius",
    "hoverRadius",
    "paused",
    "responsiveRules",
    "mobileSemantics",
    "mobileInteraction",
    "color",
    "stroke",
    "strokeWidth",
    "opacity",
    "annotations",
    "autoPlaceAnnotations",
    "background",
    "legendPosition",
    "legendLayout",
    "selection",
    "linkedHover",
    "loading"
  ])
}

/** Requiredness differences that are not covered by the normal push-mode rule. */
const REQUIREDNESS_EXCEPTIONS: Record<string, Record<string, string>> = {
  StackedAreaChart: {
    areaBy:
      "Serialized flat-data proposals require an explicit series key; the React API also supports intentional single-area and pre-grouped inputs."
  }
}

/**
 * Public React literal values retained only so a 3.x consumer keeps compiling.
 * They are excluded from serialized schemas when the runtime deliberately
 * normalizes them instead of implementing the advertised behavior.
 */
const PUBLIC_ENUM_VALUE_EXCEPTIONS: Record<
  string,
  Record<string, PublicEnumValueException>
> = Object.fromEntries(
  [
    "RealtimeLineChart",
    "RealtimeHistogram",
    "TemporalHistogram",
    "RealtimeSwarmChart",
    "RealtimeWaterfallChart",
    "RealtimeHeatmap"
  ].map((chart) => [
    chart,
    {
      arrowOfTime: {
        classification: "compatibility",
        reason:
          "The shared 3.x React type retains up/down for source compatibility, but realtime XY charts normalize them to the default horizontal layout; serialized configs expose only functional left/right values.",
        values: ["up", "down"]
      }
    }
  ])
)

// The writer and checker share one complete artifact projection.
const { files: generatedArtifacts, validationMap: generatedValidationMap } =
  buildChartSpecArtifacts(repoRoot)
for (const [relativePath, expected] of Object.entries(generatedArtifacts)) {
  let actual: string | undefined
  try {
    actual = readFileSync(join(repoRoot, relativePath), "utf8")
  } catch {
    // Report missing outputs as drift.
  }
  if (actual !== expected) {
    fail(`${relativePath} drifted (run npm run docs:chart-specs:schema)`)
  }
}

// 1. Set parity across all five sources.
const registryNames = new Set(Object.keys(CHART_SPECS))
const schemaNames = new Set(
  schema.tools
    .filter((tool) => tool.function["x-semiotic-kind"] !== "recipe")
    .map((tool) => tool.function.name)
)
const validationNames = new Set(Object.keys(VALIDATION_MAP))
const knownComponentNames = new Set<string>(KNOWN_CHART_COMPONENTS)
const metadataNames = new Set(
  Object.entries(componentMetadata.COMPONENTS_BY_CATEGORY)
    .filter(([category]) => category !== "recipe")
    .flatMap(([, names]) => names)
)

function diffSets(label: string, actual: Set<string>, expected: Set<string>) {
  const missing = [...expected].filter((n) => !actual.has(n)).sort()
  const extra = [...actual].filter((n) => !expected.has(n)).sort()
  if (missing.length) fail(`${label} is missing: ${missing.join(", ")}`)
  if (extra.length) fail(`${label} has unexpected entries: ${extra.join(", ")}`)
}

diffSets("ai/schema.json (vs CHART_SPECS)", schemaNames, registryNames)
diffSets("validationMap.ts (vs CHART_SPECS)", validationNames, registryNames)
diffSets(
  "knownChartComponents.ts (vs CHART_SPECS)",
  knownComponentNames,
  registryNames
)
const expectedRecipeTools = generateBuiltInRecipeSchemaTools()
const actualRecipeTools = schema.tools.filter(
  (tool) => tool.function["x-semiotic-kind"] === "recipe"
)
if (!isDeepStrictEqual(actualRecipeTools, expectedRecipeTools)) {
  fail(
    "ai/schema.json recipe entries drifted from BUILT_IN_CHART_RECIPES " +
      "(run `npm run docs:chart-specs:schema`)"
  )
}
diffSets(
  "ai/componentMetadata.cjs (vs CHART_SPECS)",
  metadataNames,
  registryNames
)
if (!isDeepStrictEqual([...KNOWN_CHART_COMPONENTS], [...registryNames])) {
  fail("knownChartComponents.ts order differs from CHART_SPECS")
}

// 2. Per-chart structural equivalence.
let checked = 0
for (const [name, spec] of Object.entries(CHART_SPECS)) {
  const composed = composeProps(spec)

  const definition = CHART_DEFINITIONS[name as keyof typeof CHART_DEFINITIONS]
  const generatedSchema = definition
    ? generateSchemaToolEntryFromChartDefinition(definition)
    : generateSchemaToolEntry(spec, composed)
  const canonicalSchema = schema.tools.find((t) => t.function.name === name)
  if (!canonicalSchema) {
    fail(
      `${name}: missing from ai/schema.json (run \`npm run docs:chart-specs:schema\`)`
    )
  } else if (!isDeepStrictEqual(generatedSchema, canonicalSchema)) {
    fail(`${name}: schema entry drift (regenerate ai/schema.json)`)
  }

  const generatedValidation = generatedValidationMap[name]
  const canonicalValidation = VALIDATION_MAP[name]
  if (!canonicalValidation) {
    fail(`${name}: missing from VALIDATION_MAP`)
  } else {
    if (
      !isDeepStrictEqual(
        generatedValidation.required,
        canonicalValidation.required
      )
    ) {
      fail(`${name}: validationMap.required drift`)
    }
    if (generatedValidation.dataShape !== canonicalValidation.dataShape) {
      fail(`${name}: validationMap.dataShape drift`)
    }
    if (
      !isDeepStrictEqual(
        generatedValidation.dataAccessors,
        canonicalValidation.dataAccessors
      )
    ) {
      fail(`${name}: validationMap.dataAccessors drift`)
    }
    const genKeys = new Set(Object.keys(generatedValidation.props))
    const canKeys = new Set(Object.keys(canonicalValidation.props))
    if (!isDeepStrictEqual(genKeys, canKeys)) {
      const missing = [...canKeys].filter((k) => !genKeys.has(k))
      const extra = [...genKeys].filter((k) => !canKeys.has(k))
      fail(
        `${name}: validationMap prop set drift (missing: ${missing.join(",") || "—"}; extra: ${extra.join(",") || "—"})`
      )
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

// 3. Registry ↔ resolved public TypeScript contract parity. This uses the
// checker (rather than syntax-only interface members), so inherited
// BaseChartProps and composed aliases are included in the public surface.
const generatedArtifactErrorCount = errors.length
const { props: publicPropsByChart, missing: chartsWithoutPublicType } =
  loadPublicChartPropTypes(repoRoot, Object.keys(CHART_SPECS))
for (const chartName of chartsWithoutPublicType) {
  fail(`${chartName}: exported public type ${chartName}Props was not found`)
}
const pushMaterializedInputs = new Set([
  "data",
  "areas",
  "points",
  "nodes",
  "edges",
  "flows"
])

for (const [name, spec] of Object.entries(CHART_SPECS)) {
  const publicProps = publicPropsByChart.get(name)
  if (!publicProps) continue
  const composed = composeProps(spec)
  // `omitFromSchema` entries are deliberately React/runtime-only escape
  // hatches. The public parity boundary here is the serializable schema.
  const specProps = new Set(
    Object.entries(composed)
      .filter(([, prop]) => !prop.omitFromSchema)
      .map(([propName]) => propName)
  )
  const exceptions = SPEC_ONLY_PROP_EXCEPTIONS[name] ?? {}
  const publicEnumValueExceptions = PUBLIC_ENUM_VALUE_EXCEPTIONS[name] ?? {}
  const requirednessExceptions = REQUIREDNESS_EXCEPTIONS[name] ?? {}

  for (const propName of specProps) {
    const publicProp = publicProps.get(propName)
    if (publicProp) {
      if (exceptions[propName]) {
        fail(
          `${name}.${propName}: stale spec-only exception; the public TypeScript prop now exists`
        )
      }
      const declaredSpecType = composed[propName]?.type
      const specTypes = new Set(
        Array.isArray(declaredSpecType) ? declaredSpecType : [declaredSpecType]
      )
      const comparablePublicTypes = [...publicProp.runtimeTypes].filter(
        (typeName) => typeName !== "null" && typeName !== "unknown"
      )
      if (
        comparablePublicTypes.length > 0 &&
        !comparablePublicTypes.some((typeName) =>
          specTypes.has(typeName as never)
        )
      ) {
        fail(
          `${name}.${propName}: schema type ${[...specTypes].join("|")} has no overlap with ` +
            `public TypeScript type ${comparablePublicTypes.join("|")}`
        )
      }
      const rejectedPublicTypes = serializableRuntimeTypes(publicProp).filter(
        (typeName) => !specTypes.has(typeName as never)
      )
      if (rejectedPublicTypes.length > 0) {
        fail(
          `${name}.${propName}: serializable public TypeScript type ` +
            `${rejectedPublicTypes.join("|")} is rejected by schema type ${[...specTypes].join("|")}`
        )
      }
      const schemaEnum = composed[propName]?.enum
      if (
        schemaEnum &&
        publicProp.stringLiterals.size > 0 &&
        !publicProp.broadString
      ) {
        const unsupportedValues = schemaEnum.filter(
          (value) => !publicProp.stringLiterals.has(value)
        )
        if (unsupportedValues.length > 0) {
          fail(
            `${name}.${propName}: schema enum contains values absent from TypeScript: ` +
              unsupportedValues.join(", ")
          )
        }
      }
      const enumValueException = publicEnumValueExceptions[propName]
      const rawRejectedPublicValues = unsupportedPublicEnumValues(
        publicProp,
        schemaEnum
      )
      if (enumValueException) {
        if (!enumValueException.reason.trim()) {
          fail(
            `${name}.${propName}: compatibility enum exception needs a reason`
          )
        }
        for (const value of enumValueException.values) {
          if (!rawRejectedPublicValues.includes(value)) {
            fail(
              `${name}.${propName}: stale compatibility enum exception for ${value}`
            )
          }
        }
      }
      const rejectedPublicValues = unsupportedPublicEnumValues(
        publicProp,
        schemaEnum,
        enumValueException?.values
      )
      if (rejectedPublicValues.length > 0) {
        fail(
          `${name}.${propName}: public TypeScript literals rejected by schema enum: ` +
            rejectedPublicValues.join(", ")
        )
      }
      continue
    }
    const exception = exceptions[propName]
    if (!exception) {
      fail(
        `${name}.${propName}: chart spec prop is absent from resolved ${name}Props`
      )
    } else if (!exception.reason.trim()) {
      fail(
        `${name}.${propName}: ${exception.classification} exception needs a reason`
      )
    }
  }

  for (const [propName, exception] of Object.entries(exceptions)) {
    if (!specProps.has(propName)) {
      fail(
        `${name}.${propName}: stale ${exception.classification} exception; chart spec prop no longer exists`
      )
    }
  }

  for (const propName of Object.keys(publicEnumValueExceptions)) {
    if (!specProps.has(propName) || !publicProps.has(propName)) {
      fail(
        `${name}.${propName}: stale compatibility enum exception; prop no longer crosses both public and schema surfaces`
      )
    }
  }

  // The validator knows exactly the composed props, so a public React prop the
  // spec never declares would be reported to callers as "Unknown prop".
  for (const propName of findUndeclaredPublicProps({
    publicProps,
    composedPropNames: new Set(Object.keys(composed))
  })) {
    fail(
      `${name}.${propName}: public TypeScript prop is absent from chart specs, so validateProps ` +
        "would reject it as unknown (declare it; use omitFromSchema, plus a runtimeOnly reason " +
        "for a serializable type, when it must stay out of the serialized schema)"
    )
  }

  // Runtime-only declarations replace the former public-only exception table:
  // each must still name a real, serializable-looking public prop, carry a
  // reason, and accept every runtime type the public prop accepts.
  for (const [propName, prop] of Object.entries(composed)) {
    const note = prop.runtimeOnly
    if (!note) continue
    const publicProp = publicProps.get(propName)
    if (!prop.omitFromSchema) {
      fail(
        `${name}.${propName}: a ${note.kind} runtimeOnly declaration must also set omitFromSchema`
      )
    }
    if (!note.reason.trim()) {
      fail(
        `${name}.${propName}: ${note.kind} runtimeOnly declaration needs a reason`
      )
    }
    if (!publicProp) {
      fail(
        `${name}.${propName}: stale ${note.kind} runtimeOnly declaration; ${name}Props no longer ` +
          "declares the prop (drop the entry, or list it in the chart's omitBagProps)"
      )
      continue
    }
    if (serializableRuntimeTypes(publicProp).length === 0) {
      fail(
        `${name}.${propName}: stale ${note.kind} runtimeOnly declaration; a callback-only prop ` +
          "needs no serialization reason"
      )
    }
  }

  // A prop omitted from the schema is in the registry only so React usage
  // validates. Its declared types must admit every runtime type the public
  // prop accepts, or validateProps rejects a real value (a string
  // `loadingContent`, say) with a type error.
  for (const [propName, prop] of Object.entries(composed)) {
    if (!prop.omitFromSchema) continue
    const publicProp = publicProps.get(propName)
    if (!publicProp) continue
    const declaredTypes = new Set<string>(
      Array.isArray(prop.type) ? prop.type : [prop.type]
    )
    const rejectedTypes = publicTypesRejectedBySpec(publicProp, declaredTypes)
    if (rejectedTypes.length > 0) {
      fail(
        `${name}.${propName}: public TypeScript type ${rejectedTypes.join("|")} is rejected by ` +
          `the schema-omitted declaration type ${[...declaredTypes].join("|")}, so validateProps ` +
          "would reject a real React value"
      )
    }
  }

  for (const propName of spec.omitBagProps ?? []) {
    const fromBag = spec.propBags.some((bagName) =>
      Object.prototype.hasOwnProperty.call(PROP_BAGS[bagName], propName)
    )
    if (!fromBag) {
      fail(
        `${name}.${propName}: stale omitBagProps entry; none of the chart's prop bags declares it`
      )
    } else if (
      publicProps.has(propName) &&
      !Object.prototype.hasOwnProperty.call(spec.ownProps, propName)
    ) {
      fail(
        `${name}.${propName}: omitBagProps drops a prop that ${name}Props declares`
      )
    }
  }

  for (const propName of spec.required) {
    const publicProp = publicProps.get(propName)
    if (!publicProp) continue // Name parity above reports the actionable error.
    if (!publicProp.optional) {
      if (requirednessExceptions[propName]) {
        fail(
          `${name}.${propName}: stale requiredness exception; TypeScript now requires the prop`
        )
      }
      continue
    }
    const pushModeMaterialization =
      spec.capabilities.supportsPush && pushMaterializedInputs.has(propName)
    if (!pushModeMaterialization && !requirednessExceptions[propName]) {
      fail(
        `${name}.${propName}: schema requires the prop but ${name}Props makes it optional ` +
          "(add a documented requiredness exception only for an intentional alternate input mode)"
      )
    }
  }

  for (const [propName, publicProp] of publicProps) {
    if (publicProp.optional || spec.required.includes(propName)) continue
    const exception = requirednessExceptions[propName]
    if (!exception) {
      fail(
        `${name}.${propName}: ${name}Props requires the prop but chart spec required[] does not`
      )
    } else if (!exception.trim()) {
      fail(`${name}.${propName}: requiredness exception needs a reason`)
    }
  }

  for (const propName of Object.keys(requirednessExceptions)) {
    const publicProp = publicProps.get(propName)
    const mismatch =
      publicProp &&
      ((spec.required.includes(propName) && publicProp.optional) ||
        (!spec.required.includes(propName) && !publicProp.optional))
    if (!mismatch) {
      fail(
        `${name}.${propName}: stale requiredness exception; requiredness now agrees`
      )
    }
  }
}

if (sourceContractOnly) {
  errors.splice(0, generatedArtifactErrorCount)
}

if (errors.length) {
  console.error("\n✗ chart-specs drift detected:\n")
  for (const err of errors) console.error(`  - ${err}`)
  console.error(
    "\nFix:" +
      "\n  - schema drift           → edit chartSpecs.ts, then run `npm run docs:chart-specs:schema`" +
      "\n  - validationMap drift    → edit chartSpecs.ts, then run `npm run docs:chart-specs:schema`" +
      "\n  - known chart names drift → edit chartSpecs.ts, then run `npm run docs:chart-specs:schema`" +
      "\n  - Chart Clinic drift     → edit its source registry, then run `npm run docs:chart-specs:schema`" +
      "\n  - migrated registrations → edit chartDefinitions{XY,Ordinal,Network,Physics,Realtime}.ts, then run `npm run docs:chart-specs:schema`" +
      "\n  - other metadata drift   → edit ai/componentMetadata.cjs to bucket the chart under spec.category\n"
  )
  process.exit(1)
}

console.log(
  sourceContractOnly
    ? `✅ chart-specs public TypeScript contract parity clean (${checked} charts)`
    : `✅ chart-specs round-trip clean (${checked} charts; schema/validation/metadata in sync)`
)
