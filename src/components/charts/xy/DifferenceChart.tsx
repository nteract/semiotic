"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, forwardRef, useRef, useState, useImperativeHandle, useCallback } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartMode } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { type TooltipProp, normalizeTooltip, defaultTooltipStyle } from "../../Tooltip/Tooltip"
import { SafeRender } from "../shared/withChartWrapper"
import { useChartSetup } from "../shared/useChartSetup"
import type { HoverData } from "../../realtime/types"
import type { LegendGroup } from "../../types/legendTypes"
import { computeDifferenceSegments } from "./differenceSegments"
import type { SegmentRow } from "./differenceSegments"

export { computeDifferenceSegments } from "./differenceSegments"

/**
 * DifferenceChart props
 */
export interface DifferenceChartProps<TDatum extends Datum = Datum> extends BaseChartProps, AxisConfig {
  /** Array of `{x, a, b}` data points. Omit for push API mode. */
  data?: TDatum[]
  /** Accessor for the x value. Default `"x"`. */
  xAccessor?: ChartAccessor<TDatum, number>
  /** Accessor for series A. Default `"a"`. */
  seriesAAccessor?: ChartAccessor<TDatum, number>
  /** Accessor for series B. Default `"b"`. */
  seriesBAccessor?: ChartAccessor<TDatum, number>
  /** Display label for series A (legend + tooltip). Default `"A"`. */
  seriesALabel?: string
  /** Display label for series B. Default `"B"`. */
  seriesBLabel?: string
  /** Fill color when series A is above series B. Default `"var(--semiotic-danger, #dc2626)"`. */
  seriesAColor?: string
  /** Fill color when series B is above series A. Default `"var(--semiotic-info, #2563eb)"`. */
  seriesBColor?: string
  /** Show the A and B series as overlay lines on top of the filled difference. Default `true`. */
  showLines?: boolean
  /** Line stroke width when `showLines` is true. Default `1.5`. */
  lineWidth?: number
  /** Show data points on the overlay lines. Default `false`. */
  showPoints?: boolean
  /** Point radius when `showPoints` is true. Default `3`. */
  pointRadius?: number
  /** Curve interpolation for both the area boundary and overlay lines. Default `"linear"`. */
  curve?: "linear" | "monotoneX" | "monotoneY" | "step" | "stepAfter" | "stepBefore" | "basis" | "cardinal" | "catmullRom"
  /** Fill opacity for the difference region. Default `0.6`. */
  areaOpacity?: number
  /** Gradient fill across each segment, same shape as AreaChart.gradientFill. */
  gradientFill?: boolean | { topOpacity: number; bottomOpacity: number } | { colorStops: Array<{ offset: number; color: string }> }
  /** Enable hover annotations. */
  enableHover?: boolean
  /** Show grid lines. Default `false`. */
  showGrid?: boolean
  /** Show legend. Default `true`. */
  showLegend?: boolean
  /** Legend interaction mode. */
  legendInteraction?: LegendInteractionMode
  /** Legend position. */
  legendPosition?: LegendPosition
  /** Tooltip config. */
  tooltip?: TooltipProp
  /** Annotation objects. */
  annotations?: Datum[]
  /** Fixed x domain. */
  xExtent?: [number | undefined, number | undefined] | [number]
  /** Fixed y domain. */
  yExtent?: [number | undefined, number | undefined] | [number]
  /** Stable ID accessor for push-mode `remove()` / `update()`. */
  pointIdAccessor?: string | ((d: Datum) => string)
  /** Maximum number of raw rows kept in the push buffer. When exceeded,
   *  oldest rows are evicted FIFO (sliding window). Default: unbounded.
   *  Recommended for long-running streams so the per-render segment
   *  recomputation stays bounded. */
  windowSize?: number
  /** Pass-through StreamXYFrame props. */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}

