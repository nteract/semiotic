"use client"
import * as React from "react"
import { forwardRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type {
  StreamOrdinalFrameProps,
  StreamOrdinalFrameHandle,
} from "../../stream/ordinalTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { OrdinalCustomLayout } from "../../stream/ordinalCustomLayout"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps } from "../shared/types"
import { SafeRender } from "../shared/withChartWrapper"
import { buildBaseMetadataProps, buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import { useCustomChartSetup } from "../shared/useCustomChartSetup"

export interface OrdinalCustomChartProps<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
> extends BaseChartProps {
  /** Data passed through to OrdinalLayoutContext.data. */
  data?: TDatum[]
  /** The layout function. Receives OrdinalLayoutContext, returns scene nodes + overlays. */
  layout: OrdinalCustomLayout<TConfig>
  /** Config blob threaded through to OrdinalLayoutContext.config. */
  layoutConfig?: TConfig
  /** Field name (or function) for the category. The frame builds the o-scale from these. */
  categoryAccessor?: StreamOrdinalFrameProps["categoryAccessor"]
  /** Field name (or function) for the value. The frame builds the r-scale from these. */
  valueAccessor?: StreamOrdinalFrameProps["valueAccessor"]
  /**
   * Optional category order — overrides the data's insertion order. Most
   * recipes can ignore this and read `ctx.scales.o.domain()` instead.
   */
  oExtent?: StreamOrdinalFrameProps["oExtent"]
  /** Optional fixed value extent. */
  rExtent?: StreamOrdinalFrameProps["rExtent"]
  /** Vertical / horizontal / radial. Default vertical. */
  projection?: StreamOrdinalFrameProps["projection"]
  /** Color scheme threaded into the layout's `resolveColor` helper. */
  colorScheme?: string | string[]
  enableHover?: boolean
  showAxes?: boolean
  showGrid?: boolean
  annotations?: Datum[]
  /** Additional StreamOrdinalFrame props for advanced customization. */
  frameProps?: Partial<Omit<StreamOrdinalFrameProps,
    "data" | "chartType" | "size" | "customLayout" | "layoutConfig"
  >>
}

/**
 * OrdinalCustomChart — escape hatch for bespoke ordinal geometry.
 *
 * Wraps StreamOrdinalFrame and threads a user-supplied layout function
 * into the scene-building pipeline. The layout receives the o-scale
 * (band scale over categories) and r-scale (linear over values), plus
 * dimensions, theme, and a `resolveColor` helper, and returns scene
 * primitives plus optional overlays.
 *
 * Built-in chart types (BarChart, SwarmPlot, BoxPlot, PieChart, ...)
 * should still be preferred when they fit. Reach for this HOC when none
 * does — marimekko, parallel coordinates, bullet, fan chart, slope graph,
 * etc.
 *
 * @example
 * ```tsx
 * import { OrdinalCustomChart } from "semiotic/ordinal"
 * import { marimekkoLayout } from "semiotic/recipes"
 *
 * <OrdinalCustomChart
 *   data={cohorts}
 *   layout={marimekkoLayout}
 *   layoutConfig={{
 *     categoryAccessor: "segment",
 *     valueAccessor: "revenue",
 *     stackBy: "product",
 *   }}
 *   width={700}
 *   height={300}
 * />
 * ```
 */
export const OrdinalCustomChart = forwardRef(function OrdinalCustomChart<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
>(props: OrdinalCustomChartProps<TDatum, TConfig>, ref: React.Ref<RealtimeFrameHandle>) {
  const {
    data,
    layout,
    layoutConfig,
    categoryAccessor = "category",
    valueAccessor = "value",
    oExtent,
    rExtent,
    projection = "vertical",
    margin: userMargin,
    className,
    colorScheme,
    showAxes = false,
    annotations,
    onObservation,
    onClick,
    selection,
    linkedHover,
    chartId,
    loading,
    emptyContent,
    frameProps = {},
  } = props

  // Shared setup pipeline — same one BarChart/SwarmPlot/etc. use. Provides:
  //   - earlyReturn: loading skeleton or empty-state element to short-circuit
  //   - setup.customHoverBehavior / customClickBehavior: wraps onObservation,
  //     onClick, selection, and linkedHover into the customHoverBehavior /
  //     customClickBehavior fields the frame consumes (the bare props don't
  //     exist on StreamOrdinalFrameProps)
  //   - setup.margin: merged user margin + chart-mode default
  const { frameRef, resolved, safeData, setup, earlyReturn } = useCustomChartSetup<StreamOrdinalFrameHandle>({
    imperativeRef: ref,
    imperativeVariant: "xy",
    chartTypeLabel: "OrdinalCustomChart",
    unwrapData: true,
    data,
    colorScheme,
    selection,
    linkedHover,
    onObservation,
    onClick,
    chartId,
    loading,
    emptyContent,
    margin: userMargin,
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    title: props.title,
    mode: props.mode,
  })

  if (earlyReturn) return earlyReturn

  const { width, height, enableHover, showGrid, title, description, summary, accessibleTable } = resolved

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "custom",
    ...(data != null && { data: safeData }),
    customLayout: layout as OrdinalCustomLayout,
    layoutConfig,
    // Map our user-facing accessor names to the frame's bounded-mode prop
    // names (oAccessor/rAccessor). The frame's `categoryAccessor`/
    // `valueAccessor` props are streaming-mode aliases and would be
    // ignored in bounded mode (the default for this HOC).
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    oExtent,
    rExtent,
    projection,
    colorScheme,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: setup.margin,
    enableHover,
    showAxes,
    showGrid,
    annotations,
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate }),
    // selection/linkedHover/onObservation/onClick are wired through these
    // synthesized hover/click behavior props — the bare prop names don't
    // exist on StreamOrdinalFrameProps.
    ...buildCustomBehaviorProps({
      linkedHover,
      onObservation,
      onClick,
      hoverHighlight: false,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...frameProps,
  }

  return (
    <SafeRender componentName="OrdinalCustomChart" width={width} height={height}>
      <StreamOrdinalFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <
    TDatum extends Datum = Datum,
    TConfig extends object = Record<string, unknown>
  >(
    props: OrdinalCustomChartProps<TDatum, TConfig> & React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

;(OrdinalCustomChart as { displayName?: string }).displayName = "OrdinalCustomChart"
