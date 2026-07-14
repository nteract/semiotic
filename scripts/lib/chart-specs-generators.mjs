/**
 * Pure generators that turn a `ChartSpec` (from chartSpecs.ts) into the
 * shapes consumed by schema.json, runtime validation, Chart Clinic, and
 * componentMetadata.cjs. Tested directly against the BarChart slice of
 * each canonical file in Phase 1; Phase 2+ will use them to overwrite
 * full files.
 */

// The runtime PropType set is broader than JSON Schema's — it includes
// `"function"` (accessors, callbacks, tooltip/format renderers), which is not a
// value type in JSON Schema Draft 2020-12 and makes the schema fail metaschema
// validation. `resolveSchemaType` keeps only standards-valid types in the JSON
// Schema `type` keyword and preserves the FULL runtime type list (including
// `"function"`) in the `x-semiotic-runtime-types` extension, so agents still
// learn a prop accepts a function while the emitted schema stays wire-valid.
// A prop whose only runtime type is a function emits no `type` (a schema
// without `type` matches any value) plus the extension + description.
// Use `omitFromSchema: true` on a spec to hide a prop entirely (e.g. `frameProps`).
const JSON_SCHEMA_TYPES = new Set([
  "null", "boolean", "object", "array", "number", "string", "integer",
])
function resolveSchemaType(typeOrTypes) {
  const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes]
  const jsonTypes = types.filter((t) => JSON_SCHEMA_TYPES.has(t))
  const hasRuntimeOnly = types.some((t) => !JSON_SCHEMA_TYPES.has(t))
  const result = {}
  if (jsonTypes.length === 1) result.type = jsonTypes[0]
  else if (jsonTypes.length > 1) result.type = jsonTypes
  // jsonTypes.length === 0 → omit `type` (a function-only prop has no wire type)
  if (hasRuntimeOnly) result.runtimeTypes = [...types]
  return result
}

// Annotation prop spec is a single shared blob across every chart that
// supports annotations. Keeping it here prevents schema.json from
// repeating ~30 lines of identical text per tool entry.
const ANNOTATIONS_PROP_SCHEMA = {
  type: "array",
  description: "Annotation objects to render on the chart. Each must have a `type` field. Position using your data field names (e.g. { type: \"widget\", month: \"Jan\", revenue: 500 }). Supported types: \"widget\" (arbitrary HTML/React content via foreignObject — v3 replacement for htmlAnnotationRules), \"label\" (callout with connector), \"callout\" (circle + label), \"text\" (plain label), \"y-threshold\" (horizontal reference line), \"x-threshold\" (vertical reference line), \"band\" (shaded y-region), \"enclose\" (circle around points), \"rect-enclose\" (rect around points), \"highlight\" (colored dots on filtered points), \"trend\" (regression line), \"envelope\" (upper/lower bounds), \"anomaly-band\" (mean ± stddev), \"forecast\" (extrapolated trend). Widget annotations accept: content (ReactNode), dx, dy, width, height, anchor (\"fixed\"|\"latest\"|\"sticky\"). Threshold annotations accept: value, label, color, strokeWidth, strokeDasharray. Enclose annotations accept: coordinates (array of data objects), label, color, padding.",
  items: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: [
          "widget", "label", "callout", "text", "bracket",
          "y-threshold", "x-threshold", "band",
          "enclose", "rect-enclose", "highlight",
          "trend", "envelope", "anomaly-band", "forecast",
        ],
        description: "Annotation type",
      },
    },
    required: ["type"],
  },
}

/**
 * Generate the schema.tools[] entry for one chart. Result is the tool
 * object as published in ai/schema.json, with `function.parameters`
 * carrying the JSON Schema for the chart's prop surface.
 */
export function generateSchemaToolEntry(spec, composedProps) {
  const properties = {}
  for (const [propName, propSpec] of Object.entries(composedProps)) {
    if (propSpec.omitFromSchema) continue

    if (propName === "annotations") {
      // Use the shared annotations blob rather than the bare
      // `{ type: "array" }` from PROP_BAGS so LLM tool definitions get
      // the full per-annotation-type guidance.
      properties[propName] = ANNOTATIONS_PROP_SCHEMA
      continue
    }

    const { type, runtimeTypes } = resolveSchemaType(propSpec.type)
    const entry = {}
    if (type !== undefined) entry.type = type
    if (propSpec.enum) entry.enum = [...propSpec.enum]
    if (propSpec.description) entry.description = propSpec.description
    if (propSpec.default !== undefined) entry.default = propSpec.default
    // Runtime-only types (e.g. "function") live in an extension keyword so the
    // JSON Schema `type` stays wire-valid but agents still see the full surface.
    if (runtimeTypes) entry["x-semiotic-runtime-types"] = runtimeTypes
    properties[propName] = entry
  }

  return {
    type: "function",
    function: {
      name: spec.name,
      description: spec.description,
      parameters: {
        type: "object",
        properties,
        required: [...spec.required],
      },
    },
  }
}

/**
 * Generate the VALIDATION_MAP entry for one chart. Result mirrors the
 * `ComponentSpec` shape consumed by validateProps.ts: keeps the full
 * runtime type set (including "function") and drops schema-only fields
 * (description, default).
 */