/**
 * Coerce an accessor result to a `number` the way the Stream Frame
 * pipeline does:
 *
 *   - `number` → passed through.
 *   - `Date` → `getTime()` (milliseconds), so `xScaleType="time"` users
 *     can pass `Date` objects through `xAccessor` without the segment
 *     algorithm silently dropping every row at the `Number.isFinite`
 *     guard. This matches `xExtent.ts` and the XY pipeline's time-axis
 *     handling.
 *   - numeric string (`"5"`, `"3.14"`) → parsed via `+v`. Common when
 *     consuming CSV or JSON that wasn't type-coerced upstream.
 *   - `null` / `undefined` / non-numeric string → `NaN`. The caller's
 *     `Number.isFinite` filter then drops the row cleanly.
 */
function toNumber(v: unknown): number {
  if (v == null) return NaN
  if (typeof v === "number") return v
  if (v instanceof Date) return v.getTime()
  if (typeof v === "string") {
    if (v.trim() === "") return NaN
    const n = +v
    return Number.isFinite(n) ? n : NaN
  }
  return NaN
}

/** A vertex on one of the two continuous overlay lines. */
interface LineRow {
  __x: number
  __y: number
  /** Either `"line-A"` or `"line-B"`. Acts as the line group key. */
  __diffSegment: string
}

/**
 * Build the parallel line-data rows so we can render the two original
 * series as continuous lines on top of the difference fill in the same
 * frame. Returning two groups (`"line-A"` and `"line-B"`) keyed by
 * `__diffSegment` lets the mixed scene builder pick them up as line
 * groups while the segment groups go to the area builder.
 */
function buildOverlayLineRows<TDatum extends Datum>(
  raw: TDatum[],
  getX: (d: TDatum) => number,
  getA: (d: TDatum) => number,
  getB: (d: TDatum) => number,
): LineRow[] {
  if (!raw.length) return []
  // Filter non-finite-x rows BEFORE sorting (see segment-builder
  // comment for rationale — `Array.sort` treats NaN-comparator
  // returns as 0, leaving finite rows out of order).
  const sorted = raw
    .filter(d => Number.isFinite(getX(d)))
    .sort((p, q) => getX(p) - getX(q))
  const out: LineRow[] = []
  for (const d of sorted) {
    const x = getX(d), a = getA(d), b = getB(d)
    if (Number.isFinite(a)) out.push({ __x: x, __y: a, __diffSegment: "line-A" })
    if (Number.isFinite(b)) out.push({ __x: x, __y: b, __diffSegment: "line-B" })
  }
  return out
}

/**
 * DifferenceChart — fills the area between two series with a color
 * that switches based on which series is higher at each x. Crossover
 * points are interpolated so segments meet cleanly. Both series can
 * optionally be drawn as overlay lines on top of the fill.
 *
 * Classic uses: temperature anomaly (actual vs. normal), forecast
 * accuracy (actual vs. predicted), budget variance, A/B comparison.
 *
 * @example
 * ```tsx
 * <DifferenceChart
 *   data={[
 *     { date: 1, actual: 50, forecast: 45 },
 *     { date: 2, actual: 52, forecast: 60 },
 *     { date: 3, actual: 70, forecast: 58 },
 *   ]}
 *   xAccessor="date"
 *   seriesAAccessor="actual"
 *   seriesBAccessor="forecast"
 *   seriesALabel="Actual"
 *   seriesBLabel="Forecast"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Streaming via push API — omit `data`, push raw {x, a, b} rows.
 * const ref = useRef<RealtimeFrameHandle>(null)
 * useEffect(() => {
 *   const id = setInterval(() => {
 *     const t = Date.now()
 *     ref.current?.push({ x: t, a: 50 + Math.random() * 10, b: 50 + Math.random() * 10 })
 *   }, 500)
 *   return () => clearInterval(id)
 * }, [])
 * return <DifferenceChart ref={ref} xAccessor="x" seriesAAccessor="a" seriesBAccessor="b" />
 * ```
 */
