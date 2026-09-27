import type { Datum } from "./datumTypes"
import { getMax, getMinMax } from "./minMax"
/**
 * Statistical overlay processing for LineChart.
 *
 * Two modes:
 *   **Auto mode** — provide `trainEnd` + optional `steps`/`confidence`.
 *     The module computes regression, generates forecast points, and builds
 *     annotations (envelope, anomaly band, boundary line).
 *
 *   **Pre-computed mode** — provide field accessors (`isTraining`, `isForecast`,
 *     `isAnomaly`, `upperBounds`, `lowerBounds`). The module reads segment/bounds
 *     from the data and generates annotations without any statistical computation.
 *     Use this when bounds come from an external ML model.
 */

import { darkenColor, lightenColor } from "./colorManipulation"
import { forecastModel } from "./forecastModel"
import { regressionNumber, regressionPoints } from "./leastSquaresRegression"

// ── Config types ───────────────────────────────────────────────────────

export interface AnomalyConfig {
  /** Standard deviation multiplier for anomaly bounds. Default: 2 */
  threshold?: number
  /** Show shaded anomaly band. Default: true */
  showBand?: boolean
  /** Band fill color. Default: "#6366f1" */
  bandColor?: string
  /** Band fill opacity. Default: 0.1 */
  bandOpacity?: number
  /** Outlier dot color. Default: "#ef4444" */
  anomalyColor?: string
  /** Outlier dot radius. Default: 6 */
  anomalyRadius?: number
  /** Label for the band */
  label?: string
}

export interface ForecastConfig {
  // ── Auto mode (computed regression) ────────────────────────
  /** X-value where training data ends. Required for auto mode. */
  trainEnd?: number
  /** Number of forecast steps beyond last data point. Default: 10 */
  steps?: number
  /** Regression method. LOESS extrapolates the final smoothed segment. Default: "linear" */
  method?: "linear" | "loess"
  /** LOESS bandwidth (only for method="loess"). Default: 0.3 */
  bandwidth?: number
  /** Confidence level for prediction interval (0-1). Default: 0.95 */
  confidence?: number

  // ── Pre-computed mode (field accessors) ─────────────────────
  /** Field or function marking training data points */
  isTraining?: string | ((d: Datum) => boolean)
  /** Field or function marking forecast data points */
  isForecast?: string | ((d: Datum) => boolean)
  /** Field or function marking anomalous data points */
  isAnomaly?: string | ((d: Datum) => boolean)
  /** Field or function for upper envelope bound per data point */
  upperBounds?: string | ((d: Datum) => number)
  /** Field or function for lower envelope bound per data point */
  lowerBounds?: string | ((d: Datum) => number)

  // ── Styling (both modes) ───────────────────────────────────
  /** Color for forecast line and envelope. Default: "#6366f1" */
  color?: string
  /** Envelope fill opacity. Default: 0.15 */
  bandOpacity?: number
  /** Dash pattern for training line segment. Default: "8,4" */
  trainDasharray?: string
  /** Dash pattern for forecast line segment. Default: "4,4" */
  forecastDasharray?: string
  /** Stroke opacity for the training line segment (0–1). Default: 1 */
  trainOpacity?: number
  /** Stroke opacity for the forecast line segment (0–1). Default: 1 */
  forecastOpacity?: number
  /**
   * Ramp each forecast point's opacity by its uncertainty — wider
   * prediction interval (longer horizon) renders fainter, fusing
   * confidence into the encoding instead of a single flat opacity.
   * `true` ramps across `[0.15, 1]`; pass `{ min, max }` to bound the
   * range. Honored by `createSegmentLineStyle`; overrides
   * `forecastOpacity` per point. Mutually exclusive with
   * `confidenceAccessor` (which wins if both are set).
   */
  uncertaintyOpacity?: boolean | { min?: number; max?: number }
  /**
   * Externally-supplied per-point confidence in `[0, 1]` (field name or
   * function). When set, each forecast point's opacity is interpolated
   * across the `uncertaintyOpacity` range (or `[0.15, 1]`) by its
   * confidence — higher confidence, more opaque. Use when the consumer's
   * model emits a confidence rather than a prediction interval.
   */
  confidenceAccessor?: string | ((d: Datum) => number)
  /**
   * Training line stroke color.
   * - `"darken"`: auto-darken the line's own color by 50% (hex colors only —
   *   non-hex values like `rgb()` or CSS variables pass through unchanged).
   * - Any CSS color string: use that color explicitly.
   * - Omit to inherit the line's color unchanged.
   */
  trainStroke?: string
  /** Training line linecap (e.g. "round"). Default: inherits from base style */
  trainLinecap?: string
  /**
   * Render a solid underline beneath the dashed training line.
   * - `true`: solid line in the base (or lightened) color beneath the dashed training line
   * - `"lighten"`: solid line in a 40% lightened version of the line's color
   * - Omit or `false`: no underline (default)
   */
  trainUnderline?: boolean | "lighten"
  /**
   * Outlier dot color.
   * - `string`: fixed color (default: "#ef4444")
   * - `(datum) => string`: per-datum color function
   */
  anomalyColor?: string | ((datum: Datum) => string)
  /**
   * Outlier dot radius.
   * - `number`: fixed radius (default: 6)
   * - `(datum) => number`: per-datum radius function (e.g. for count-based sizing)
   */
  anomalyRadius?: number | ((datum: Datum) => number)
  /**
   * Full style override for anomaly dots.
   * When provided as a function, receives the datum and should return a CSS style object.
   * Overrides `anomalyColor` when provided.
   */
  anomalyStyle?: Datum | ((datum: Datum) => Datum)
  /**
   * Internal: field or accessor used to group data into separate lines (e.g. "metricLabel").
   * When set, boundary point duplication only bridges within the same group,
   * preventing cross-metric stray lines. Set automatically by LineChart when
   * both lineBy and forecast are active.
   * @internal
   */
  _groupBy?: string | ((d: Datum) => unknown)
  /** Label for the forecast/envelope region */
  label?: string
}

