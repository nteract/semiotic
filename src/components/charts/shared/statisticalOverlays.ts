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
  /** Regression method. Default: "linear" */
  method?: "linear" | "loess"
  /** LOESS bandwidth (only for method="loess"). Default: 0.3 */
  bandwidth?: number
  /** Confidence level for prediction interval (0-1). Default: 0.95 */
  confidence?: number

  // ── Pre-computed mode (field accessors) ─────────────────────
  /** Field or function marking training data points */
  isTraining?: string | ((d: Record<string, any>) => boolean)
  /** Field or function marking forecast data points */
  isForecast?: string | ((d: Record<string, any>) => boolean)
  /** Field or function marking anomalous data points */
  isAnomaly?: string | ((d: Record<string, any>) => boolean)
  /** Field or function for upper envelope bound per data point */
  upperBounds?: string | ((d: Record<string, any>) => number)
  /** Field or function for lower envelope bound per data point */
  lowerBounds?: string | ((d: Record<string, any>) => number)

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
   * Training line stroke color.
   * - `"darken"`: auto-darken the line's own color by 50%.
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
  anomalyColor?: string | ((datum: Record<string, any>) => string)
  /**
   * Outlier dot radius.
   * - `number`: fixed radius (default: 6)
   * - `(datum) => number`: per-datum radius function (e.g. for count-based sizing)
   */
  anomalyRadius?: number | ((datum: Record<string, any>) => number)
  /**
   * Full style override for anomaly dots.
   * When provided as a function, receives the datum and should return a CSS style object.
   * Overrides `anomalyColor` when provided.
   */
  anomalyStyle?: Record<string, any> | ((datum: Record<string, any>) => Record<string, any>)
  /**
   * Internal: field name used to group data into separate lines (e.g. "metricLabel").
   * When set, boundary point duplication only bridges within the same group,
   * preventing cross-metric stray lines. Set automatically by LineChart when
   * both lineBy and forecast are active.
   * @internal
   */
  _groupBy?: string
  /** Label for the forecast/envelope region */
  label?: string
}

/** Internal segment marker added to each datum */
export const SEGMENT_FIELD = "__forecastSegment" as const
export type SegmentType = "training" | "training-base" | "observed" | "forecast"

// ── Helpers ────────────────────────────────────────────────────────────

function readBool(d: Record<string, any>, accessor: string | ((d: Record<string, any>) => boolean)): boolean {
  if (typeof accessor === "function") return accessor(d)
  return !!d[accessor]
}

function readNum(d: Record<string, any>, accessor: string | ((d: Record<string, any>) => number)): number | undefined {
  if (typeof accessor === "function") return accessor(d)
  const v = d[accessor]
  return v != null && isFinite(v as number) ? (v as number) : undefined
}

// ── Anomaly annotation builder (standalone, no forecast) ───────────────

export function buildAnomalyAnnotations(
  config: AnomalyConfig
): Record<string, any>[] {
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
  processedData: Record<string, any>[]
  annotations: Record<string, any>[]
}

