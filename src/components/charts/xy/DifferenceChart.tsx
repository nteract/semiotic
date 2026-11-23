"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import {
  buildBaseMetadataProps,
  buildCustomBehaviorProps
} from "../shared/streamPropsHelpers"
import * as React from "react"
import {
  useMemo,
  forwardRef,
  useRef,
  useState,
  useSyncExternalStore,
  useLayoutEffect,
  useImperativeHandle,
  useCallback
} from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import { ensureXYPlugin } from "../../stream/xyPlugins/registry"
import { differenceHoverScene } from "./differenceSeries"
import { mixedXYPlugin } from "../../stream/xyPlugins/mixedPlugin"
import type {
  StreamXYFrameProps,
  StreamXYFrameHandle
} from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartMode } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import {
  type TooltipProp,
  resolveMultiCapableTooltip,
  defaultTooltipStyle
} from "../../Tooltip/Tooltip"
import { useChartSetup } from "../shared/useChartSetup"
import { resolveXYFramePropsAxisChrome } from "../../legendLayout"
import type { HoverData } from "../../realtime/types"
import { buildOverlayLineRows, createDifferenceProjection, differenceFrameAccessors } from "./differenceSegments"
import { RingBuffer } from "../../realtime/RingBuffer"
import { toIdSet } from "../../stream/pipelineIdentityOps"
import { reserveChartRows } from "../shared/reserveChartRows"
import { normalizeGradient, type GradientInput } from "../shared/gradient"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import { useSelectionAwareXYFrameStyles } from "../shared/useSelectionAwareFrameStyle"
import { type StyleRule } from "../shared/styleRules"
import { buildDifferenceLegend, buildDifferenceStyles } from "./differenceMarkStyle"
import { withChartErrorBoundary } from "../shared/withChartErrorBoundary"

export { computeDifferenceSegments } from "./differenceSegments"

/**
 * DifferenceChart props
 */
export interface DifferenceChartProps<TDatum extends Datum = Datum>
  extends BaseChartProps, AxisConfig {
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
  curve?:
    | "linear"
    | "monotoneX"
    | "monotoneY"
    | "step"
    | "stepAfter"
    | "stepBefore"
    | "basis"
    | "cardinal"
    | "catmullRom"
  /** Fill opacity for the difference region. Default `0.6`. */
  areaOpacity?: number
  /** Gradient fill from each segment's tip (offset 0) to its base (offset 1). */
  gradientFill?: GradientInput
  /**
   * Declarative, threshold-aware fill/line styling. `ctx.y` is the plotted
   * upper boundary (`__y`); `category` is `"A"` or `"B"`. Field thresholds
   * see the original source row.
   */
  styleRules?: StyleRule[]
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
   *  Limits retained samples for long-running streams. */
  windowSize?: number
  /** Pass-through StreamXYFrame props. */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}

