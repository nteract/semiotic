"use client"
import * as React from "react"
import { useMemo, forwardRef, useRef, useImperativeHandle } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useChartMode, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor, CategoryFormatFn } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"

/**
 * FunnelChart component props
 */
export interface FunnelChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data?: TDatum[]
  /** Accessor for funnel step names (e.g., "Awareness", "Interest", "Purchase") */
  stepAccessor?: ChartAccessor<TDatum, string>
  /** Accessor for the numeric value at each step */
  valueAccessor?: ChartAccessor<TDatum, number>
  /** Accessor for splitting into mirrored categories (e.g., "control" vs "treatment") */
  categoryAccessor?: ChartAccessor<TDatum, string>
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  /**
   * Funnel orientation.
   *
   * - `"horizontal"` (default): steps run top-to-bottom with centered bars and
   *   trapezoid connectors between steps.
   * - `"vertical"`: steps on the x-axis as vertical bars. Each bar is stacked:
   *   solid = retained value, hatched = dropoff from the previous step.
   *   Multi-category data renders grouped bars within each step.
   */
  orientation?: "horizontal" | "vertical"
  /** Opacity of the trapezoid connectors between steps (0–1, default 0.3). Horizontal only. */
  connectorOpacity?: number
  /** Show step name + value labels on bars (default true) */
  showLabels?: boolean
  enableHover?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: "right" | "left" | "top" | "bottom"
  tooltip?: TooltipProp
  annotations?: Record<string, any>[]
  /** Custom formatter for category tick labels */
  categoryFormat?: CategoryFormatFn
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * FunnelChart — Visualize sequential conversion steps.
 *
 * **Horizontal** (default): centered bars narrowing top-to-bottom with
 * trapezoid connectors. Multi-category mirrors around center axis.
 *
 * **Vertical** (`orientation="vertical"`): vertical bars with hatched
 * dropoff stacking. Each bar shows retained (solid) + dropoff from
 * previous step (hatched). Multi-category renders grouped bars.
 */
