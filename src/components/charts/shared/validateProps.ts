import type { Datum } from "./datumTypes"
/**
 * Static props validation for AI code-generation pipelines.
 *
 * Validates component name, required props, prop types, enum values,
 * unknown props (typo detection), and data shape via the existing
 * validateArrayData / validateObjectData / validateNetworkData helpers.
 * Components with dataShape "none" intentionally skip data validation.
 */

import {
  validateArrayData,
  validateObjectData,
  validateNetworkData,
} from "./validateChartData"
import { VALIDATION_MAP } from "./validationMap"
import type { PropType, DataShape } from "./chartSpecCore"
import { closestMatch } from "./stringDistance"

// Re-export for external consumers (diagnoseConfig, chartConfig, etc.)
export { VALIDATION_MAP }
export type { PropType, DataShape }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface PropDef {
  type: PropType | PropType[]
  enum?: readonly string[]
}

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
      componentName === "UnitPileChart")
  )
}

function validateGaugeThresholds(props: Datum): string[] {
  if (!Array.isArray(props.thresholds)) return []
  const errors: string[] = []
  if (props.thresholds.length === 0) {
    errors.push(
      '"thresholds" for GaugeChart must contain at least one { value, color, label? } object.'
    )
  }
  props.thresholds.forEach((threshold, index) => {
    if (!threshold || typeof threshold !== "object" || Array.isArray(threshold)) {
      errors.push(
        `"thresholds[${index}]" for GaugeChart should be an object with numeric "value" and string "color".`
      )
      return
    }
    const entry = threshold as Record<string, unknown>
    if (typeof entry.value !== "number" || !Number.isFinite(entry.value)) {
      errors.push(
        `"thresholds[${index}].value" is required for GaugeChart and must be a finite number. BigNumber's "at" threshold key is not supported here.`
      )
    }
    if (typeof entry.color !== "string" || entry.color.length === 0) {
      errors.push(
        `"thresholds[${index}].color" is required for GaugeChart and must be a non-empty string.`
      )
    }
    if (entry.label !== undefined && typeof entry.label !== "string") {
      errors.push(
        `"thresholds[${index}].label" for GaugeChart should be a string.`
      )
    }
    const unexpected = Object.keys(entry).filter(
      (key) => key !== "value" && key !== "color" && key !== "label"
    )
    if (unexpected.length > 0) {
      errors.push(
        `"thresholds[${index}]" has unsupported GaugeChart key(s): ${unexpected.join(", ")}. Use { value, color, label? }; { at, level } belongs to BigNumber.`
      )
    }
  })
  return errors
}

const LEGEND_LAYOUT_ALIGNMENTS = new Set([
  "start",
  "center",
  "end",
  "left",
  "right",
])

const LEGEND_LAYOUT_NUMERIC_RULES: Record<
  string,
  { minimum: number; label: string }
> = {
  swatchSize: { minimum: 1, label: "a positive number" },
  labelGap: { minimum: 0, label: "a non-negative number" },
  itemGap: { minimum: 0, label: "a non-negative number" },
  rowHeight: { minimum: 1, label: "a positive number" },
  maxWidth: { minimum: 1, label: "a positive number" },
  edgeGutter: { minimum: 0, label: "a non-negative number" },
  sideGutter: { minimum: 0, label: "a non-negative number" },
  axisGutter: { minimum: 0, label: "a non-negative number" },
}

function validateFrameProps(props: Datum): string[] {
  const frameProps = props.frameProps
  if (
    frameProps == null ||
    typeof frameProps !== "object" ||
    Array.isArray(frameProps)
  ) {
    return []
  }

  const legendLayout = (frameProps as Datum).legendLayout
  if (
    legendLayout == null ||
    typeof legendLayout !== "object" ||
    Array.isArray(legendLayout)
  ) {
    return legendLayout == null
      ? []
      : ['"frameProps.legendLayout" should be object, got ' +
          (Array.isArray(legendLayout) ? "array" : typeof legendLayout) + "."]
  }

  const errors: string[] = []
  const layout = legendLayout as Datum
  const knownKeys = new Set(["align", ...Object.keys(LEGEND_LAYOUT_NUMERIC_RULES)])

  for (const key of Object.keys(layout)) {
    if (!knownKeys.has(key)) {
      errors.push(
        `Unknown "frameProps.legendLayout" key "${key}". Valid keys: ${[
          ...knownKeys,
        ].join(", ")}.`,
      )
    }
  }

  if (layout.align !== undefined && typeof layout.align !== "string") {
    errors.push(
      `"frameProps.legendLayout.align" should be string, got ${Array.isArray(layout.align) ? "array" : typeof layout.align}.`,
    )
  } else if (
    typeof layout.align === "string" &&
    !LEGEND_LAYOUT_ALIGNMENTS.has(layout.align)
  ) {
    errors.push(
      `"frameProps.legendLayout.align" value "${layout.align}" is not valid. Expected one of: ${[
        ...LEGEND_LAYOUT_ALIGNMENTS,
      ].join(", ")}.`,
    )
  }

  for (const [key, rule] of Object.entries(LEGEND_LAYOUT_NUMERIC_RULES)) {
    const value = layout[key]
    if (value === undefined) continue
    if (typeof value !== "number" || !Number.isFinite(value)) {
      errors.push(
        `"frameProps.legendLayout.${key}" should be ${rule.label}, got ${Array.isArray(value) ? "array" : typeof value}.`,
      )
    } else if (value < rule.minimum) {
      errors.push(
        `"frameProps.legendLayout.${key}" should be ${rule.label} (minimum ${rule.minimum}), got ${value}.`,
      )
    }
  }

  return errors
}

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
    // Geo HOCs such as FlowMap declare their own array input (`flows`,
    // `points`, or `areas`) rather than a generic `data` prop. Do not invent
    // an unknown `data` requirement for a chart whose declared prop surface
    // cannot satisfy it.
    Object.prototype.hasOwnProperty.call(spec.props, "data") &&
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
    if (!def) continue // unknown prop — checked in step 4

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
    // Network validation checks node fields only; source/target accessors
    // belong to edge records and must not be tested against a node sample.
    // ForceDirectedGraph accepts its old nodeIDAccessor spelling through the
    // 3.x line, but nodeIdAccessor is canonical and wins when both exist.
    const nodeIdAccessor = props.nodeIdAccessor ?? props.nodeIDAccessor ?? "id"
    const nodeAccessors = typeof nodeIdAccessor === "string"
      ? { nodeIdAccessor }
      : undefined
    const dataError = validateNetworkData({
      componentName,
      nodes: props.nodes,
      edges: props.edges,
      nodesRequired: spec.required.includes("nodes"),
      edgesRequired: spec.required.includes("edges"),
      accessors: nodeAccessors,
    })
    if (dataError) errors.push(dataError)
  }
  // "none" (e.g. GaugeChart's value-only props) and "realtime" (ref-based
  // push API) data shapes have no data prop to validate — no branch needed.

  if (componentName === "GaugeChart") {
    errors.push(...validateGaugeThresholds(props))
  }

  if (componentName === "ScatterplotMatrix" && props.frameProps != null) {
    errors.push(
      '"frameProps" is not supported for ScatterplotMatrix; configure its matrix props directly.',
    )
  }

  errors.push(...validateFrameProps(props))

  return { valid: errors.length === 0, errors }
}
