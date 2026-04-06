"use client"
import * as React from "react"
import { useMemo, useRef, useImperativeHandle, forwardRef } from "react"
import StreamGeoFrame from "../../stream/StreamGeoFrame"
import type { StreamGeoFrameProps, StreamGeoFrameHandle, ProjectionProp } from "../../stream/geoTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { getColor, getSize } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, useChartMode, useLegendInteraction, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { Style } from "../../stream/types"
import { useReferenceAreas, type AreasProp } from "../../geo/useReferenceAreas"

export interface ProportionalSymbolMapProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  /** Point data with geographic coordinates */
  points?: TDatum[]
  /** Longitude accessor @default "lon" */
  xAccessor?: ChartAccessor<TDatum, number>
  /** Latitude accessor @default "lat" */
  yAccessor?: ChartAccessor<TDatum, number>
  /** Field to scale point size */
  sizeBy: ChartAccessor<TDatum, number>
  /** Min and max radius @default [3, 30] */
  sizeRange?: [number, number]
  /** Field to determine point color */
  colorBy?: ChartAccessor<TDatum, string>
  /** Color scheme @default "category10" */
  colorScheme?: string | string[]
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
  /** Show legend */
  showLegend?: boolean
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /** Legend position */
  legendPosition?: LegendPosition
  /** Padding fraction for auto-fit projection. 0.1 = 10% inset from edges. @default 0 */
  fitPadding?: number
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
  annotations?: Record<string, any>[]
  /** Passthrough */
  frameProps?: Partial<Omit<StreamGeoFrameProps, "points" | "projection">>
}

export const ProportionalSymbolMap = forwardRef(function ProportionalSymbolMap<TDatum extends Record<string, any> = Record<string, any>>(props: ProportionalSymbolMapProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const frameRef = useRef<StreamGeoFrameHandle>(null)
  useImperativeHandle(ref, () => ({
    push: (point) => frameRef.current?.push(point),
    pushMany: (points) => frameRef.current?.pushMany(points),
    remove: (id) => frameRef.current?.removePoint(id) ?? [],
    update: (id, updater) => {
      const removed = frameRef.current?.removePoint(id) ?? []
      for (const old of removed) frameRef.current?.push(updater(old))
      return removed
    },
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getData() ?? []
  }))

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showLegend: props.showLegend,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
  })

  const {
    points,
    xAccessor = "lon",
    yAccessor = "lat",
    sizeBy,
    sizeRange = [3, 30],
    colorBy,
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
    areaStyle = { fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 },
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
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    frameProps = {}
  } = props

  // Tile maps default to zoomable; non-tile maps default to not zoomable
  const zoomable = zoomableProp ?? (tileURL ? true : false)

  const resolvedAreas = useReferenceAreas(areas)

  const safeData = points || []

  // ── All hooks must be called unconditionally (before any early returns) ──

  const { activeSelectionHook, customHoverBehavior, customClickBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    onObservation,
    onClick,
    chartType: "ProportionalSymbolMap",
    chartId
  })

  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  // Compute size domain for scaling
  const sizeDomain = useMemo(() => {
    if (!sizeBy) return undefined
    const acc = typeof sizeBy === "function" ? sizeBy : (d: any) => d[sizeBy as string]
    const vals = safeData.map(d => acc(d)).filter(v => v != null && isFinite(v))
    if (vals.length === 0) return undefined
    return [Math.min(...vals), Math.max(...vals)] as [number, number]
  }, [safeData, sizeBy])

  const pointStyleFn = useMemo(() => {
    const base = (d: Record<string, any>): Style & { r?: number } => ({
      fill: colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR,
      fillOpacity: 0.7,
      stroke: "#fff",
      strokeWidth: 0.5,
      r: sizeBy ? getSize(d, sizeBy, sizeRange, sizeDomain) : 6
    })
    if (activeSelectionHook) {
      return wrapStyleWithSelection(base, activeSelectionHook, selection) as (d: any) => Style & { r?: number }
    }
    return base
  }, [colorBy, colorScale, sizeBy, sizeRange, sizeDomain, activeSelectionHook, selection])

  const allCategories = useMemo(() => {
    if (!colorBy) return []
    const acc = typeof colorBy === "function" ? colorBy : (d: any) => d[colorBy as string]
    const vals = new Set<string>()
    for (const d of safeData) {
      const v = acc(d)
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [safeData, colorBy])

  const legendState = useLegendInteraction(legendInteraction, colorBy, allCategories)

  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: safeData,
    colorBy,
    colorScale,
    showLegend: resolved.showLegend,
    legendPosition: legendPositionProp,
    userMargin,
    defaults: { top: 10, bottom: 10, left: 10, right: 10 }
  })

  const defaultTooltip = useMemo(() => (d: any) => {
    // Try to find a human-readable name for the point
    const name = d?.name || d?.label || d?.NAME || d?.id
    const sizeField = typeof sizeBy === "string" ? sizeBy : null
    const sizeAcc = typeof sizeBy === "function" ? sizeBy : (datum: any) => datum[sizeBy as string]
    const sizeVal = sizeAcc(d)

    // Format numbers: use toLocaleString for large integers, limit decimals for floats
    const formatValue = (v: any): string => {
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

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(loading, resolved.width, resolved.height)
  const emptyEl = !loadingEl ? renderEmptyState(points, resolved.width, resolved.height, emptyContent) : null

  warnMissingField("ProportionalSymbolMap", safeData, "xAccessor", xAccessor)
  warnMissingField("ProportionalSymbolMap", safeData, "yAccessor", yAccessor)

  const streamProps: StreamGeoFrameProps = {
    projection,
    ...(points != null && { points: safeData }),
    xAccessor: xAccessor as any,
    yAccessor: yAccessor as any,
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
    margin,
    enableHover: true,
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltip),
    ...(legend && { legend, legendPosition }),
    ...(legendInteraction && legendInteraction !== "none" && {
      legendHoverBehavior: legendState.onLegendHover,
      legendClickBehavior: legendState.onLegendClick,
      legendHighlightedCategory: legendState.highlightedCategory,
      legendIsolatedCategories: legendState.isolatedCategories,
    }),
    ...((linkedHover || onObservation || onClick) && { customHoverBehavior }),
    ...((onObservation || onClick) && { customClickBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(resolved.title && { title: resolved.title }),
    ...(resolved.description && { description: resolved.description }),
    ...(resolved.summary && { summary: resolved.summary }),
    ...(resolved.accessibleTable !== undefined && { accessibleTable: resolved.accessibleTable }),
    ...(className && { className }),
    ...frameProps
  }

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl

  return (
    <SafeRender componentName="ProportionalSymbolMap" width={resolved.width} height={resolved.height}>
      <StreamGeoFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: ProportionalSymbolMapProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
ProportionalSymbolMap.displayName = "ProportionalSymbolMap"
