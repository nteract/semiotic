import type { Datum } from "./datumTypes"
import type { Diagnosis, DiagnosisResult } from "./diagnoseTypes"
/**
 * diagnoseConfig — anti-pattern detector for Semiotic chart configurations.
 *
 * Catches common failure modes that produce blank charts or runtime errors,
 * returning actionable fix instructions for each issue found.
 */

import { VALIDATION_MAP, validateProps } from "./validateProps"
import { diagnoseTokenEncoding } from "../../recipes/tokenEncoding"
import { contrastRatio } from "./colorContrast"
import {
  BAR_AREA_CHARTS,
  HIERARCHY_CHARTS,
  NETWORK_CHARTS,
  ORDINAL_BAR_CHARTS,
  TREND_SERIES_CHARTS,
} from "./chartFamilySets"
import {
  checkAnnotationConnectors,
  checkAnnotationDensity,
  checkInteractiveAnnotationIds,
} from "./diagnoseAnnotationChecks"
import {
  checkCherryPickedWindow,
  checkDualAxisUnlabeled,
  checkExtremeAspectRatio,
  checkInvertedAxis,
  checkNonPassingCurve,
  checkPartToWholeNegative,
  checkPieTooManySlices,
} from "./diagnoseMisleadingChecks"
import { checkPhysicsConfig } from "./diagnosePhysicsChecks"

export { contrastRatio } from "./colorContrast"
export type { Diagnosis, DiagnosisResult } from "./diagnoseTypes"

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
  if (!HIERARCHY_CHARTS.has(component)) return
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
  if (!NETWORK_CHARTS.has(component)) return
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
  if (props.linkedHover && !props.selection) {
    out.push({
      severity: "warning",
      code: "LINKED_HOVER_NO_SELECTION",
      message: `linkedHover is set but selection is not — this chart emits hover events but won't highlight from others.`,
      fix: `Add selection={{ name: "${typeof props.linkedHover === "object" ? props.linkedHover.name || "hl" : "hl"}" }} to receive cross-highlights.`,
    })
  }
}

function checkDataGaps(
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  if (!TREND_SERIES_CHARTS.has(component)) return
  if (props.gapStrategy) return
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
  if (!BAR_AREA_CHARTS.has(component)) return

  const extent = props.rExtent || props.yExtent || props.valueExtent
  if (extent && Array.isArray(extent) && extent.length >= 1 && extent[0] != null && extent[0] !== 0) {
    out.push({
      severity: "warning",
      code: "NON_ZERO_BASELINE",
      message: `${component} has a non-zero baseline (${extent[0]}). Bar and area charts should start at zero to avoid exaggerating differences.`,
      fix: `Remove the custom extent minimum or set it to 0: rExtent={[0, ${extent[1] ?? "auto"}]}. For trend-focused charts, use LineChart instead.`,
    })
  }
}

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
  if (!ORDINAL_BAR_CHARTS.has(component)) return
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

function checkColorContrast(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  const colors = props.colorScheme
  if (!colors || !Array.isArray(colors)) return

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
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  const declaredProps = VALIDATION_MAP[component]?.props
  const hasSupportedText = (name: "title" | "description" | "summary") =>
    !!declaredProps?.[name] && typeof props[name] === "string" && props[name].trim().length > 0
  const hasTitle = hasSupportedText("title")
  const hasDescription = hasSupportedText("description")
  const hasSummary = hasSupportedText("summary")

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
  if (typeof scheme !== "string") return

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

  const hexColors = colors.filter((color): color is string => typeof color === "string" && color.startsWith("#"))
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
      message: `Function accessor${fnAccessors.length > 1 ? "s" : ""} detected: ${fnAccessors.join(", ")}. If defined inline (e.g. \`xAccessor={d => d.value}\`), every parent re-render creates a new reference; closures over changing values can force unnecessary scene rebuilds on resize/rotation.`,
      fix: `Use string accessors when possible (e.g. xAccessor="value"), or memoize with useCallback / define outside the component.`,
    })
  }
}

function checkMobileHitRadius(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  const radius = props.hoverRadius
  const hoverConfigured =
    props.enableHover !== false &&
    (props.hoverAnnotation !== false || props.tooltip || props.customHoverBehavior || props.customClickBehavior || props.onClick)
  if (typeof radius === "number" && radius > 0 && radius < 24 && hoverConfigured) {
    out.push({
      severity: "warning",
      code: "TOUCH_TARGET_SMALL",
      message: `hoverRadius=${radius}px is below the ~24px radius needed for reliable 48px touch targets on mobile screens.`,
      fix: `Use hoverRadius={24} or larger for touch-heavy views. Semiotic floors touch pointer hit testing to 24px, but explicit desktop-only radii should be documented.`,
    })
  }
}

function checkResponsiveMobileLayout(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  if (props.responsiveWidth === true && props.responsiveHeight === true) {
    out.push({
      severity: "warning",
      code: "RESPONSIVE_BOTH_AXES",
      message: `responsiveWidth and responsiveHeight are both true. On mobile this can create resize feedback loops when the parent height depends on chart content.`,
      fix: `Prefer responsiveWidth={true} with a fixed parent height or size={[width, fixedHeight]}; use a ResizeObserver outside the chart if the height must follow aspect ratio.`,
    })
  }
}

