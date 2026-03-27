"use client"
import * as React from "react"
import { useMemo, useCallback, forwardRef, useRef, useImperativeHandle, useState } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle, MarginalGraphicsConfig } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor, getSize } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, useChartMode, useLegendInteraction, DEFAULT_COLOR } from "../shared/hooks"
import { useStreamingLegend } from "../shared/useStreamingLegend"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedBrush, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useBrushSelection } from "../../store/useSelection"

/**
 * BubbleChart component props
 */
export interface BubbleChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps, AxisConfig {
  /**
   * Array of data points. Each point should have x, y, and size properties.
   * @example
   * ```ts
   * [{x: 1, y: 10, size: 50, category: 'A'}, {x: 2, y: 20, size: 30, category: 'B'}]
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
   * Field name or function to determine bubble size (required)
   * @example
   * ```ts
   * sizeBy="population"
   * sizeBy={d => Math.sqrt(d.value)}
   * ```
   */
  sizeBy: ChartAccessor<TDatum, number>

  /**
   * Min and max radius for bubbles
   * @default [5, 40]
   */
  sizeRange?: [number, number]

  /**
   * Field name or function to determine bubble color
   * @example
   * ```ts
   * colorBy="category"
   * colorBy={d => d.value > 10 ? 'red' : 'blue'}
   * ```
   */
  colorBy?: ChartAccessor<TDatum, string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Bubble opacity
   * @default 0.6
   */
  bubbleOpacity?: number

  /**
   * Bubble stroke width
   * @default 1
   */
  bubbleStrokeWidth?: number

  /**
   * Bubble stroke color
   * @default "white"
   */
  bubbleStrokeColor?: string

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
   * Show legend
   * @default true (when colorBy is specified)
   */
  showLegend?: boolean

  /**
   * Tooltip configuration
   */
  tooltip?: TooltipProp

  /**
   * Marginal distribution plots in axis margins
   */
  marginalGraphics?: MarginalGraphicsConfig

