"use client"
import * as React from "react"
import { useMemo, forwardRef, useRef, useImperativeHandle } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle, CurveType } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useChartMode } from "../shared/hooks"
import { useThemeCategorical } from "../shared/hooks"
import { COLOR_SCHEMES, DEFAULT_COLORS } from "../shared/colorUtils"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { useChartSetup } from "../shared/useChartSetup"
import { wrapStyleWithSelection } from "../shared/selectionUtils"

// ── Internal field names ────────────────────────────────────────────────
const UNITIZED_FIELD = "__ma_unitized"
const SERIES_FIELD = "__ma_series"

/**
 * Configuration for a single series in a MultiAxisLineChart.
 */
export interface MultiAxisSeriesConfig<TDatum = Record<string, any>> {
  /** Field name or function to access y values for this series */
  yAccessor: ChartAccessor<TDatum, number>
  /** Axis label for this series */
  label?: string
  /** Override color for this series (defaults to theme palette) */
  color?: string
  /** Tick format function for this series' axis */
  format?: (d: number) => string
  /** Fixed extent [min, max] for this series. Required for push API streaming.
   *  If omitted, computed from data. */
  extent?: [number, number]
}

/**
 * MultiAxisLineChart component props
 */
export interface MultiAxisLineChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps, AxisConfig {
  /** Array of data points shared by both series */
  data?: TDatum[]
  /** Field name or function to access x values @default "x" */
  xAccessor?: ChartAccessor<TDatum, number>
  /** Series configuration — exactly 2 for dual-axis mode.
   *  If not exactly 2, renders as a normal line chart with a console warning. */
  series: MultiAxisSeriesConfig<TDatum>[]
  /** Color scheme or custom colors array @default "category10" */
  colorScheme?: string | string[]
  /** Enable hover annotations @default true */
  enableHover?: boolean
  /** Curve interpolation @default "monotoneX" */
  curve?: CurveType
  /** Line width in pixels @default 2 */
  lineWidth?: number
  /** Show legend @default true */
  showLegend?: boolean
  /** Show grid lines @default false */
  showGrid?: boolean
  /** Tooltip configuration */
  tooltip?: TooltipProp
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /** Legend position */
  legendPosition?: LegendPosition
  /** Annotations */
  annotations?: Record<string, any>[]
  /** Additional StreamXYFrame props */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}

// ── Helpers ──────────────────────────────────────────────────────────────

function computeExtent(
  data: Record<string, any>[],
  accessor: ChartAccessor<any, number>
): [number, number] {
  let min = Infinity
  let max = -Infinity
  const fn = typeof accessor === "function" ? accessor : (d: any) => d[accessor]
  for (const d of data) {
    const v = fn(d)
    if (v != null && isFinite(v)) {
      if (v < min) min = v
      if (v > max) max = v
    }
  }
  if (!isFinite(min) || !isFinite(max)) return [0, 1]
  if (min === max) {
    // Constant series — pad ±10% or ±1 if zero
    const pad = min === 0 ? 1 : Math.abs(min) * 0.1
    return [min - pad, max + pad]
  }
  return [min, max]
}

function unitize(value: number, extent: [number, number]): number {
  const range = extent[1] - extent[0]
  if (range === 0) return 0.5
  return (value - extent[0]) / range
}

function invertUnitized(unitized: number, extent: [number, number]): number {
  return extent[0] + unitized * (extent[1] - extent[0])
}

/**
 * MultiAxisLineChart — Dual Y-axis line chart for comparing two series
 * with different scales on the same time/x axis.
 *
 * Data is unitized (normalized to [0,1]) internally so both series share
 * a common visual scale. The left axis shows series[0] values and the
 * right axis shows series[1] values in their original units.
 *
 * If `series` does not contain exactly 2 entries, renders as a standard
 * multi-line chart with a dev-mode console warning.
 */
