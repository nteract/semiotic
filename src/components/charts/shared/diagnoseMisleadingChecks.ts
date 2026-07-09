import {
  CURVE_CHARTS,
  NORMALIZED_STACK_ACCESSORS,
  PART_TO_WHOLE_ACCESSORS,
  PIE_CHARTS,
  TREND_SERIES_CHARTS,
} from "./chartFamilySets"
import type { Datum } from "./datumTypes"
import type { Diagnosis } from "./diagnoseTypes"

// Rules for design patterns that mislead readers — and, per "The Perils of
// Chart Deception" (IEEE VIS 2025) — mislead vision-language models the same
// way. Each rule targets a deception category with empirical backing (CALVI's
// misleading-element items; Cleveland & McGill on encoding fidelity). All are
// config-level checks: they read props + data, never the rendered output, so
// they run identically in --doctor, MCP diagnoseConfig, and CI.

const EXTENT_PROPS = ["xExtent", "yExtent", "rExtent"] as const
const MAX_LEGIBLE_SLICES = 8

export function checkInvertedAxis(
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

export function checkDualAxisUnlabeled(
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

export function checkCherryPickedWindow(
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  if (!TREND_SERIES_CHARTS.has(component)) return
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

export function checkPartToWholeNegative(
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  const pieLike = PART_TO_WHOLE_ACCESSORS[component]
  const stackLike = NORMALIZED_STACK_ACCESSORS[component]
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

export function checkNonPassingCurve(
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  if (!CURVE_CHARTS.has(component)) return
  if (props.curve !== "basis") return
  out.push({
    severity: "warning",
    code: "NON_PASSING_CURVE",
    message: `curve="basis" draws a B-spline that does NOT pass through your data points — rendered values differ from actual values everywhere except the endpoints.`,
    fix: `Use curve="monotoneX" or curve="catmullRom" (both interpolate through every point), or keep "basis" only for deliberately schematic, clearly-labeled smoothing.`,
  })
}

export function checkExtremeAspectRatio(
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

export function checkPieTooManySlices(
  component: string,
  props: Datum,
  out: Diagnosis[]
): void {
  if (!PIE_CHARTS.has(component)) return
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
