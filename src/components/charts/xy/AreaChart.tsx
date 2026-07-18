"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle, BandConfig } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartMode } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { MultiPointTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { useChartSetup } from "../shared/useChartSetup"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import { useAreaSeriesSetup } from "../shared/useAreaSeriesSetup"
import { makeXYRuleContext, type StyleRule } from "../shared/styleRules"
import { useSeriesFeatures } from "../shared/useSeriesFeatures"
import type { ForecastConfig, AnomalyConfig } from "../shared/statisticalOverlays"

export interface SemanticGradientStop {
  /** Percent from baseline to line/top. 0 = baseline, 100 = line/top. */
  at: number
  color: string
  /** Optional opacity applied to this stop. */
  opacity?: number
}

function withOpacity(color: string, opacity: number | undefined): string {
  if (opacity == null) return color
  const trimmed = color.trim()
  const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const raw = hex[1]
    const expanded = raw.length === 3
      ? raw.split("").map((c) => c + c).join("")
      : raw
    const r = parseInt(expanded.slice(0, 2), 16)
    const g = parseInt(expanded.slice(2, 4), 16)
    const b = parseInt(expanded.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }
  if (trimmed.startsWith("rgba(")) {
    const lastComma = trimmed.lastIndexOf(",")
    const lastParen = trimmed.lastIndexOf(")")
    if (lastComma !== -1 && lastParen > lastComma) {
      return `${trimmed.slice(0, lastComma + 1)} ${opacity})`
    }
  }
  if (trimmed.startsWith("rgb(")) {
    return trimmed.replace(/^rgb\(/, "rgba(").replace(/\)$/, `, ${opacity})`)
  }
  return color
}

/**
 * Convert value-anchored `semanticGradient` stops (`{ at, color }` on the value
 * scale, 0–100) into the frame's `gradientFill.colorStops` (offset 0 = top).
 * Exported so the server (`renderChart`) config resolves it identically to this
 * HOC — otherwise SSR silently drops `semanticGradient` and paints a flat area.
 */
export function semanticGradientToColorStops(stops: SemanticGradientStop[]): Array<{ offset: number; color: string }> {
  return stops
    .filter((stop) => Number.isFinite(stop.at))
    .map((stop) => ({
      offset: 1 - Math.max(0, Math.min(100, stop.at)) / 100,
      color: withOpacity(stop.color, stop.opacity),
    }))
    .sort((a, b) => a.offset - b.offset)
}

/**
 * AreaChart component props
 */
export interface AreaChartProps<TDatum extends Datum = Datum> extends BaseChartProps, AxisConfig {
  /**
   * Array of data points, grouped by category.
   * @example
   * ```ts
   * // Multiple areas with grouping
   * [{x: 1, y: 10, category: 'A'}, {x: 2, y: 20, category: 'A'}, {x: 1, y: 15, category: 'B'}]
   * ```
   */
  data?: TDatum[]

  /**
   * Field name or function to access x values
   * @default "x"
   */
  xAccessor?: ChartAccessor<TDatum, number | Date | string>

  /**
   * Field name or function to access y values
   * @default "y"
   */
  yAccessor?: ChartAccessor<TDatum, number>

  /**
   * Field name or function to group data into multiple areas
   * @example
   * ```ts
   * areaBy="category"  // Group by category field
   * areaBy={d => d.group}  // Use function
   * ```
   */
  areaBy?: ChartAccessor<TDatum, string>

  /**
   * Field name in area objects that contains coordinate arrays
   * Used when data is in area objects format
   * @default "coordinates"
   */
  lineDataAccessor?: string

  /**
   * Field name or function to determine area color
   * @example
   * ```ts
   * colorBy="category"
   * colorBy={d => d.label}
   * ```
   */
  colorBy?: ChartAccessor<TDatum, string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[] | Record<string, string>
  /**
   * Declarative, threshold-aware area styling. Ordered `{ when, style }`
   * rules; last applicable rule wins. Per-SERIES (resolves against the series'
   * sample datum). A rule `fill` may be a color or a HatchFill — hatch an
   * "uncertain"/"projected" series. Layers over the resolved series color.
   */
  styleRules?: StyleRule[]

  /**
   * Curve interpolation type
   * @default "monotoneX"
   */
  curve?: "linear" | "monotoneX" | "monotoneY" | "step" | "stepAfter" | "stepBefore" | "basis" | "cardinal" | "catmullRom"

