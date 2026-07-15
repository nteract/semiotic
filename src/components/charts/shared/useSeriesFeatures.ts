/**
 * useSeriesFeatures — shared `forecast` / `anomaly` orchestration
 * for series-shaped XY HOCs.
 *
 * The math lives in `statisticalOverlays.ts`
 * (`buildForecast`, `buildAnomalyAnnotations`, etc.) — this hook
 * owns the React-side plumbing every consuming HOC repeats verbatim:
 *
 *   1. **Synthetic-key bake** — function accessors get baked under
 *      `__semiotic_resolvedX` / `__semiotic_resolvedY` so the overlay
 *      pipeline (which expects string keys) can read values.
 *   2. **Lazy module load** — `statisticalOverlaysLazy` defers the
 *      LOESS/regression weight so charts without forecast/anomaly
 *      don't pay the bundle cost.
 *   3. **State management** — `processedData` (forecast adds tagged
 *      future points) and `annotations` (envelope, anomaly band,
 *      anomaly dots) live in component state; the effect re-runs
 *      when configs change but data-only churn keeps prior results
 *      visible (no flicker for streaming forecast sparklines).
 *   4. **Stale-clear on config removal** — switching `forecast` off
 *      mid-stream clears the overlay cleanly.
 *
 * LineChart was the original consumer. AreaChart, Scatterplot,
 * ConnectedScatterplot, and any future series chart that wants the
 * same analytical-overlay surface can opt in by calling this hook
 * and merging the returned annotations / effective data into their
 * own streamProps.
 */
"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import type { Datum, DatumValue } from "./datumTypes"
import type { Accessor } from "./types"
import type { ForecastConfig, AnomalyConfig, ForecastResult } from "./statisticalOverlays"
import { buildForecastLazy, buildAnomalyAnnotationsLazy } from "./statisticalOverlaysLazy"

const RESOLVED_X_KEY = "__semiotic_resolvedX"
const RESOLVED_Y_KEY = "__semiotic_resolvedY"

export interface SeriesFeaturesOptions {
  /** Sparse-filtered chart data (the HOC's `safeData`). */
  data: Datum[]
  /** x accessor — string or function. */
  xAccessor: Accessor<number | Date | string>
  /** y accessor — string or function. */
  yAccessor: Accessor<number>
  /** Optional forecast configuration. When set, the hook adds
   *  segment-tagged future points to `effectiveData` and appends
   *  envelope/forecast-line annotations. */
  forecast?: ForecastConfig | undefined
  /** Optional anomaly configuration (band + dot overlay). */
  anomaly?: AnomalyConfig | undefined
  /** When the consuming HOC supports grouped series (e.g. LineChart's
   *  `lineBy`), pass the grouping field name so the overlay pipeline
   *  can do group-aware boundary duplication. Required when the same
   *  data array carries multiple metric series interleaved by x. */
  groupBy?: Accessor<string> | undefined
}

export interface SeriesFeaturesResult {
  /** Data to forward to the frame. When forecast adds future points,
   *  this is the augmented set; otherwise the original `data`. */
  effectiveData: Datum[]
  /** Annotations the chart should merge into its own annotations
   *  array (envelope, anomaly band, anomaly dots). Empty when
   *  forecast/anomaly are unset or still loading. */
  statisticalAnnotations: Datum[]
  /** True when forecast is active and processedData differs from
   *  the input data. Useful for HOC-side branches (e.g. LineChart's
   *  compound-group accessor). */
  hasForecast: boolean
  /** Resolved string key for the x axis — either the user's string
   *  accessor or a synthetic key written by the bake step. The
   *  forecast/anomaly pipeline reads through this key. */
  xAccessorKey: string
  /** Resolved string key for the y axis (mirror of xAccessorKey). */
  yAccessorKey: string
}

