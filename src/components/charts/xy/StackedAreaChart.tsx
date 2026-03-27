"use client"
import * as React from "react"
import { useMemo, useCallback, forwardRef, useRef, useImperativeHandle } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, useChartMode, useLegendInteraction, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import { useStreamingLegend } from "../shared/useStreamingLegend"

/**
 * StackedAreaChart component props
 */
export interface StackedAreaChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps, AxisConfig {
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
   * Normalize to 100% stacked (proportional)
   * @default false
   */
  normalize?: boolean

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
   * Tooltip configuration
   */
  tooltip?: TooltipProp

  /**
   * Annotation objects to render on the chart
   */
  annotations?: Record<string, any>[]

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
 */
export const StackedAreaChart = forwardRef(function StackedAreaChart<TDatum extends Record<string, any> = Record<string, any>>(props: StackedAreaChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    colorScheme = "category10",
    curve = "monotoneX",
    areaOpacity = 0.7,
    showLine = true,
    lineWidth = 2,
    normalize = false,
    tooltip,
    annotations,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    chartId,
    loading,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showGrid = resolved.showGrid
  const showLegend = resolved.showLegend
  const title = resolved.title
  const description = resolved.description
  const summary = resolved.summary
  const xLabel = resolved.xLabel
  const yLabel = resolved.yLabel

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(loading, width, height)
  const emptyEl = !loadingEl ? renderEmptyState(data, width, height, emptyContent) : null

  const safeData = data || []
  const actualColorBy = colorBy || areaBy
  const isPushMode = data === undefined

  const streaming = useStreamingLegend({
    isPushMode,
    colorBy: actualColorBy,
    colorScheme,
    showLegend,
    legendPosition: legendPositionProp,
  })

  const wrappedPush = useCallback(
    streaming.wrapPush((d: any) => frameRef.current?.push(d)),
    [streaming.wrapPush]
  )
  const wrappedPushMany = useCallback(
    streaming.wrapPushMany((d: any[]) => frameRef.current?.pushMany(d)),
    [streaming.wrapPushMany]
  )

  useImperativeHandle(ref, () => ({
    push: wrappedPush,
    pushMany: wrappedPushMany,
    clear: () => {
      streaming.resetCategories()
      frameRef.current?.clear()
    },
    getData: () => frameRef.current?.getData() ?? []
  }), [wrappedPush, wrappedPushMany, streaming.resetCategories])

  // ── Selection hooks (always called, conditional logic inside) ──────────

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    onObservation, chartType: "StackedAreaChart", chartId
  })

  // ── Core chart logic ───────────────────────────────────────────────────

  // Check if data is in area objects format (has lineDataAccessor field)
  const isAreaObjectFormat = safeData[0]?.[lineDataAccessor] !== undefined

  // Transform data to line/area format if needed
  const areaData = useMemo(() => {
    if (isAreaObjectFormat) {
      // Data is already in area objects format
      return safeData
    }

    if (areaBy) {
      // Group data by areaBy field
      const grouped = safeData.reduce((acc, d) => {
        const key = typeof areaBy === "function" ? areaBy(d) : d[areaBy]
        if (!acc[key]) {
          const areaObj: Record<string, any> = { [lineDataAccessor]: [] }
          // Add the grouping field
          if (typeof areaBy === "string") {
            areaObj[areaBy] = key
          }
          acc[key] = areaObj
        }
        acc[key][lineDataAccessor].push(d)
        return acc
      }, {} as Record<string, Record<string, any>>)

      return Object.values(grouped)
    }

    // Single area - wrap in area object
    return [{ [lineDataAccessor]: safeData }]
  }, [safeData, areaBy, lineDataAccessor, isAreaObjectFormat])