  /** Accessor for unique point IDs, used by point-anchored annotations */
  pointIdAccessor?: ChartAccessor<TDatum, string>

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
 * BubbleChart - Visualize three dimensions of data using x, y, and size
 *
 * A simplified wrapper around StreamXYFrame for creating bubble charts. Perfect for
 * showing relationships between three continuous variables or comparing
 * magnitudes across categories.
 *
 * @example
 * ```tsx
 * // Simple bubble chart
 * <BubbleChart
 *   data={[
 *     {x: 1, y: 10, size: 50, name: 'A'},
 *     {x: 2, y: 20, size: 30, name: 'B'},
 *     {x: 3, y: 15, size: 70, name: 'C'}
 *   ]}
 *   sizeBy="size"
 *   xLabel="Time"
 *   yLabel="Value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With color encoding
 * <BubbleChart
 *   data={data}
 *   sizeBy="population"
 *   colorBy="continent"
 *   sizeRange={[5, 50]}
 *   bubbleOpacity={0.7}
 *   xLabel="GDP per Capita"
 *   yLabel="Life Expectancy"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Advanced: Override StreamXYFrame props
 * <BubbleChart
 *   data={data}
 *   sizeBy="value"
 *   frameProps={{
 *     customPointMark: ({ d }) => <circle r={d.r} fill="gold" />
 *   }}
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link StreamXYFrame} with sensible defaults for bubble charts.
 * For more advanced features like custom marks, annotations, or complex interactions,
 * use StreamXYFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any StreamXYFrame prop
 * - See StreamXYFrame documentation: https://semiotic.nteract.io/guides/xy-frame
 * - All StreamXYFrame props are available via `frameProps`
 *
 * @param props - BubbleChart configuration
 * @returns Rendered bubble chart
 */
export const BubbleChart = forwardRef(function BubbleChart<TDatum extends Record<string, any> = Record<string, any>>(props: BubbleChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    sizeBy,
    sizeRange = [5, 40],
    colorBy,
    colorScheme = "category10",
    bubbleOpacity = 0.6,
    bubbleStrokeWidth = 1,
    bubbleStrokeColor = "white",
    tooltip,
    marginalGraphics,
    pointIdAccessor,
    annotations,
    frameProps = {},
    selection,
    linkedHover,
    linkedBrush,
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
  const accessibleTable = resolved.accessibleTable
  const xLabel = resolved.xLabel
  const yLabel = resolved.yLabel

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(loading, width, height)
  const emptyEl = !loadingEl ? renderEmptyState(data, width, height, emptyContent) : null

  const safeData = data || []
  const isPushMode = data === undefined

  // ── Streaming size domain — track min/max from pushed data ───────────
  const streamingSizeDomainRef = useRef<[number, number] | null>(null)
  const [sizeDomainVersion, setSizeDomainVersion] = useState(0)

  const updateSizeDomain = useCallback((items: Record<string, any>[]) => {
    if (!isPushMode) return
    let changed = false
    for (const d of items) {
      const val = typeof sizeBy === "function" ? sizeBy(d) : d[sizeBy as string]
      if (val == null || !isFinite(val)) continue
      if (!streamingSizeDomainRef.current) {
        streamingSizeDomainRef.current = [val, val]
        changed = true
      } else {
        if (val < streamingSizeDomainRef.current[0]) { streamingSizeDomainRef.current[0] = val; changed = true }
        if (val > streamingSizeDomainRef.current[1]) { streamingSizeDomainRef.current[1] = val; changed = true }
      }
    }
    if (changed) setSizeDomainVersion(v => v + 1)
  }, [isPushMode, sizeBy])

  const streaming = useStreamingLegend({
    isPushMode,
    colorBy,
    colorScheme,
    showLegend,
    legendPosition: legendPositionProp,
  })

  const wrappedPush = useCallback(
    streaming.wrapPush((d: any) => {
      updateSizeDomain([d])
      frameRef.current?.push(d)
    }),
    [streaming.wrapPush, updateSizeDomain]
  )
  const wrappedPushMany = useCallback(
    streaming.wrapPushMany((d: any[]) => {
      updateSizeDomain(d)
      frameRef.current?.pushMany(d)
    }),
    [streaming.wrapPushMany, updateSizeDomain]
  )

  useImperativeHandle(ref, () => ({
    push: wrappedPush,
    pushMany: wrappedPushMany,
    clear: () => {
      streaming.resetCategories()
      streamingSizeDomainRef.current = null
      setSizeDomainVersion(v => v + 1)
      frameRef.current?.clear()
    },
    getData: () => frameRef.current?.getData() ?? []
  }), [wrappedPush, wrappedPushMany, streaming.resetCategories])

  // ── Selection hooks (always called, conditional logic inside) ──────────

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    onObservation, chartType: "BubbleChart", chartId
  })

  const brushConfig = normalizeLinkedBrush(linkedBrush)

  const brushHook = useBrushSelection({
    name: brushConfig?.name || "__unused_brush__",
    xField: brushConfig?.xField || (typeof xAccessor === "string" ? xAccessor : undefined),
    yField: brushConfig?.yField || (typeof yAccessor === "string" ? yAccessor : undefined)
  })

  // ── Core chart logic ───────────────────────────────────────────────────

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

  // Calculate size domain (bounded mode from data, push mode from tracked range)
  const sizeDomain = useMemo(() => {
    if (isPushMode) {
      void sizeDomainVersion // trigger recompute when streaming domain changes
      return streamingSizeDomainRef.current || [0, 1] as [number, number]
    }
    const sizes = safeData.map((d) => {
      if (typeof sizeBy === "function") {
        return sizeBy(d)
      }
      return d[sizeBy]
    })

    return [Math.min(...sizes), Math.max(...sizes)] as [number, number]
  }, [safeData, sizeBy, isPushMode, sizeDomainVersion])

  // Point style function
  const basePointStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        fillOpacity: bubbleOpacity,
        strokeWidth: bubbleStrokeWidth,
        stroke: bubbleStrokeColor
      }

      // Apply color — skip fill when colorScale unavailable (push API)
      // so the frame's own color map can fill in
      if (colorBy) {
        if (colorScale) baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }

      // Apply size
      baseStyle.r = getSize(d, sizeBy, sizeRange, sizeDomain)

      return baseStyle
    }
  }, [colorBy, colorScale, sizeBy, sizeRange, sizeDomain, bubbleOpacity, bubbleStrokeWidth, bubbleStrokeColor])

  const pointStyle = useMemo(
    () => wrapStyleWithSelection(basePointStyle, effectiveSelectionHook, selection),
    [basePointStyle, effectiveSelectionHook, selection]
  )

  // Legend + margin
  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: safeData,
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
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x" },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y" },
    { label: accessorName(sizeBy), accessor: sizeBy, role: "size" },
    ...(colorBy ? [{ label: accessorName(colorBy), accessor: colorBy, role: "color" as const }] : []),
  ]), [xAccessor, yAccessor, xLabel, yLabel, sizeBy, colorBy])

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "BubbleChart",
    data: data,
    accessors: {
      xAccessor,
      yAccessor,
    },
    requiredProps: { sizeBy },
  })
  if (error) return <ChartError componentName="BubbleChart" message={error} width={width} height={height} />

  // Build StreamXYFrame props
  const streamProps: StreamXYFrameProps = {
    chartType: "bubble",
    ...(data != null && { data: safeData }),
    xAccessor,
    yAccessor,
    colorAccessor: colorBy || undefined,
    sizeAccessor: sizeBy,
    sizeRange,
    pointStyle,
    colorScheme,
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
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(marginalGraphics && { marginalGraphics }),
    ...(pointIdAccessor && { pointIdAccessor }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps
  }

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl

  return <SafeRender componentName="BubbleChart" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: BubbleChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
BubbleChart.displayName = "BubbleChart"
