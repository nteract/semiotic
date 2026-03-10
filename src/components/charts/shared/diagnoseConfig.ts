/**
 * diagnoseConfig — anti-pattern detector for Semiotic chart configurations.
 *
 * Catches common failure modes that produce blank charts or runtime errors,
 * returning actionable fix instructions for each issue found.
 */

import { VALIDATION_MAP, validateProps } from "./validateProps"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Diagnosis {
  severity: "error" | "warning"
  code: string
  message: string
  fix: string
}

export interface DiagnosisResult {
  ok: boolean
  diagnoses: Diagnosis[]
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const HIERARCHY_COMPONENTS = new Set([
  "TreeDiagram", "Treemap", "CirclePack", "OrbitDiagram"
])

const NETWORK_COMPONENTS = new Set([
  "ForceDirectedGraph", "SankeyDiagram", "ChordDiagram"
])

function checkEmptyData(
  component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  const spec = VALIDATION_MAP[component]
  if (!spec) return

  if (spec.dataShape === "array") {
    const data = props.data
    if (data && Array.isArray(data) && data.length === 0) {
      out.push({
        severity: "error",
        code: "EMPTY_DATA",
        message: `data is an empty array — chart will render blank.`,
        fix: `Provide at least one data point: data={[{ x: 1, y: 2 }]}.`,
      })
    }
  }

  if (spec.dataShape === "network") {
    if (props.edges && Array.isArray(props.edges) && props.edges.length === 0) {
      out.push({
        severity: "error",
        code: "EMPTY_EDGES",
        message: `edges is an empty array — network chart will render blank.`,
        fix: `Provide at least one edge: edges={[{ source: "A", target: "B" }]}.`,
      })
    }
  }
}

function checkBadDimensions(
  _component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  const w = props.width
  const h = props.height
  if (w !== undefined && (typeof w !== "number" || w <= 0)) {
    out.push({
      severity: "error",
      code: "BAD_WIDTH",
      message: `width=${JSON.stringify(w)} — chart needs a positive number.`,
      fix: `Set width={600} or use responsiveWidth={true}.`,
    })
  }
  if (h !== undefined && (typeof h !== "number" || h <= 0)) {
    out.push({
      severity: "error",
      code: "BAD_HEIGHT",
      message: `height=${JSON.stringify(h)} — chart needs a positive number.`,
      fix: `Set height={400} or use responsiveHeight={true}.`,
    })
  }
  // size=[0,0] or similar
  if (props.size && Array.isArray(props.size)) {
    const [sw, sh] = props.size
    if ((sw != null && sw <= 0) || (sh != null && sh <= 0)) {
      out.push({
        severity: "error",
        code: "BAD_SIZE",
        message: `size=[${sw}, ${sh}] — both dimensions must be positive.`,
        fix: `Set size={[600, 400]}.`,
      })
    }
  }
}

function checkAccessorFieldMissing(
  component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  const spec = VALIDATION_MAP[component]
  if (!spec || spec.dataShape !== "array") return
  const data = props.data
  if (!data || !Array.isArray(data) || data.length === 0) return

  const sample = data[0]
  if (!sample || typeof sample !== "object") return
  const available = Object.keys(sample)

  for (const accProp of spec.dataAccessors) {
    const accValue = props[accProp]
    if (typeof accValue !== "string") continue
    if (!(accValue in sample)) {
      out.push({
        severity: "error",
        code: "ACCESSOR_MISSING",
        message: `${accProp}="${accValue}" not found in data. Available fields: ${available.join(", ")}.`,
        fix: `Change ${accProp} to one of: ${available.map(f => `"${f}"`).join(", ")}.`,
      })
    }
  }
}

function checkHierarchyDataAsArray(
  component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  if (!HIERARCHY_COMPONENTS.has(component)) return
  if (Array.isArray(props.data)) {
    out.push({
      severity: "error",
      code: "HIERARCHY_FLAT_ARRAY",
      message: `${component} expects hierarchical data but received a flat array.`,
      fix: `Pass a root object: data={{ name: "root", children: [...] }}. For flat data, use BarChart or LineChart.`,
    })
  }
}

function checkNetworkMissingEdges(
  component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  if (!NETWORK_COMPONENTS.has(component)) return
  if (!props.edges && !props.data) {
    out.push({
      severity: "error",
      code: "NETWORK_NO_EDGES",
      message: `${component} requires an edges prop.`,
      fix: `Provide edges={[{ source: "A", target: "B", value: 10 }]}.`,
    })
  }
}

function checkDateWithoutFormat(
  component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  const spec = VALIDATION_MAP[component]
  if (!spec || spec.dataShape !== "array") return
  const data = props.data
  if (!data || !Array.isArray(data) || data.length === 0) return

  const sample = data[0]
  if (!sample || typeof sample !== "object") return

  // Check if xAccessor points to a Date field
  const xAcc = props.xAccessor
  if (typeof xAcc === "string" && sample[xAcc] instanceof Date && !props.xFormat) {
    out.push({
      severity: "warning",
      code: "DATE_NO_FORMAT",
      message: `xAccessor "${xAcc}" contains Date objects but no xFormat is provided. Axis ticks may display "[object Object]".`,
      fix: `Add xFormat={d => d.toLocaleDateString()} or use timestamps (d.getTime()) instead of Date objects.`,
    })
  }
}

function checkLinkedChartsWithoutSelection(
  _component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  // If linkedHover is set but selection is not, the highlight won't apply
  if (props.linkedHover && !props.selection) {
    out.push({
      severity: "warning",
      code: "LINKED_HOVER_NO_SELECTION",
      message: `linkedHover is set but selection is not — this chart emits hover events but won't highlight from others.`,
      fix: `Add selection={{ name: "${typeof props.linkedHover === "object" ? props.linkedHover.name || "hl" : "hl"}" }} to receive cross-highlights.`,
    })
  }
}

function checkMarginOverflow(
  _component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  const w = props.width ?? 600
  const h = props.height ?? 400
  const m = props.margin
  if (!m || typeof m !== "object") return

  const totalH = (m.left || 0) + (m.right || 0)
  const totalV = (m.top || 0) + (m.bottom || 0)
  if (totalH >= w) {
    out.push({
      severity: "error",
      code: "MARGIN_OVERFLOW_H",
      message: `Horizontal margins (${totalH}px) >= width (${w}px) — no drawing area left.`,
      fix: `Reduce margin.left/right or increase width.`,
    })
  }
  if (totalV >= h) {
    out.push({
      severity: "error",
      code: "MARGIN_OVERFLOW_V",
      message: `Vertical margins (${totalV}px) >= height (${h}px) — no drawing area left.`,
      fix: `Reduce margin.top/bottom or increase height.`,
    })
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run anti-pattern diagnostics on a Semiotic chart configuration.
 *
 * Returns actionable diagnoses with severity, code, message, and fix instruction.
 * Runs validateProps internally — validation errors are included as diagnoses.
 */
export function diagnoseConfig(
  componentName: string,
  props: Record<string, any>
): DiagnosisResult {
  const diagnoses: Diagnosis[] = []

  // Run validateProps first
  const validation = validateProps(componentName, props)
  for (const err of validation.errors) {
    diagnoses.push({
      severity: "error",
      code: "VALIDATION",
      message: err,
      fix: "", // validateProps errors already contain guidance
    })
  }

  // If component is unknown, skip further checks
  if (!VALIDATION_MAP[componentName]) {
    return { ok: diagnoses.length === 0, diagnoses }
  }

  // Run anti-pattern checks
  checkEmptyData(componentName, props, diagnoses)
  checkBadDimensions(componentName, props, diagnoses)
  checkAccessorFieldMissing(componentName, props, diagnoses)
  checkHierarchyDataAsArray(componentName, props, diagnoses)
  checkNetworkMissingEdges(componentName, props, diagnoses)
  checkDateWithoutFormat(componentName, props, diagnoses)
  checkLinkedChartsWithoutSelection(componentName, props, diagnoses)
  checkMarginOverflow(componentName, props, diagnoses)

  return {
    ok: diagnoses.every(d => d.severity === "warning"),
    diagnoses,
  }
}