  // Create color scale if colorBy is specified
  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  // Legend interaction
  const allCategories = useMemo(() => {
    if (!colorBy) return []
    const vals = new Set<string>()
    for (const d of safeData as Record<string, any>[]) {
      const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [safeData, colorBy])

  const legendState = useLegendInteraction(legendInteraction, colorBy, allCategories)

  // Merge legend selection with cross-chart selection
  const effectiveSelectionHook = useMemo(() => {
    if (legendState.legendSelectionHook) return legendState.legendSelectionHook
    return activeSelectionHook
  }, [legendState.legendSelectionHook, activeSelectionHook])

  // Area/line style function
  const baseLineStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {}

      // Apply color — skip when colorScale unavailable (push API)
      // so the frame's own color resolution can fill in
      if (colorBy && colorScale) {
        const color = getColor(d, colorBy, colorScale)
        baseStyle.fill = color
        if (showLine) {
          baseStyle.stroke = color
          baseStyle.strokeWidth = lineWidth
        } else {
          baseStyle.stroke = "none"
        }
      } else if (!colorBy) {
        baseStyle.fill = DEFAULT_COLOR
        baseStyle.stroke = showLine ? DEFAULT_COLOR : "none"
        if (showLine) baseStyle.strokeWidth = lineWidth
      }
      baseStyle.fillOpacity = areaOpacity

      return baseStyle
    }
  }, [colorBy, colorScale, areaOpacity, showLine, lineWidth])

  const lineStyle = useMemo(
    () => wrapStyleWithSelection(baseLineStyle, effectiveSelectionHook, selection),
    [baseLineStyle, effectiveSelectionHook, selection]
  )

  // Legend + margin
  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: areaData,
    colorBy,
    colorScale,
    showLegend,
    legendPosition: legendPositionProp,
    userMargin,
    defaults: resolved.marginDefaults,
  })

  // Merge streaming legend when in push API mode
  const effectiveLegend = streaming.streamingLegend || legend
  const effectiveLegendPosition = legendPositionProp || legendPosition

  // Adjust margin for streaming legend
  const effectiveMargin = useMemo(() => {
    if (streaming.streamingMarginAdjust) {
      const m = { ...margin }
      for (const [key, val] of Object.entries(streaming.streamingMarginAdjust)) {
        const k = key as keyof typeof m
        if (m[k] < val) m[k] = val
      }
      return m
    }
    return margin
  }, [margin, streaming.streamingMarginAdjust])

  // Default tooltip showing all configured fields
  const groupField = areaBy || colorBy
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x" },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y" },
    ...(groupField ? [{ label: accessorName(groupField), accessor: groupField, role: "group" as const }] : []),
  ]), [xAccessor, yAccessor, xLabel, yLabel, groupField])

  // Validate data (after all hooks)
  const validationError = validateArrayData({
    componentName: "StackedAreaChart",
    data: data,
    accessors: {
      xAccessor,
      yAccessor,
    },
  })

  // Flatten area data into a single array for StreamXYFrame
  const flattenedData = useMemo(() => {
    if (isAreaObjectFormat || areaBy) {
      return areaData.flatMap((area: Record<string, any>) => {
        const coords = area[lineDataAccessor] || []
        if (areaBy && typeof areaBy === "string") {
          return coords.map((c: Record<string, any>) => ({ ...c, [areaBy]: area[areaBy] }))
        }
        return coords
      })
    }
    return safeData
  }, [areaData, lineDataAccessor, isAreaObjectFormat, areaBy, safeData])

  // Build StreamXYFrame props
  const streamProps: StreamXYFrameProps = {
    chartType: "stackedarea",
    ...(data != null && { data: flattenedData }),
    xAccessor,
    yAccessor,
    groupAccessor: areaBy || undefined,
    curve,
    normalize,
    lineStyle,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: effectiveMargin,
    showAxes: resolved.showAxes,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    showGrid,
    ...(effectiveLegend && { legend: effectiveLegend, legendPosition: effectiveLegendPosition }),
    ...(legendInteraction && legendInteraction !== "none" && {
      legendHoverBehavior: legendState.onLegendHover,
      legendClickBehavior: legendState.onLegendClick,
      legendHighlightedCategory: legendState.highlightedCategory,
      legendIsolatedCategories: legendState.isolatedCategories,
    }),
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    ...(className && { className }),
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps
  }

  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl
  if (validationError) return <ChartError componentName="StackedAreaChart" message={validationError} width={width} height={height} />

  return <SafeRender componentName="StackedAreaChart" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: StackedAreaChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
StackedAreaChart.displayName = "StackedAreaChart"