export const DifferenceChart = forwardRef(function DifferenceChart<TDatum extends Datum = Datum>(
  props: DifferenceChartProps<TDatum>,
  ref: React.Ref<RealtimeFrameHandle>,
) {
  const frameRef = useRef<StreamXYFrameHandle>(null)

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
    xFormat, yFormat,
    xAccessor = "x" as ChartAccessor<TDatum, number>,
    seriesAAccessor = "a" as ChartAccessor<TDatum, number>,
    seriesBAccessor = "b" as ChartAccessor<TDatum, number>,
    seriesALabel = "A",
    seriesBLabel = "B",
    seriesAColor = "var(--semiotic-danger, #dc2626)",
    seriesBColor = "var(--semiotic-info, #2563eb)",
    showLines = true,
    lineWidth = 1.5,
    showPoints = false,
    pointRadius = 3,
    curve = "linear",
    areaOpacity = 0.6,
    gradientFill,
    tooltip,
    annotations,
    xExtent, yExtent,
    frameProps = {},
    selection, linkedHover,
    onObservation, onClick, hoverHighlight, chartId,
    loading, loadingContent, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    pointIdAccessor,
    windowSize,
  } = props

  const { width, height, enableHover, showGrid, showLegend, title, description, summary, accessibleTable, xLabel, yLabel } = resolved

  // ── Resolve string accessors once ────────────────────────────────────
  // Every accessor result flows through `toNumber` so `Date` (common for
  // `xScaleType="time"`) and numeric-string fields (CSV / JSON without
  // upstream type coercion) survive the `Number.isFinite` guards in
  // segment computation. The raw-field cast still trips on object types
  // it can't coerce — those produce `NaN` and the row is dropped cleanly.
  const getX = useMemo(
    () => typeof xAccessor === "function"
      ? (d: TDatum) => toNumber(xAccessor(d))
      : (d: TDatum) => toNumber(d[xAccessor as string]),
    [xAccessor],
  )
  const getA = useMemo(
    () => typeof seriesAAccessor === "function"
      ? (d: TDatum) => toNumber(seriesAAccessor(d))
      : (d: TDatum) => toNumber(d[seriesAAccessor as string]),
    [seriesAAccessor],
  )
  const getB = useMemo(
    () => typeof seriesBAccessor === "function"
      ? (d: TDatum) => toNumber(seriesBAccessor(d))
      : (d: TDatum) => toNumber(d[seriesBAccessor as string]),
    [seriesBAccessor],
  )

  // ── Push-mode raw data state ────────────────────────────────────────
  // The HOC owns a copy of the raw rows so push/pushMany/clear can
  // drive re-renders without going through the parent. Two-tier
  // storage:
  //   - `pushRowsRef` holds the LIVE array, mutated synchronously by
  //     the imperative-handle methods. Reading it inside `remove()` /
  //     `update()` returns the actually-removed records deterministically
  //     even under React's concurrent batching (React may defer the
  //     `setState` updater; the ref doesn't).
  //   - `pushRows` is the state mirror that triggers re-renders. The
  //     `sync()` helper updates both in lockstep so the ref never
  //     diverges from the rendered value.
  // When `data` is provided statically, push state is ignored — static
  // and push modes are mutually exclusive.
  const [pushRows, setPushRows] = useState<TDatum[]>([])
  const pushRowsRef = useRef<TDatum[]>([])
  const isPushMode = data == null

  const safeData = useMemo(
    () => filterSparseArray(isPushMode ? pushRows : data) as TDatum[],
    [isPushMode, pushRows, data],
  )

  // ── Compute segmented + overlay rows ────────────────────────────────
  const segmented = useMemo(
    () => computeDifferenceSegments(safeData, getX, getA, getB),
    [safeData, getX, getA, getB],
  )
  const overlayLines = useMemo(
    () => showLines ? buildOverlayLineRows(safeData, getX, getA, getB) : [],
    [showLines, safeData, getX, getA, getB],
  )

  // Combined data — areas + lines in the same flat array. The mixed
  // scene builder partitions them by group key via `areaGroups`.
  const combined = useMemo(
    () => [...segmented, ...overlayLines] as Datum[],
    [segmented, overlayLines],
  )

  // Array of area-group keys (each `seg-N-A`/`seg-N-B`). Line groups
  // (`line-A`/`line-B`) are NOT in this list so they render as lines.
  // Deduplicated via Set during the build (segments contain 2+ vertices
  // per group); the StreamXYFrame prop is a string[] so we hand off the
  // unique values.
  const areaGroups = useMemo(() => {
    const s = new Set<string>()
    for (const r of segmented) s.add(r.__diffSegment)
    return Array.from(s)
  }, [segmented])

  // ── Imperative handle (push API) ────────────────────────────────────
  // All mutations route through `sync()` so the ref and state stay
  // aligned. Return values are computed BEFORE the setState call so
  // they're deterministic under React 18+ concurrent batching — the
  // earlier pattern of building results inside the updater function
  // could return empty arrays if React deferred or replayed the
  // updater.
  useImperativeHandle(ref, () => {
    const sync = (next: TDatum[]) => {
      // FIFO window: when `windowSize` is set, evict the oldest rows so
      // the segment recomputation cost on each render stays bounded.
      // Without this, push streams accumulate forever even when the
      // user has indicated a maximum buffer size via prop.
      const trimmed = windowSize && next.length > windowSize
        ? next.slice(next.length - windowSize)
        : next
      pushRowsRef.current = trimmed
      setPushRows(trimmed)
    }
    const resolveId = pointIdAccessor
      ? (typeof pointIdAccessor === "function"
        ? pointIdAccessor
        : (d: Datum) => d[pointIdAccessor as string] as string)
      : null
    return {
      push: (point) => sync([...pushRowsRef.current, point as TDatum]),
      pushMany: (points) => sync([...pushRowsRef.current, ...points as TDatum[]]),
      remove: (id) => {
        if (!resolveId) return []
        const ids = Array.isArray(id) ? id : [id]
        const removed: TDatum[] = []
        const next: TDatum[] = []
        for (const d of pushRowsRef.current) {
          if (ids.includes(resolveId(d))) removed.push(d)
          else next.push(d)
        }
        sync(next)
        return removed
      },
      update: (id, updater) => {
        if (!resolveId) return []
        const ids = Array.isArray(id) ? id : [id]
        const updated: TDatum[] = []
        const next: TDatum[] = pushRowsRef.current.map(d => {
          if (ids.includes(resolveId(d))) {
            const newD = updater(d) as TDatum
            updated.push(newD)
            return newD
          }
          return d
        })
        sync(next)
        return updated
      },
      clear: () => sync([]),
      getData: () => (isPushMode ? pushRowsRef.current : safeData) as Datum[],
      getScales: () => frameRef.current?.getScales() ?? null,
    }
  }, [isPushMode, safeData, pointIdAccessor, windowSize])

  // ── Setup (margin, selection, hover behavior; legend custom below) ──
  // colorBy is set to `__diffWinner` so the hover/selection wiring has
  // a categorical field to use, but we render with our own per-group
  // styleFns below — the auto-built legend is replaced with a custom
  // two-item legend (seriesALabel + seriesBLabel).
  const setup = useChartSetup({
    data: safeData,
    rawData: data,
    colorBy: "__diffWinner",
    colorScheme: [seriesAColor, seriesBColor],
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: ["__diffWinner"],
    unwrapData: false,
    onObservation,
    onClick,
    hoverHighlight,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "DifferenceChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    loadingContent,
    emptyContent,
    width,
    height,
    hasTitle: !!title,
  })

  // Custom two-item legend keyed to series labels, not the internal
  // segment keys. Defaults to ON (two series always merits a legend);
  // skipped entirely when the user explicitly passes `showLegend={false}`.
  //
  // The legend renderer takes the swatch color from `styleFn(item).fill`,
  // not from `item.color` — `item.color` is just metadata for downstream
  // consumers like custom hover handlers. Read each item's color back out
  // of the styleFn so the swatch matches the series fill.
  const customLegend = useMemo(() => {
    if (showLegend === false) return undefined
    const groups: LegendGroup[] = [{
      label: "",
      type: "fill",
      styleFn: (item) => ({ fill: (item.color as string) || "currentColor" }),
      items: [
        { label: seriesALabel, color: seriesAColor },
        { label: seriesBLabel, color: seriesBColor },
      ],
    }]
    return { legendGroups: groups }
  }, [showLegend, seriesALabel, seriesBLabel, seriesAColor, seriesBColor])

  // ── Style resolvers ─────────────────────────────────────────────────
  // areaStyle gets called per segment-group. The group key is
  // `seg-<i>-A` or `seg-<i>-B`; the trailing letter picks the color.
  const areaStyle = useCallback((d: Datum) => {
    const segKey = (d as SegmentRow).__diffSegment
    const winner = segKey?.endsWith("-A") ? "A" : "B"
    return {
      fill: winner === "A" ? seriesAColor : seriesBColor,
      stroke: "none",
      fillOpacity: areaOpacity,
    }
  }, [seriesAColor, seriesBColor, areaOpacity])

  // lineStyle for the overlay lines — `line-A` / `line-B` keys.
  const lineStyle = useCallback((d: Datum) => {
    const key = (d as LineRow).__diffSegment
    const winner = key === "line-A" ? "A" : "B"
    return {
      stroke: winner === "A" ? seriesAColor : seriesBColor,
      strokeWidth: lineWidth,
      fill: "none",
    }
  }, [seriesAColor, seriesBColor, lineWidth])

  const pointStyle = useCallback((d: Datum) => {
    const key = (d as LineRow).__diffSegment
    const winner = key === "line-A" ? "A" : "B"
    return {
      fill: winner === "A" ? seriesAColor : seriesBColor,
      r: pointRadius,
    }
  }, [seriesAColor, seriesBColor, pointRadius])

  // ── Tooltip ─────────────────────────────────────────────────────────
  const defaultTooltipContent = useCallback((hover: HoverData) => {
    // Three hover shapes feed this tooltip:
    //   1. Area hover — `hover.data` is a SegmentRow with `__valA` /
    //      `__valB` baked in.
    //   2. Line hover — `hover.data` is a LineRow (no `__valA`/`__valB`);
    //      we look up the source row by x to recover both values.
    //   3. Multi-tooltip hover (tooltip="multi") — the cursor sits on
    //      an interpolated x, so `hover.allSeries` carries the
    //      interpolated `line-A` / `line-B` values and `hover.xValue`
    //      carries the data-space x. Prefer those when present; the
    //      interpolated x rarely matches a raw data row by `===`.
    const hd = hover.data as Datum | undefined
    const allSeries = hover.allSeries as Array<{ group?: string; value?: number }> | undefined
    const xVal: number | undefined = (hover.xValue as number | undefined) ?? (hd?.__x as number | undefined)
    let aVal: number | undefined = hd?.__valA as number | undefined
    let bVal: number | undefined = hd?.__valB as number | undefined
    if (allSeries && allSeries.length > 0) {
      const aSeries = allSeries.find(s => s.group === "line-A")
      const bSeries = allSeries.find(s => s.group === "line-B")
      if (aSeries?.value != null && Number.isFinite(aSeries.value)) aVal = aSeries.value
      if (bSeries?.value != null && Number.isFinite(bSeries.value)) bVal = bSeries.value
    }
    if (xVal != null && (aVal == null || bVal == null)) {
      const source = safeData.find(d => getX(d) === xVal)
      if (source) {
        if (aVal == null) aVal = getA(source)
        if (bVal == null) bVal = getB(source)
      }
    }
    const fmt = (v: number | undefined) =>
      v == null || !Number.isFinite(v) ? "—" : (Math.round(v * 100) / 100).toString()
    const fmtX = xFormat && xVal != null ? xFormat(xVal) : (xVal != null ? String(xVal) : "")
    // Use `defaultTooltipStyle` + the `semiotic-tooltip` className so the
    // tooltip picks up the standard chrome (background, padding, shadow,
    // theme-aware text color) instead of rendering as a transparent
    // floating div. Same pattern `buildDefaultTooltip` and other shared
    // tooltip helpers use — keeps the chart consistent with the rest of
    // the library.
    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        {fmtX && <div style={{ fontWeight: 600, marginBottom: 4 }}>{fmtX}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, background: seriesAColor, display: "inline-block", borderRadius: 2 }} />
          <span>{seriesALabel}: {fmt(aVal)}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, background: seriesBColor, display: "inline-block", borderRadius: 2 }} />
          <span>{seriesBLabel}: {fmt(bVal)}</span>
        </div>
        {aVal != null && bVal != null && Number.isFinite(aVal) && Number.isFinite(bVal) && (
          <div style={{ marginTop: 4, opacity: 0.7 }}>
            Δ = {fmt(aVal - bVal)}
          </div>
        )}
      </div>
    )
  }, [safeData, getX, getA, getB, xFormat, seriesAColor, seriesBColor, seriesALabel, seriesBLabel])

  // `tooltip="multi"` opts into hover-anywhere along the x-axis with
  // interpolated series values — same shape LineChart/AreaChart use.
  // The default tooltip handles both single-point and multi shapes
  // (it reads `hover.allSeries` when present), so we don't swap the
  // content function; we just enable the frame's multi tooltipMode.
  const multiTooltip = tooltip === "multi"
  const tooltipContent = useMemo(() => {
    if (tooltip === false) return () => null
    if (multiTooltip) return defaultTooltipContent
    const normalized = normalizeTooltip(tooltip)
    return (normalized as ((d: HoverData) => React.ReactNode) | false) || defaultTooltipContent
  }, [tooltip, multiTooltip, defaultTooltipContent])

  // Loading / empty state — returned only after every hook above has run, so
  // the hook count is identical whether or not data is present. Mounting empty
  // (loading skeleton) and then streaming in data must not change the number of
  // hooks between renders, or React throws "Rendered more hooks than during the
  // previous render."
  if (setup.earlyReturn) return setup.earlyReturn

  // ── StreamXYFrame props ─────────────────────────────────────────────
  // Use `mixed` chartType: segment-group keys appear in `areaGroups`
  // (each renders as an area polygon with y0Accessor as the lower
  // boundary), and the two `line-*` groups render as continuous lines.
  // All groups share the same x/y scale so geometry aligns perfectly.
  const streamProps: StreamXYFrameProps = {
    chartType: "mixed",
    data: combined,
    xAccessor: "__x",
    yAccessor: "__y",
    y0Accessor: "__y0",
    groupAccessor: "__diffSegment",
    areaGroups,
    curve,
    areaStyle,
    lineStyle,
    ...(showPoints && { pointStyle }),
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
    showGrid,
    ...(gradientFill && { gradientFill: gradientFill === true ? { topOpacity: 0.85, bottomOpacity: 0.15 } : gradientFill }),
    ...(customLegend && { legend: customLegend, legendPosition: setup.legendPosition }),
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate, axisExtent: props.axisExtent, autoPlaceAnnotations: props.autoPlaceAnnotations }),
    tooltipContent,
    ...(multiTooltip && { tooltipMode: "multi" as const }),
    ...buildCustomBehaviorProps({
      linkedHover, selection, onObservation, onClick, hoverHighlight,
      mobileInteraction: setup.mobileInteraction,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(xExtent && { xExtent }),
    ...(yExtent && { yExtent }),
    ...setup.crosshairProps,
    ...frameProps,
  }

  return (
    <SafeRender componentName="DifferenceChart" width={width} height={height}>
      <StreamXYFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <TDatum extends Datum = Datum>(props: DifferenceChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}

if (typeof DifferenceChart === "function") {
  (DifferenceChart as { displayName?: string }).displayName = "DifferenceChart"
}
