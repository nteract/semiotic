"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamGeoFrame from "../../stream/StreamGeoFrame"
import type { StreamGeoFrameProps, ProjectionProp, DistanceCartogramConfig } from "../../stream/geoTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { Style } from "../../stream/types"

export interface DistanceCartogramProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  /** Point data with geographic coordinates */
  points: TDatum[]
  /** Route/edge data with source/target fields */
  lines?: { source: string; target: string; coordinates?: any[]; [key: string]: any }[]
  /** Longitude accessor @default "lon" */
  xAccessor?: ChartAccessor<TDatum, number>
  /** Latitude accessor @default "lat" */
  yAccessor?: ChartAccessor<TDatum, number>
  /** Node ID accessor @default "id" */
  nodeIdAccessor?: string
  /** ID of the center point */
  center: string
  /** Cost/distance accessor — numeric field or function */
  costAccessor: string | ((d: any) => number)
  /** Interpolation between geographic (0) and cartogram (1) @default 1 */
  strength?: number
  /** Line rendering mode @default "straight" */
  lineMode?: "straight" | "fractional"
  /** Base geographic projection @default "mercator" */
  projection?: ProjectionProp
  /** Show graticule grid lines */
  graticule?: boolean | import("../../stream/geoTypes").GraticuleConfig
  /** Transition duration in ms when center/strength changes */
  transition?: number
  /** Field to determine point color */
  colorBy?: ChartAccessor<TDatum, string>
  /** Color scheme @default "category10" */
  colorScheme?: string | string[]
  /** Point radius @default 5 */
  pointRadius?: number
  /** Tooltip */
  tooltip?: TooltipProp
  /** Show legend */
  showLegend?: boolean
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
  frameProps?: Partial<Omit<StreamGeoFrameProps, "projection">>
}

export function DistanceCartogram<TDatum extends Record<string, any> = Record<string, any>>(
  props: DistanceCartogramProps<TDatum>
) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showLegend: props.showLegend,
    title: props.title,
  })

  const {
    points,
    lines,
    xAccessor = "lon",
    yAccessor = "lat",
    nodeIdAccessor = "id",
    center,
    costAccessor,
    strength = 1,
    lineMode = "straight",
    projection = "mercator",
    graticule,
    fitPadding,
    zoomable: zoomableProp,
    zoomExtent,
    onZoom: onZoomProp,
    dragRotate,
    tileURL,
    tileAttribution,
    tileCacheSize,
    transition: transitionDuration,
    colorBy,
    colorScheme = "category10",
    pointRadius = 5,
    tooltip,
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

  const loadingEl = renderLoadingState(loading, resolved.width, resolved.height)
  if (loadingEl) return loadingEl
  const emptyEl = renderEmptyState(points, resolved.width, resolved.height, emptyContent)
  if (emptyEl) return emptyEl

  const safeData = points || []

  warnMissingField("DistanceCartogram", safeData, "xAccessor", xAccessor)
  warnMissingField("DistanceCartogram", safeData, "yAccessor", yAccessor)

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    onObservation,
    chartType: "DistanceCartogram",
    chartId
  })

  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  const pointStyleFn = useMemo(() => {
    const base = (d: Record<string, any>): Style & { r?: number } => ({
      fill: colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR,
      fillOpacity: 0.8,
      stroke: "#fff",
      strokeWidth: 1,
      r: pointRadius
    })
    if (activeSelectionHook) {
      return wrapStyleWithSelection(base, activeSelectionHook, selection) as (d: any) => Style & { r?: number }
    }
    return base
  }, [colorBy, colorScale, pointRadius, activeSelectionHook, selection])

  const { legend, margin } = useChartLegendAndMargin({
    data: safeData,
    colorBy,
    colorScale,
    showLegend: resolved.showLegend,
    userMargin,
    defaults: { top: 10, bottom: 10, left: 10, right: 10 }
  })

  // Build cartogram config
  const cartogramConfig: DistanceCartogramConfig = useMemo(() => ({
    center,
    centerAccessor: nodeIdAccessor,
    costAccessor,
    strength,
    lineMode
  }), [center, nodeIdAccessor, costAccessor, strength, lineMode])

  // Convert lines to format StreamGeoFrame expects
  const lineData = useMemo(() => {
    if (!lines) return undefined
    const xAcc = typeof xAccessor === "function" ? xAccessor : (d: any) => d[xAccessor as string]
    const yAcc = typeof yAccessor === "function" ? yAccessor : (d: any) => d[yAccessor as string]

    // Build node lookup for edge coordinates
    const nodeLookup = new Map<string, TDatum>()
    for (const node of safeData) {
      nodeLookup.set(String(node[nodeIdAccessor]), node)
    }

    return lines.map(line => {
      if (line.coordinates) return line
      const src = nodeLookup.get(String(line.source))
      const tgt = nodeLookup.get(String(line.target))
      if (!src || !tgt) return null
      return {
        ...line,
        coordinates: [
          { [xAccessor as string]: xAcc(src), [yAccessor as string]: yAcc(src) },
          { [xAccessor as string]: xAcc(tgt), [yAccessor as string]: yAcc(tgt) }
        ]
      }
    }).filter(Boolean) as Record<string, any>[]
  }, [lines, safeData, xAccessor, yAccessor, nodeIdAccessor])

  const defaultTooltip = useMemo(() => (d: any) => {
    const costAcc = typeof costAccessor === "function" ? costAccessor : (datum: any) => datum[costAccessor as string]
    const cost = costAcc(d)
    const name = d[nodeIdAccessor] || d.name || d.id || "Point"
    return (
      <div style={{ background: "rgba(0,0,0,0.85)", color: "white", padding: "6px 10px", borderRadius: 4, fontSize: 12 }}>
        <div style={{ fontWeight: 600 }}>{name}</div>
        {cost != null && <div style={{ opacity: 0.7 }}>Cost: {typeof cost === "number" ? cost.toFixed(1) : cost}</div>}
      </div>
    )
  }, [costAccessor, nodeIdAccessor])

  const streamProps: StreamGeoFrameProps = {
    projection,
    points: safeData,
    ...(lineData && { lines: lineData, lineDataAccessor: "coordinates" }),
    xAccessor: xAccessor as any,
    yAccessor: yAccessor as any,
    pointIdAccessor: nodeIdAccessor,
    pointStyle: pointStyleFn,
    projectionTransform: cartogramConfig,
    ...(transitionDuration && { transition: { duration: transitionDuration } }),
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
    tooltipContent: normalizeTooltip(tooltip) || defaultTooltip,
    ...(legend && { legend }),
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(resolved.title && { title: resolved.title }),
    ...(className && { className }),
    ...frameProps
  }

  return (
    <SafeRender componentName="DistanceCartogram" width={resolved.width} height={resolved.height}>
      <StreamGeoFrame {...streamProps} />
    </SafeRender>
  )
}

DistanceCartogram.displayName = "DistanceCartogram"
