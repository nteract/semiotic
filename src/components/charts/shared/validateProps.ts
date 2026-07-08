import type { Datum } from "./datumTypes"
/**
 * Static props validation for AI code-generation pipelines.
 *
 * Validates component name, required props, prop types, enum values,
 * unknown props (typo detection), and data shape via the existing
 * validateArrayData / validateObjectData / validateNetworkData helpers.
 * Components with dataShape "none" intentionally skip data validation.
 */

import { validateArrayData } from "./validateChartData"
import { validateObjectData } from "./validateChartData"
import { validateNetworkData } from "./validateChartData"
import { VALIDATION_MAP } from "./validationMap"

// Re-export for external consumers (diagnoseConfig, chartConfig, etc.)
export { VALIDATION_MAP }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export type PropType = "string" | "number" | "boolean" | "array" | "object" | "function"

export interface PropDef {
  type: PropType | PropType[]
  enum?: readonly string[]
}

type DataShape = "array" | "object" | "network" | "realtime" | "none"

export interface ComponentSpec {
  /** Props that must be present */
  required: string[]
  /** Data shape — drives which validateChartData helper to call; "none" means no data prop is expected */
  dataShape: DataShape
  /** Accessor props to validate against data (key = prop name) */
  dataAccessors: string[]
  /** Per-prop type / enum constraints */
  props: Record<string, PropDef>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function checkType(value: unknown, expected: PropType | PropType[]): boolean {
  const types = Array.isArray(expected) ? expected : [expected]
  const actual = Array.isArray(value) ? "array" : typeof value
  return types.includes(actual as PropType)
}

function allowsGeneratedArrayData(componentName: string, props: Datum): boolean {
  return (
    props.mode === "mechanical" &&
    (componentName === "GaltonBoardChart" ||
      componentName === "PhysicsPileChart")
  )
}

import { closestMatch } from "./stringDistance"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate props for a Semiotic HOC chart component.
 *
 * Checks: component name, required props, prop types, enum values,
 * unknown prop names (typo detection), and data shape + accessor validity.
 */
export function validateProps(
  componentName: string,
  props: Datum
): ValidationResult {
  const errors: string[] = []

  // This validator exists to catch malformed agent-generated configs, so it
  // must return a result rather than throw when handed malformed input itself.
  // A null / non-object `props` (e.g. from a repair loop or a direct
  // `semiotic/ai` / `semiotic/utils` caller) is normalized to `{}` so the
  // required-prop and Object.entries passes below don't dereference null.
  if (props == null || typeof props !== "object") {
    props = {} as Datum
  }

  // 1. Component name check
  const spec = VALIDATION_MAP[componentName]
  if (!spec) {
    return {
      valid: false,
      errors: [
        `Unknown component "${componentName}". Valid components: ${Object.keys(VALIDATION_MAP).join(", ")}`,
      ],
    }
  }

  // 2. Required props
  for (const req of spec.required) {
    if (props[req] === undefined || props[req] === null) {
      errors.push(`"${req}" is required for ${componentName}.`)
    }
  }

  // 2b. Array-shape charts need a `data` prop in static usage even when "data"
  // isn't in `required` (those lists hold semantic accessors). Without this,
  // CandlestickChart / MultiAxisLineChart / QuadrantChart / DifferenceChart /
  // SwimlaneChart / LikertChart validated as OK with no data and rendered
  // blank. The canonical message lets the usageMode filter keep it in static
  // and drop it in push. The guard avoids double-emitting for charts that
  // already list "data" in `required` (handled in the loop above).
  if (
    spec.dataShape === "array" &&
    !spec.required.includes("data") &&
    !allowsGeneratedArrayData(componentName, props) &&
    (props.data === undefined || props.data === null)
  ) {
    errors.push(`"data" is required for ${componentName}.`)
  }

  // 3. Prop types & enum values
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue
    const def = spec.props[key]
    if (!def) continue // unknown prop — checked in step 5

    // Type check
    if (!checkType(value, def.type)) {
      const expectedStr = Array.isArray(def.type)
        ? def.type.join(" | ")
        : def.type
      errors.push(
        `"${key}" should be ${expectedStr}, got ${Array.isArray(value) ? "array" : typeof value}.`
      )
      continue
    }

    // Enum check
    if (def.enum && typeof value === "string" && !def.enum.includes(value)) {
      errors.push(
        `"${key}" value "${value}" is not valid. Expected one of: ${def.enum.join(", ")}.`
      )
    }
  }

  // 4. Unknown props (typo-aware suggestions)
  const knownPropNames = Object.keys(spec.props)
  const knownProps = new Set(knownPropNames)
  for (const key of Object.keys(props)) {
    if (props[key] === undefined) continue
    if (!knownProps.has(key)) {
      const suggestion = closestMatch(key, knownPropNames)
      const msg = suggestion
        ? `Unknown prop "${key}" for ${componentName}. Did you mean "${suggestion}"?`
        : `Unknown prop "${key}" for ${componentName}. Valid props: ${knownPropNames.join(", ")}.`
      errors.push(msg)
    }
  }

  // 5. Data shape + accessor validation (delegate to existing helpers)
  if (spec.dataShape === "array") {
    const data = props.data
    const accessors: Record<string, string | undefined> = {}
    for (const acc of spec.dataAccessors) {
      const val = props[acc]
      if (typeof val === "string") {
        accessors[acc] = val
      }
    }
    const dataError = validateArrayData({
      componentName,
      data,
      accessors: Object.keys(accessors).length > 0 ? accessors : undefined,
    })
    if (dataError) errors.push(dataError)
  } else if (spec.dataShape === "object") {
    const dataError = validateObjectData({
      componentName,
      data: props.data,
    })
    if (dataError) errors.push(dataError)
  } else if (spec.dataShape === "network") {
    const dataError = validateNetworkData({
      componentName,
      nodes: props.nodes,
      edges: props.edges,
      nodesRequired: spec.required.includes("nodes"),
      edgesRequired: spec.required.includes("edges"),
    })
    if (dataError) errors.push(dataError)
  } else if (spec.dataShape === "none") {
    // Value-only components such as GaugeChart have no data prop to validate.
  }
  // realtime charts: no data validation (ref-based push API)

  return { valid: errors.length === 0, errors }
}