/** Internal segment marker added to each datum */
export const SEGMENT_FIELD = "__forecastSegment" as const
export type SegmentType = "training" | "training-base" | "observed" | "forecast"

/** Internal per-point opacity stamped by the uncertainty ramp. */
export const FORECAST_OPACITY_FIELD = "__forecastOpacity" as const

/**
 * Stamp `__forecastOpacity` on forecast points so `createSegmentLineStyle`
 * can fade each by its uncertainty. Two sources, confidence wins:
 *
 * - `confidenceAccessor` — opacity = lerp(min, max, confidence∈[0,1]).
 * - `uncertaintyOpacity` — opacity ramped by prediction-interval width
 *   (narrowest → max, widest → min), normalized across the given points.
 *
 * Mutates the supplied point objects in place; no-op when neither source
 * is configured. Pure otherwise (only reads via the passed accessors).
 */
export function stampForecastOpacity(
  points: Datum[],
  config: ForecastConfig,
  getUpper: (d: Datum) => number | undefined,
  getLower: (d: Datum) => number | undefined
): void {
  const ramp = config.uncertaintyOpacity
  const conf = config.confidenceAccessor
  if (!ramp && !conf) return

  const range = typeof ramp === "object" ? ramp : {}
  const minO = range.min ?? 0.15
  const maxO = range.max ?? 1

  if (conf) {
    const read = typeof conf === "function" ? conf : (d: Datum) => d[conf] as number
    for (const p of points) {
      const c = read(p)
      if (c != null && Number.isFinite(c)) {
        const t = Math.max(0, Math.min(1, c))
        p[FORECAST_OPACITY_FIELD] = minO + t * (maxO - minO)
      }
    }
    return
  }

  // Interval-width ramp: collect widths, normalize, fade the wide ones.
  const widths = points.map((p) => {
    const u = getUpper(p)
    const l = getLower(p)
    return u != null && l != null && Number.isFinite(u) && Number.isFinite(l)
      ? Math.abs(u - l)
      : NaN
  })
  const finite = widths.filter((w) => Number.isFinite(w))
  if (finite.length === 0) return
  const [minW, maxW] = getMinMax(finite)
  const span = maxW - minW
  points.forEach((p, i) => {
    const w = widths[i]
    if (!Number.isFinite(w)) return
    const t = span > 0 ? (w - minW) / span : 0 // 0 = narrowest interval
    p[FORECAST_OPACITY_FIELD] = maxO - t * (maxO - minO)
  })
}

// ── Helpers ────────────────────────────────────────────────────────────

function readBool(d: Datum, accessor: string | ((d: Datum) => boolean)): boolean {
  if (typeof accessor === "function") return accessor(d)
  return !!d[accessor]
}

// ── Anomaly annotation builder (standalone, no forecast) ───────────────

export function buildAnomalyAnnotations(
  config: AnomalyConfig
): Datum[] {
  return [
    {
      type: "anomaly-band",
      threshold: config.threshold ?? 2,
      showBand: config.showBand !== false,
      fill: config.bandColor || "#6366f1",
      fillOpacity: config.bandOpacity ?? 0.1,
      anomalyColor: config.anomalyColor || "#ef4444",
      anomalyRadius: config.anomalyRadius ?? 6,
      label: config.label,
    },
  ]
}