  /**
   * Per-point lower bound accessor for band/ribbon charts.
   * When set, the area fills between yAccessor (top) and y0Accessor (bottom)
   * instead of filling down to the axis. Use for percentile bands (p5–p95),
   * confidence intervals, or any ribbon visualization.
   * @example
   * ```ts
   * // Data: [{ x: 0, p95: 80, p5: 20 }, ...]
   * <AreaChart data={d} xAccessor="x" yAccessor="p95" y0Accessor="p5" />
   * ```
   */
  y0Accessor?: ChartAccessor<TDatum, number>

  /**
   * Gradient fill from line to baseline. Set `true` for default opacity (80% → 5%),
   * `{ topOpacity, bottomOpacity }` for custom opacity, or
   * `{ colorStops: [{offset, color}] }` for multi-color gradients.
   * @default false
   */
  gradientFill?: boolean | { topOpacity: number; bottomOpacity: number } | { colorStops: Array<{ offset: number; color: string }> }

  /**
   * Semantic area gradient stops expressed in user-facing percentages:
   * `at: 0` is the baseline and `at: 100` is the line/top of the area.
   * This is converted to `gradientFill.colorStops`, whose raw offsets use
   * the renderer coordinate convention (`0` = top, `1` = baseline).
   * When set, this takes precedence over `gradientFill`.
   */
  semanticGradient?: SemanticGradientStop[]

  /**
   * Area opacity (flat fill, ignored when gradientFill is set)
   * @default 0.7
   */
  areaOpacity?: number

  /**
   * Horizontal gradient for the line stroke. Color stops define a left-to-right gradient.
   */
  lineGradient?: { colorStops: Array<{ offset: number; color: string }> }

  /**
   * Show line on top of area
   * @default true
   */
  showLine?: boolean

  /**
   * Line stroke width when showLine is true
   * @default 2
   */
  lineWidth?: number

  /**
   * Show data points on the area line.
   * Useful for sparse data or single-point series.
   * @default false
   */
  showPoints?: boolean

  /**
   * Point radius when showPoints is true
   * @default 3
   */
  pointRadius?: number

  /**
   * Enable hover annotations
   * @default true
   */
  enableHover?: boolean

  /**
   * Show grid lines
   * @default false
   */
  showGrid?: boolean

  /**
   * Show legend for multiple areas
   * @default true (when multiple areas)
   */
  showLegend?: boolean

  /**
   * Legend interaction mode.
   * - "highlight": hover dims non-hovered categories to 30% opacity
   * - "isolate": click toggles category visibility with checkmark indicators
   * - "none": static legend (default)
   */
  legendInteraction?: LegendInteractionMode

  /**
   * Legend position
   */
  legendPosition?: LegendPosition

  /**
   * Tooltip configuration. Pass "multi" to show every area value at the
   * hovered x position.
   */
  tooltip?: TooltipProp

  /**
   * Annotation objects to render on the chart
   */
  annotations?: Datum[]

  /**
   * Forecast overlay — extends the area with a tagged training /
   * observed / forecast region and (optionally) a confidence
   * envelope. Same shape as LineChart's `forecast` prop. Pair with
   * `anomaly` for combined anomaly + forecast visualization.
   *
   * @example
   * ```tsx
   * <AreaChart data={obs} xAccessor="t" yAccessor="value"
   *            forecast={{ trainEnd: 80, steps: 10, color: "#6366f1" }} />
   * ```
   */
  forecast?: ForecastConfig
  /**
   * Anomaly overlay — adds a ±σ band and per-point anomaly dots.
   * Standalone (without forecast) gives raw anomaly detection.
   *
   * @example
   * ```tsx
   * <AreaChart data={obs} anomaly={{ threshold: 2 }} />
   * ```
   */
  anomaly?: AnomalyConfig

  /**
   * Asymmetric min/max band(s) drawn under the area fill. Distinct from
   * `y0Accessor` (which replaces the area's baseline) — `band` is a
   * decorative envelope painted beneath the area, driven by independent
   * `y0Accessor` / `y1Accessor` per band. Pass an array for fan charts.
   *
   * The hovered datum gets `band: { y0, y1 }` and `bands: [...]` for
   * tooltip access. See the LineChart docs for full ergonomics.
   */
  band?: BandConfig<TDatum> | Array<BandConfig<TDatum>>