export const MultiAxisLineChart = forwardRef(function MultiAxisLineChart<TDatum extends Record<string, any> = Record<string, any>>(
  props: MultiAxisLineChartProps<TDatum>,
  ref: React.Ref<RealtimeFrameHandle>
) {
  const frameRef = useRef<StreamXYFrameHandle>(null)
  const extentsRef = useRef<[number, number][]>([])

  useImperativeHandle(ref, () => ({
    push: (point) => {
      if (!frameRef.current) return
      const raw = point as Record<string, any>
      // Transform point into unitized series points
      for (let i = 0; i < props.series.length && i < 2; i++) {
        const s = props.series[i]
        const extent = s.extent || extentsRef.current[i]
        if (!extent) continue
        const fn = typeof s.yAccessor === "function" ? s.yAccessor : (d: any) => d[s.yAccessor as string]
        const val = fn(raw)
        if (val == null || !isFinite(val)) continue
        frameRef.current.push({
          ...raw,
          [UNITIZED_FIELD]: unitize(val, extent),
          [SERIES_FIELD]: s.label || `Series ${i + 1}`
        })
      }
    },
    pushMany: (points) => {
      if (!frameRef.current) return
      const transformed: Record<string, any>[] = []
      for (const raw of points as Record<string, any>[]) {
        for (let i = 0; i < props.series.length && i < 2; i++) {
          const s = props.series[i]
          const extent = s.extent || extentsRef.current[i]
          if (!extent) continue
          const fn = typeof s.yAccessor === "function" ? s.yAccessor : (d: any) => d[s.yAccessor as string]
          const val = fn(raw)
          if (val == null || !isFinite(val)) continue
          transformed.push({
            ...raw,
            [UNITIZED_FIELD]: unitize(val, extent),
            [SERIES_FIELD]: s.label || `Series ${i + 1}`
          })
        }
      }
      frameRef.current.pushMany(transformed)
    },
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getData() ?? []
  }))

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    xLabel: props.xLabel,
    accessibleTable: props.accessibleTable,
  }, { width: 800, height: 400 })

  const {
    data,
    margin: userMargin,
    className,
    xFormat,
    xAccessor = "x",
    series,
    colorScheme,
    curve = "monotoneX",
    lineWidth = 2,
    tooltip,
    annotations,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    onClick,
    chartId,
    loading,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showGrid = resolved.showGrid
  const showLegend = resolved.showLegend ?? true
  const title = resolved.title
  const description = resolved.description
  const summary = resolved.summary
  const accessibleTable = resolved.accessibleTable
  const xLabel = resolved.xLabel

  const isDualAxis = series.length === 2

  // Warn in dev mode if not exactly 2 series
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production" && !isDualAxis) {
    // eslint-disable-next-line no-console
    console.warn(
      `[MultiAxisLineChart] Expected exactly 2 series for dual-axis mode, got ${series.length}. ` +
      `Rendering as a standard multi-line chart.`
    )
  }

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(loading, width, height)
  const emptyEl = !loadingEl ? renderEmptyState(data, width, height, emptyContent) : null

  const safeData = data || []

  // ── Resolve colors from theme ─────────────────────────────────────────
  const themeCategorical = useThemeCategorical()

  const seriesColors = useMemo(() => {
    // Resolve the effective palette
    let palette: string[]
    if (Array.isArray(colorScheme)) {
      palette = colorScheme
    } else if (themeCategorical && themeCategorical.length > 0) {
      palette = themeCategorical
    } else {
      const resolved = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES]
      palette = Array.isArray(resolved) ? resolved as string[] : DEFAULT_COLORS as unknown as string[]
    }

    return series.map((s, i) => s.color || palette[i % palette.length])
  }, [series, colorScheme, themeCategorical])

  // ── Series labels ─────────────────────────────────────────────────────
  const seriesLabels = useMemo(
    () => series.map((s, i) => s.label || `Series ${i + 1}`),
    [series]
  )

  // ── Compute extents and unitized data ─────────────────────────────────
  const { unitizedData, extents } = useMemo(() => {
    if (safeData.length === 0) {
      // Push mode: no data yet, but series[].extent provides axis ranges
      const exts = series.map(s => s.extent || null).filter(Boolean) as [number, number][]
      if (exts.length === series.length) extentsRef.current = exts
      return { unitizedData: [], extents: exts.length === series.length ? exts : [] }
    }

    const exts = series.map((s) =>
      s.extent || computeExtent(safeData, s.yAccessor)
    )
    extentsRef.current = exts

    if (!isDualAxis) {
      // Fallback: no unitization, just group by series
      const result: Record<string, any>[] = []
      for (const d of safeData) {
        for (let i = 0; i < series.length; i++) {
          const s = series[i]
          const fn = typeof s.yAccessor === "function" ? s.yAccessor : (dd: any) => dd[s.yAccessor as string]
          const val = fn(d)
          if (val == null) continue
          result.push({
            ...d,
            [UNITIZED_FIELD]: val,
            [SERIES_FIELD]: seriesLabels[i]
          })
        }
      }
      return { unitizedData: result, extents: exts }
    }

    const result: Record<string, any>[] = []
    for (const d of safeData) {
      for (let i = 0; i < 2; i++) {
        const s = series[i]
        const fn = typeof s.yAccessor === "function" ? s.yAccessor : (dd: any) => dd[s.yAccessor as string]
        const val = fn(d)
        if (val == null) continue
        result.push({
          ...d,
          [UNITIZED_FIELD]: unitize(val, exts[i]),
          [SERIES_FIELD]: seriesLabels[i]
        })
      }
    }
    return { unitizedData: result, extents: exts }
  }, [safeData, series, isDualAxis, seriesLabels])

  // ── Axes config ───────────────────────────────────────────────────────
  const axesConfig = useMemo(() => {
    if (!isDualAxis || extents.length < 2) return undefined

    const leftFmt = series[0].format || ((v: number) => {
      const orig = invertUnitized(v, extents[0])
      return Number.isInteger(orig) ? String(orig) : orig.toFixed(1)
    })
    const rightFmt = series[1].format || ((v: number) => {
      const orig = invertUnitized(v, extents[1])
      return Number.isInteger(orig) ? String(orig) : orig.toFixed(1)
    })

    return [
      { orient: "left" as const, label: seriesLabels[0], tickFormat: leftFmt },
      { orient: "right" as const, label: seriesLabels[1], tickFormat: rightFmt },
      { orient: "bottom" as const }
    ]
  }, [isDualAxis, extents, series, seriesLabels])

  // ── In push mode, synthesize minimal data so the legend can resolve categories
  const legendData = useMemo(() => {
    if (unitizedData.length > 0) return unitizedData
    // Push mode: no data yet, but we know the series labels from props
    return seriesLabels.map(label => ({ [SERIES_FIELD]: label }))
  }, [unitizedData, seriesLabels])

  // ── Chart setup (legend, selection, margin) ───────────────────────────
  const setup = useChartSetup({
    data: legendData,
    rawData: data,
    colorBy: SERIES_FIELD,
    colorScheme: seriesColors,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: [SERIES_FIELD],
    unwrapData: false,
    onObservation,
    onClick,
    chartType: "MultiAxisLineChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: isDualAxis
      ? { ...resolved.marginDefaults, left: 70, right: 70 }
      : resolved.marginDefaults,
    loading,
    emptyContent,
    width,
    height,
  })

  if (setup.earlyReturn) return setup.earlyReturn

  // ── Line style ────────────────────────────────────────────────────────
  const baseLineStyle = useMemo(() => {
    const colorMap = new Map<string, string>()
    seriesLabels.forEach((label, i) => colorMap.set(label, seriesColors[i]))

    return (d: Record<string, any>) => {
      const seriesName = d[SERIES_FIELD]
      return {
        stroke: colorMap.get(seriesName) || seriesColors[0],
        strokeWidth: lineWidth,
        fill: "none"
      }
    }
  }, [seriesLabels, seriesColors, lineWidth])

  const lineStyle = useMemo(
    () => wrapStyleWithSelection(baseLineStyle, setup.effectiveSelectionHook, selection),
    [baseLineStyle, setup.effectiveSelectionHook, selection]
  )

  // ── Tooltip ───────────────────────────────────────────────────────────
  const tooltipFn = useMemo(() => {
    if (tooltip === false) return () => null
    const userTooltip = normalizeTooltip(tooltip)
    if (userTooltip) return userTooltip

    // Default: show series name, x value, and original y value
    return (d: Record<string, any>) => {
      const datum = d.data || d
      const seriesName = datum[SERIES_FIELD]
      const seriesIdx = seriesLabels.indexOf(seriesName)
      const unitizedVal = datum[UNITIZED_FIELD]
      const originalVal = isDualAxis && seriesIdx >= 0 && extents[seriesIdx]
        ? invertUnitized(unitizedVal, extents[seriesIdx])
        : unitizedVal
      const fmt = seriesIdx >= 0 && series[seriesIdx]?.format
        ? series[seriesIdx].format!
        : (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))

      const xVal = typeof xAccessor === "function" ? xAccessor(datum) : datum[xAccessor]

      return React.createElement("div", {
        style: {
          padding: "6px 10px",
          fontFamily: "var(--semiotic-font-family, sans-serif)",
          fontSize: "var(--semiotic-tooltip-font-size, 13px)",
        }
      },
        React.createElement("div", {
          style: { fontWeight: 600, marginBottom: 4, color: seriesColors[seriesIdx] || "inherit" }
        }, seriesName),
        React.createElement("div", null, `${typeof xAccessor === "string" ? xAccessor : "x"}: ${xVal}`),
        React.createElement("div", null, `${seriesName}: ${fmt(originalVal)}`)
      )
    }
  }, [tooltip, seriesLabels, seriesColors, extents, isDualAxis, series, xAccessor])

  // ── Validation ────────────────────────────────────────────────────────
  const validationError = validateArrayData({
    componentName: "MultiAxisLineChart",
    data: data,
    accessors: { xAccessor },
  })

  // ── Y extent for unitized data ────────────────────────────────────────
  // Force [0, 1] when dual-axis to keep unitization stable
  const yExtent = isDualAxis ? [0, 1] as [number, number] : undefined

  // ── Build StreamXYFrame props ─────────────────────────────────────────
  const streamProps: StreamXYFrameProps = {
    chartType: "line",
    ...(data != null && { data: unitizedData }),
    xAccessor,
    yAccessor: UNITIZED_FIELD,
    groupAccessor: SERIES_FIELD,
    lineStyle,
    colorScheme: seriesColors,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: setup.margin,
    showAxes: resolved.showAxes,
    ...(axesConfig && { axes: axesConfig }),
    xLabel,
    // Left/right labels come from axes config, suppress yLabel/yLabelRight when using axes
    ...(isDualAxis ? {} : { yLabel: seriesLabels[0] }),
    xFormat,
    ...(isDualAxis && yExtent && { yExtent }),
    enableHover,
    showGrid,
    curve,
    ...setup.legendBehaviorProps,
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    tooltipContent: tooltipFn,
    ...(annotations && { annotations }),
    ...((linkedHover || onObservation || onClick) && { customHoverBehavior: setup.customHoverBehavior }),
    ...((onObservation || onClick) && { customClickBehavior: setup.customClickBehavior }),
    ...frameProps
  }

  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl
  if (validationError) return <ChartError componentName="MultiAxisLineChart" message={validationError} width={width} height={height} />

  return (
    <SafeRender componentName="MultiAxisLineChart" width={width} height={height}>
      <StreamXYFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(
    props: MultiAxisLineChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}
MultiAxisLineChart.displayName = "MultiAxisLineChart"
