"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartMode } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { MultiPointTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { useChartSetup } from "../shared/useChartSetup"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import { useAreaSeriesSetup } from "../shared/useAreaSeriesSetup"

/**
 * StackedAreaChart component props
 */
export interface StackedAreaChartProps<TDatum extends Datum = Datum> extends BaseChartProps, AxisConfig {
  /**
   * Array of data points, grouped by category.
   * @example
   * ```ts
   * [{x: 1, y: 10, category: 'A'}, {x: 2, y: 20, category: 'A'}, {x: 1, y: 15, category: 'B'}]
   * ```
   */
  data?: TDatum[]

  /**
   * Field name or function to access x values
   * @default "x"
   */
  xAccessor?: ChartAccessor<TDatum, number>

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
  colorScheme?: string | string[]

  /**
   * Curve interpolation type
   * @default "monotoneX"
   */
  curve?: "linear" | "monotoneX" | "monotoneY" | "step" | "stepAfter" | "stepBefore" | "basis" | "cardinal" | "catmullRom"

  /**
   * Area opacity
   * @default 0.7
   */
  areaOpacity?: number

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
   * Show data points on the area lines.
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
   * Normalize to 100% stacked (proportional)
   * @default false
   */
  normalize?: boolean

  /**
   * Stacked baseline mode — controls where the stack origin sits.
   * - `"zero"` (default): standard stacked area, baseline at y=0.
   * - `"wiggle"`: streamgraph offset (Byron–Wattenberg). Minimizes visual
   *   wiggle across series — best for high-cardinality series where
   *   relative shape matters more than absolute values.
   * - `"silhouette"`: center the stack symmetrically around y=0.
   *
   * Mutually exclusive with `normalize` — when `normalize` is true,
   * baseline is forced to `"zero"`.
   *
   * @default "zero"
   */
  baseline?: "zero" | "wiggle" | "silhouette"

  /**
   * Stack order — controls which series sits at the top, middle, or
   * bottom of the stack. Pair with `baseline: "wiggle"` or
   * `"silhouette"` for the canonical streamgraph look:
   *
   * - `"key"` (default): alphabetical by series key. Stable under
   *   streaming (no re-shuffling on data eviction).
   * - `"insideOut"`: largest-total series in the middle, smaller series
   *   wrapping outward. The classic d3 streamgraph aesthetic — gives
   *   you a "central anchor" layer with everything else built off of it.
   * - `"asc"` / `"desc"`: by total ascending / descending.
   */
  stackOrder?: "key" | "insideOut" | "asc" | "desc"

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
   * Tooltip configuration.
   *
   * Pass `"multi"` to enable hover-anywhere mode: hovering at any x along the
   * chart surfaces a single tooltip listing every stacked series at that x,
   * with values interpolated between rendered path samples. Stacked series
   * report band height rather than the cumulative stack top. Without `"multi"`,
   * the tooltip only appears within `hoverRadius` of an explicit data point.
   */
  tooltip?: TooltipProp

  /**
   * Annotation objects to render on the chart
   */
  annotations?: Datum[]

  /**
   * Fixed x domain `[min, max]`. Either bound may be `undefined` to leave
   * that side data-derived.
   */
  xExtent?: [number | undefined, number | undefined] | [number]

  /**
   * Fixed y domain `[min, max]`. Either bound may be `undefined` to leave
   * that side data-derived. Stacked areas auto-extend the y domain to
   * cover the cumulative sum unless `yExtent` is fully specified —
   * passing `yExtent={[0, 200]}` pins both bounds.
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
 * StackedAreaChart - Visualize quantities stacked on top of each other over continuous intervals
 *
 * Each series is stacked so that the total height represents the sum of all series.
 * Use `normalize` for 100% stacked (proportional) areas.
 *
 * For overlapping (non-stacked) areas use {@link AreaChart}.
 *
 * @example
 * ```tsx
 * // Stacked series — each category contributes a band of height
 * <StackedAreaChart
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
 * // 100% normalized stack — y axis becomes share of total
 * <StackedAreaChart
 *   data={data}
 *   xAccessor="t"
 *   yAccessor="value"
 *   areaBy="category"
 *   colorBy="category"
 *   normalize
 *   yFormat={(v) => `${(v * 100).toFixed(0)}%`}
 * />
 * ```
 */
export const StackedAreaChart = forwardRef(function StackedAreaChart<TDatum extends Datum = Datum>(props: StackedAreaChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    xFormat,
    yFormat,
    xAccessor = "x",
    yAccessor = "y",
    areaBy,
    lineDataAccessor = "coordinates",
    colorBy,
    colorScheme,
    curve = "monotoneX",
    areaOpacity = 0.7,
    showLine = true,
    lineWidth = 2,
    showPoints = false,
    pointRadius = 3,
    normalize = false,
    baseline = "zero",
    stackOrder,
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
  const actualColorBy = colorBy || areaBy

  useFrameImperativeHandle(ref, { variant: "xy", frameRef })

  // ── Shared setup (color, legend, selection, loading/empty) ────────────
  const setup = useChartSetup({
    data: safeData,
    rawData: data,
    colorBy: actualColorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: actualColorBy ? [typeof actualColorBy === "string" ? actualColorBy : ""] : [],
    unwrapData: false,
    onObservation,
    onClick,
    hoverHighlight,
    chartType: "StackedAreaChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    emptyContent,
    width,
    height,
  })

  // ── Area-series construction (data shaping, line/point style, tooltip) ─
  // `actualColorBy` (= `colorBy ?? areaBy`) feeds the helper's color
  // resolution since stacked areas without explicit colorBy still want
  // distinct per-series colors. `groupField` keeps the prior tooltip
  // label preference (`areaBy ?? colorBy`).
  const { flattenedData, lineStyle, pointStyle, defaultTooltipContent } = useAreaSeriesSetup({
    safeData, data,
    areaBy, lineDataAccessor,
    colorBy: actualColorBy, colorScale: setup.colorScale,
    color, stroke, strokeWidth, opacity,
    effectiveSelectionHook: setup.effectiveSelectionHook,
    resolvedSelection: setup.resolvedSelection,
    areaOpacity, showLine, lineWidth, showPoints, pointRadius,
    xAccessor, yAccessor, xLabel, yLabel, xFormat, yFormat,
    groupField: areaBy || colorBy,
  })

  // Validate data (after all hooks)
  const validationError = validateArrayData({
    componentName: "StackedAreaChart",
    data: data,
    accessors: {
      xAccessor,
      yAccessor,
    },
  })

  // Build StreamXYFrame props
  const streamProps: StreamXYFrameProps = {
    chartType: "stackedarea",
    ...(data != null && { data: flattenedData }),
    xAccessor,
    yAccessor,
    groupAccessor: areaBy || undefined,
    curve,
    normalize,
    baseline: normalize ? "zero" : baseline,
    stackOrder,
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
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate }),
    ...(tooltip === "multi"
      ? { tooltipContent: MultiPointTooltip(), tooltipMode: "multi" as const }
      : buildTooltipProps({ tooltip, defaultTooltipContent })),
    ...buildCustomBehaviorProps({
      linkedHover, onObservation, onClick, hoverHighlight,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(xExtent && { xExtent }),
    ...(yExtent && { yExtent }),
    ...setup.crosshairProps,
    ...frameProps
  }

  if (setup.earlyReturn) return setup.earlyReturn
  if (validationError) return <ChartError componentName="StackedAreaChart" message={validationError} width={width} height={height} />

  return <SafeRender componentName="StackedAreaChart" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: StackedAreaChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
StackedAreaChart.displayName = "StackedAreaChart"
