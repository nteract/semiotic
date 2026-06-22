import type { Datum } from "./datumTypes"
/**
 * diagnoseConfig — anti-pattern detector for Semiotic chart configurations.
 *
 * Catches common failure modes that produce blank charts or runtime errors,
 * returning actionable fix instructions for each issue found.
 */

import { VALIDATION_MAP, validateProps } from "./validateProps"
import { annotationBudget } from "../../recipes/annotationDensity"
import {
  annotationDrawsConnector,
  annotationType,
  isNoteAnnotation,
} from "./annotationTypes"

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

// Named color schemes that resolve to a palette (colorUtils.COLOR_SCHEMES).
// A string `colorScheme` outside this set silently falls back to the default
// palette, so a typo produces wrong colors with no error. Kept in sync with
// COLOR_SCHEMES by a drift test in diagnoseConfig.test.ts.
const KNOWN_COLOR_SCHEMES = new Set([
  "category10", "tableau10", "set3",
  "blues", "reds", "greens", "oranges", "purples", "greys",
  "viridis", "plasma", "inferno", "magma", "cividis", "turbo",
])

function checkEmptyData(
  component: string,
  props: Datum,
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
  props: Datum,
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
  props: Datum,
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
  props: Datum,
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
  props: Datum,
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
  props: Datum,
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
  props: Datum,
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
  props: Datum,
  out: Diagnosis[]
): void {
  if (!XY_COMPONENTS.has(component)) return
  if (props.gapStrategy) return // explicit strategy set, no warning needed
  const data = props.data
  if (!data || !Array.isArray(data) || data.length === 0) return

  const yAcc = props.yAccessor || "y"
  if (typeof yAcc !== "string") return

  const hasGap = data.some((d: Datum) => {
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
  props: Datum,
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
  "BarChart", "StackedBarChart", "GroupedBarChart", "FunnelChart"
])

function checkDegenerateExtent(
  component: string,
  props: Datum,
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
  props: Datum,
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
  props: Datum,
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
  props: Datum,
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
  props: Datum,
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

/** Compute relative luminance of a hex color (WCAG formula).
 *  Accepts 6-digit (#1f77b4) and 3-digit shorthand (#333) hex — the default
 *  light/dark themes use shorthand, so the shorthand path is load-bearing for
 *  the theme contrast conformance test. */
function luminance(hex: string): number | null {
  let h = hex.replace(/^#/, "")
  if (/^[a-f\d]{3}$/i.test(h)) {
    h = h.split("").map((c) => c + c).join("")
  }
  const m = h.match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return null
  const [r, g, b] = [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/** WCAG contrast ratio between two hex colors. Exported for reuse by the
 *  accessibility audit (auditAccessibility.ts) — single source of truth for the
 *  contrast math. Returns null if either color isn't a parseable hex. */
export function contrastRatio(hex1: string, hex2: string): number | null {
  const l1 = luminance(hex1)
  const l2 = luminance(hex2)
  if (l1 === null || l2 === null) return null
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function checkColorContrast(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  // Check categorical colors against background if both are hex
  const colors = props.colorScheme
  if (!colors || !Array.isArray(colors)) return

  // Try to determine background — explicit prop or default white/dark
  const bg = typeof props.background === "string" ? props.background : "#ffffff"
  if (!bg.startsWith("#")) return

  const lowContrast: string[] = []
  for (const c of colors) {
    if (typeof c !== "string" || !c.startsWith("#")) continue
    const ratio = contrastRatio(c, bg)
    if (ratio !== null && ratio < 3) {
      lowContrast.push(`${c} (${ratio.toFixed(1)}:1)`)
    }
  }

  if (lowContrast.length > 0) {
    out.push({
      severity: "warning",
      code: "LOW_COLOR_CONTRAST",
      message: `${lowContrast.length} color(s) in colorScheme have < 3:1 contrast against background "${bg}": ${lowContrast.join(", ")}. Data marks may be hard to see.`,
      fix: `Use darker colors on light backgrounds or lighter colors on dark backgrounds. Import COLOR_BLIND_SAFE_CATEGORICAL from "semiotic" for an accessible preset.`,
    })
  }
}

function checkMarginOverflow(
  _component: string,
  props: Datum,
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

const ACCESSOR_PROPS = [
  "xAccessor", "yAccessor", "timeAccessor", "valueAccessor",
  "categoryAccessor", "colorBy", "sizeBy", "lineBy", "areaBy",
  "stackBy", "groupBy", "orderAccessor", "y0Accessor",
  "sourceAccessor", "targetAccessor", "nodeIDAccessor",
  "childrenAccessor", "costAccessor",
]

function checkMissingDescription(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  // Chartability critical: charts should have a title, description, or summary
  const hasTitle = typeof props.title === "string" && props.title.trim().length > 0
  const hasDescription = typeof props.description === "string" && props.description.trim().length > 0
  const hasSummary = typeof props.summary === "string" && props.summary.trim().length > 0

  if (!hasTitle && !hasDescription && !hasSummary) {
    out.push({
      severity: "warning",
      code: "MISSING_DESCRIPTION",
      message: `No title, description, or summary provided. Screen readers will fall back to a generic chart-type label.`,
      fix: `Add a title="..." prop for a brief label, or description="..." for a detailed aria-label, or summary="..." for a screen-reader-only note describing the chart's purpose.`,
    })
  }
}

function checkUnknownColorScheme(
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  const scheme = props.colorScheme
  // Arrays are explicit palettes; non-strings aren't named schemes.
  if (typeof scheme !== "string") return
  // Charts with an explicit colorScheme enum (e.g. Heatmap's sequential names,
  // including "custom") are validated by validateProps — don't second-guess it.
  const spec = VALIDATION_MAP[component]
  if (spec?.props?.colorScheme?.enum) return
  if (!KNOWN_COLOR_SCHEMES.has(scheme)) {
    out.push({
      severity: "warning",
      code: "UNKNOWN_COLOR_SCHEME",
      message: `colorScheme "${scheme}" is not a recognized named scheme — the chart will fall back to the default palette.`,
      fix: `Use a known scheme name (${[...KNOWN_COLOR_SCHEMES].join(", ")}) or pass an explicit color array, e.g. colorScheme={["#1f77b4", "#ff7f0e"]}.`,
    })
  }
}

function checkAdjacentCategoryContrast(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  const colors = props.colorScheme
  if (!colors || !Array.isArray(colors) || colors.length < 2) return

  // Check that adjacent categorical colors are distinguishable from each other
  const hexColors = colors.filter((c: any) => typeof c === "string" && c.startsWith("#"))
  if (hexColors.length < 2) return

  const lowDistinguishability: string[] = []
  for (let i = 0; i < hexColors.length - 1; i++) {
    const ratio = contrastRatio(hexColors[i], hexColors[i + 1])
    if (ratio !== null && ratio < 1.5) {
      lowDistinguishability.push(`${hexColors[i]} / ${hexColors[i + 1]} (${ratio.toFixed(1)}:1)`)
    }
  }

  if (lowDistinguishability.length > 0) {
    out.push({
      severity: "warning",
      code: "LOW_ADJACENT_CONTRAST",
      message: `${lowDistinguishability.length} adjacent color pair(s) in colorScheme have very similar luminance: ${lowDistinguishability.join("; ")}. Categories may be hard to distinguish.`,
      fix: `Alternate light and dark colors in the scheme, or use COLOR_BLIND_SAFE_CATEGORICAL from "semiotic" for a pre-tested palette.`,
    })
  }
}

function checkFunctionAccessors(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  const fnAccessors: string[] = []
  for (const prop of ACCESSOR_PROPS) {
    if (typeof props[prop] === "function") {
      fnAccessors.push(prop)
    }
  }
  if (fnAccessors.length > 0) {
    out.push({
      severity: "warning",
      code: "FUNCTION_ACCESSOR",
      message: `Function accessor${fnAccessors.length > 1 ? "s" : ""} detected: ${fnAccessors.join(", ")}. If defined inline (e.g. \`xAccessor={d => d.value}\`), every parent re-render creates a new reference which may trigger unnecessary scene rebuilds.`,
      fix: `Use string accessors when possible (e.g. xAccessor="value"), or memoize with useCallback / define outside the component.`,
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
// Connector-necessity (Rahman et al.'s "Placement"): a note should sit next to
// its target, with a connector only when proximity is infeasible. Two cheap
// static smells — a note placed far from its anchor with no connector at all,
// and a connector long enough to suggest the note could have been adjacent.
// Advisory only (warnings). The label/callout default offset (~42px) sits well
// under both thresholds, so default-placed notes never trip this.
const FAR_PLACEMENT_PX = 120
const VERY_LONG_CONNECTOR_PX = 250

function checkAnnotationConnectors(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  const anns = Array.isArray(props.annotations) ? (props.annotations as Datum[]) : null
  if (!anns) return
  for (const a of anns) {
    if (!a || typeof a !== "object") continue
    const type = annotationType(a)
    // Widgets are HTML affordances rather than anchored SVG notes, so the
    // connector-distance diagnostic does not apply to them.
    if (!isNoteAnnotation(a) || type === "widget") continue
    const dx = typeof a.dx === "number" ? a.dx : 0
    const dy = typeof a.dy === "number" ? a.dy : 0
    const dist = Math.hypot(dx, dy)
    const label = typeof a.label === "string" ? a.label : typeof a.title === "string" ? a.title : type
    // `text` never draws a connector; label/callout draw one unless disabled.
    const hasConnector = annotationDrawsConnector(a)

    if (!hasConnector && dist > FAR_PLACEMENT_PX) {
      out.push({
        severity: "warning",
        code: "ANNOTATION_FAR_NO_CONNECTOR",
        message: `Annotation "${label}" sits ~${Math.round(dist)}px from its anchor with no connector — a reader can't tell what it refers to.`,
        fix: `Add a connector (connector: { end: "arrow" }, the label/callout default) or place the note adjacent to its target (smaller dx/dy).`,
      })
    } else if (hasConnector && dist > VERY_LONG_CONNECTOR_PX) {
      out.push({
        severity: "warning",
        code: "ANNOTATION_LONG_CONNECTOR",
        message: `Annotation "${label}" uses a very long connector (~${Math.round(dist)}px); prefer placing the note adjacent to its target when space allows.`,
        fix: `Reduce dx/dy so the note sits near its target, or keep the long connector only if proximity is genuinely infeasible.`,
      })
    }
  }
}

// Amount & density (Rahman et al.'s "Amount of annotation": balance explanatory
// support against clutter). A soft, advisory smell — count note-like
// annotations against the same area-derived budget the runtime density pass
// uses, and suggest emphasis or progressive disclosure when they pile up.
// Reference lines, bands and overlays don't count toward the budget.
function checkAnnotationDensity(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  const anns = Array.isArray(props.annotations) ? (props.annotations as Datum[]) : null
  if (!anns) return

  const noteCount = anns.filter(isNoteAnnotation).length
  if (noteCount === 0) return

  const width = typeof props.width === "number" ? props.width : 600
  const height = typeof props.height === "number" ? props.height : 400
  const budget = annotationBudget(width, height)
  if (!Number.isFinite(budget) || noteCount <= budget) return

  out.push({
    severity: "warning",
    code: "ANNOTATION_DENSITY",
    message: `${noteCount} note annotations on a ${width}×${height} chart exceed the ~${budget} notes the plot area carries comfortably — the chart may read as cluttered.`,
    fix: `Mark the essential notes emphasis: "primary" and let density management shed the rest (autoPlaceAnnotations: { density: true }), enable progressive disclosure to reveal secondary notes on hover, or give the chart more room.`,
  })
}

// ---------------------------------------------------------------------------
// Misleading-design checks (deception pack)
//
// Rules for design patterns that mislead readers — and, per "The Perils of
// Chart Deception" (IEEE VIS 2025) — mislead vision-language models the same
// way. Each rule targets a deception category with empirical backing (CALVI's
// misleading-element items; Cleveland & McGill on encoding fidelity). All are
// config-level checks: they read props + data, never the rendered output, so
// they run identically in --doctor, MCP diagnoseConfig, and CI.
// ---------------------------------------------------------------------------

const EXTENT_PROPS = ["xExtent", "yExtent", "rExtent"] as const

function checkInvertedAxis(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  for (const prop of EXTENT_PROPS) {
    const extent = props[prop]
    if (!Array.isArray(extent) || extent.length < 2) continue
    const [lo, hi] = extent
    if (typeof lo !== "number" || typeof hi !== "number") continue
    if (lo > hi) {
      out.push({
        severity: "warning",
        code: "INVERTED_AXIS",
        message: `${prop}=[${lo}, ${hi}] is descending — the axis renders inverted, so "up" reads as less. Inverted axes are a classic misleading-design pattern unless the inversion is the point.`,
        fix: `Order the extent ascending (${prop}={[${hi}, ${lo}]}). If the inversion is deliberate (e.g. rank #1 at top), say so in the title or an annotation so readers aren't misled.`,
      })
    }
  }
}

function checkDualAxisUnlabeled(
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  if (component !== "MultiAxisLineChart") return
  const series = props.series
  // Dual-axis mode is exactly two series; ≠2 falls back to multi-line.
  if (!Array.isArray(series) || series.length !== 2) return
  const unlabeled = series.filter(
    (s: Datum) => !s || typeof s !== "object" || typeof s.label !== "string" || s.label.trim().length === 0
  )
  if (unlabeled.length > 0) {
    out.push({
      severity: "warning",
      code: "DUAL_AXIS_UNLABELED",
      message: `Dual-axis chart with ${unlabeled.length} unlabeled series. Two y-scales invite false equivalence between the lines; without per-series labels a reader can't tell which scale is whose.`,
      fix: `Give every series a label: series={[{ yAccessor: "a", label: "Revenue ($)" }, { yAccessor: "b", label: "Users" }]} — and consider whether two separate charts read more honestly.`,
    })
  }
}

const TREND_WINDOW_COMPONENTS = new Set([
  "LineChart", "AreaChart", "StackedAreaChart"
])

function checkCherryPickedWindow(
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  if (!TREND_WINDOW_COMPONENTS.has(component)) return
  const extent = props.xExtent
  if (!Array.isArray(extent) || extent.length < 2) return
  const [lo, hi] = extent
  if (typeof lo !== "number" || typeof hi !== "number" || lo >= hi) return
  const data = props.data
  if (!data || !Array.isArray(data) || data.length < 4) return
  const xAcc = props.xAccessor ?? "x"
  if (typeof xAcc !== "string") return

  let dataMin = Infinity
  let dataMax = -Infinity
  for (const d of data) {
    const v = d?.[xAcc]
    if (typeof v !== "number" || !Number.isFinite(v)) continue
    if (v < dataMin) dataMin = v
    if (v > dataMax) dataMax = v
  }
  if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax) || dataMax <= dataMin) return

  const dataSpan = dataMax - dataMin
  const visibleSpan = Math.max(0, Math.min(hi, dataMax) - Math.max(lo, dataMin))
  const coverage = visibleSpan / dataSpan
  if (coverage < 0.7) {
    out.push({
      severity: "warning",
      code: "CHERRY_PICKED_WINDOW",
      message: `xExtent=[${lo}, ${hi}] shows only ~${Math.round(coverage * 100)}% of the data's x range [${dataMin}, ${dataMax}] — a trend cropped to a favorable window is a classic misleading-design pattern.`,
      fix: `Widen xExtent to cover the data, filter the data itself so the chart shows what it has, or annotate the visible window ("Q4 only") so the cropping is explicit.`,
    })
  }
}

const PART_TO_WHOLE_COMPONENTS: Record<string, string> = {
  PieChart: "valueAccessor",
  DonutChart: "valueAccessor",
  FunnelChart: "valueAccessor",
}

const NORMALIZED_STACK_COMPONENTS: Record<string, string> = {
  StackedBarChart: "valueAccessor",
  StackedAreaChart: "yAccessor",
}

function checkPartToWholeNegative(
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  const pieLike = PART_TO_WHOLE_COMPONENTS[component]
  const stackLike = NORMALIZED_STACK_COMPONENTS[component]
  if (!pieLike && !stackLike) return
  // Normalized stacks distort with negatives; un-normalized stacks diverge
  // around zero (a legitimate encoding), so only gate stacks when normalize.
  if (stackLike && !props.normalize) return

  const accProp = pieLike ?? stackLike!
  const accValue = props[accProp]
  const accessor =
    typeof accValue === "string" ? accValue : accProp === "yAccessor" ? "y" : "value"
  const data = props.data
  if (!data || !Array.isArray(data) || data.length === 0) return

  const negatives = data.filter((d: Datum) => {
    const v = d?.[accessor]
    return typeof v === "number" && v < 0
  })
  if (negatives.length > 0) {
    out.push({
      severity: pieLike ? "error" : "warning",
      code: "PART_TO_WHOLE_NEGATIVE",
      message: `${negatives.length} negative value(s) in "${accessor}" — a part-to-whole encoding cannot represent negative parts${pieLike ? "; slice angles/areas for negatives are meaningless" : "; normalized shares distort when parts are negative"}.`,
      fix: pieLike
        ? `Filter or transform negative values first, or switch to a BarChart/WaterfallChart, which encode signed values honestly.`
        : `Drop normalize for signed data, or use a diverging BarChart so negative contributions read as negative.`,
    })
  }
}

const CURVE_COMPONENTS = new Set([
  "LineChart", "AreaChart", "StackedAreaChart", "ConnectedScatterplot"
])

function checkNonPassingCurve(
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  if (!CURVE_COMPONENTS.has(component)) return
  if (props.curve !== "basis") return
  out.push({
    severity: "warning",
    code: "NON_PASSING_CURVE",
    message: `curve="basis" draws a B-spline that does NOT pass through your data points — rendered values differ from actual values everywhere except the endpoints.`,
    fix: `Use curve="monotoneX" or curve="catmullRom" (both interpolate through every point), or keep "basis" only for deliberately schematic, clearly-labeled smoothing.`,
  })
}

function checkExtremeAspectRatio(
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  if (component !== "LineChart" && component !== "AreaChart") return
  if (props.mode === "sparkline") return // sparklines are wide by contract
  if (props.responsiveWidth || props.responsiveHeight) return // container decides
  const w = typeof props.width === "number" ? props.width : 600
  const h = typeof props.height === "number" ? props.height : 400
  if (w <= 0 || h <= 0) return
  const ratio = w / h
  if (ratio > 8 || ratio < 0.25) {
    const direction = ratio > 8 ? "flattens" : "exaggerates"
    out.push({
      severity: "warning",
      code: "EXTREME_ASPECT_RATIO",
      message: `${w}×${h} (${ratio.toFixed(1)}:1) is an extreme aspect ratio that ${direction} the slopes a reader perceives — aspect-ratio distortion is a documented misleading-design pattern.`,
      fix: ratio > 8
        ? `Use a more balanced aspect (e.g. width/height between 1 and 3), or set mode="sparkline" if this is genuinely a sparkline strip.`
        : `Use a more balanced aspect (e.g. width/height between 1 and 3); very tall trend charts overstate every change.`,
    })
  }
}

const PIE_COMPONENTS = new Set(["PieChart", "DonutChart"])
const MAX_LEGIBLE_SLICES = 8

function checkPieTooManySlices(
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  if (!PIE_COMPONENTS.has(component)) return
  const data = props.data
  if (!data || !Array.isArray(data) || data.length === 0) return
  const catAcc = props.categoryAccessor
  const accessor = typeof catAcc === "string" ? catAcc : "category"
  const distinct = new Set<unknown>()
  for (const d of data) {
    const v = d?.[accessor]
    if (v != null) distinct.add(v)
  }
  if (distinct.size > MAX_LEGIBLE_SLICES) {
    out.push({
      severity: "warning",
      code: "PIE_TOO_MANY_SLICES",
      message: `${distinct.size} slices — angle judgments degrade rapidly past ~${MAX_LEGIBLE_SLICES} categories (Cleveland & McGill), and thin slices become unreadable and unlabelable.`,
      fix: `Use a BarChart or DotPlot for ${distinct.size} categories, or group the long tail into an "Other" slice before charting.`,
    })
  }
}

export function diagnoseConfig(
  componentName: string,
  props: Datum
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
  checkColorContrast(componentName, props, diagnoses)
  checkAdjacentCategoryContrast(componentName, props, diagnoses)
  checkUnknownColorScheme(componentName, props, diagnoses)
  checkMissingDescription(componentName, props, diagnoses)
  checkFunctionAccessors(componentName, props, diagnoses)
  checkAnnotationConnectors(componentName, props, diagnoses)
  checkAnnotationDensity(componentName, props, diagnoses)

  // Misleading-design checks (deception pack)
  checkInvertedAxis(componentName, props, diagnoses)
  checkDualAxisUnlabeled(componentName, props, diagnoses)
  checkCherryPickedWindow(componentName, props, diagnoses)
  checkPartToWholeNegative(componentName, props, diagnoses)
  checkNonPassingCurve(componentName, props, diagnoses)
  checkExtremeAspectRatio(componentName, props, diagnoses)
  checkPieTooManySlices(componentName, props, diagnoses)

  return {
    ok: diagnoses.every(d => d.severity === "warning"),
    diagnoses,
  }
}
