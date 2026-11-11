import type { Datum } from "./datumTypes"
/**
 * Static props validation for AI code-generation pipelines.
 *
 * Validates component name, required props, prop types, enum values,
 * unknown props (typo detection), and data shape via the existing
 * validateArrayData / validateObjectData / validateNetworkData helpers.
 * Components with dataShape "none" skip data validation.
 *
 * Every finding is reported twice: as a sentence in `errors` (the original
 * contract) and as a structured `issues` entry with a stable code, the prop
 * path, and a suggestion or patch where one exists, so a repair loop does not
 * have to parse prose.
 */

import {
  validateArrayData,
  validateObjectData,
  validateNetworkData,
} from "./validateChartData"
import { VALIDATION_MAP } from "./validationMap"
import type { PropType, DataShape } from "./chartSpecCore"
import { closestMatch } from "./stringDistance"
import { findUnknownAxisConfigKeys } from "../../stream/axisConfigKeys"

// Re-export for external consumers (diagnoseConfig, chartConfig, etc.)
export { VALIDATION_MAP }
export type { PropType, DataShape }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Stable identifiers for the kinds of finding `validateProps` reports. */
export type ValidationIssueCode =
  /** The component name is not in the chart registry. */
  | "UNKNOWN_COMPONENT"
  /** A statically required prop is missing. */
  | "MISSING_REQUIRED_PROP"
  /** The value's runtime type is not one the prop accepts. */
  | "INVALID_PROP_TYPE"
  /** The type is right but the value is not (enum, range, tuple shape). */
  | "INVALID_PROP_VALUE"
  /** The prop is not part of the component's public surface. */
  | "UNKNOWN_PROP"
  /** A key inside a structured prop (`frameProps.axes[0]`, `legendLayout`) is unknown. */
  | "UNKNOWN_NESTED_KEY"
  /** The prop exists elsewhere but this component does not support it. */
  | "UNSUPPORTED_PROP"
  /** The data shape or an accessor does not match the data. */
  | "INVALID_DATA"

/**
 * A machine-applicable repair. It is attached only when it is unambiguous:
 * a rename never overwrites a prop the caller already set, and the renamed
 * value has a type the target prop accepts.
 */
export type ValidationPatch =
  | { op: "rename"; from: string; to: string }
  | { op: "remove"; path: string }
  | { op: "set"; path: string; value: string }

export interface ValidationIssue {
  code: ValidationIssueCode
  /**
   * Prop path the issue is about (`"xAccessor"`,
   * `"frameProps.legendLayout.align"`). Absent for component-level findings.
   */
  path?: string
  /** The same sentence that appears at this index in `errors`. */
  message: string
  /** Runtime type of the offending value (`"string"`, `"array"`, …). */
  actualType?: string
  /** Runtime types the prop accepts. */
  expectedTypes?: PropType[]
  /** Accepted values for an enum prop. */
  allowedValues?: string[]
  /** Nearest valid name or value. */
  suggestion?: string
  patch?: ValidationPatch
}

export interface ValidationResult {
  valid: boolean
  /** One sentence per finding, in the same order as `issues`. */
  errors: string[]
  /**
   * Structured form of `errors`. `validateProps` always sets it; it is optional
   * here only so results assembled by hand before it existed still type-check.
   */
  issues?: ValidationIssue[]
  /**
   * The component's accepted prop names. Present only when an unknown prop had
   * no suggestion, and listed once per result rather than once per error.
   */
  validProps?: string[]
}

