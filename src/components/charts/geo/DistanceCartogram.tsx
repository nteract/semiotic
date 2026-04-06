"use client"
import * as React from "react"
import { useMemo, useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react"
import StreamGeoFrame from "../../stream/StreamGeoFrame"
import type { StreamGeoFrameProps, StreamGeoFrameHandle, ProjectionProp, DistanceCartogramConfig } from "../../stream/geoTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendPosition } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { Style } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"

export interface DistanceCartogramProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  /** Point data with geographic coordinates */
  points?: TDatum[]
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
  /** Show concentric distance rings around center. true for auto intervals, number for ring count, or number[] for explicit cost values. @default true */
  showRings?: boolean | number | number[]
  /** Ring style overrides */
  ringStyle?: { stroke?: string; strokeWidth?: number; strokeDasharray?: string; labelColor?: string; labelSize?: number }
  /** Show north indicator arrow @default true */
  showNorth?: boolean
  /** Label for cost units shown on rings (e.g. "hrs", "km") */
  costLabel?: string
  /** Annotations */
  annotations?: Record<string, any>[]
  /** Passthrough */
  frameProps?: Partial<Omit<StreamGeoFrameProps, "projection">>
}

export const DistanceCartogram = forwardRef(function DistanceCartogram<TDatum extends Record<string, any> = Record<string, any>>(props: DistanceCartogramProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    colorScheme,
    pointRadius = 5,
    tooltip,
    showRings = true,
    ringStyle,
    showNorth = true,
    costLabel,
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
    legendPosition: legendPositionProp,
    frameProps = {}
  } = props

  // Tile maps default to zoomable; non-tile maps default to not zoomable
  const zoomable = zoomableProp ?? (tileURL ? true : false)

  const safeData = points || []

  // ── All hooks must be called unconditionally (before any early returns) ──

  const { activeSelectionHook, customHoverBehavior, customClickBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    onObservation,
    onClick,
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

  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: safeData,
    colorBy,
    colorScale,
    showLegend: resolved.showLegend,
    legendPosition: legendPositionProp,
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
    const nodeLookup = new Map<string, Record<string, any>>()
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

  // ── Ref + layout state for overlay rendering ─────────────────────
  const geoRef = useRef<StreamGeoFrameHandle>(null)
  useImperativeHandle(ref, () => ({
    push: (point) => geoRef.current?.push(point),
    pushMany: (points) => geoRef.current?.pushMany(points),
    remove: (id) => geoRef.current?.removePoint(id) ?? [],
    update: (id, updater) => {
      const removed = geoRef.current?.removePoint(id) ?? []
      for (const old of removed) geoRef.current?.push(updater(old))
      return removed
    },
    clear: () => geoRef.current?.clear(),
    getData: () => geoRef.current?.getData() ?? []
  }))

  const [cartogramLayout, setCartogramLayout] = useState<{
    cx: number; cy: number; maxCost: number; availableRadius: number
  } | null>(null)

  // Read layout after each render cycle (store computes it synchronously in computeScene)
  const readLayout = useCallback(() => {
    const layout = geoRef.current?.getCartogramLayout?.()
    if (layout) {
      setCartogramLayout(prev => {
        if (prev && prev.cx === layout.cx && prev.cy === layout.cy &&
            prev.maxCost === layout.maxCost && prev.availableRadius === layout.availableRadius) return prev
        return layout
      })
    }
  }, [])

  // Re-read when inputs that affect layout change
  useEffect(() => {
    // Use rAF to read after the frame renders
    const id = requestAnimationFrame(readLayout)
    return () => cancelAnimationFrame(id)
  }, [readLayout, strength, center, resolved.width, resolved.height, safeData])

  // ── Compute ring radii ──────────────────────────────────────────
  const ringValues = useMemo(() => {
    if (!showRings || !cartogramLayout) return []
    const { maxCost, availableRadius } = cartogramLayout
    if (maxCost <= 0) return []

    if (Array.isArray(showRings)) return showRings.filter(v => v > 0 && v <= maxCost)

    // Auto or explicit count
    const count = typeof showRings === "number" ? showRings : Math.min(5, Math.max(2, Math.ceil(maxCost / 5)))
    const step = maxCost / count
    const values: number[] = []
    for (let i = 1; i <= count; i++) {
      values.push(Math.round(step * i * 10) / 10)
    }
    return values
  }, [showRings, cartogramLayout])

  // ── Foreground SVG overlay ──────────────────────────────────────
  const overlayGraphics = useMemo(() => {
    if (!cartogramLayout) return frameProps.foregroundGraphics || null
    const { cx, cy, maxCost, availableRadius } = cartogramLayout
    const rs = {
      stroke: "#999",
      strokeWidth: 0.8,
      strokeDasharray: "4,3",
      labelColor: "#777",
      labelSize: 10,
      ...ringStyle
    }

    // Adjust positions for margin
    const mx = margin.left ?? 10
    const my = margin.top ?? 10

    return (
      <g>
        {/* Concentric distance rings */}
        {ringValues.map((cost) => {
          const r = (cost / maxCost) * availableRadius
          return (
            <g key={cost}>
              <circle
                cx={cx + mx}
                cy={cy + my}
                r={r}
                fill="none"
                stroke={rs.stroke}
                strokeWidth={rs.strokeWidth}
                strokeDasharray={rs.strokeDasharray}
                opacity={0.5}
              />
              <text
                x={cx + mx + r + 3}
                y={cy + my - 2}
                fontSize={rs.labelSize}
                fill={rs.labelColor}
                fontFamily="system-ui, sans-serif"
              >
                {cost}{costLabel ? ` ${costLabel}` : ""}
              </text>
            </g>
          )
        })}

        {/* North indicator */}
        {showNorth && (
          <g transform={`translate(${mx + 24}, ${my + 24})`}>
            {/* Circle background */}
            <circle r={16} fill="white" fillOpacity={0.85} stroke="#bbb" strokeWidth={0.8} />
            {/* Arrow pointing up (north) */}
            <path
              d="M0,-11 L3,-3 L1,-4 L1,7 L-1,7 L-1,-4 L-3,-3 Z"
              fill="#555"
              stroke="none"
            />
            {/* N label */}
            <text
              y={-12}
              textAnchor="middle"
              fontSize={7}
              fontWeight={700}
              fill="#555"
              fontFamily="system-ui, sans-serif"
            >
              N
            </text>
            {/* Tick marks for E, S, W */}
            <line x1={11} y1={0} x2={13} y2={0} stroke="#bbb" strokeWidth={0.8} />
            <line x1={-11} y1={0} x2={-13} y2={0} stroke="#bbb" strokeWidth={0.8} />
            <line x1={0} y1={11} x2={0} y2={13} stroke="#bbb" strokeWidth={0.8} />
          </g>
        )}

        {/* Pass through any user foregroundGraphics */}
        {frameProps.foregroundGraphics}
      </g>
    )
  }, [cartogramLayout, ringValues, showNorth, costLabel, ringStyle, margin, frameProps.foregroundGraphics])

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(loading, resolved.width, resolved.height)
  const emptyEl = !loadingEl ? renderEmptyState(points, resolved.width, resolved.height, emptyContent) : null

  warnMissingField("DistanceCartogram", safeData, "xAccessor", xAccessor)
  warnMissingField("DistanceCartogram", safeData, "yAccessor", yAccessor)

  const streamProps: StreamGeoFrameProps = {
    projection,
    ...(points != null && { points: safeData }),
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
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltip),
    ...(legend && { legend, legendPosition }),
    ...((linkedHover || onObservation || onClick) && { customHoverBehavior }),
    ...((onObservation || onClick) && { customClickBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(resolved.title && { title: resolved.title }),
    ...(resolved.description && { description: resolved.description }),
    ...(resolved.summary && { summary: resolved.summary }),
    ...(resolved.accessibleTable !== undefined && { accessibleTable: resolved.accessibleTable }),
    ...(className && { className }),
    ...frameProps,
    // Override foregroundGraphics with our overlay (which includes user's foregroundGraphics)
    ...(overlayGraphics && { foregroundGraphics: overlayGraphics })
  }

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl

  return (
    <SafeRender componentName="DistanceCartogram" width={resolved.width} height={resolved.height}>
      <StreamGeoFrame ref={geoRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: DistanceCartogramProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
DistanceCartogram.displayName = "DistanceCartogram"
