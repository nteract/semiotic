/** Shared lazy forecast/anomaly processing, keyed to the current input rows. */
"use client"
import { useEffect, useMemo, useState } from "react"
import type { Datum, DatumValue } from "./datumTypes"
import type { Accessor } from "./types"
import type {
  ForecastConfig,
  AnomalyConfig,
  ForecastResult
} from "./statisticalOverlays"
import {
  buildForecastLazy,
  buildAnomalyAnnotationsLazy
} from "./statisticalOverlaysLazy"

import { useStableShallow } from "../../stream/useStableShallow"

const EMPTY_ANNOTATIONS: Datum[] = []

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
export function useSeriesFeatures(
  options: SeriesFeaturesOptions
): SeriesFeaturesResult {
  const { data, xAccessor, yAccessor, groupBy } = options
  const forecast = useStableShallow(options.forecast)
  const anomaly = useStableShallow(options.anomaly)

  // 1 — bake synthetic keys for function accessors. The overlay
  // pipeline (and the annotation renderer) needs string-keyed data.
  const xAccessorKey =
    typeof xAccessor === "string" ? xAccessor : RESOLVED_X_KEY
  const yAccessorKey =
    typeof yAccessor === "string" ? yAccessor : RESOLVED_Y_KEY

  const overlayData = useMemo(() => {
    if (!forecast && !anomaly) return data
    const needsX = typeof xAccessor === "function"
    const needsY = typeof yAccessor === "function"
    if (!needsX && !needsY) return data
    return data.map((d) => {
      const copy = { ...d }
      if (needsX)
        copy[RESOLVED_X_KEY] = (xAccessor as (datum: Datum) => DatumValue)(d)
      if (needsY)
        copy[RESOLVED_Y_KEY] = (yAccessor as (datum: Datum) => DatumValue)(d)
      return copy
    })
  }, [data, forecast, anomaly, xAccessor, yAccessor])

  const request = useMemo(
    () => ({
      overlayData,
      forecast,
      anomaly,
      xAccessorKey,
      yAccessorKey,
      groupBy
    }),
    [overlayData, forecast, anomaly, xAccessorKey, yAccessorKey, groupBy]
  )
  const [completed, setCompleted] = useState<{
    request: typeof request
    result: ForecastResult
    hasForecast: boolean
  } | null>(null)

  useEffect(() => {
    if (!forecast && !anomaly) {
      setCompleted(null)
      return
    }
    let cancelled = false
    const work = forecast
      ? buildForecastLazy(
          overlayData,
          xAccessorKey,
          yAccessorKey,
          groupBy ? { ...forecast, _groupBy: groupBy } : forecast,
          anomaly
        )
      : buildAnomalyAnnotationsLazy(anomaly!).then((annotations) => ({
          processedData: overlayData,
          annotations
        }))
    work
      .then((result) => {
        if (!cancelled)
          setCompleted({ request, result, hasForecast: !!forecast })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[Semiotic] Unable to compute statistical overlays:",
            error
          )
        }
        setCompleted(null)
      })
    return () => {
      cancelled = true
    }
  }, [
    request,
    overlayData,
    forecast,
    anomaly,
    xAccessorKey,
    yAccessorKey,
    groupBy
  ])

  // Never forward rows or annotations computed for a different request. Equal
  // inline configs retain the same request and therefore the completed overlay.
  const current = completed?.request === request ? completed : null
  return {
    effectiveData: current?.result.processedData ?? data,
    statisticalAnnotations: current?.result.annotations ?? EMPTY_ANNOTATIONS,
    hasForecast: current?.hasForecast ?? false,
    xAccessorKey,
    yAccessorKey
  }
}