/** What `validateProps` returns: a `ValidationResult` whose `issues` is set. */
export interface ValidationReport extends ValidationResult {
  issues: ValidationIssue[]
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

function runtimeTypeOf(value: unknown): string {
  return Array.isArray(value) ? "array" : typeof value
}

function allowsGeneratedArrayData(componentName: string, props: Datum): boolean {
  return (
    props.mode === "mechanical" &&
    (componentName === "GaltonBoardChart" ||
      componentName === "UnitPileChart")
  )
}

// Names other chart libraries, grammar specs, and Semiotic 1.x/2.x use for a
// channel, mapped to the canonical props that carry it. The first candidate
// the component actually declares wins, so `x` resolves to `xAccessor` on an
// XY chart, `categoryAccessor` on an ordinal chart, and `timeAccessor` on a
// realtime chart. Keys are lowercase.
const X_CHANNEL = ["xAccessor", "categoryAccessor", "timeAccessor"]
const Y_CHANNEL = ["yAccessor", "valueAccessor"]
const SERIES_CHANNEL = [
  "lineBy", "areaBy", "groupBy", "stackBy", "seriesAccessor", "colorBy",
]
const ID_CHANNEL = [
  "nodeIdAccessor", "idAccessor", "pointIdAccessor", "dataIdAccessor",
]
const X_TITLE = ["xLabel", "categoryLabel"]
const Y_TITLE = ["yLabel", "valueLabel"]
const X_FORMAT = ["xFormat", "categoryFormat", "tickFormatTime"]
const Y_FORMAT = ["yFormat", "valueFormat", "tickFormatValue"]
const PROP_NAME_ALIASES: Readonly<Record<string, readonly string[]>> = {
  x: X_CHANNEL,
  xkey: X_CHANNEL,
  xfield: X_CHANNEL,
  namekey: X_CHANNEL,
  oaccessor: ["categoryAccessor"],
  y: Y_CHANNEL,
  ykey: Y_CHANNEL,
  yfield: Y_CHANNEL,
  datakey: Y_CHANNEL,
  raccessor: ["valueAccessor"],
  series: SERIES_CHANNEL,
  serieskey: SERIES_CHANNEL,
  seriesfield: SERIES_CHANNEL,
  group: SERIES_CHANNEL,
  colorfield: ["colorBy"],
  colorkey: ["colorBy"],
  hue: ["colorBy"],
  colors: ["colorScheme"],
  palette: ["colorScheme"],
  colorscale: ["colorScheme"],
  sizefield: ["sizeBy", "nodeSize"],
  sizekey: ["sizeBy", "nodeSize"],
  id: ID_CHANNEL,
  key: ID_CHANNEL,
  links: ["edges"],
  xtitle: X_TITLE,
  xaxislabel: X_TITLE,
  xaxistitle: X_TITLE,
  ytitle: Y_TITLE,
  yaxislabel: Y_TITLE,
  yaxistitle: Y_TITLE,
  xtickformat: X_FORMAT,
  xaxisformat: X_FORMAT,
  ytickformat: Y_FORMAT,
  yaxisformat: Y_FORMAT,
  grid: ["showGrid"],
  arialabel: ["description"],
}

// Bare words that usually carry a literal style value, not a field name.
const STYLE_VALUE_WORDS = new Set(["color", "size", "symbol"])

/**
 * Nearest accepted prop for an unknown one. Tried in order: the same name in a
 * different case, the name with the accessor/`By` suffix Semiotic uses
 * (`x` → `xAccessor`, `size` → `sizeBy`), a known alias from another API, then
 * edit distance. The distance allowed grows with the name's length, so a
 * one- or two-letter prop never "matches" an unrelated short prop.
 */
function suggestPropName(
  key: string,
  known: Record<string, PropDef>,
  knownNames: string[],
): { name: string; rename: boolean } | undefined {
  const has = (name: string) =>
    Object.prototype.hasOwnProperty.call(known, name)
  const lower = key.toLowerCase()
  const sameName = knownNames.find((name) => name.toLowerCase() === lower)
  if (sameName) return { name: sameName, rename: true }
  if (has(key + "Accessor")) return { name: key + "Accessor", rename: true }
  if (has(key + "By")) {
    // `color: "red"` is far more often a literal than a field name, so point
    // at `colorBy` without offering to move the value there.
    return { name: key + "By", rename: !STYLE_VALUE_WORDS.has(lower) }
  }
  const alias = PROP_NAME_ALIASES[lower]?.find(has)
  if (alias) return { name: alias, rename: true }
  const maxDistance =
    key.length <= 2 ? 0 : key.length <= 4 ? 1 : key.length <= 6 ? 2 : 3
  const nearest =
    maxDistance === 0 ? undefined : closestMatch(key, knownNames, maxDistance)
  return nearest ? { name: nearest, rename: true } : undefined
}

function validateGaugeThresholds(props: Datum): ValidationIssue[] {
  if (!Array.isArray(props.thresholds)) return []
  const issues: ValidationIssue[] = []
  if (props.thresholds.length === 0) {
    issues.push({
      code: "INVALID_PROP_VALUE",
      path: "thresholds",
      message:
        '"thresholds" for GaugeChart must contain at least one { value, color, label? } object.',
    })
  }
  props.thresholds.forEach((threshold, index) => {
    const path = `thresholds[${index}]`
    if (!threshold || typeof threshold !== "object" || Array.isArray(threshold)) {
      issues.push({
        code: "INVALID_PROP_TYPE",
        path,
        actualType: threshold === null ? "null" : runtimeTypeOf(threshold),
        expectedTypes: ["object"],
        message: `"${path}" for GaugeChart should be an object with numeric "value" and string "color".`,
      })
      return
    }
    const entry = threshold as Record<string, unknown>
    if (typeof entry.value !== "number" || !Number.isFinite(entry.value)) {
      issues.push({
        code: "INVALID_PROP_VALUE",
        path: `${path}.value`,
        message: `"${path}.value" is required for GaugeChart and must be a finite number. BigNumber's "at" threshold key is not supported here.`,
      })
    }
    if (typeof entry.color !== "string" || entry.color.length === 0) {
      issues.push({
        code: "INVALID_PROP_VALUE",
        path: `${path}.color`,
        message: `"${path}.color" is required for GaugeChart and must be a non-empty string.`,
      })
    }
    if (entry.label !== undefined && typeof entry.label !== "string") {
      issues.push({
        code: "INVALID_PROP_TYPE",
        path: `${path}.label`,
        actualType: runtimeTypeOf(entry.label),
        expectedTypes: ["string"],
        message: `"${path}.label" for GaugeChart should be a string.`,
      })
    }
    const unexpected = Object.keys(entry).filter(
      (key) => key !== "value" && key !== "color" && key !== "label"
    )
    if (unexpected.length > 0) {
      issues.push({
        code: "UNKNOWN_NESTED_KEY",
        path,
        message: `"${path}" has unsupported GaugeChart key(s): ${unexpected.join(", ")}. Use { value, color, label? }; { at, level } belongs to BigNumber.`,
      })
    }
  })
  return issues
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

function validateFrameProps(props: Datum): ValidationIssue[] {
  const frameProps = props.frameProps
  if (
    frameProps == null ||
    typeof frameProps !== "object" ||
    Array.isArray(frameProps)
  ) {
    return []
  }

  return [
    ...validateAxisConfigKeys((frameProps as Datum).axes, "frameProps.axes"),
    ...validateLegendLayout(frameProps as Datum),
  ]
}

/** Axis config objects silently ignore keys; flag the ones nothing reads. */
function validateAxisConfigKeys(axes: unknown, path: string): ValidationIssue[] {
  return findUnknownAxisConfigKeys(axes).map(({ index, key, suggestion }) => ({
    code: "UNKNOWN_NESTED_KEY" as const,
    path: `${path}[${index}].${key}`,
    message:
      `Unknown "${path}[${index}]" key "${key}" is ignored.` +
      (suggestion ? ` Did you mean "${suggestion}"?` : ""),
    ...(suggestion ? { suggestion } : {}),
  }))
}

function validateLegendLayout(frameProps: Datum): ValidationIssue[] {
  const legendLayout = frameProps.legendLayout
  const base = "frameProps.legendLayout"
  if (
    legendLayout == null ||
    typeof legendLayout !== "object" ||
    Array.isArray(legendLayout)
  ) {
    return legendLayout == null
      ? []
      : [{
          code: "INVALID_PROP_TYPE",
          path: base,
          actualType: runtimeTypeOf(legendLayout),
          expectedTypes: ["object"],
          message:
            `"${base}" should be object, got ${runtimeTypeOf(legendLayout)}.`,
        }]
  }

  const issues: ValidationIssue[] = []
  const layout = legendLayout as Datum
  const knownKeys = ["align", ...Object.keys(LEGEND_LAYOUT_NUMERIC_RULES)]

  for (const key of Object.keys(layout)) {
    if (!knownKeys.includes(key)) {
      const suggestion = closestMatch(key, knownKeys)
      issues.push({
        code: "UNKNOWN_NESTED_KEY",
        path: `${base}.${key}`,
        message: `Unknown "${base}" key "${key}". Valid keys: ${knownKeys.join(", ")}.`,
        ...(suggestion ? { suggestion } : {}),
      })
    }
  }

  if (layout.align !== undefined && typeof layout.align !== "string") {
    issues.push({
      code: "INVALID_PROP_TYPE",
      path: `${base}.align`,
      actualType: runtimeTypeOf(layout.align),
      expectedTypes: ["string"],
      message: `"${base}.align" should be string, got ${runtimeTypeOf(layout.align)}.`,
    })
  } else if (
    typeof layout.align === "string" &&
    !LEGEND_LAYOUT_ALIGNMENTS.has(layout.align)
  ) {
    issues.push({
      code: "INVALID_PROP_VALUE",
      path: `${base}.align`,
      allowedValues: [...LEGEND_LAYOUT_ALIGNMENTS],
      message: `"${base}.align" value "${layout.align}" is not valid. Expected one of: ${[
        ...LEGEND_LAYOUT_ALIGNMENTS,
      ].join(", ")}.`,
    })
  }

  for (const [key, rule] of Object.entries(LEGEND_LAYOUT_NUMERIC_RULES)) {
    const value = layout[key]
    if (value === undefined) continue
    if (typeof value !== "number" || !Number.isFinite(value)) {
      issues.push({
        code: "INVALID_PROP_TYPE",
        path: `${base}.${key}`,
        actualType: runtimeTypeOf(value),
        expectedTypes: ["number"],
        message: `"${base}.${key}" should be ${rule.label}, got ${runtimeTypeOf(value)}.`,
      })
    } else if (value < rule.minimum) {
      issues.push({
        code: "INVALID_PROP_VALUE",
        path: `${base}.${key}`,
        message: `"${base}.${key}" should be ${rule.label} (minimum ${rule.minimum}), got ${value}.`,
      })
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate props for a Semiotic HOC chart component.
 *
 * Checks: component name, required props, prop types, enum values,
 * unknown prop names (typo detection), and data shape + accessor validity.
 *
 * Every prop the component's public TypeScript type accepts is known here,
 * including React-only props such as `linkedHover`, `selection`, and
 * `hoverRadius` that are deliberately absent from the serialized schema.
 */
export function validateProps(
  componentName: string,
  props: Datum
): ValidationReport {
  const issues: ValidationIssue[] = []

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
    const componentNames = Object.keys(VALIDATION_MAP)
    const suggestion =
      typeof componentName === "string"
        ? closestMatch(componentName, componentNames)
        : undefined
    const message = `Unknown component "${componentName}". Valid components: ${componentNames.join(", ")}`
    return {
      valid: false,
      errors: [message],
      issues: [{
        code: "UNKNOWN_COMPONENT",
        message,
        ...(suggestion ? { suggestion } : {}),
      }],
    }
  }

  // 2. Required props
  for (const req of spec.required) {
    if (props[req] === undefined || props[req] === null) {
      issues.push({
        code: "MISSING_REQUIRED_PROP",
        path: req,
        message: `"${req}" is required for ${componentName}.`,
      })
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
    issues.push({
      code: "MISSING_REQUIRED_PROP",
      path: "data",
      message: `"data" is required for ${componentName}.`,
    })
  }

  // 3. Prop types & enum values
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue
    const def = Object.prototype.hasOwnProperty.call(spec.props, key)
      ? spec.props[key] : undefined
    if (!def) continue // unknown prop — checked in step 4

    // Type check
    if (!checkType(value, def.type)) {
      const expectedTypes = Array.isArray(def.type) ? def.type : [def.type]
      const actualType = runtimeTypeOf(value)
      // A callback prop handed a serializable value is the classic generated-
      // config mistake (a d3 format string for `yFormat`). Say why it cannot
      // work rather than only naming the type.
      const callbackOnly =
        expectedTypes.length === 1 && expectedTypes[0] === "function"
      issues.push({
        code: "INVALID_PROP_TYPE",
        path: key,
        actualType,
        expectedTypes: [...expectedTypes],
        message:
          `"${key}" should be ${expectedTypes.join(" | ")}, got ${actualType}.` +
          (callbackOnly
            ? ` It takes a function, which a serialized config cannot carry; omit "${key}" there and pass the function in React code.`
            : ""),
        ...(callbackOnly ? { patch: { op: "remove" as const, path: key } } : {}),
      })
      continue
    }

    if ((key === "width" || key === "height") &&
      (typeof value !== "number" || !Number.isFinite(value) || value <= 0)) {
      issues.push({
        code: "INVALID_PROP_VALUE",
        path: key,
        message: `"${key}" must be a finite positive number.`,
      })
    }
    if (key === "size" && Array.isArray(value) &&
      (value.length !== 2 || !Array.from(value).every((entry) => typeof entry === "number" && Number.isFinite(entry) && entry > 0))) {
      issues.push({
        code: "INVALID_PROP_VALUE",
        path: key,
        message: '"size" must contain two finite positive dimensions.',
      })
    }

    // Enum check
    if (def.enum && typeof value === "string" && !def.enum.includes(value)) {
      const suggestion = closestMatch(value, [...def.enum], 2)
      issues.push({
        code: "INVALID_PROP_VALUE",
        path: key,
        allowedValues: [...def.enum],
        message: `"${key}" value "${value}" is not valid. Expected one of: ${def.enum.join(", ")}.`,
        ...(suggestion
          ? { suggestion, patch: { op: "set" as const, path: key, value: suggestion } }
          : {}),
      })
    }
  }

  // 4. Unknown props (typo- and alias-aware suggestions)
  const knownPropNames = Object.keys(spec.props)
  let validProps: string[] | undefined
  for (const key of Object.keys(props)) {
    if (props[key] === undefined) continue
    if (Object.prototype.hasOwnProperty.call(spec.props, key)) continue
    const match = suggestPropName(key, spec.props, knownPropNames)
    if (match) {
      const suggestion = match.name
      // Rename only when it cannot clobber a value the caller already set and
      // the target accepts this value; otherwise the unknown prop is redundant
      // (target already set) or needs a human decision (type mismatch).
      const targetSet = props[suggestion] !== undefined && props[suggestion] !== null
      const patch: ValidationPatch | undefined = targetSet
        ? { op: "remove", path: key }
        : match.rename &&
            (props[key] === null ||
              checkType(props[key], spec.props[suggestion].type))
          ? { op: "rename", from: key, to: suggestion }
          : undefined
      issues.push({
        code: "UNKNOWN_PROP",
        path: key,
        suggestion,
        message: `Unknown prop "${key}" for ${componentName}. Did you mean "${suggestion}"?`,
        ...(patch ? { patch } : {}),
      })
      continue
    }
    // The accepted-prop list is long, so it is spelled out once per result:
    // in the first such sentence, and as `validProps` for structured callers.
    const firstWithoutSuggestion = validProps === undefined
    validProps ??= [...knownPropNames]
    issues.push({
      code: "UNKNOWN_PROP",
      path: key,
      patch: { op: "remove", path: key },
      message: firstWithoutSuggestion
        ? `Unknown prop "${key}" for ${componentName}. Valid props: ${knownPropNames.join(", ")}.`
        : `Unknown prop "${key}" for ${componentName} (valid props are listed above).`,
    })
  }

  // Histogram charts take axis configs as a top-level prop.
  if (Object.prototype.hasOwnProperty.call(spec.props, "axes")) {
    issues.push(...validateAxisConfigKeys(props.axes, "axes"))
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
    if (dataError) issues.push({ code: "INVALID_DATA", path: "data", message: dataError })
  } else if (spec.dataShape === "object") {
    const dataError = validateObjectData({
      componentName,
      data: props.data,
    })
    if (dataError) issues.push({ code: "INVALID_DATA", path: "data", message: dataError })
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
    if (dataError) issues.push({ code: "INVALID_DATA", message: dataError })
  }
  // "none" (e.g. GaugeChart's value-only props) and "realtime" (ref-based
  // push API) data shapes have no data prop to validate — no branch needed.

  if (componentName === "GaugeChart") {
    issues.push(...validateGaugeThresholds(props))
  }

  if (componentName === "ScatterplotMatrix" && props.frameProps != null) {
    issues.push({
      code: "UNSUPPORTED_PROP",
      path: "frameProps",
      patch: { op: "remove", path: "frameProps" },
      message:
        '"frameProps" is not supported for ScatterplotMatrix; configure its matrix props directly.',
    })
  }

  issues.push(...validateFrameProps(props))

  // One entry per distinct sentence: two checks reaching the same conclusion
  // about the same prop should not double the report.
  const seen = new Set<string>()
  const unique = issues.filter((entry) => {
    if (seen.has(entry.message)) return false
    seen.add(entry.message)
    return true
  })

  return {
    valid: unique.length === 0,
    errors: unique.map((entry) => entry.message),
    issues: unique,
    ...(validProps ? { validProps } : {}),
  }
}
