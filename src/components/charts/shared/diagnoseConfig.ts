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

const BAR_AREA_COMPONENTS = new Set([
  "BarChart", "StackedBarChart", "GroupedBarChart",
  "AreaChart", "StackedAreaChart"
])

const XY_COMPONENTS = new Set([
  "LineChart", "AreaChart", "StackedAreaChart"
])

function checkDataGaps(
  component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  if (!XY_COMPONENTS.has(component)) return
  if (props.gapStrategy) return // explicit strategy set, no warning needed
  const data = props.data
  if (!data || !Array.isArray(data) || data.length === 0) return

  const yAcc = props.yAccessor || "y"
  if (typeof yAcc !== "string") return

  const hasGap = data.some((d: Record<string, any>) => {
    const v = d[yAcc]
    return v == null || Number.isNaN(v)
  })

  if (hasGap) {
    out.push({
      severity: "warning",
      code: "DATA_GAPS",
      message: `Data contains null/undefined/NaN values in "${yAcc}". Default behavior breaks the line at gaps.`,
      fix: `Set gapStrategy="break" (default), "interpolate", or "zero" to control gap handling.`,
    })
  }
}

function checkNonZeroBaseline(
  component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  if (!BAR_AREA_COMPONENTS.has(component)) return

  // Check if rExtent or yExtent explicitly sets a non-zero minimum
  const extent = props.rExtent || props.yExtent
  if (extent && Array.isArray(extent) && extent.length >= 1 && extent[0] != null && extent[0] !== 0) {
    out.push({
      severity: "warning",
      code: "NON_ZERO_BASELINE",
      message: `${component} has a non-zero baseline (${extent[0]}). Bar and area charts should start at zero to avoid exaggerating differences.`,
      fix: `Remove the custom extent minimum or set it to 0: rExtent={[0, ${extent[1] ?? "auto"}]}. For trend-focused charts, use LineChart instead.`,
    })
  }
}

const ORDINAL_BAR_COMPONENTS = new Set([
  "BarChart", "StackedBarChart", "GroupedBarChart"
])

function checkDegenerateExtent(
  component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  const spec = VALIDATION_MAP[component]
  if (!spec || spec.dataShape !== "array") return
  const data = props.data
  if (!data || !Array.isArray(data) || data.length === 0) return

  const accessors: Array<{ prop: string; name: string }> = []
  if (props.xAccessor && typeof props.xAccessor === "string") {
    accessors.push({ prop: "xAccessor", name: props.xAccessor })
  }
  if (props.yAccessor && typeof props.yAccessor === "string") {
    accessors.push({ prop: "yAccessor", name: props.yAccessor })
  }
  if (props.valueAccessor && typeof props.valueAccessor === "string") {
    accessors.push({ prop: "valueAccessor", name: props.valueAccessor })
  }

  const sampleSize = Math.min(data.length, 5)
  for (const acc of accessors) {
    let allNaN = true
    for (let i = 0; i < sampleSize; i++) {
      const v = data[i]?.[acc.name]
      if (typeof v === "number" && Number.isFinite(v)) {
        allNaN = false
        break
      }
    }
    if (allNaN) {
      out.push({
        severity: "error",
        code: "DEGENERATE_EXTENT",
        message: `${acc.prop}="${acc.name}" produces NaN or non-finite values for all sampled data points — chart extents will be invalid.`,
        fix: `Ensure data[].${acc.name} contains finite numbers, or use a function accessor to transform values.`,
      })
    }
  }
}

function checkBarPaddingInvisible(
  component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  if (!ORDINAL_BAR_COMPONENTS.has(component)) return
  const padding = props.barPadding
  if (typeof padding === "number" && padding < 10) {
    out.push({
      severity: "warning",
      code: "BAR_PADDING_INVISIBLE",
      message: `barPadding=${padding} is very small — bars may appear to have no spacing between them.`,
      fix: `Increase barPadding to at least 10 for visible gaps, e.g. barPadding={12}.`,
    })
  }
}

function checkBottomMarginWithLegend(
  _component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  if (props.legendPosition !== "bottom") return
  const m = props.margin
  if (!m || typeof m !== "object") return
  const bottom = m.bottom
  if (typeof bottom === "number" && bottom < 70) {
    out.push({
      severity: "warning",
      code: "BOTTOM_MARGIN_WITH_LEGEND",
      message: `legendPosition="bottom" with margin.bottom=${bottom}px — legend may overlap axis labels.`,
      fix: `Increase margin.bottom to at least 70, e.g. margin={{ ...margin, bottom: 80 }}.`,
    })
  }
}

function checkLegendMarginTight(
  _component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  if (!props.showLegend) return
  const pos = props.legendPosition ?? "right"
  if (pos !== "right") return
  const m = props.margin
  if (!m || typeof m !== "object") return
  const right = m.right
  if (typeof right === "number" && right < 100) {
    out.push({
      severity: "warning",
      code: "LEGEND_MARGIN_TIGHT",
      message: `showLegend is true with legendPosition="right" but margin.right=${right}px — legend may be clipped or overlap the chart.`,
      fix: `Increase margin.right to at least 100, e.g. margin={{ ...margin, right: 120 }}.`,
    })
  }
}

function checkHeatmapStringAccessor(
  component: string,
  props: Record<string, any>,
  out: Diagnosis[]
): void {
  if (component !== "Heatmap") return
  const data = props.data
  if (!data || !Array.isArray(data) || data.length === 0) return

  const sample = data[0]
  if (!sample || typeof sample !== "object") return

  for (const accProp of ["xAccessor", "yAccessor"] as const) {
    const accValue = props[accProp]
    if (typeof accValue !== "string") continue
    const v = sample[accValue]
    if (typeof v === "string") {
      out.push({
        severity: "warning",
        code: "HEATMAP_STRING_ACCESSOR",
        message: `${accProp}="${accValue}" resolves to string values (e.g. "${v}"). Heatmap will use categorical axis handling which may produce unexpected cell layout.`,
        fix: `If you intend categorical axes this is fine. Otherwise, convert values to numbers before passing data.`,
      })
    }
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
  checkNonZeroBaseline(componentName, props, diagnoses)
  checkDataGaps(componentName, props, diagnoses)
  checkMarginOverflow(componentName, props, diagnoses)
  checkDegenerateExtent(componentName, props, diagnoses)
  checkBarPaddingInvisible(componentName, props, diagnoses)
  checkBottomMarginWithLegend(componentName, props, diagnoses)
  checkLegendMarginTight(componentName, props, diagnoses)
  checkHeatmapStringAccessor(componentName, props, diagnoses)

  return {
    ok: diagnoses.every(d => d.severity === "warning"),
    diagnoses,
  }
}
