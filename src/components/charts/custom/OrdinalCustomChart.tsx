"use client"
import * as React from "react"
import { forwardRef, useMemo, useRef, useImperativeHandle } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type {
  StreamOrdinalFrameProps,
  StreamOrdinalFrameHandle,
} from "../../stream/ordinalTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { OrdinalCustomLayout } from "../../stream/ordinalCustomLayout"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps } from "../shared/types"
import { useChartMode } from "../shared/hooks"
import { SafeRender } from "../shared/withChartWrapper"
import { filterSparseArray } from "../shared/sparseArray"

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
  const frameRef = useRef<StreamOrdinalFrameHandle>(null)

  // Forward push/pushMany/clear/getData to the inner frame, mirroring the
  // built-in ordinal HOCs (BarChart, etc.).
  useImperativeHandle(ref, () => ({
    push: (d: Datum) => frameRef.current?.push(d),
    pushMany: (d: Datum[]) => frameRef.current?.pushMany(d),
    remove: (id: string | string[]) => frameRef.current?.remove(id) ?? [],
    update: (id, updater) => frameRef.current?.update(id, updater) ?? [],
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getData() ?? [],
    getScales: () => frameRef.current?.getScales() ?? null,
  }), [])

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    showLegend: undefined,
    title: props.title,
    xLabel: undefined,
    yLabel: undefined,
  })

  const {
    data,
    layout,
    layoutConfig,
    categoryAccessor = "category",
    valueAccessor = "value",
    oExtent,
    rExtent,
    projection = "vertical",
    margin: userMarginRaw,
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

  // PartialMargin allows a number shorthand; StreamOrdinalFrame's margin
  // only accepts the sided object form.
  const userMargin = useMemo(() => {
    if (typeof userMarginRaw === "number") {
      return { top: userMarginRaw, right: userMarginRaw, bottom: userMarginRaw, left: userMarginRaw }
    }
    return userMarginRaw
  }, [userMarginRaw])

  const {
    width,
    height,
    enableHover,
    title,
    description,
    summary,
    accessibleTable,
  } = resolved

  const safeData = useMemo(() => filterSparseArray(data ?? []), [data])

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "custom",
    ...(data != null && { data: safeData }),
    customLayout: layout as OrdinalCustomLayout,
    layoutConfig,
    categoryAccessor,
    valueAccessor,
    oExtent,
    rExtent,
    projection,
    colorScheme,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: userMargin,
    className,
    title,
    description,
    summary,
    accessibleTable,
    enableHover,
    showAxes,
    onObservation,
    onClick,
    selection,
    linkedHover,
    chartId,
    loading,
    emptyContent,
    annotations,
    ...frameProps,
  } as StreamOrdinalFrameProps

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
