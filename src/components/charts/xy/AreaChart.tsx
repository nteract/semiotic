"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor } from "../shared/colorUtils"
import { useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import { useChartSetup } from "../shared/useChartSetup"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"

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
   * Tooltip configuration
   */
  tooltip?: TooltipProp

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
 * AreaChart - Visualize quantities over continuous intervals with overlapping filled areas
 *
 * Each series fills from its line down to the baseline. Multiple series overlap
 * with transparency so all shapes remain visible.
 *
 * For stacked areas use {@link StackedAreaChart}.
 *
 * @example
 * ```tsx
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
    lineDataAccessor = "coordinates",
    colorBy,
    colorScheme,
    curve = "monotoneX",
    areaOpacity = 0.7,
    lineGradient,
    showLine = true,
    lineWidth = 2,
    showPoints = false,
    pointRadius = 3,
    tooltip,
    annotations,
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

  // ── Dev-mode warnings ─────────────────────────────────────────────────
  warnMissingField("AreaChart", safeData, "xAccessor", xAccessor)
  warnMissingField("AreaChart", safeData, "yAccessor", yAccessor)

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
          const areaObj: Datum = { [lineDataAccessor]: [] }
          // Add the grouping field
          if (typeof areaBy === "string") {
            areaObj[areaBy] = key
          }
          acc[key] = areaObj
        }
        acc[key][lineDataAccessor].push(d)
        return acc
      }, {} as Record<string, Datum>)

      return Object.values(grouped)
    }

    // Single area - wrap in area object
    return [{ [lineDataAccessor]: safeData }]
  }, [safeData, areaBy, lineDataAccessor, isAreaObjectFormat])

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
    chartType: "AreaChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    emptyContent,
    width,
    height,
  })

  // Area/line style function
  const baseLineStyle = useMemo(() => {
    return (d: Datum) => {
      const baseStyle: Record<string, string | number> = {}

      // Apply color — skip fill/stroke when colorScale unavailable (push API)
      // so the frame's own color map can fill in
      if (colorBy) {
        if (setup.colorScale) {
          const color = getColor(d, colorBy, setup.colorScale)
          baseStyle.fill = color
          if (showLine) {
            baseStyle.stroke = color
            baseStyle.strokeWidth = lineWidth
          } else {
            baseStyle.stroke = "none"
          }
        }
      } else {
        const uniformColor = color || DEFAULT_COLOR
        baseStyle.fill = uniformColor
        if (showLine) {
          baseStyle.stroke = uniformColor
          baseStyle.strokeWidth = lineWidth
        } else {
          baseStyle.stroke = "none"
        }
      }
      baseStyle.fillOpacity = areaOpacity

      return baseStyle
    }
  }, [colorBy, setup.colorScale, color, areaOpacity, showLine, lineWidth])

  const baseLineStyleWithPrimitives = useMemo(
    () => mergeShapeStyle(baseLineStyle, { stroke, strokeWidth, opacity }),
    [baseLineStyle, stroke, strokeWidth, opacity]
  )

  const lineStyle = useMemo(
    () => wrapStyleWithSelection(baseLineStyleWithPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection),
    [baseLineStyleWithPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection]
  )

  // Point style function (if showPoints is true)
  const pointStyle = useMemo(() => {
    if (!showPoints) return undefined
    return (d: Datum) => {
      const baseStyle: Record<string, string | number> = { r: pointRadius, fillOpacity: 1 }
      if (colorBy) {
        if (setup.colorScale) baseStyle.fill = getColor(d.parentLine || d, colorBy, setup.colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }
      return baseStyle
    }
  }, [showPoints, pointRadius, colorBy, setup.colorScale])

  // Default tooltip showing all configured fields. `xFormat`/`yFormat`
  // cascade from the HOC so the tooltip values read the same way as the axis.
  const groupField = areaBy || colorBy
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x", format: xFormat },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y", format: yFormat },
    ...(groupField ? [{ label: accessorName(groupField), accessor: groupField, role: "group" as const }] : []),
  ]), [xAccessor, yAccessor, xLabel, yLabel, groupField, xFormat, yFormat])

  // Validate data (after all hooks)
  const validationError = validateArrayData({
    componentName: "AreaChart",
    data: data,
    accessors: {
      xAccessor,
      yAccessor,
    },
  })

  // Flatten area data into a single array for StreamXYFrame
  const flattenedData = useMemo(() => {
    if (isAreaObjectFormat || areaBy) {
      return areaData.flatMap((area: Datum) => {
        const coords = area[lineDataAccessor] || []
        if (areaBy && typeof areaBy === "string") {
          return coords.map((c: Datum) => ({ ...c, [areaBy]: area[areaBy] }))
        }
        return coords
      })
    }
    return safeData
  }, [areaData, lineDataAccessor, isAreaObjectFormat, areaBy, safeData])

  // Build StreamXYFrame props
  const streamProps: StreamXYFrameProps = {
    chartType: "area",
    ...(data != null && { data: flattenedData }),
    xAccessor,
    yAccessor,
    groupAccessor: areaBy || undefined,
    ...(y0Accessor && { y0Accessor }),
    ...(gradientFill && { gradientFill }),
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
    ...(annotations && annotations.length > 0 && { annotations }),
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