/**
 * Build series feature overlays (forecast + anomaly) for a chart.
 * Returns the effective data + annotations to merge into the
 * chart's stream-frame props. Returns the input data unchanged when
 * neither prop is set.
 *
 * @example
 * ```tsx
 * const { effectiveData, statisticalAnnotations } = useSeriesFeatures({
 *   data: safeData, xAccessor, yAccessor, forecast, anomaly,
 * })
 * const mergedAnnotations = [...(annotations || []), ...statisticalAnnotations]
 * // forward effectiveData + mergedAnnotations to the frame
 * ```
 */
export function useSeriesFeatures(options: SeriesFeaturesOptions): SeriesFeaturesResult {
  const { data, xAccessor, yAccessor, forecast, anomaly, groupBy } = options

  // 1 — bake synthetic keys for function accessors. The overlay
  // pipeline (and the annotation renderer) needs string-keyed data.
  const xAccessorKey = typeof xAccessor === "string" ? xAccessor : RESOLVED_X_KEY
  const yAccessorKey = typeof yAccessor === "string" ? yAccessor : RESOLVED_Y_KEY

  const overlayData = useMemo(() => {
    if (!forecast && !anomaly) return data
    const needsX = typeof xAccessor === "function"
    const needsY = typeof yAccessor === "function"
    if (!needsX && !needsY) return data
    return data.map((d) => {
      const copy = { ...d }
      if (needsX) copy[RESOLVED_X_KEY] = (xAccessor as (datum: Datum) => DatumValue)(d)
      if (needsY) copy[RESOLVED_Y_KEY] = (yAccessor as (datum: Datum) => DatumValue)(d)
      return copy
    })
  }, [data, forecast, anomaly, xAccessor, yAccessor])

  // 2 — state for processed result + annotations. Held outside the
  // overlayData memo so streaming data churn doesn't blow away the
  // last successful forecast result mid-loading.
  const [statisticalResult, setStatisticalResult] = useState<ForecastResult | null>(null)
  const [statisticalAnnotations, setStatisticalAnnotations] = useState<Datum[]>([])

  // 3 — track config identity. Clear results only when the
  // forecast/anomaly CONFIG object changes — data-only updates
  // (streaming sparklines re-pushing every 150ms) should not
  // flicker the overlay.
  const prevForecastRef = useRef(forecast)
  const prevAnomalyRef = useRef(anomaly)

  useEffect(() => {
    if (!forecast && !anomaly) {
      if (prevForecastRef.current || prevAnomalyRef.current) {
        setStatisticalResult(null)
        setStatisticalAnnotations([])
        prevForecastRef.current = forecast
        prevAnomalyRef.current = anomaly
      }
      return
    }
    let cancelled = false
    const configChanged = forecast !== prevForecastRef.current || anomaly !== prevAnomalyRef.current
    prevForecastRef.current = forecast
    prevAnomalyRef.current = anomaly
    if (configChanged) {
      setStatisticalResult(null)
      setStatisticalAnnotations([])
    }
    if (forecast) {
      // Inject `_groupBy` (string-form only) so group-aware boundary
      // duplication tags adjacent training/observed/forecast segments
      // per-group instead of mixing them across metric series.
      const enrichedForecast = groupBy && typeof groupBy === "string" && typeof forecast === "object"
        ? { ...forecast, _groupBy: groupBy }
        : forecast
      buildForecastLazy(overlayData, xAccessorKey, yAccessorKey, enrichedForecast, anomaly)
        .then((result) => {
          if (!cancelled) {
            setStatisticalResult(result)
            setStatisticalAnnotations(result.annotations)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setStatisticalResult(null)
            setStatisticalAnnotations([])
          }
        })
    } else if (anomaly) {
      buildAnomalyAnnotationsLazy(anomaly)
        .then((result) => {
          if (!cancelled) {
            setStatisticalResult(null)
            setStatisticalAnnotations(result)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setStatisticalAnnotations([])
          }
        })
    }
    return () => { cancelled = true }
  }, [overlayData, forecast, anomaly, xAccessorKey, yAccessorKey, groupBy])

  const effectiveData = statisticalResult ? statisticalResult.processedData : data
  const hasForecast = !!statisticalResult

  return {
    effectiveData,
    statisticalAnnotations,
    hasForecast,
    xAccessorKey,
    yAccessorKey,
  }
}