// ── Pre-computed mode ──────────────────────────────────────────────────

export interface ForecastResult {
  processedData: Datum[]
  annotations: Datum[]
}

function buildPrecomputed(
  data: Datum[],
  xAccessor: string,
  yAccessor: string,
  config: ForecastConfig,
  anomalyConfig?: AnomalyConfig
): ForecastResult {
  const {
    isTraining: isTrainingAcc,
    isForecast: isForecastAcc,
    isAnomaly: isAnomalyAcc,
    upperBounds: upperAcc,
    lowerBounds: lowerAcc,
    color = "#6366f1",
    bandOpacity = 0.15,
    anomalyColor = "#ef4444",
    anomalyRadius = 6,
    label,
  } = config

  // Tag each datum with segment
  const tagged: Datum[] = data.map((d) => {
    let segment: SegmentType = "observed"
    if (isForecastAcc && readBool(d, isForecastAcc)) {
      segment = "forecast"
    } else if (isTrainingAcc && readBool(d, isTrainingAcc)) {
      segment = "training"
    }
    return { ...d, [SEGMENT_FIELD]: segment }
  })

  // Adjacent segments share endpoints. buildForecast partitions series first.
  const processedData: Datum[] = []
  for (let i = 0; i < tagged.length; i++) {
    processedData.push(tagged[i])
    if (i < tagged.length - 1 && tagged[i][SEGMENT_FIELD] !== tagged[i + 1][SEGMENT_FIELD]) {
      // Bridge in both directions so neither segment has a gap
      processedData.push({ ...tagged[i + 1], [SEGMENT_FIELD]: tagged[i][SEGMENT_FIELD] })
      processedData.push({ ...tagged[i], [SEGMENT_FIELD]: tagged[i + 1][SEGMENT_FIELD] })
    }
  }

  // Collect training-base copies AFTER boundary duplication so the solid
  // underline includes bridge points and covers the same x-extent as the
  // dashed training segment.
  if (config.trainUnderline) {
    const trainBaseCopies: Datum[] = []
    for (const d of processedData) {
      if (d[SEGMENT_FIELD] === "training") {
        trainBaseCopies.push({ ...d, [SEGMENT_FIELD]: "training-base" as SegmentType })
      }
    }
    // Prepend so training-base renders first (beneath the dashed training line)
    processedData.unshift(...trainBaseCopies)
  }

  const annotations: Datum[] = []

  // Envelope from upper/lower bounds
  if (upperAcc && lowerAcc) {
    // Build internal fields for the envelope annotation to read
    const upperField = typeof upperAcc === "string" ? upperAcc : "__envUpper"
    const lowerField = typeof lowerAcc === "string" ? lowerAcc : "__envLower"

    // If using function accessors, bake values into data
    if (typeof upperAcc === "function" || typeof lowerAcc === "function") {
      for (const d of processedData) {
        if (typeof upperAcc === "function") d[upperField] = upperAcc(d)
        if (typeof lowerAcc === "function") d[lowerField] = lowerAcc(d)
      }
    }

    annotations.push({
      type: "envelope",
      upperAccessor: upperField,
      lowerAccessor: lowerField,
      fill: color,
      fillOpacity: bandOpacity,
      label,
    })
  }

  // Ramp per-point opacity by interval width / confidence (opt-in). Only
  // the forecast-segment points are faded; observed/training stay solid.
  if (config.uncertaintyOpacity || config.confidenceAccessor) {
    const readUpper = upperAcc
      ? (typeof upperAcc === "function" ? upperAcc : (d: Datum) => d[upperAcc] as number)
      : () => undefined
    const readLower = lowerAcc
      ? (typeof lowerAcc === "function" ? lowerAcc : (d: Datum) => d[lowerAcc] as number)
      : () => undefined
    const forecastPts = processedData.filter((d) => d[SEGMENT_FIELD] === "forecast")
    stampForecastOpacity(forecastPts, config, readUpper, readLower)
  }

  // Anomaly dots from isAnomaly field
  if (isAnomalyAcc) {
    const anomalyStyleProp = config.anomalyStyle
    // Build the annotation — support function-based r and style
    const highlightAnn: Datum = {
      type: "highlight",
      filter: (d: Datum) => readBool(d, isAnomalyAcc!),
    }

    if (anomalyStyleProp) {
      // Full style override — function or object
      highlightAnn.style = anomalyStyleProp
      highlightAnn.r = anomalyRadius
    } else if (typeof anomalyColor === "function") {
      // Per-datum color function
      highlightAnn.style = (d: Datum) => {
        const c = (anomalyColor as (d: Datum) => string)(d)
        return { stroke: c, strokeWidth: 1.5, fill: c, fillOpacity: 0.7 }
      }
      highlightAnn.r = anomalyRadius
    } else {
      // Static color
      highlightAnn.color = anomalyColor
      highlightAnn.r = anomalyRadius
      highlightAnn.style = {
        stroke: anomalyColor,
        strokeWidth: 1.5,
        fill: anomalyColor,
        fillOpacity: 0.7,
      }
    }

    annotations.push(highlightAnn)
  }

  // Mean ± threshold × population standard deviation over the rendered data.
  if (anomalyConfig) annotations.push(...buildAnomalyAnnotations(anomalyConfig))

  return { processedData, annotations }
}

