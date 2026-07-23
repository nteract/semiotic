"use client"
import type { Datum } from "../shared/datumTypes"
import { EMPTY_ARRAY } from "../shared/sparseArray"
import * as React from "react"
import { useMemo, useRef, forwardRef } from "react"
import StreamGeoFrame from "../../stream/StreamGeoFrame"
import type { StreamGeoFrameProps, StreamGeoFrameHandle, ProjectionProp } from "../../stream/geoTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { getColor, getSize } from "../shared/colorUtils"
import { useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import { resolveAxisFreeMarginDefaults } from "../shared/chartMode"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import { composeStyleRules, makeNodeRuleContext, type StyleRule } from "../shared/styleRules"

import { SafeRender, warnMissingField } from "../shared/withChartWrapper"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { Style } from "../../stream/types"
import { useReferenceAreas, type AreasProp } from "../../geo/useReferenceAreas"
import { useChartSetup } from "../shared/useChartSetup"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import { getMinMax } from "../shared/minMax"
import { GEO_BACKGROUND_AREA_STYLE } from "../shared/geoStyleDefaults"

const DEFAULT_SIZE_RANGE: [number, number] = [3, 30]
const SPARKLINE_SIZE_RANGE: [number, number] = [1, 4]

export interface ProportionalSymbolMapProps<TDatum extends Datum = Datum> extends BaseChartProps {
  /** Point data with geographic coordinates */
  points?: TDatum[]
  /** Longitude accessor @default "lon" */
  xAccessor?: ChartAccessor<TDatum, number>
  /** Latitude accessor @default "lat" */
  yAccessor?: ChartAccessor<TDatum, number>
  /** Field to scale point size */
  sizeBy: ChartAccessor<TDatum, number>
  /** Min and max radius. Defaults to [3, 30], or [1, 4] in sparkline mode. */
  sizeRange?: [number, number]
  /** Field to determine point color */
  colorBy?: ChartAccessor<TDatum, string>
  /**
   * Declarative, threshold-aware symbol styling. Ordered `{ when, style }`
   * rules; last applicable rule wins. `ctx` = `{ value, category }` (value =
   * `sizeBy`, category = `colorBy`). A rule `fill` may be a color or HatchFill.
   */
  styleRules?: StyleRule[]
  /** Color scheme @default "category10" */
  colorScheme?: string | string[] | Record<string, string>
  /** Geographic projection @default "equalEarth" */
  projection?: ProjectionProp
  /** Show graticule grid lines */
  graticule?: boolean | import("../../stream/geoTypes").GraticuleConfig
  /** Optional background geography */
  areas?: AreasProp
  /** Style for background areas @default { fill: "#f0f0f0", stroke: "#ccc" } */
  areaStyle?: Style
  /** Tooltip config */
  tooltip?: TooltipProp
  /** Enable hover interaction. Defaults by chart mode. */
  enableHover?: boolean
  /** Show legend */
  showLegend?: boolean
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /** Legend position */
  legendPosition?: LegendPosition
  /**
   * Finite projection-fit fraction in `[0, 0.5)`. `0.1` = 10% inset;
   * nullish values use 0 and invalid values throw. An explicit
   * `frameProps.projectionExtent` remains authoritative.
   * @default 0
   */
  fitPadding?: number | null
  /** Enable zoom/pan. Defaults to true when tileURL is set, false otherwise. */
  zoomable?: boolean
  /** [minZoom, maxZoom] @default [1, 8] */
  zoomExtent?: [number, number]
  /** Zoom change callback */
  onZoom?: StreamGeoFrameProps["onZoom"]
  /**
   * When true, drag gestures rotate the projection (globe spinning)
   * instead of panning. Defaults to true for orthographic projection.
   */
  dragRotate?: boolean
  /** Raster tile URL template or function. Enables tile basemap (Mercator only). */
  tileURL?: string | ((z: number, x: number, y: number, dpr: number) => string)
  /** Attribution text for tile provider */
  tileAttribution?: string
  /** Max cached tiles @default 256 */
  tileCacheSize?: number
  /** Annotations */
  annotations?: Datum[]
  /** Passthrough */
  frameProps?: Partial<Omit<StreamGeoFrameProps, "points" | "projection">>
}

/**
 * ProportionalSymbolMap - Plot points on a map sized by a numeric value.
 *
 * Each row in `points` becomes a circle whose pixel radius is scaled from
 * `sizeBy`. Optional `colorBy` adds a categorical encoding; an optional
 * `areas` background gives geographic context.
 *
 * For value-per-region encodings use {@link ChoroplethMap}; for
 * directed-flow encodings use {@link FlowMap}.
 *
 * @example
 * ```tsx
 * // Cities sized by population
 * <ProportionalSymbolMap
 *   points={cities}                // [{ lon, lat, population, country }]
 *   xAccessor="lon"
 *   yAccessor="lat"
 *   sizeBy="population"
 *   sizeRange={[3, 30]}
 *   areas="world-110m"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color by region + tile basemap (Mercator)
 * <ProportionalSymbolMap
 *   points={cities}
 *   sizeBy="population"
 *   colorBy="region"
 *   projection="mercator"
 *   tileURL="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
 *   tileAttribution="© OpenStreetMap contributors"
 *   showLegend
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Push API — stream new observations onto the map.
 * // Include the id field in pushed data so remove()/update() can target it.
 * const ref = useRef<RealtimeFrameHandle>(null)
 * useEffect(() => {
 *   ref.current?.push({ id: "evt-1", lon: -73.9, lat: 40.7, magnitude: 5.2 })
 * }, [])
 *
 * <ProportionalSymbolMap
 *   ref={ref}
 *   sizeBy="magnitude"
 *   pointIdAccessor="id"
 * />
 * ```
 */
export const ProportionalSymbolMap = forwardRef(function ProportionalSymbolMap<TDatum extends Datum = Datum>(props: ProportionalSymbolMapProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const frameRef = useRef<StreamGeoFrameHandle>(null)
  useFrameImperativeHandle(ref, { variant: "geo-points", frameRef })

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showLegend: props.showLegend,
    enableHover: props.enableHover,
    linkedHover: props.linkedHover,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
      mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
})

  const {
    points,
    xAccessor = "lon",
    yAccessor = "lat",
    sizeBy,
    sizeRange: sizeRangeProp,
    colorBy,
    styleRules,
    colorScheme,
    projection = "equalEarth",
    graticule,
    fitPadding,
    zoomable: zoomableProp,
    zoomExtent,
    onZoom: onZoomProp,
    dragRotate,
    tileURL,
    tileAttribution,
    tileCacheSize,
    areas,
    areaStyle = GEO_BACKGROUND_AREA_STYLE,
    tooltip,
    annotations,
    margin: userMargin,
    className,
    selection,
    linkedHover,
    onObservation,
    onClick,
    chartId,
    loading,
    loadingContent,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    frameProps = {},
    stroke,
    strokeWidth,
    opacity,
  } = props

  const sizeRange: [number, number] = sizeRangeProp
    ?? (resolved.mode === "sparkline" ? SPARKLINE_SIZE_RANGE : DEFAULT_SIZE_RANGE)
  const defaultPointRadius = resolved.mode === "sparkline" ? 1.5 : 6

  // Tile maps default to zoomable; non-tile maps default to not zoomable
  const zoomable = zoomableProp ?? (tileURL ? true : false)

  const resolvedAreas = useReferenceAreas(areas)

  // ── All hooks must be called unconditionally (before any early returns) ──
  // `useChartSetup` filters `data` and `rawData` for `null`/non-object
  // entries internally and exposes the sanitized array as `setup.data`,
  // so we forward the raw `points` prop here (push mode is signaled by
  // `rawData === undefined`) and read `setup.data` for downstream
  // iteration. Avoids a redundant pre-setup filter pass per render.
  const setup = useChartSetup({
    // Stable empty fallback so push mode (`points === undefined`)
    // doesn't hand `useChartSetup` a fresh `[]` per render — which
    // would invalidate its sparse-filter `useMemo` and downstream
    // color/legend memos every parent render.
    data: points ?? (EMPTY_ARRAY as Datum[]),
    rawData: points,
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
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "ProportionalSymbolMap",
    chartId,
    showLegend: resolved.showLegend,
    userMargin,
    marginDefaults: resolveAxisFreeMarginDefaults(resolved),
    loading,
    loadingContent,
    emptyContent,
    width: resolved.width,
    height: resolved.height,
    hasTitle: !!resolved.title,
  })

  // Alias `setup.data` (sparse-filtered by useChartSetup) so the rest
  // of this HOC body still reads `safeData`.
  const safeData = setup.data

  // Compute size domain for scaling
  const sizeDomain = useMemo(() => {
    if (!sizeBy) return undefined
    const acc = typeof sizeBy === "function" ? sizeBy : (d: Datum) => d?.[sizeBy as string]
    const vals = safeData.filter(Boolean).map(d => acc(d)).filter(v => v != null && isFinite(v))
    if (vals.length === 0) return undefined
    return getMinMax(vals)
  }, [safeData, sizeBy])

  const pointStyleFn = useMemo(() => {
    const base = (d: Datum): Style & { r?: number } => ({
      fill: colorBy ? getColor(d, colorBy, setup.colorScale) : DEFAULT_COLOR,
      fillOpacity: 0.7,
      stroke: "#fff",
      strokeWidth: 0.5,
      r: sizeBy ? getSize(d, sizeBy, sizeRange, sizeDomain) : defaultPointRadius
    })
    const ruled = composeStyleRules(
      base,
      styleRules,
      makeNodeRuleContext(
        colorBy as string | ((d: Datum) => unknown) | undefined,
        sizeBy as string | ((d: Datum) => unknown) | undefined,
      ),
    ) as (d: Datum) => Style & { r?: number }
    const withPrimitives = mergeShapeStyle(ruled, { stroke, strokeWidth, opacity }) as (d: Datum) => Style & { r?: number }
    if (setup.effectiveSelectionHook) {
      return wrapStyleWithSelection(withPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection) as (d: Datum) => Style & { r?: number }
    }
    return withPrimitives
  }, [colorBy, setup.colorScale, setup.effectiveSelectionHook, setup.resolvedSelection, sizeBy, sizeRange, sizeDomain, defaultPointRadius, stroke, strokeWidth, opacity, styleRules])

  const defaultTooltip = useMemo(() => (d: Datum) => {
    // Try to find a human-readable name for the point
    const name = d?.name || d?.label || d?.NAME || d?.id
    const sizeField = typeof sizeBy === "string" ? sizeBy : null
    const sizeAcc = typeof sizeBy === "function" ? sizeBy : (datum: Datum) => datum[sizeBy as string]
    const sizeVal = sizeAcc(d)

    // Format numbers: use toLocaleString for large integers, limit decimals for floats
    const formatValue = (v: unknown): string => {
      if (typeof v !== "number" || !isFinite(v)) return String(v ?? "")
      if (Number.isInteger(v)) return v.toLocaleString()
      return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
    }

    // If colorBy is a string, show the category too
    const categoryField = typeof colorBy === "string" ? colorBy : null
    const categoryVal = categoryField ? d?.[categoryField] : null

    return (
      <div style={{ background: "rgba(0,0,0,0.85)", color: "white", padding: "6px 10px", borderRadius: 4, fontSize: 12 }}>
        {name && <div style={{ fontWeight: 600, marginBottom: 2 }}>{name}</div>}
        {sizeField && sizeVal != null && (
          <div><span style={{ opacity: 0.7 }}>{sizeField}: </span>{formatValue(sizeVal)}</div>
        )}
        {categoryField && categoryVal != null && (
          <div><span style={{ opacity: 0.7 }}>{categoryField}: </span>{String(categoryVal)}</div>
        )}
        {!name && !sizeField && (
          // Fallback: show first few fields, but format numbers
          Object.entries(d).filter(([k]) => k !== "data" && k !== "x" && k !== "y" && k !== "time").slice(0, 4).map(([k, v]) => (
            <div key={k}><span style={{ opacity: 0.7 }}>{k}: </span>{formatValue(v)}</div>
          ))
        )}
      </div>
    )
  }, [sizeBy, colorBy])

  // Loading / empty state — returned only after every hook above has run, so
  // the hook count is identical whether or not data is present. Mounting empty
  // (loading skeleton, no points) and then streaming in data must not change
  // the number of hooks between renders, or React throws "Rendered more hooks
  // than during the previous render."
  if (setup.earlyReturn) return setup.earlyReturn

  warnMissingField("ProportionalSymbolMap", safeData, "xAccessor", xAccessor)
  warnMissingField("ProportionalSymbolMap", safeData, "yAccessor", yAccessor)

  const streamProps: StreamGeoFrameProps = {
    projection,
    ...(points != null && { points: safeData }),
    xAccessor,
    yAccessor,
    pointStyle: pointStyleFn,
    ...(props.pointIdAccessor && { pointIdAccessor: props.pointIdAccessor }),
    ...(resolvedAreas && { areas: resolvedAreas, areaStyle }),
    ...(graticule != null && { graticule }),
    ...(fitPadding != null && { fitPadding }),
    ...(zoomable && { zoomable: true }),
    ...(zoomExtent && { zoomExtent }),
    ...(onZoomProp && { onZoom: onZoomProp }),
    ...(dragRotate != null && { dragRotate }),
    ...(tileURL && { tileURL }),
    ...(tileAttribution && { tileAttribution }),
    ...(tileCacheSize && { tileCacheSize }),
    size: [resolved.width, resolved.height],
    margin: setup.margin,
    enableHover: resolved.enableHover,
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltip),
    ...setup.legendBehaviorProps,
    ...buildCustomBehaviorProps({
      linkedHover,
      selection,
      onObservation,
      onClick,
      mobileInteraction: setup.mobileInteraction,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
      linkedHoverInClickPredicate: false,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(props.autoPlaceAnnotations !== undefined && { autoPlaceAnnotations: props.autoPlaceAnnotations }),
    ...(resolved.title && { title: resolved.title }),
    ...(resolved.description && { description: resolved.description }),
    ...(resolved.summary && { summary: resolved.summary }),
    ...(resolved.accessibleTable !== undefined && { accessibleTable: resolved.accessibleTable }),
    ...(className && { className }),
    ...(props.animate != null && { animate: props.animate }),
    ...frameProps
  }

  return (
    <SafeRender componentName="ProportionalSymbolMap" width={resolved.width} height={resolved.height}>
      <StreamGeoFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <TDatum extends Datum = Datum>(props: ProportionalSymbolMapProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
ProportionalSymbolMap.displayName = "ProportionalSymbolMap"
