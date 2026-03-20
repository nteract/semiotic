"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamGeoFrame from "../../stream/StreamGeoFrame"
import type { StreamGeoFrameProps, ProjectionProp } from "../../stream/geoTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, useChartSelection, useChartLegendAndMargin, useChartMode, useLegendInteraction, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import { scaleSequential } from "d3-scale"
import { interpolateBlues, interpolateReds, interpolateGreens, interpolateViridis } from "d3-scale-chromatic"
import { extent } from "d3-array"
import type { Style } from "../../stream/types"
import { useReferenceAreas, type AreasProp } from "../../geo/useReferenceAreas"

const SCHEME_MAP: Record<string, (t: number) => string> = {
  blues: interpolateBlues,
  reds: interpolateReds,
  greens: interpolateGreens,
  viridis: interpolateViridis
}

export interface ChoroplethMapProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  /** GeoJSON features or a reference string ("world-110m", "world-50m", "land-110m", "land-50m") */
  areas: AreasProp
  /** Accessor for the numeric value to encode as color */
  valueAccessor: ChartAccessor<TDatum, number>
  /** Sequential color scheme @default "blues" */
  colorScheme?: string
  /** Geographic projection @default "equalEarth" */
  projection?: ProjectionProp
  /** Show graticule grid lines */
  graticule?: boolean | import("../../stream/geoTypes").GraticuleConfig
  /** Tooltip config */
  tooltip?: TooltipProp
  /** Show legend @default true */
  showLegend?: boolean
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
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
  /** Fill opacity for area polygons. Useful for layering over tile basemaps. @default 1 */
  areaOpacity?: number
  /** Annotations */
  annotations?: Record<string, any>[]
  /** Passthrough to StreamGeoFrame */
  frameProps?: Partial<Omit<StreamGeoFrameProps, "areas" | "projection">>
}

export function ChoroplethMap<TDatum extends Record<string, any> = Record<string, any>>(props: ChoroplethMapProps<TDatum>) {

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showLegend: props.showLegend,
    title: props.title,
  })

  const {
    areas,
    valueAccessor,
    colorScheme = "blues",
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
    tooltip,
    areaOpacity = 1,
    annotations,
    margin: userMargin,
    className,
    selection,
    linkedHover,
    onObservation,
    chartId,
    loading,
    emptyContent,
    frameProps = {}
  } = props

  // Tile maps default to zoomable; non-tile maps default to not zoomable
  const zoomable = zoomableProp ?? (tileURL ? true : false)

  // Resolve string reference ("world-110m") or use features directly
  const resolvedAreas = useReferenceAreas(areas)

  // ── All hooks must be called unconditionally (before any early returns) ──

  const valAcc = useMemo(() =>
    typeof valueAccessor === "function"
      ? valueAccessor
      : (d: any) => d?.properties?.[valueAccessor] ?? d?.[valueAccessor],
    [valueAccessor]
  )

  // Build sequential color scale
  const colorScale = useMemo(() => {
    if (!resolvedAreas) return scaleSequential(interpolateBlues).domain([0, 1])
    const values = resolvedAreas.map(f => valAcc(f)).filter(v => v != null && isFinite(v))
    const [min, max] = extent(values) as [number, number]
    const interpolator = SCHEME_MAP[colorScheme] || interpolateBlues
    return scaleSequential(interpolator).domain([min ?? 0, max ?? 1])
  }, [resolvedAreas, valAcc, colorScheme])

  // Selection
  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection,
    linkedHover,
    onObservation,
    chartType: "ChoroplethMap",
    chartId
  })

  // Area style
  const areaStyleFn = useMemo(() => {
    const base = (d: any): Style => {
      const val = valAcc(d)
      return {
        fill: val != null && isFinite(val) ? colorScale(val) : "#ccc",
        stroke: "#999",
        strokeWidth: 0.5,
        fillOpacity: areaOpacity
      }
    }
    if (activeSelectionHook) {
      return wrapStyleWithSelection(base, activeSelectionHook, selection) as (d: any) => Style
    }
    return base
  }, [valAcc, colorScale, activeSelectionHook, selection, areaOpacity])

  // Default tooltip — check both nested properties and flattened fields
  // (StreamGeoFrame flattens feature.properties onto the hover object)
  const defaultTooltip = useMemo(() => (d: any) => {
    const name = d?.properties?.name || d?.properties?.NAME || d?.name || d?.NAME || "Feature"
    const val = valAcc(d)

    const formatValue = (v: any): string => {
      if (typeof v !== "number" || !isFinite(v)) return String(v ?? "")
      if (Number.isInteger(v)) return v.toLocaleString()
      return v.toLocaleString(undefined, { maximumFractionDigits: 2 })
    }

    return (
      <div style={{ background: "rgba(0,0,0,0.85)", color: "white", padding: "6px 10px", borderRadius: 4, fontSize: 12 }}>
        <div style={{ fontWeight: 600 }}>{name}</div>
        {val != null && <div style={{ opacity: 0.7 }}>{formatValue(val)}</div>}
      </div>
    )
  }, [valAcc])

  const margin = useMemo(() => ({
    top: 10, right: 10, bottom: 10, left: 10,
    ...userMargin
  }), [userMargin])

  // ── Early returns (after all hooks) ─────────────────────────────────

  const loadingEl = renderLoadingState(loading, resolved.width, resolved.height)
  if (loadingEl) return loadingEl

  // Show loading state while reference geography is loading (async resolve in progress)
  if (!resolvedAreas) {
    return renderLoadingState(true, resolved.width, resolved.height) || null
  }

  const emptyEl = renderEmptyState(resolvedAreas, resolved.width, resolved.height, emptyContent)
  if (emptyEl) return emptyEl

  // Validate areas is a valid GeoJSON feature array.
  // We skip accessor validation here because valueAccessor resolves through
  // properties (d.properties[field]) which validateArrayData doesn't understand.
  if (Array.isArray(resolvedAreas) && resolvedAreas.length > 0) {
    const sample = resolvedAreas[0]
    if (!sample || typeof sample !== "object" || !sample.geometry) {
      return <ChartError componentName="ChoroplethMap" message="ChoroplethMap: areas must be an array of GeoJSON Features with a geometry property." width={resolved.width} height={resolved.height} />
    }
  }

  const streamProps: StreamGeoFrameProps = {
    projection,
    areas: resolvedAreas,
    areaStyle: areaStyleFn,
    size: [resolved.width, resolved.height],
    margin,
    enableHover: true,
    tooltipContent: tooltip === false ? () => null : tooltip === true ? defaultTooltip : (normalizeTooltip(tooltip) || defaultTooltip),
    ...(graticule != null && { graticule }),
    ...(fitPadding != null && { fitPadding }),
    ...(zoomable && { zoomable: true }),
    ...(zoomExtent && { zoomExtent }),
    ...(onZoomProp && { onZoom: onZoomProp }),
    ...(dragRotate != null && { dragRotate }),
    ...(tileURL && { tileURL }),
    ...(tileAttribution && { tileAttribution }),
    ...(tileCacheSize && { tileCacheSize }),
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(resolved.title && { title: resolved.title }),
    ...(className && { className }),
    ...frameProps
  }

  return (
    <SafeRender componentName="ChoroplethMap" width={resolved.width} height={resolved.height}>
      <StreamGeoFrame {...streamProps} />
    </SafeRender>
  )
}
ChoroplethMap.displayName = "ChoroplethMap"