// ── Auto mode (computed regression) ────────────────────────────────────

function buildAutoForecast(
  data: Datum[],
  xAccessor: string,
  yAccessor: string,
  config: ForecastConfig,
  anomalyConfig?: AnomalyConfig
): ForecastResult {
  const {
    trainEnd,
    steps = 10,
    color = "#6366f1",
    bandOpacity = 0.15,
    label,
  } = config

  if (regressionNumber(trainEnd) === null) {
    return { processedData: data as Datum[], annotations: [] }
  }

  // Split data into training and observed
  const training: Datum[] = []
  const observed: Datum[] = []

  for (const d of [...data].sort((a, b) => (regressionNumber(a[xAccessor]) ?? Infinity) - (regressionNumber(b[xAccessor]) ?? Infinity))) {
    const xVal = regressionNumber(d[xAccessor])
    if (xVal !== null && xVal <= trainEnd!) {
      training.push({ ...d, [SEGMENT_FIELD]: "training" as SegmentType })
    } else {
      observed.push({ ...d, [SEGMENT_FIELD]: "observed" as SegmentType })
    }
  }

  // Build regression from training data
  const points = regressionPoints(training.map((d) => [d[xAccessor], d[yAccessor]]))

  const annotations: Datum[] = []
  const forecastPoints: Datum[] = []

  if (points.length >= 3 && Number.isInteger(steps) && steps > 0) {
    const model = forecastModel(points, config)
    if (model) {

      const allX = data.map((d) => regressionNumber(d[xAccessor])).filter((v): v is number => v !== null)
      const xMax = getMax(allX)

      const dateX = data.some((d) => d[xAccessor] instanceof Date)
      for (const { x: fx, y: fy, upper, lower } of model.forecast(steps, xMax)) {
        forecastPoints.push({
          ...(observed[observed.length - 1] ?? training[training.length - 1]),
          [xAccessor]: dateX ? new Date(fx) : fx,
          [yAccessor]: fy,
          [SEGMENT_FIELD]: "forecast" as SegmentType,
          __forecastUpper: upper,
          __forecastLower: lower,
        })
      }

      // Ramp per-point opacity by interval width / confidence (opt-in).
      stampForecastOpacity(
        forecastPoints,
        config,
        (d) => d.__forecastUpper as number | undefined,
        (d) => d.__forecastLower as number | undefined
      )

      // Envelope annotation drawn from the actual forecast data points
      annotations.push({
        type: "envelope",
        upperAccessor: "__forecastUpper",
        lowerAccessor: "__forecastLower",
        fill: color,
        fillOpacity: bandOpacity,
        label,
      })
    }
  }

  // Boundary line at trainEnd
  annotations.push({
    type: "x-threshold",
    x: trainEnd,
    color: "#94a3b8",
    strokeWidth: 1,
    strokeDasharray: "4,2",
    label: "Train / Forecast",
  })

  // Mean ± threshold × population standard deviation over the rendered data.
  if (anomalyConfig) annotations.push(...buildAnomalyAnnotations(anomalyConfig))

  // Duplicate boundary points so adjacent segments share an endpoint (no gap)
  const processedData: Datum[] = []

  // Training → Observed boundary
  processedData.push(...training)
  if (training.length > 0 && observed.length > 0) {
    // Copy last training point into observed segment
    processedData.push({ ...training[training.length - 1], [SEGMENT_FIELD]: "observed" as SegmentType })
  }
  processedData.push(...observed)

  // Observed → Forecast boundary
  if (forecastPoints.length > 0) {
    const lastObserved = observed.length > 0 ? observed[observed.length - 1] : training[training.length - 1]
    if (lastObserved) {
      processedData.push({ ...lastObserved, [SEGMENT_FIELD]: "forecast" as SegmentType })
    }
    processedData.push(...forecastPoints)
  }

  return { processedData, annotations }
}