export function generateValidationMapEntry(spec, composedProps) {
  const props = {}
  for (const [propName, propSpec] of Object.entries(composedProps)) {
    const entry = { type: propSpec.type }
    if (propSpec.enum) entry.enum = [...propSpec.enum]
    props[propName] = entry
  }
  return {
    required: [...spec.required],
    dataShape: spec.dataShape,
    dataAccessors: [...spec.dataAccessors],
    props,
  }
}

/**
 * Generate the complete runtime validation map in registry insertion order.
 * Keeping this composition here gives the writer and drift checker one exact
 * implementation, while the emitted runtime module remains independent of the
 * documentation-rich chart-spec registry.
 */
export function generateValidationMap(chartSpecs, composeProps) {
  const validationMap = {}
  for (const [name, spec] of Object.entries(chartSpecs)) {
    validationMap[name] = generateValidationMapEntry(spec, composeProps(spec))
  }
  return validationMap
}

/**
 * Serialize the runtime map as a deterministic TypeScript module.
 *
 * The generated file intentionally uses a plain object literal rather than a
 * compact lookup codec: Brotli already compresses the repeated prop shapes,
 * and the literal preserves VALIDATION_MAP's existing public/runtime shape
 * without adding decode work during module initialization. One chart is
 * written per line to keep the generated repository artifact compact while
 * still producing localized diffs when a chart changes.
 */
export function generateValidationMapModule(validationMap) {
  const chartLines = Object.entries(validationMap).map(
    ([name, entry]) => `  ${JSON.stringify(name)}: ${JSON.stringify(entry)}`,
  )
  return `/**
 * AUTO-GENERATED from chartSpecs.ts by scripts/regenerate-schema.ts.
 * Do not edit by hand; run \`npm run docs:chart-specs:schema\`.
 */
import type { ComponentSpec } from "./validateProps"

export const VALIDATION_MAP: Record<string, ComponentSpec> = {
${chartLines.join(",\n")}
}
`
}

/**
 * Serialize the compact chart-name registry used by config serialization.
 * Generating it alongside the richer artifacts keeps the root bundle lean
 * without introducing a second hand-maintained chart catalog.
 */
export function generateKnownChartComponentsModule(chartSpecs) {
  return `/**
 * AUTO-GENERATED from chartSpecs.ts by scripts/regenerate-schema.ts.
 * Do not edit by hand; run \`npm run docs:chart-specs:schema\`.
 *
 * This compact registry is intentionally separate from validation metadata:
 * config serialization only needs chart-name membership.
 */
export const KNOWN_CHART_COMPONENTS = ${JSON.stringify(Object.keys(chartSpecs), null, 2)} as const

const KNOWN_CHART_COMPONENT_SET: ReadonlySet<string> = new Set(
  KNOWN_CHART_COMPONENTS,
)

export function isKnownChartComponent(componentName: string): boolean {
  return KNOWN_CHART_COMPONENT_SET.has(componentName)
}
`
}

/**
 * Generate the small metadata projection consumed by Chart Clinic bundle
 * guidance. Pilot definitions override the general family recommendation,
 * while non-pilot charts derive their facade and renderChart support directly
 * from ChartSpec.
 */
export function generateChartClinicMetadata(chartSpecs, chartDefinitionPilot) {
  const metadata = {}
  for (const [name, spec] of Object.entries(chartSpecs)) {
    const definition = chartDefinitionPilot[name]
    if (definition) {
      metadata[name] = {
        category: definition.chartFamily,
        recommendedImport: definition.runtime.implementation.module,
        ...(definition.metadata.support.server.mode === "render-chart"
          ? { serverImport: "semiotic/server" }
          : {}),
        docsRoute: definition.metadata.propDocs.route,
        pilot: true,
      }
      continue
    }

    metadata[name] = {
      category: spec.category,
      recommendedImport: `semiotic/${spec.category}`,
      ...(spec.capabilities.supportsSSR
        ? { serverImport: "semiotic/server" }
        : {}),
    }
  }
  return metadata
}

/** Serialize Chart Clinic's projection as a deterministic runtime module. */
export function generateChartClinicMetadataModule(metadata) {
  const chartLines = Object.entries(metadata).map(
    ([name, entry]) => `  ${JSON.stringify(name)}: ${JSON.stringify(entry)}`,
  )
  return `/**
 * AUTO-GENERATED from chartSpecs.ts and chartDefinitionPilot.ts by
 * scripts/regenerate-schema.ts.
 * Do not edit by hand; run \`npm run docs:chart-specs:schema\`.
 */
import type { ChartCategory } from "../charts/shared/chartSpecs"

interface ChartClinicMetadata {
  readonly category: ChartCategory
  readonly recommendedImport: string
  readonly serverImport?: "semiotic/server"
  readonly docsRoute?: string
  readonly pilot?: true
}

export const CHART_CLINIC_METADATA: Readonly<Record<string, ChartClinicMetadata>> = {
${chartLines.join(",\n")}
}
`
}

/**
 * Generate the per-chart bucket entry for componentMetadata.cjs.
 * componentMetadata.cjs stores a category → name[] map; this returns
 * the (category, name) pair so the orchestrator can build the map.
 */
export function generateMetadataEntry(spec) {
  return { name: spec.name, category: spec.category }
}