export const FunnelChart = forwardRef(function FunnelChart<TDatum extends Record<string, any> = Record<string, any>>(props: FunnelChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: false,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
    showCategoryTicks: false,
  })

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)
  useImperativeHandle(ref, () => ({
    push: (point) => frameRef.current?.push(point),
    pushMany: (points) => frameRef.current?.pushMany(points),
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getData() ?? []
  }))

  const {
    data,
    margin: userMargin,
    className,
    stepAccessor = "step",
    valueAccessor = "value",
    categoryAccessor,
    colorBy,
    colorScheme,
    orientation = "horizontal",
    connectorOpacity = 0.3,
    showLabels = true,
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
    categoryFormat,
  } = props

  const isVertical = orientation === "vertical"

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showLegend = resolved.showLegend
  const title = resolved.title
  const description = resolved.description
  const summary = resolved.summary
  const accessibleTable = resolved.accessibleTable

  // Horizontal funnel has no axes — tight margins.
  // Vertical bar-funnel needs room for axis labels and floating labels above bars.
  const funnelMarginDefaults = isVertical
    ? { top: title ? 60 : 40, right: 20, bottom: 60, left: 60 }
    : { top: title ? 40 : 10, right: 10, bottom: 10, left: 10 }

  const safeData = data || []

  // colorBy only applies when explicitly set or when categoryAccessor is present.
  // Single-category funnel (no categoryAccessor, no colorBy) should be uniform color.
  const effectiveColorBy = colorBy || categoryAccessor
  const isSingleColor = !effectiveColorBy

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
    unwrapData: true,
    onObservation,
    onClick,
    hoverHighlight,
    chartType: "FunnelChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: funnelMarginDefaults,
    loading,
    emptyContent,
    width,
    height,
  })

  if (setup.earlyReturn) return setup.earlyReturn

  warnMissingField("FunnelChart", safeData, "stepAccessor", stepAccessor)
  warnMissingField("FunnelChart", safeData, "valueAccessor", valueAccessor)

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [safeData])

  // For single-category funnel, resolve one uniform fill color
  const uniformFill = useMemo(() => {
    if (!isSingleColor) return undefined
    // Use explicit color prop, or first color from theme/scheme, or a default teal
    if (color) return color
    if (themeCategorical?.[0]) return themeCategorical[0]
    if (Array.isArray(colorScheme) && colorScheme[0]) return colorScheme[0]
    return "#4e79a7"
  }, [isSingleColor, color, themeCategorical, colorScheme])

  const basePieceStyle = useMemo(() => {
    return (d: Record<string, any>, category?: string) => {
      const baseStyle: Record<string, string | number> = {}
      if (uniformFill) {
        // Single-category: every step gets the same color
        baseStyle.fill = uniformFill
      } else if (effectiveColorBy) {
        baseStyle.fill = getColor(d, effectiveColorBy, setup.colorScale)
      } else {
        baseStyle.fill = resolveDefaultFill(color, themeCategorical, colorScheme, category, categoryIndexMap)
      }
      return baseStyle
    }
  }, [uniformFill, effectiveColorBy, setup.colorScale, color, themeCategorical, colorScheme, categoryIndexMap])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyle, setup.effectiveSelectionHook, selection),
    [basePieceStyle, setup.effectiveSelectionHook, selection]
  )

  // Default tooltip showing step, value, and percentage
  const defaultTooltipContent = useMemo(() => {
    return (d: any) => {
      const datum = d?.data || d
      // Support both horizontal (__funnelStep) and vertical (__barFunnelStep) metadata
      const step = datum?.__funnelStep || datum?.__barFunnelStep || datum?.step || ""
      const value = datum?.__funnelValue ?? datum?.__barFunnelValue ?? datum?.value ?? ""
      const pct = datum?.__funnelPercent ?? datum?.__barFunnelPercent
      const isFirst = datum?.__funnelIsFirstStep ?? datum?.__barFunnelIsFirstStep
      const isDropoff = datum?.__barFunnelIsDropoff
      const cat = datum?.__barFunnelCategory ?? datum?.category
      const pctStr = pct != null && !isFirst
        ? ` (${Math.abs(pct - Math.round(pct)) < 0.05 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`})`
        : ""
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          {step && <div style={{ fontWeight: "bold" }}>{String(step)}</div>}
          {cat && cat !== step && <div style={{ marginTop: 2, opacity: 0.8 }}>{String(cat)}</div>}
          {isDropoff && <div style={{ marginTop: 2, fontStyle: "italic", opacity: 0.7 }}>Dropoff</div>}
          <div style={{ marginTop: 4 }}>{String(value)}{pctStr}</div>
        </div>
      )
    }
  }, [])

  const error = validateArrayData({
    componentName: "FunnelChart",
    data: data,
    accessors: { stepAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="FunnelChart" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: isVertical ? "bar-funnel" : "funnel",
    ...(data != null && { data: safeData }),
    oAccessor: stepAccessor,
    rAccessor: valueAccessor,
    ...(categoryAccessor && { stackBy: categoryAccessor }),
    projection: isVertical ? "vertical" : "horizontal",
    barPadding: isVertical ? 40 : 0,
    pieceStyle,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: setup.margin,
    enableHover,
    showAxes: isVertical,
    showCategoryTicks: isVertical,
    ...(categoryFormat && { oFormat: categoryFormat }),
    showGrid: isVertical,
    ...(!isVertical && { connectorOpacity }),
    showLabels,
    ...setup.legendBehaviorProps,
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    tooltipContent: tooltip === false
      ? () => null
      : tooltip === true || tooltip == null
        ? defaultTooltipContent
        : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation || onClick || hoverHighlight) && { customHoverBehavior: setup.customHoverBehavior }),
    ...((onObservation || onClick || linkedHover) && { customClickBehavior: setup.customClickBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps
  } as any

  return <SafeRender componentName="FunnelChart" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: FunnelChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
FunnelChart.displayName = "FunnelChart"
