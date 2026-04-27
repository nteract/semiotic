"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import * as React from "react"
import { useMemo, useCallback, forwardRef, useRef, useImperativeHandle, useState } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle, MarginalGraphicsConfig } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor, getSize } from "../shared/colorUtils"
import { useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedBrush, wrapStyleWithSelection } from "../shared/selectionUtils"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import { useBrushSelection } from "../../store/useSelection"
import { useChartSetup } from "../shared/useChartSetup"

/**
 * BubbleChart component props
 */
export interface BubbleChartProps<TDatum extends Datum = Datum> extends BaseChartProps, AxisConfig {
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
  annotations?: Datum[]

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
export const BubbleChart = forwardRef(function BubbleChart<TDatum extends Datum = Datum>(props: BubbleChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    colorScheme,
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

  const safeData = useMemo(() => filterSparseArray(data), [data])
  const isPushMode = data === undefined

  // ── Shared setup (color, legend, selection, loading/empty) ────────────
  const setup = useChartSetup({
    data: safeData,
    rawData: data,
    colorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: false,
    onObservation,
    onClick,
    hoverHighlight,
    chartType: "BubbleChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    emptyContent,
    width,
    height,
  })

  // ── Streaming size domain — track min/max from pushed data ───────────
  const streamingSizeDomainRef = useRef<[number, number] | null>(null)
  const [sizeDomainVersion, setSizeDomainVersion] = useState(0)

  const updateSizeDomain = useCallback((items: Datum[]) => {
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

  const wrappedPush = useCallback(
    (d: Datum) => {
      updateSizeDomain([d])
      frameRef.current?.push(d)
    },
    [updateSizeDomain]
  )
  const wrappedPushMany = useCallback(
    (d: Datum[]) => {
      updateSizeDomain(d)
      frameRef.current?.pushMany(d)
    },
    [updateSizeDomain]
  )

  useImperativeHandle(ref, () => ({
    push: wrappedPush,
    pushMany: wrappedPushMany,
    remove: (id) => frameRef.current?.remove(id) ?? [],
    update: (id, updater) => frameRef.current?.update(id, updater) ?? [],
    clear: () => {
      streamingSizeDomainRef.current = null
      setSizeDomainVersion(v => v + 1)
      frameRef.current?.clear()
    },
    getData: () => frameRef.current?.getData() ?? [],
    getScales: () => frameRef.current?.getScales() ?? null
  }), [wrappedPush, wrappedPushMany])

  const brushConfig = normalizeLinkedBrush(linkedBrush)

  const _brushHook = useBrushSelection({
    name: brushConfig?.name || "__unused_brush__",
    xField: brushConfig?.xField || (typeof xAccessor === "string" ? xAccessor : undefined),
    yField: brushConfig?.yField || (typeof yAccessor === "string" ? yAccessor : undefined)
  })

  // ── Core chart logic ───────────────────────────────────────────────────

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
    return (d: Datum) => {
      const baseStyle: Record<string, string | number> = {
        fillOpacity: bubbleOpacity,
        strokeWidth: bubbleStrokeWidth,
        stroke: bubbleStrokeColor
      }

      // Apply color — skip fill when colorScale unavailable (push API)
      // so the frame's own color map can fill in
      if (colorBy) {
        if (setup.colorScale) baseStyle.fill = getColor(d, colorBy, setup.colorScale)
      } else {
        baseStyle.fill = color || DEFAULT_COLOR
      }

      // Apply size
      baseStyle.r = getSize(d, sizeBy, sizeRange, sizeDomain)

      return baseStyle
    }
  }, [colorBy, setup.colorScale, sizeBy, sizeRange, sizeDomain, bubbleOpacity, bubbleStrokeWidth, bubbleStrokeColor, color])

  const basePointStyleWithPrimitives = useMemo(
    () => mergeShapeStyle(basePointStyle, { stroke, strokeWidth, opacity }),
    [basePointStyle, stroke, strokeWidth, opacity]
  )

  const pointStyle = useMemo(
    () => wrapStyleWithSelection(basePointStyleWithPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection),
    [basePointStyleWithPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection]
  )

  // Default tooltip showing all configured fields. `xFormat`/`yFormat`
  // cascade from the HOC so the tooltip values read the same way as the axis.
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x", format: xFormat },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y", format: yFormat },
    { label: accessorName(sizeBy), accessor: sizeBy, role: "size" },
    ...(colorBy ? [{ label: accessorName(colorBy), accessor: colorBy, role: "color" as const }] : []),
  ]), [xAccessor, yAccessor, xLabel, yLabel, sizeBy, colorBy, xFormat, yFormat])

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
    margin: setup.margin,
    showAxes: resolved.showAxes,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    showGrid,
    ...setup.legendBehaviorProps,
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    ...(props.animate != null && { animate: props.animate }),
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation || onClick || hoverHighlight) && { customHoverBehavior: setup.customHoverBehavior }),
    ...((onObservation || onClick || linkedHover) && { customClickBehavior: setup.customClickBehavior }),
    ...(marginalGraphics && { marginalGraphics }),
    ...(pointIdAccessor && { pointIdAccessor }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...setup.crosshairProps,
    ...frameProps
  }

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (setup.earlyReturn) return setup.earlyReturn

  return <SafeRender componentName="BubbleChart" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: BubbleChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
BubbleChart.displayName = "BubbleChart"