function checkGeoParticlesMobile(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  if (props.showParticles !== true) return
  const style = props.particleStyle && typeof props.particleStyle === "object" ? props.particleStyle : {}
  const maxPerLine = typeof style.maxPerLine === "number" ? style.maxPerLine : undefined
  const spawnRate = typeof style.spawnRate === "number" ? style.spawnRate : undefined
  if ((typeof maxPerLine === "number" && maxPerLine > 20) || (typeof spawnRate === "number" && spawnRate > 0.08)) {
    out.push({
      severity: "warning",
      code: "GEO_PARTICLE_MOBILE_COST",
      message: `Animated geo particles run a continuous canvas loop that can drain battery and trigger thermal throttling on mobile GPUs.`,
      fix: `Set particleStyle={{ maxPerLine: 12, spawnRate: 0.06 }} for mobile-heavy views, or disable showParticles when reduced-motion or low-power modes are active.`,
    })
  }
}

function isTokenEncodingLike(value: unknown): value is Datum {
  return (
    typeof value === "object" &&
    value !== null &&
    ("tokenType" in value ||
      "tokenSemantics" in value ||
      "countStrategy" in value ||
      "unitValue" in value ||
      "unit" in value)
  )
}

function numericTokenBudget(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined
}

function estimateVisibleTokens(props: Datum, encoding: Datum): number | undefined {
  const explicit = numericTokenBudget(props.visibleTokens)
  if (explicit != null) return explicit

  const denominator = numericTokenBudget(encoding.denominator)
  if (encoding.countStrategy === "fixed-denominator" && denominator != null) {
    return denominator
  }

  const tokenCount = numericTokenBudget(encoding.tokenCount)
  const maxTokens = numericTokenBudget(encoding.maxTokens)
  if (tokenCount != null && maxTokens != null) return Math.min(tokenCount, maxTokens)
  return tokenCount ?? denominator ?? maxTokens
}

function checkTokenEncodingDiagnostics(
  _component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  const candidates: Array<{ source: "tokenEncoding" | "encoding"; encoding: Datum }> = []
  if (isTokenEncodingLike(props.tokenEncoding)) {
    candidates.push({ source: "tokenEncoding", encoding: props.tokenEncoding })
  }
  if (isTokenEncodingLike(props.encoding)) {
    candidates.push({ source: "encoding", encoding: props.encoding })
  }

  for (const { source, encoding } of candidates) {
    const visibleTokens = estimateVisibleTokens(props, encoding)
    for (const diagnostic of diagnoseTokenEncoding(encoding, { visibleTokens })) {
      out.push({
        severity: "warning",
        code: `TOKEN_${diagnostic.code}`,
        message: diagnostic.message,
        fix:
          diagnostic.code === "MISSING_UNIT_VALUE"
            ? `Set ${source}.unitValue to the value represented by one full token.`
            : diagnostic.code === "MISSING_UNIT_MEANING"
              ? `Set ${source}.unitMeaning so readers know what one full token represents.`
              : diagnostic.code === "MISSING_COUNT_STRATEGY"
                ? `Set ${source}.countStrategy to actual, unitized, fixed-denominator, quantile, sample, posterior-sample, or random-sample.`
                : diagnostic.code === "TOKEN_SEMANTICS_UNCLEAR"
                  ? `Set ${source}.tokenSemantics to observed-unit, unitized-measure, risk-case, possible-outcome, posterior-sample, hypothetical-case, topic-anchor, or decorative.`
                  : `Adjust ${source} so its semantics, strategy, labels, and visible token count match the task.`,
      })
    }
  }
}

function propsForValidation(props: Datum): Datum {
  const validationProps = { ...props }
  delete validationProps.tokenEncoding
  delete validationProps.visibleTokens
  if (isTokenEncodingLike(validationProps.encoding)) {
    delete validationProps.encoding
  }
  return validationProps
}

/**
 * Run anti-pattern diagnostics on a Semiotic chart configuration.
 *
 * Returns actionable diagnoses with severity, code, message, and fix instruction.
 * Runs validateProps internally — validation errors are included as diagnoses.
 */
export function diagnoseConfig(
  componentName: string,
  props: Datum
): DiagnosisResult {
  const diagnoses: Diagnosis[] = []

  const validation = validateProps(componentName, propsForValidation(props))
  for (const err of validation.errors) {
    diagnoses.push({
      severity: "error",
      code: "VALIDATION",
      message: err,
      fix: "",
    })
  }

  if (!VALIDATION_MAP[componentName]) {
    return { ok: diagnoses.length === 0, diagnoses }
  }

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
  checkMobileHitRadius(componentName, props, diagnoses)
  checkResponsiveMobileLayout(componentName, props, diagnoses)
  checkGeoParticlesMobile(componentName, props, diagnoses)
  checkTokenEncodingDiagnostics(componentName, props, diagnoses)
  checkAnnotationConnectors(componentName, props, diagnoses)
  checkAnnotationDensity(componentName, props, diagnoses)
  checkInteractiveAnnotationIds(componentName, props, diagnoses)

  checkInvertedAxis(componentName, props, diagnoses)
  checkDualAxisUnlabeled(componentName, props, diagnoses)
  checkCherryPickedWindow(componentName, props, diagnoses)
  checkPartToWholeNegative(componentName, props, diagnoses)
  checkNonPassingCurve(componentName, props, diagnoses)
  checkExtremeAspectRatio(componentName, props, diagnoses)
  checkPieTooManySlices(componentName, props, diagnoses)
  checkPhysicsConfig(componentName, props, diagnoses)

  return {
    ok: diagnoses.every(d => d.severity === "warning"),
    diagnoses,
  }
}