  /**
   * Fixed x domain `[min, max]`. Either bound may be `undefined` to leave
   * that side data-derived. Useful for pinning a time axis to a known
   * window (e.g. last 24 hours) so streamed updates don't shift the
   * left/right edges as data flows in.
   */
  xExtent?: [number | undefined, number | undefined] | [number]

  /**
   * Fixed y domain `[min, max]`. Either bound may be `undefined` to leave
   * that side data-derived. The fill baseline is the y-domain minimum, so
   * setting `yExtent={[0, 100]}` anchors both the axis AND the area's
   * baseline at 0 — the typical "percentage / counter" shape.
   */
  yExtent?: [number | undefined, number | undefined] | [number]

  /**
   * Additional StreamXYFrame props for advanced customization
   * For full control, consider using StreamXYFrame directly
   * @see https://semiotic.nteract.io/guides/xy-frame
   */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}

/**
 * AreaChart - Visualize quantities over continuous intervals with overlapping filled areas
 *
 * Each series fills from its line down to the baseline. Multiple series overlap
 * with transparency so all shapes remain visible.
 *
 * For stacked areas use {@link StackedAreaChart}.
 *
 * @example
 * ```tsx
 * // Multi-series areas with overlap transparency
 * <AreaChart
 *   data={[
 *     {x: 1, y: 10, category: 'A'},
 *     {x: 2, y: 20, category: 'A'},
 *     {x: 1, y: 15, category: 'B'},
 *     {x: 2, y: 25, category: 'B'}
 *   ]}
 *   areaBy="category"
 *   colorBy="category"
 *   xLabel="Time"
 *   yLabel="Value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Single series with a vertical opacity gradient (tip → baseline fade)
 * <AreaChart
 *   data={data}
 *   xAccessor="t"
 *   yAccessor="value"
 *   color="steelblue"
 *   gradientFill={{ topOpacity: 0.8, bottomOpacity: 0.05 }}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Push mode — omit `data`, drive the chart through a ref. Use a
 * // stable string id so `remove(id)` / `update(id, ...)` work later.
 * const ref = useRef<RealtimeFrameHandle>(null)
 * useEffect(() => {
 *   const id = setInterval(() => {
 *     const t = Date.now()
 *     ref.current?.push({ id: String(t), x: t, y: Math.random() })
 *   }, 200)
 *   return () => clearInterval(id)
 * }, [])
 * return <AreaChart ref={ref} xAccessor="x" yAccessor="y" pointIdAccessor="id" />
 * ```
 */