function createPushRevision() {
  let version = 0
  let epoch = 0
  let frame: number | undefined
  let listener: (() => void) | undefined
  return {
    read: () => version,
    get epoch() { return epoch },
    changed(reset = false) {
      if (reset) epoch++
      version++
      if (listener && frame === undefined) frame = requestAnimationFrame(() => {
        frame = undefined
        listener?.()
      })
    },
    subscribe(callback: () => void) {
      listener = callback
      return () => {
        if (frame !== undefined) cancelAnimationFrame(frame)
        frame = undefined
        listener = undefined
      }
    }
  }
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
export const DifferenceChart = /* @__PURE__ */ withChartErrorBoundary(/* @__PURE__ */ forwardRef(function DifferenceChart<
  TDatum extends Datum = Datum
>(props: DifferenceChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  ensureXYPlugin(mixedXYPlugin)
  const frameRef = useRef<StreamXYFrameHandle>(null)

  const resolved = useChartMode(props.mode, props)

  const {
    data,
    margin: userMargin,
    xFormat,
    yFormat,
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
    styleRules,
    tooltip,
    annotations,
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
    pointIdAccessor,
    windowSize
  } = props

  const {
    width,
    height,
    enableHover,
    showGrid,
    showLegend,
    title,
    xLabel,
    yLabel
  } = resolved

  const [rows] = useState(() => new RingBuffer<TDatum>(1))
  const [updates] = useState(createPushRevision)
  const version = useSyncExternalStore(updates.subscribe, updates.read, updates.read)
  useLayoutEffect(() => {
    if (reserveChartRows(rows, 0, windowSize).length) updates.changed(true)
  }, [rows, windowSize, updates])
  const safeData = useMemo(() => filterSparseArray(data ?? rows.toArray()) as TDatum[],
    [data, rows, version])
  const projection = useMemo(() => createDifferenceProjection<TDatum>(xAccessor, seriesAAccessor, seriesBAccessor),
    [xAccessor, seriesAAccessor, seriesBAccessor, data, updates.epoch])
  const { segmented, areaGroups, points } = useMemo(() => projection.read(safeData), [projection, safeData])
  const getLineRows = useCallback(() => buildOverlayLineRows(points), [points])
  const multiHoverScene = useMemo(() =>
    differenceHoverScene(showLines, getLineRows, seriesAColor, seriesBColor, curve),
    [showLines, getLineRows, seriesAColor, seriesBColor, curve])

  // The mixed scene paints each segment as an area and the two source series as lines.
  const combined = useMemo(() => showLines ? [...segmented, ...getLineRows()] : segmented,
    [segmented, showLines, getLineRows])

  useImperativeHandle(ref, () => {
    const matches = (id: string | string[]) => {
      const ids = toIdSet(id)
      return (row: TDatum) => ids.has(typeof pointIdAccessor === "function"
        ? pointIdAccessor(row) : row[pointIdAccessor as string] as string)
    }
    const pushMany = (batch: Datum[]) => {
      const trimmed = reserveChartRows(rows, batch.length, windowSize)
      const evicted = rows.pushMany(batch as TDatum[])
      updates.changed(Boolean(trimmed.length || evicted.length))
    }
    return {
      push: (row) => pushMany([row]),
      pushMany,
      remove(id) {
        const removed = pointIdAccessor ? rows.remove(matches(id)) : []
        if (removed.length) updates.changed(true)
        return removed
      },
      update(id, updater) {
        const updated: TDatum[] = []
        if (!pointIdAccessor) return updated
        let edited = false
        try {
          rows.update(matches(id), row => {
            edited = true
            const next = updater(row) as TDatum
            updated.push(next)
            return next
          })
          return updated
        } finally {
          if (edited) updates.changed(true)
        }
      },
      clear() {
        rows.clear()
        updates.changed(true)
      },
      getData: () => data == null ? rows.toArray() : safeData,
      getScales: () => frameRef.current?.getScales() ?? null
    }
  }, [rows, data, safeData, pointIdAccessor, windowSize, updates])

  const seriesLegend = useMemo(
    () => buildDifferenceLegend(seriesALabel, seriesAColor, seriesBLabel, seriesBColor),
    [seriesALabel, seriesAColor, seriesBLabel, seriesBColor]
  )

  // ── Setup (margin, selection, hover behavior) ────────────────────────
  // colorBy is set to `__diffWinner` so hover/selection retain a categorical
  // field, while this custom two-series legend remains the exact legend that
  // shared setup measures and hands to StreamXYFrame. `frameProps.legend`
  // still owns the final escape hatch.
  const setup = useChartSetup({
    responsive: props,
    data: safeData,
    rawData: data,
    colorBy: "__diffWinner",
    colorScheme: [seriesAColor, seriesBColor],
    legendInteraction,
    legendPosition: legendPositionProp,
    frameLegend: { legend: showLegend === false ? undefined : seriesLegend, ...frameProps },
    selection,
    linkedHover,
    fallbackFields: ["__diffWinner"],
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
    axisChrome: resolveXYFramePropsAxisChrome(frameProps, {
      showAxes: resolved.showAxes,
      xLabel,
      yLabel
    })
  })
  // Fill segments, source lines and points share winner colors and selection.
  const [selectedAreaStyle, selectedLineStyle, selectedPointStyle] = useMemo(() => {
    const options = { seriesAColor, seriesBColor, areaOpacity, lineWidth, pointRadius, styleRules }
    return buildDifferenceStyles(options).map(style => wrapStyleWithSelection(style, setup.effectiveSelectionHook, setup.resolvedSelection))
  }, [seriesAColor, seriesBColor, areaOpacity, lineWidth, pointRadius, styleRules, setup.effectiveSelectionHook, setup.resolvedSelection])
  const frameStyles = useSelectionAwareXYFrameStyles(frameProps, setup.effectiveSelectionHook, setup.resolvedSelection)

  // ── Tooltip ─────────────────────────────────────────────────────────
  const defaultTooltipContent = useCallback(
    (hover: HoverData) => {
      // Three hover shapes feed this tooltip:
      //   1. Area hover — `hover.data` is a SegmentRow with `__valA` /
      //      `__valB` baked in.
      //   2. Line hover — `hover.data` is a LineRow (no `__valA`/`__valB`);
      //      we look up the source row by x to recover both values.
      //   3. Multi hover provides both series at the selected x, including
      //      curve estimates when the caller opts into interpolation.
      const hd = hover.data as Datum | undefined
      const xVal = (hover.xValue ?? hd?.__x) as number | undefined
      const seriesValue = (group: string, fallback: number | undefined) => {
        const value = hover.allSeries?.find(row => row.group === group)?.value
        return Number.isFinite(value) ? value : fallback
      }
      let aVal = seriesValue("line-A", hd?.__valA)
      let bVal = seriesValue("line-B", hd?.__valB)
      if (xVal != null && (aVal == null || bVal == null)) {
        const point = points.find((sample) => sample.x === xVal)
        aVal ??= point?.a
        bVal ??= point?.b
      }
      const fmt = (v: number | undefined) =>
        Number.isFinite(v) ? String(Math.round(v! * 100) / 100) : "—"
      const fmtX = xVal == null ? "" : (xFormat ?? String)(xVal)
      // Use `defaultTooltipStyle` + the `semiotic-tooltip` className so the
      // tooltip picks up the standard chrome (background, padding, shadow,
      // theme-aware text color) instead of rendering as a transparent
      // floating div. Same pattern `buildDefaultTooltip` and other shared
      // tooltip helpers use — keeps the chart consistent with the rest of
      // the library.
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          {fmtX && (
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{fmtX}</div>
          )}
          {seriesLegend.legendGroups[0].items.map(({ label, color }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, background: color, display: "inline-block", borderRadius: 2 }} />
              <span>{label}: {fmt(i === 0 ? aVal : bVal)}</span>
            </div>
          ))}
          {Number.isFinite(aVal) && Number.isFinite(bVal) && (
              <div style={{ marginTop: 4, opacity: 0.7 }}>
                Δ = {fmt(aVal! - bVal!)}
              </div>
            )}
        </div>
      )
    },
    [
      points,
      xFormat,
      seriesLegend
    ]
  )

  // `tooltip="multi"` / `{ mode: "multi", content? }` opts into hover-anywhere
  // along the x-axis with shared series values — same shape
  // LineChart/AreaChart use. The difference-aware default handles both
  // single-point and multi shapes (it reads `hover.allSeries` when present).
  const tooltipProps = useMemo(
    () =>
      resolveMultiCapableTooltip({
        tooltip,
        defaultTooltipContent,
        multiDefaultContent: defaultTooltipContent
      }),
    [tooltip, defaultTooltipContent]
  )

  // Normalize once (memoized by the raw prop), before the early returns
  // (rules-of-hooks). Default is an opaque-top → faint-bottom fill; the memo
  // keeps a stable identity so a `true`/legacy input can't force a rebuild.
  const normalizedGradientFill = useMemo(
    () =>
      normalizeGradient(gradientFill, {
        stops: [
          { offset: 0, opacity: 0.85 },
          { offset: 1, opacity: 0.15 }
        ]
      }),
    [gradientFill]
  )

  if (setup.earlyReturn) return setup.earlyReturn

  // ── StreamXYFrame props ─────────────────────────────────────────────
  // Use `mixed` chartType: segment-group keys appear in `areaGroups`
  // (each renders as an area polygon with y0Accessor as the lower
  // boundary), and the two `line-*` groups render as continuous lines.
  // All groups share the same x/y scale so geometry aligns perfectly.
  const streamProps: StreamXYFrameProps = {
    ...differenceFrameAccessors,
    data: combined,
    areaGroups,
    curve,
    areaStyle: selectedAreaStyle,
    lineStyle: selectedLineStyle,
    ...(showPoints && { pointStyle: selectedPointStyle }),
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
    ...(normalizedGradientFill && { gradientFill: normalizedGradientFill }),
    ...setup.legendBehaviorProps,
    ...buildBaseMetadataProps({ ...props, ...resolved }),
    ...tooltipProps,
    multiHoverScene,
    ...buildCustomBehaviorProps({ ...props, ...setup }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(xExtent && { xExtent }),
    ...(yExtent && { yExtent }),
    ...setup.crosshairProps,
    ...frameProps,
    ...frameStyles,
  }

  return (
    <StreamXYFrame ref={frameRef} {...streamProps} />
  )
}), "DifferenceChart") as unknown as {
  <TDatum extends Datum = Datum>(
    props: DifferenceChartProps<TDatum> &
      React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