// ── Public entry point ─────────────────────────────────────────────────

/**
 * Detect whether the config uses pre-computed field accessors or auto mode.
 * Pre-computed mode is triggered when any of `isTraining`, `isForecast`,
 * `isAnomaly`, `upperBounds`, or `lowerBounds` is provided.
 */
function isPrecomputedMode(config: ForecastConfig): boolean {
  return !!(config.isTraining || config.isForecast || config.isAnomaly ||
    config.upperBounds || config.lowerBounds)
}

export function buildForecast(
  data: Datum[],
  xAccessor: string,
  yAccessor: string,
  forecastConfig: ForecastConfig,
  anomalyConfig?: AnomalyConfig
): ForecastResult {
  const groupBy = forecastConfig._groupBy
  if (groupBy && data.length) {
    const readGroup = typeof groupBy === "function" ? groupBy : (d: Datum) => d[groupBy]
    const groups = new Map<unknown, Datum[]>()
    for (const row of data) {
      const key = readGroup(row)
      const group = groups.get(key)
      if (group) group.push(row)
      else groups.set(key, [row])
    }
    const processedData: Datum[] = []
    const annotations: Datum[] = []
    for (const [key, rows] of groups) {
      const result = buildForecast(rows, xAccessor, yAccessor, { ...forecastConfig, _groupBy: undefined }, anomalyConfig)
      for (const row of result.processedData) processedData.push(row)
      for (const ann of result.annotations) {
        if (ann.type === "x-threshold") {
          if (!annotations.some((existing) => existing.type === "x-threshold")) annotations.push(ann)
        } else {
          const priorFilter = ann.filter as ((d: Datum) => boolean) | undefined
          annotations.push({ ...ann, filter: (d: Datum) => {
            const value = readGroup(d)
            return (value === key || Object.is(value, key)) && (!priorFilter || priorFilter(d))
          } })
        }
      }
    }
    return { processedData, annotations }
  }
  if (isPrecomputedMode(forecastConfig)) {
    return buildPrecomputed(data, xAccessor, yAccessor, forecastConfig, anomalyConfig)
  }
  return buildAutoForecast(data, xAccessor, yAccessor, forecastConfig, anomalyConfig)
}

// Re-export color helpers from standalone module (avoids pulling this heavy
// module into the barrel import graph for consumers who only need color utils)
export { darkenColor, lightenColor } from "./colorManipulation"


// ── Segment-aware line style wrapper ───────────────────────────────────

export function createSegmentLineStyle(
  baseStyle: (d: Datum) => Datum,
  forecastConfig: ForecastConfig
): (d: Datum) => Datum {
  const trainDash = forecastConfig.trainDasharray ?? "8,4"
  const forecastDash = forecastConfig.forecastDasharray ?? "4,4"
  const forecastColor = forecastConfig.color || "#6366f1"
  const trainOpacity = forecastConfig.trainOpacity
  const forecastOpacity = forecastConfig.forecastOpacity
  const trainStrokeCfg = forecastConfig.trainStroke
  const trainLinecap = forecastConfig.trainLinecap
  const trainUnderline = forecastConfig.trainUnderline

  return (d: Datum) => {
    const base = baseStyle(d)
    const segment = d[SEGMENT_FIELD] as SegmentType | undefined

    if (segment === "training") {
      let stroke = base.stroke
      if (trainStrokeCfg === "darken") {
        stroke = darkenColor(base.stroke || "#666", 0.5)
      } else if (trainStrokeCfg) {
        stroke = trainStrokeCfg
      }
      return {
        ...base,
        stroke,
        strokeDasharray: trainDash,
        ...(trainLinecap && { strokeLinecap: trainLinecap }),
        ...(trainOpacity != null && { strokeOpacity: trainOpacity }),
      }
    }
    if (segment === "training-base") {
      // Solid underline beneath the dashed training line
      let stroke = base.stroke || "#666"
      if (trainUnderline === "lighten") {
        stroke = lightenColor(stroke, 0.4)
      }
      return {
        ...base,
        stroke,
        strokeDasharray: undefined,
      }
    }
    if (segment === "forecast") {
      // Per-point uncertainty ramp (if stamped) wins over the flat
      // forecastOpacity — wider intervals / lower confidence draw fainter.
      const perPoint = d[FORECAST_OPACITY_FIELD] as number | undefined
      const resolvedOpacity = perPoint != null ? perPoint : forecastOpacity
      return {
        ...base,
        stroke: forecastColor,
        strokeDasharray: forecastDash,
        ...(resolvedOpacity != null && { strokeOpacity: resolvedOpacity }),
      }
    }
    return base
  }
}