export const AreaChart = forwardRef(function AreaChart<TDatum extends Datum = Datum>(props: AreaChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const frameRef = useRef<StreamXYFrameHandle>(null)

  useFrameImperativeHandle(ref, { variant: "xy", frameRef })

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    xLabel: props.xLabel,
    yLabel: props.yLabel,
      mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
})

  const {
    data,
    margin: userMargin,
    className,
    xFormat,
    yFormat,
    xAccessor = "x",
    yAccessor = "y",
    areaBy,
    y0Accessor,
    gradientFill = false,
    semanticGradient,
    lineDataAccessor = "coordinates",
    colorBy,
    colorScheme,
    styleRules,
    curve = "monotoneX",
    areaOpacity = 0.7,
    lineGradient,
    showLine = true,
    lineWidth = 2,
    showPoints = false,
    pointRadius = 3,
    tooltip,
    annotations,
    forecast,
    anomaly,
    band,
    xExtent,
    yExtent,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    onClick,
    hoverHighlight,
    chartId,
    loading,
    loadingContent,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color,
    stroke,
    strokeWidth,
    opacity,
  } = props

  const { width, height, enableHover, showGrid, showLegend, title, description, summary, accessibleTable, xLabel, yLabel } = resolved

  const safeData = useMemo(() => filterSparseArray(data), [data])
  const effectiveColorBy = colorBy || areaBy
  const resolvedGradientFill = useMemo(() => {
    if (semanticGradient && semanticGradient.length > 0) {
      return { colorStops: semanticGradientToColorStops(semanticGradient) }
    }
    return gradientFill
  }, [semanticGradient, gradientFill])

  // ── Dev-mode warnings ─────────────────────────────────────────────────
  warnMissingField("AreaChart", safeData, "xAccessor", xAccessor)
  warnMissingField("AreaChart", safeData, "yAccessor", yAccessor)

  // ── Shared setup (color, legend, selection, loading/empty) ────────────
  const setup = useChartSetup({
    data: safeData,
    rawData: data,
    colorBy: effectiveColorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: effectiveColorBy ? [typeof effectiveColorBy === "string" ? effectiveColorBy : ""] : [],
    unwrapData: false,
    onObservation,
    onClick,
    hoverHighlight,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "AreaChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    loadingContent,
    emptyContent,
    width,
    height,
  })

  // ── Statistical features (forecast + anomaly overlays) ────────────────
  // Same hook LineChart uses — produces post-forecast effective data
  // (tagged future points appended) + envelope/anomaly annotations.
  const {
    effectiveData: featureEffectiveData,
    statisticalAnnotations,
  } = useSeriesFeatures({
    data: safeData as Datum[],
    xAccessor, yAccessor,
    forecast, anomaly,
    groupBy: areaBy,
  })

  // ── Area-series construction (data shaping, line/point style, tooltip) ─
  // Use featureEffectiveData when forecast is active so post-forecast
  // future points flow into the area pipeline; otherwise raw safeData.
  const areaRuleContext = useMemo(
    () => makeXYRuleContext(
      xAccessor as string | ((d: Datum) => unknown),
      yAccessor as string | ((d: Datum) => unknown),
    ),
    [xAccessor, yAccessor],
  )
  const { flattenedData, lineStyle, pointStyle, defaultTooltipContent } = useAreaSeriesSetup({
    safeData: featureEffectiveData as TDatum[], data,
    areaBy, lineDataAccessor,
    colorBy: effectiveColorBy, colorScale: setup.colorScale,
    color, stroke, strokeWidth, opacity,
    effectiveSelectionHook: setup.effectiveSelectionHook,
    resolvedSelection: setup.resolvedSelection,
    areaOpacity, showLine, lineWidth, showPoints, pointRadius,
    xAccessor, yAccessor, xLabel, yLabel, xFormat, yFormat,
    groupField: areaBy || colorBy,
    band,
    styleRules,
    ruleContext: areaRuleContext,
  })

  // Validate data (after all hooks)
  const validationError = validateArrayData({
    componentName: "AreaChart",
    data: data,
    accessors: {
      xAccessor,
      yAccessor,
    },
  })

  // Build StreamXYFrame props
  const streamProps: StreamXYFrameProps = {
    chartType: "area",
    ...(data != null && { data: flattenedData }),
    xAccessor,
    yAccessor,
    groupAccessor: areaBy || undefined,
    ...(y0Accessor && { y0Accessor }),
    ...(band && { band: band as StreamXYFrameProps["band"] }),
    ...(resolvedGradientFill && { gradientFill: resolvedGradientFill }),
    ...(lineGradient && { lineGradient }),
    curve,
    lineStyle,
    ...(showPoints && pointStyle && { pointStyle }),
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: setup.margin,
    showAxes: resolved.showAxes,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    ...(props.pointIdAccessor && { pointIdAccessor: props.pointIdAccessor }),
    showGrid,
    ...setup.legendBehaviorProps,
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate, axisExtent: props.axisExtent, autoPlaceAnnotations: props.autoPlaceAnnotations }),
    ...(tooltip === "multi"
      ? { tooltipContent: MultiPointTooltip(), tooltipMode: "multi" as const }
      : buildTooltipProps({ tooltip, defaultTooltipContent })),
    ...buildCustomBehaviorProps({
      linkedHover, selection, onObservation, onClick, hoverHighlight,
      mobileInteraction: setup.mobileInteraction,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(((annotations && annotations.length > 0) || statisticalAnnotations.length > 0) && {
      annotations: [...(annotations || []), ...statisticalAnnotations],
    }),
    ...(xExtent && { xExtent }),
    ...(yExtent && { yExtent }),
    ...setup.crosshairProps,
    ...frameProps
  }

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (setup.earlyReturn) return setup.earlyReturn
  if (validationError) return <ChartError componentName="AreaChart" message={validationError} width={width} height={height} />

  return <SafeRender componentName="AreaChart" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: AreaChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
AreaChart.displayName = "AreaChart"
