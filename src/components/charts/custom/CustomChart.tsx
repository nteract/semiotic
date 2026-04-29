"use client"
import * as React from "react"
import { forwardRef, useRef } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { CustomLayout } from "../../stream/customLayout"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, AxisConfig } from "../shared/types"
import { useChartMode } from "../shared/hooks"
import { SafeRender } from "../shared/withChartWrapper"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import { filterSparseArray } from "../shared/sparseArray"
import { useChartSetup } from "../shared/useChartSetup"
import { buildBaseMetadataProps, buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import type { TooltipProp } from "../../Tooltip/Tooltip"

export interface CustomChartProps<TDatum extends Datum = Datum, TConfig = Record<string, unknown>>
  extends BaseChartProps,
    AxisConfig {
  /** Data passed through to LayoutContext.data. */
  data?: TDatum[]
  /** The layout function. Receives LayoutContext, returns SceneNode[] + overlays. */
  layout: CustomLayout<TConfig>
  /** Config blob threaded through to LayoutContext.config. */
  layoutConfig?: TConfig
  /**
   * Optional fixed extents — flow into scale construction *before* the layout
   * runs, so scales reflect the layout's intended domain. Layouts that don't
   * use scales (waffle, calendar, treemap) can ignore this.
   */
  xExtent?: [number | undefined, number | undefined]
  yExtent?: [number | undefined, number | undefined]
  /** Show axes — default false; most custom layouts draw their own axes. */
  showAxes?: boolean
  showGrid?: boolean
  enableHover?: boolean
  showLegend?: boolean
  annotations?: Datum[]
  colorScheme?: string | string[]
  tooltip?: TooltipProp
  /** Additional StreamXYFrame props for advanced customization, excluding CustomChart-controlled fields. */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size" | "customLayout" | "layoutConfig">>
}

/**
 * CustomChart — escape hatch for bespoke chart geometry.
 *
 * Wraps StreamXYFrame and threads a user-supplied layout function into the
 * scene-building pipeline. The layout receives scales, dimensions, theme,
 * and a resolveColor helper, and returns scene nodes + optional overlays.
 *
 * Built-in chart types should always be preferred. Reach for CustomChart
 * when no HOC fits — waffle grids, calendar heatmaps, horizon bands,
 * bespoke composites. See `semiotic/recipes` for reference layouts.
 *
 * @example
 * ```tsx
 * import { CustomChart } from "semiotic/xy"
 * import { waffleLayout } from "semiotic/recipes"
 *
 * <CustomChart
 *   data={cells}
 *   layout={waffleLayout}
 *   layoutConfig={{ rows: 10, columns: 10, gutter: 2, valueAccessor: "value" }}
 * />
 * ```
 */
export const CustomChart = forwardRef(function CustomChart<
  TDatum extends Datum = Datum,
  TConfig = Record<string, unknown>
>(props: CustomChartProps<TDatum, TConfig>, ref: React.Ref<RealtimeFrameHandle>) {
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
    layout,
    layoutConfig,
    xExtent,
    yExtent,
    showAxes = false,
    margin: userMargin,
    className,
    annotations,
    onObservation,
    onClick,
    selection,
    linkedHover,
    chartId,
    loading,
    emptyContent,
    colorScheme,
    frameProps = {},
  } = props

  const {
    width,
    height,
    enableHover,
    showGrid,
    showLegend,
    title,
    description,
    summary,
    accessibleTable,
    xLabel,
    yLabel,
  } = resolved

  const safeData = React.useMemo(() => filterSparseArray(data ?? []), [data])

  const setup = useChartSetup({
    data: safeData,
    rawData: data,
    colorBy: undefined,
    colorScheme,
    legendInteraction: undefined,
    selection,
    linkedHover,
    fallbackFields: [],
    unwrapData: false,
    onObservation,
    onClick,
    chartType: "CustomChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    emptyContent,
    width,
    height,
  })

  if (setup.earlyReturn) return setup.earlyReturn

  const streamProps: StreamXYFrameProps = {
    chartType: "custom",
    ...(data != null && { data: safeData }),
    customLayout: layout as CustomLayout,
    // Pass through as-is — coercing to a fresh {} when omitted breaks the
    // pipelineConfig useMemo identity and forces a store rebuild every render.
    layoutConfig: layoutConfig as Record<string, unknown> | undefined,
    xExtent,
    yExtent,
    colorScheme,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: setup.margin,
    showAxes,
    xLabel,
    yLabel,
    enableHover,
    showGrid,
    ...setup.legendBehaviorProps,
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate }),
    ...(props.tooltip != null && { tooltipContent: props.tooltip as StreamXYFrameProps["tooltipContent"] }),
    ...buildCustomBehaviorProps({
      linkedHover,
      onObservation,
      onClick,
      hoverHighlight: false,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...setup.crosshairProps,
    ...frameProps,
  }

  return (
    <SafeRender componentName="CustomChart" width={width} height={height}>
      <StreamXYFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <TDatum extends Datum = Datum, TConfig = Record<string, unknown>>(
    props: CustomChartProps<TDatum, TConfig> & React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

;(CustomChart as { displayName?: string }).displayName = "CustomChart"
