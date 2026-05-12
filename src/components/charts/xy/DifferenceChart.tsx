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

/**
 * Crossover-segmented record used by the area pipeline. One row per
 * vertex along either the upper or lower boundary; `__diffSegment` is a
 * group key per segment so the area scene builder produces one polygon
 * per id with the correct fill color.
 */
interface SegmentRow {
  __x: number
  /** Upper boundary y value (max of A, B). The area pipeline reads this. */
  __y: number
  /** Lower boundary y value (min of A, B) — picked up as per-datum y0. */
  __y0: number
  /** Segment id. Format: `"seg-<index>-<winner>"`. */
  __diffSegment: string
  /** Which series is on top in this segment ("A" or "B"). Drives fill. */
  __diffWinner: "A" | "B"
  /** Original A value at this x (or interpolated at crossovers). */
  __valA: number
  /** Original B value at this x (or interpolated at crossovers). */
  __valB: number
  /** Original datum (for tooltip lookup at non-crossover vertices). */
  __sourceDatum?: Datum
}

/** A vertex on one of the two continuous overlay lines. */
interface LineRow {
  __x: number
  __y: number
  /** Either `"line-A"` or `"line-B"`. Acts as the line group key. */
  __diffSegment: string
}

/**
 * Walk sorted data, splitting at each A↔B crossover. Inserts an
 * interpolated vertex on BOTH sides of every crossover so adjacent
 * segments meet at a zero-width point (no jagged edges).
 *
 * Skipping non-finite rows is supported: the algorithm tracks the most
 * recent VALID point (not the index neighbor) for crossover detection,
 * so a non-finite gap doesn't drop a crossover that straddles it.
 *
 * Exported for direct unit-testing — the area pipeline depends on the
 * exact crossover-vertex shape produced here.
 */
export function computeDifferenceSegments<TDatum extends Datum>(
  raw: TDatum[],
  getX: (d: TDatum) => number,
  getA: (d: TDatum) => number,
  getB: (d: TDatum) => number,
): SegmentRow[] {
  if (!raw.length) return []
  const sorted = [...raw].sort((p, q) => getX(p) - getX(q))
  const out: SegmentRow[] = []
  let segIdx = 0
  let currentWinner: "A" | "B" | null = null
  // Track the last valid (finite a, b) row's x / a / b / winner so the
  // crossover check survives non-finite gaps. Using `sorted[i - 1]`
  // directly would compare against an invalid neighbor and drop the
  // crossover between the last valid point and the current one.
  let lastValid: { x: number; a: number; b: number; w: "A" | "B" | null } | null = null
  const winnerAt = (a: number, b: number): "A" | "B" | null =>
    a > b ? "A" : b > a ? "B" : null
  const segKey = (w: "A" | "B") => `seg-${segIdx}-${w}`

  for (let i = 0; i < sorted.length; i++) {
    const d = sorted[i]
    const x = getX(d), a = getA(d), b = getB(d)
    if (!Number.isFinite(x) || !Number.isFinite(a) || !Number.isFinite(b)) continue
    const w = winnerAt(a, b)

    if (currentWinner == null) {
      // First valid point of the dataset (or after consecutive ties).
      // Pick a winner; if exactly tied, default to "A" (the tied lead-in
      // segment collapses to zero width either way).
      currentWinner = w ?? "A"
    } else if (lastValid && lastValid.w && w && lastValid.w !== w) {
      // Crossover between the last valid row and this one.
      // Solve `pa + t*(a-pa) === pb + t*(b-pb)` for t ∈ [0, 1].
      const px = lastValid.x, pa = lastValid.a, pb = lastValid.b
      const denom = (a - pa) - (b - pb)
      if (denom !== 0) {
        const t = (pb - pa) / denom
        const tc = Math.max(0, Math.min(1, t))
        const xc = px + tc * (x - px)
        const yc = pa + tc * (a - pa)
        // Close the current segment at the crossover.
        out.push({
          __x: xc, __y: yc, __y0: yc,
          __diffSegment: segKey(currentWinner),
          __diffWinner: currentWinner,
          __valA: yc, __valB: yc,
        })
        // Open the new segment at the same vertex.
        segIdx++
        currentWinner = w
        out.push({
          __x: xc, __y: yc, __y0: yc,
          __diffSegment: segKey(currentWinner),
          __diffWinner: currentWinner,
          __valA: yc, __valB: yc,
        })
      }
    }

    const winner: "A" | "B" = currentWinner ?? (w ?? "A")
    const upper = a >= b ? a : b
    const lower = a >= b ? b : a
    out.push({
      __x: x, __y: upper, __y0: lower,
      __diffSegment: segKey(winner),
      __diffWinner: winner,
      __valA: a, __valB: b,
      __sourceDatum: d,
    })
    lastValid = { x, a, b, w }
  }
  return out
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
  const sorted = [...raw].sort((p, q) => getX(p) - getX(q))
  const out: LineRow[] = []
  for (const d of sorted) {
    const x = getX(d), a = getA(d), b = getB(d)
    if (!Number.isFinite(x)) continue
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
    loading, emptyContent,
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
    chartType: "DifferenceChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    emptyContent,
    width,
    height,
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
    // The hovered datum carries either a SegmentRow (area hover) or a
    // LineRow (line hover). For LineRow, `__sourceDatum` is absent;
    // look up the source row by x to recover both A and B values.
    const hd = hover.data as Datum | undefined
    let xVal: number | undefined = hd?.__x as number | undefined
    let aVal: number | undefined = hd?.__valA as number | undefined
    let bVal: number | undefined = hd?.__valB as number | undefined
    if (xVal != null && (aVal == null || bVal == null)) {
      const source = safeData.find(d => getX(d) === xVal)
      if (source) {
        aVal = getA(source)
        bVal = getB(source)
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

  const tooltipContent = useMemo(() => {
    if (tooltip === false) return () => null
    const normalized = normalizeTooltip(tooltip)
    return (normalized as ((d: HoverData) => React.ReactNode) | false) || defaultTooltipContent
  }, [tooltip, defaultTooltipContent])

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
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate, axisExtent: props.axisExtent }),
    tooltipContent,
    ...buildCustomBehaviorProps({
      linkedHover, onObservation, onClick, hoverHighlight,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(xExtent && { xExtent }),
    ...(yExtent && { yExtent }),
    ...setup.crosshairProps,
    ...frameProps,
  }

  // ── Loading / empty guards ──────────────────────────────────────────
  if (setup.earlyReturn) return setup.earlyReturn

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
