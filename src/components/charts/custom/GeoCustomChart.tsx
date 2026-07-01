"use client"
import * as React from "react"
import { forwardRef, useMemo } from "react"
import StreamGeoFrame from "../../stream/StreamGeoFrame"
import type {
  ProjectionProp,
  StreamGeoFrameHandle,
  StreamGeoFrameProps,
} from "../../stream/geoTypes"
import type { GeoCustomLayout } from "../../stream/geoCustomLayout"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps } from "../shared/types"
import { SafeRender } from "../shared/withChartWrapper"
import { filterSparseArray } from "../shared/sparseArray"
import { useCustomChartScaffold } from "../shared/useCustomChartSetup"
import { useChartSetup } from "../shared/useChartSetup"
import { buildBaseMetadataProps, buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"

export interface GeoCustomChartProps<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
> extends BaseChartProps {
  /** Geographic point data supplied to `GeoLayoutContext.points`. */
  points?: TDatum[]
  /** Geographic areas supplied to `GeoLayoutContext.areas`. */
  areas?: GeoJSON.Feature[]
  /** Geographic line/flow records supplied to `GeoLayoutContext.lines`. */
  lines?: TDatum[]
  /** Layout function that emits GeoFrame scene nodes and optional overlays. */
  layout: GeoCustomLayout<TConfig>
  /** User configuration threaded to `GeoLayoutContext.config`. */
  layoutConfig?: TConfig
  /** Projection resolved before the custom layout runs. @default "equirectangular" */
  projection?: ProjectionProp
  xAccessor?: StreamGeoFrameProps<TDatum>["xAccessor"]
  yAccessor?: StreamGeoFrameProps<TDatum>["yAccessor"]
  lineDataAccessor?: StreamGeoFrameProps<TDatum>["lineDataAccessor"]
  colorScheme?: string | string[] | Record<string, string>
  enableHover?: boolean
  tooltip?: TooltipProp
  annotations?: Datum[]
  /** Additional StreamGeoFrame props excluding fields controlled by this HOC. */
  frameProps?: Partial<Omit<
    StreamGeoFrameProps,
    | "areas"
    | "points"
    | "lines"
    | "projection"
    | "size"
    | "customLayout"
    | "layoutConfig"
    | "layoutSelection"
    | "xAccessor"
    | "yAccessor"
    | "lineDataAccessor"
  >>
}

/**
 * GeoCustomChart — escape hatch for bespoke geographic geometry.
 *
 * The frame resolves the projection and continues to own canvas rendering,
 * polygon/point/line hit-testing, accessibility, tooltips, selection, and SSR.
 * The supplied layout owns only the scene geometry and SVG overlays.
 */
export const GeoCustomChart = forwardRef(function GeoCustomChart<
  TDatum extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
>(
  props: GeoCustomChartProps<TDatum, TConfig>,
  ref: React.Ref<RealtimeFrameHandle>
) {
  const {
    points,
    areas,
    lines,
    layout,
    layoutConfig,
    projection = "equirectangular",
    xAccessor = "lon",
    yAccessor = "lat",
    lineDataAccessor,
    colorScheme,
    tooltip,
    annotations,
    margin: userMargin,
    selection,
    linkedHover,
    onObservation,
    onClick,
    chartId,
    loading,
    loadingContent,
    emptyContent,
    className,
    frameProps = {},
  } = props

  const { frameRef, resolved, normalizedMargin } =
    useCustomChartScaffold<StreamGeoFrameHandle>({
      imperativeRef: ref,
      imperativeVariant: "geo-points",
      margin: userMargin,
      width: props.width,
      height: props.height,
      enableHover: props.enableHover,
      title: props.title,
      mode: props.mode,
    })

  const safePoints = useMemo(() => filterSparseArray(points), [points])
  const safeAreas = useMemo(() => filterSparseArray(areas), [areas])
  const safeLines = useMemo(() => filterSparseArray(lines), [lines])
  const setupData = useMemo<Datum[]>(
    () => [...safePoints, ...safeLines, ...(safeAreas as unknown as Datum[])],
    [safePoints, safeLines, safeAreas]
  )
  const hasBoundedInput = points !== undefined || lines !== undefined || areas !== undefined

  const setup = useChartSetup({
    data: setupData,
    rawData: hasBoundedInput ? setupData : undefined,
    colorBy: undefined,
    colorScheme,
    legendInteraction: undefined,
    selection,
    linkedHover,
    fallbackFields: [],
    unwrapData: false,
    onObservation,
    onClick,
    chartType: "GeoCustomChart",
    chartId,
    showLegend: false,
    userMargin: normalizedMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    loadingContent,
    emptyContent,
    width: resolved.width,
    height: resolved.height,
  })

  const effectiveSelection = setup.effectiveSelectionHook
  const layoutSelection = useMemo(
    () =>
      effectiveSelection?.isActive
        ? { isActive: true, predicate: effectiveSelection.predicate }
        : null,
    [effectiveSelection?.isActive, effectiveSelection?.predicate]
  )

  if (setup.earlyReturn) return setup.earlyReturn

  const {
    width,
    height,
    enableHover,
    title,
    description,
    summary,
    accessibleTable,
  } = resolved

  const normalizedTooltip = normalizeTooltip(tooltip)
  const streamProps: StreamGeoFrameProps = {
    projection,
    ...(points != null && { points: safePoints }),
    ...(areas != null && { areas: safeAreas }),
    ...(lines != null && { lines: safeLines }),
    xAccessor: xAccessor as StreamGeoFrameProps["xAccessor"],
    yAccessor: yAccessor as StreamGeoFrameProps["yAccessor"],
    ...(lineDataAccessor != null && {
      lineDataAccessor: lineDataAccessor as StreamGeoFrameProps["lineDataAccessor"],
    }),
    customLayout: layout as unknown as GeoCustomLayout,
    layoutConfig,
    layoutSelection,
    colorScheme,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: setup.margin,
    enableHover,
    ...buildBaseMetadataProps({
      title,
      description,
      summary,
      accessibleTable,
      className,
      animate: props.animate,
      autoPlaceAnnotations: props.autoPlaceAnnotations,
    }),
    ...(tooltip === false
      ? { tooltipContent: () => null }
      : normalizedTooltip
        ? { tooltipContent: normalizedTooltip }
        : {}),
    ...buildCustomBehaviorProps({
      linkedHover,
      onObservation,
      onClick,
      hoverHighlight: false,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
      linkedHoverInClickPredicate: false,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps,
  }

  return (
    <SafeRender componentName="GeoCustomChart" width={width} height={height}>
      <StreamGeoFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <
    TDatum extends Datum = Datum,
    TConfig extends object = Record<string, unknown>
  >(
    props: GeoCustomChartProps<TDatum, TConfig> &
      React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

;(GeoCustomChart as { displayName?: string }).displayName = "GeoCustomChart"
