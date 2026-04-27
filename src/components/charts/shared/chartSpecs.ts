/**
 * Single source of truth for per-chart prop specifications.
 *
 * Three downstream consumers used to maintain their own per-chart entries:
 *   - `ai/schema.json`                                    (LLM tool definitions)
 *   - `src/components/charts/shared/validationMap.ts`     (runtime prop validation)
 *   - `ai/componentMetadata.cjs`                          (category buckets)
 *
 * Generators in `scripts/generate-*.mjs` walk `CHART_SPECS` and emit those
 * three files. `npm run docs:chart-specs` regenerates them; `check:chart-specs`
 * fails the build on drift between this registry and the generated files.
 *
 * Design notes:
 *   - Shared prop bags (common, xyAxis, ordinalAxis) live in `PROP_BAGS` and
 *     are referenced by name in each spec so common surface stays in one place.
 *   - The runtime PropType set ("string" | "number" | "boolean" | "array" |
 *     "object" | "function") is broader than JSON Schema's. The schema
 *     generator strips "function" before emitting because LLMs cannot supply
 *     function values; validationMap keeps all types because runtime callers do.
 *   - Props relevant only at runtime (e.g. `tooltip`, `onClick`, `frameProps`)
 *     are tagged `omitFromSchema: true` so they appear in validationMap but
 *     not in schema.json. Conversely, `description` and `default` annotations
 *     surface in schema.json (and MCP responses) but are dropped from
 *     validationMap (which only reads `type` and `enum`).
 */

export type PropType = "string" | "number" | "boolean" | "array" | "object" | "function"
export type DataShape = "array" | "object" | "network" | "realtime" | "none"
export type ChartCategory = "xy" | "ordinal" | "network" | "geo" | "realtime"

export interface ChartPropSpec {
  /** Allowed runtime types. May be a single value or a union. */
  type: PropType | PropType[]
  /** Allowed enum values for string-typed props. */
  enum?: readonly string[]
  /** Default value surfaced in schema.json (and shown in MCP getSchema). */
  default?: unknown
  /** Schema-side description; surfaces in LLM tool definitions. */
  description?: string
  /**
   * When true, the prop is included in validationMap but omitted from
   * schema.json. Use for handler/callback props (`onClick`, `tooltip`)
   * and pass-through escape hatches (`frameProps`) that LLMs shouldn't
   * be asked to populate.
   */
  omitFromSchema?: boolean
}

export interface ChartSpec {
  /** Component name, must match the React export. */
  name: string
  category: ChartCategory
  /** Human-readable description for schema.tools[].function.description. */
  description: string
  /** Statically-required props. Push-mode optionality lives in behaviorContracts. */
  required: string[]
  /** Drives validation dispatch (validateArrayData / validateNetworkData / …). */
  dataShape: DataShape
  /** Accessor props validated against the data shape at runtime. */
  dataAccessors: string[]
  /**
   * Shared prop bags this chart composes. Bag props are merged in left-to-right
   * order; chart-specific `ownProps` win on key collision.
   */
  propBags: ReadonlyArray<keyof typeof PROP_BAGS>
  /** Chart-specific prop spec, overlaid on top of the composed bags. */
  ownProps: Record<string, ChartPropSpec>
}

// ---------------------------------------------------------------------------
// Shared prop bags
// ---------------------------------------------------------------------------

const commonProps: Record<string, ChartPropSpec> = {
  width: { type: "number", default: 600 },
  height: { type: "number", default: 400 },
  margin: { type: "object" },
  className: { type: "string" },
  title: { type: "string" },
  enableHover: { type: "boolean", default: true },
  showLegend: { type: "boolean" },
  showGrid: { type: "boolean", default: false },
  colorBy: { type: ["string", "function"] },
  colorScheme: { type: ["string", "array"], default: "category10" },
  tooltip: { type: ["boolean", "function", "object"], omitFromSchema: true },
  annotations: { type: "array" },
  frameProps: { type: "object", omitFromSchema: true },
  onClick: { type: "function", omitFromSchema: true },
}

const xyAxisProps: Record<string, ChartPropSpec> = {
  xLabel: { type: "string" },
  yLabel: { type: "string" },
  xFormat: { type: "function", omitFromSchema: true },
  yFormat: { type: "function", omitFromSchema: true },
}

const ordinalAxisProps: Record<string, ChartPropSpec> = {
  categoryLabel: { type: "string" },
  valueLabel: { type: "string" },
  valueFormat: { type: "function", omitFromSchema: true },
  categoryFormat: { type: "function", omitFromSchema: true },
}

export const PROP_BAGS = {
  common: commonProps,
  xyAxis: xyAxisProps,
  ordinalAxis: ordinalAxisProps,
} as const

// ---------------------------------------------------------------------------
// Reusable enums
// ---------------------------------------------------------------------------

export const ORIENTATION_ENUM = ["vertical", "horizontal"] as const

// ---------------------------------------------------------------------------
// Chart specs (Phase 1: BarChart only — proves the round-trip shape)
// ---------------------------------------------------------------------------

export const CHART_SPECS: Record<string, ChartSpec> = {
  BarChart: {
    name: "BarChart",
    category: "ordinal",
    description: "Vertical or horizontal bars for categorical comparisons.",
    required: ["data"],
    dataShape: "array",
    dataAccessors: ["categoryAccessor", "valueAccessor"],
    propBags: ["common", "ordinalAxis"],
    ownProps: {
      data: { type: "array", description: "Array of data objects" },
      categoryAccessor: { type: ["string", "function"], default: "category", description: "Key for category labels" },
      valueAccessor: { type: ["string", "function"], default: "value", description: "Key for bar values" },
      orientation: { type: "string", enum: ORIENTATION_ENUM, default: "vertical" },
      sort: { type: ["boolean", "string", "function"], default: false, description: "Sort bars: false, true, 'asc', 'desc', or comparator function" },
      barPadding: { type: "number", default: 5 },
      // `roundedTop` is currently in validationMap but omitted from
      // schema.json — likely an oversight in the hand-curated schema. Mark
      // it `omitFromSchema` to preserve the canonical Phase 1 surface;
      // Phase 2 migration can drop the omit so it surfaces in LLM tools.
      roundedTop: { type: "number", omitFromSchema: true },
    },
  },
}

// ---------------------------------------------------------------------------
// Helpers (used by generators)
// ---------------------------------------------------------------------------

/**
 * Compose a chart's full prop set (bags + ownProps) in deterministic order.
 * ownProps wins on key collision so a chart can override a shared default.
 */
export function composeProps(spec: ChartSpec): Record<string, ChartPropSpec> {
  const result: Record<string, ChartPropSpec> = {}
  for (const bagName of spec.propBags) {
    Object.assign(result, PROP_BAGS[bagName])
  }
  Object.assign(result, spec.ownProps)
  return result
}