function buildPrecomputed(
  data: Record<string, any>[],
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
  const tagged: Record<string, any>[] = data.map((d) => {
    let segment: SegmentType = "observed"
    if (isForecastAcc && readBool(d, isForecastAcc)) {
      segment = "forecast"
    } else if (isTrainingAcc && readBool(d, isTrainingAcc)) {
      segment = "training"
    }
    return { ...d, [SEGMENT_FIELD]: segment }
  })

  // Collect training-base copies BEFORE boundary duplication so they don't
  // interfere with the sequential boundary-point logic.
  const trainBaseCopies: Record<string, any>[] = []
  if (config.trainUnderline) {
    for (const d of tagged) {
      if (d[SEGMENT_FIELD] === "training") {
        trainBaseCopies.push({ ...d, [SEGMENT_FIELD]: "training-base" as SegmentType })
      }
    }
  }

  // Duplicate boundary points so adjacent segments share an endpoint (no gap).
  // When _groupBy is set (multi-metric data), we must group by metric first
  // because the flat data is interleaved by timestamp (A_t1, B_t1, A_t2, B_t2...),
  // so adjacent-pair scanning would never find within-group segment transitions.
  const groupByField = config._groupBy
  const processedData: Record<string, any>[] = []
  // Prepend training-base copies so they appear first in the data stream —
  // PipelineStore iterates groups in insertion order, so the solid underline
  // renders before (beneath) the dashed training line.
  processedData.push(...trainBaseCopies)

  if (groupByField) {
    // Group-aware boundary duplication: collect points per group, find
    // segment transitions within each group, then emit all points in
    // original order with bridge points inserted at the right positions.
    const groups = new Map<string, Record<string, any>[]>()
    for (const d of tagged) {
      const key = d[groupByField] ?? "__default"
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(d)
    }

    // For each group, find segment boundaries and collect bridge points
    // keyed by their position in the original tagged array (insert-after index).
    const bridgePoints: Record<string, any>[] = []
    for (const [, groupPoints] of groups) {
      for (let j = 0; j < groupPoints.length - 1; j++) {
        if (groupPoints[j][SEGMENT_FIELD] !== groupPoints[j + 1][SEGMENT_FIELD]) {
          // Copy the NEXT point tagged with the CURRENT segment so the previous
          // segment extends forward to the boundary rather than the next segment
          // reaching backward (which would start forecast styling one point early).
          bridgePoints.push({ ...groupPoints[j + 1], [SEGMENT_FIELD]: groupPoints[j][SEGMENT_FIELD] })
          // Also copy the CURRENT point tagged with the NEXT segment so the next
          // segment extends backward to the boundary (no gap on the other side).
          bridgePoints.push({ ...groupPoints[j], [SEGMENT_FIELD]: groupPoints[j + 1][SEGMENT_FIELD] })
        }
      }
    }
    processedData.push(...tagged, ...bridgePoints)
  } else {
    // Single-group: scan adjacent pairs directly
    for (let i = 0; i < tagged.length; i++) {
      processedData.push(tagged[i])
      if (i < tagged.length - 1 && tagged[i][SEGMENT_FIELD] !== tagged[i + 1][SEGMENT_FIELD]) {
        // Bridge in both directions so neither segment has a gap
        processedData.push({ ...tagged[i + 1], [SEGMENT_FIELD]: tagged[i][SEGMENT_FIELD] })
        processedData.push({ ...tagged[i], [SEGMENT_FIELD]: tagged[i + 1][SEGMENT_FIELD] })
      }
    }
  }

  const annotations: Record<string, any>[] = []

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

  // Anomaly dots from isAnomaly field
  if (isAnomalyAcc) {
    const anomalyStyleProp = config.anomalyStyle
    // Build the annotation — support function-based r and style
    const highlightAnn: Record<string, any> = {
      type: "highlight",
      filter: (d: Record<string, any>) => readBool(d, isAnomalyAcc!),
    }

    if (anomalyStyleProp) {
      // Full style override — function or object
      highlightAnn.style = anomalyStyleProp
      highlightAnn.r = anomalyRadius
    } else if (typeof anomalyColor === "function") {
      // Per-datum color function
      highlightAnn.style = (d: Record<string, any>) => {
        const c = (anomalyColor as (d: Record<string, any>) => string)(d)
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

  // Anomaly band (IQR-based) if anomaly config provided alongside pre-computed
  if (anomalyConfig) {
    annotations.push({
      type: "anomaly-band",
      threshold: anomalyConfig.threshold ?? 2,
      showBand: anomalyConfig.showBand !== false,
      fill: anomalyConfig.bandColor || "#6366f1",
      fillOpacity: anomalyConfig.bandOpacity ?? 0.1,
      anomalyColor: anomalyConfig.anomalyColor || "#ef4444",
      anomalyRadius: anomalyConfig.anomalyRadius ?? 6,
      label: anomalyConfig.label,
    })
  }

  return { processedData, annotations }
}

// ── Auto mode (computed regression) ────────────────────────────────────

function buildAutoForecast(
  data: Record<string, any>[],
  xAccessor: string,
  yAccessor: string,
  config: ForecastConfig,
  anomalyConfig?: AnomalyConfig
): ForecastResult {
  const {
    trainEnd,
    steps = 10,
    confidence = 0.95,
    color = "#6366f1",
    bandOpacity = 0.15,
    label,
  } = config

  if (trainEnd == null) {
    return { processedData: data as Record<string, any>[], annotations: [] }
  }

  // Split data into training and observed
  const training: Record<string, any>[] = []
  const observed: Record<string, any>[] = []

  for (const d of data) {
    const xVal = d[xAccessor] as number
    if (xVal <= trainEnd) {
      training.push({ ...d, [SEGMENT_FIELD]: "training" as SegmentType })
    } else {
      observed.push({ ...d, [SEGMENT_FIELD]: "observed" as SegmentType })
    }
  }

  // Build regression from training data
  const points: [number, number][] = training
    .map((d) => [d[xAccessor], d[yAccessor]] as [number, number])
    .filter((p) => p[0] != null && p[1] != null && isFinite(p[0]) && isFinite(p[1]))
    .sort((a, b) => a[0] - b[0])

  const annotations: Record<string, any>[] = []
  const forecastPoints: Record<string, any>[] = []

  if (points.length >= 3) {
    const n = points.length
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0
    for (const [x, y] of points) {
      sumX += x; sumY += y; sumXX += x * x; sumXY += x * y
    }
    const det = n * sumXX - sumX * sumX
    if (Math.abs(det) > 1e-12) {
      const slope = (n * sumXY - sumX * sumY) / det
      const intercept = (sumY - slope * sumX) / n
      const predict = (x: number) => intercept + slope * x

      // Residual standard error
      const residuals = points.map(([x, y]) => y - predict(x))
      const sse = residuals.reduce((s, r) => s + r * r, 0)
      const se = Math.sqrt(sse / Math.max(n - 2, 1))

      const meanX = points.reduce((s, p) => s + p[0], 0) / n
      const ssX = points.reduce((s, p) => s + (p[0] - meanX) ** 2, 0)

      const z = confidence >= 0.99 ? 2.576
        : confidence >= 0.95 ? 1.96
        : confidence >= 0.9 ? 1.645
        : 1.0

      const allX = data.map((d) => d[xAccessor] as number).filter((v) => v != null && isFinite(v))
      const xMax = Math.max(...allX)
      const step = points.length > 1 ? (points[n - 1][0] - points[0][0]) / (n - 1) : 1

      for (let i = 1; i <= steps; i++) {
        const fx = xMax + i * step
        const fy = predict(fx)
        const interval = se * Math.sqrt(1 + 1 / n + (ssX > 0 ? (fx - meanX) ** 2 / ssX : 0)) * z
        forecastPoints.push({
          [xAccessor]: fx,
          [yAccessor]: fy,
          [SEGMENT_FIELD]: "forecast" as SegmentType,
          __forecastUpper: fy + interval,
          __forecastLower: fy - interval,
        })
      }

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

  // Anomaly band (computed from training data only via IQR)
  if (anomalyConfig) {
    annotations.push({
      type: "anomaly-band",
      threshold: anomalyConfig.threshold ?? 2,
      showBand: anomalyConfig.showBand !== false,
      fill: anomalyConfig.bandColor || "#6366f1",
      fillOpacity: anomalyConfig.bandOpacity ?? 0.1,
      anomalyColor: anomalyConfig.anomalyColor || "#ef4444",
      anomalyRadius: anomalyConfig.anomalyRadius ?? 6,
      label: anomalyConfig.label,
    })
  }

  // Duplicate boundary points so adjacent segments share an endpoint (no gap)
  const processedData: Record<string, any>[] = []

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
  data: Record<string, any>[],
  xAccessor: string,
  yAccessor: string,
  forecastConfig: ForecastConfig,
  anomalyConfig?: AnomalyConfig
): ForecastResult {
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
  baseStyle: (d: Record<string, any>) => Record<string, any>,
  forecastConfig: ForecastConfig
): (d: Record<string, any>) => Record<string, any> {
  const trainDash = forecastConfig.trainDasharray ?? "8,4"
  const forecastDash = forecastConfig.forecastDasharray ?? "4,4"
  const forecastColor = forecastConfig.color || "#6366f1"
  const trainOpacity = forecastConfig.trainOpacity
  const forecastOpacity = forecastConfig.forecastOpacity
  const trainStrokeCfg = forecastConfig.trainStroke
  const trainLinecap = forecastConfig.trainLinecap
  const trainUnderline = forecastConfig.trainUnderline

  return (d: Record<string, any>) => {
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
      return {
        ...base,
        stroke: forecastColor,
        strokeDasharray: forecastDash,
        ...(forecastOpacity != null && { strokeOpacity: forecastOpacity }),
      }
    }
    return base
  }
}
