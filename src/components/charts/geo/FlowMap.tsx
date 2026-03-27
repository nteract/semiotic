"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamGeoFrame from "../../stream/StreamGeoFrame"
import type { StreamGeoFrameProps, ProjectionProp } from "../../stream/geoTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { normalizeLinkedHover, wrapStyleWithSelection } from "../shared/selectionUtils"
import type { SelectionHookResult } from "../shared/selectionUtils"
import { useSelection, useLinkedHover } from "../../store/useSelection"
import { useObservationSelector } from "../../store/ObservationStore"
import type { OnObservationCallback, ChartObservation } from "../../store/ObservationStore"
import type { Style } from "../../stream/types"
import type { GeoParticleStyle } from "../../stream/GeoParticlePool"
import { scaleLinear } from "d3-scale"
import { useReferenceAreas, type AreasProp } from "../../geo/useReferenceAreas"

export interface FlowMapProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  /** Flow edges with source/target/value */
  flows?: { source: string; target: string; value?: number; [key: string]: any }[]
  /** Geographic nodes with coordinates */
  nodes?: TDatum[]
  /** Node ID accessor @default "id" */
  nodeIdAccessor?: string
  /** Longitude accessor @default "lon" */
  xAccessor?: ChartAccessor<TDatum, number>
  /** Latitude accessor @default "lat" */
  yAccessor?: ChartAccessor<TDatum, number>
  /** Value accessor for edge width @default "value" */
  valueAccessor?: string
  /** Projection @default "equalEarth" */
  projection?: ProjectionProp
  /** Show graticule grid lines */
  graticule?: boolean | import("../../stream/geoTypes").GraticuleConfig
  /** Line type: "geo" for great circles, "line" for straight @default "geo" */
  lineType?: "geo" | "line"
  /** Flow rendering style: "basic" (straight/great-circle), "offset" (bidirectional offset), "arc" (curved arcs) @default "basic" */
  flowStyle?: "basic" | "offset" | "arc"
  /** Optional background areas */
  areas?: AreasProp
  /** Background area style */
  areaStyle?: Style
  /** Edge color accessor */
  edgeColorBy?: ChartAccessor<any, string>
  /** Edge opacity @default 0.6 */
  edgeOpacity?: number
  /** Min/max pixel width for proportional edge width @default [1, 8] */
  edgeWidthRange?: [number, number]
  /** Line cap style for flow edges @default "round" */
  edgeLinecap?: "butt" | "round" | "square"
  /** Color scheme for edges @default "category10" */
  colorScheme?: string | string[]
  /** Show animated particles along flow lines */
  showParticles?: boolean
  /** Particle appearance and behavior */
  particleStyle?: GeoParticleStyle
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

export function FlowMap<TDatum extends Record<string, any> = Record<string, any>>(props: FlowMapProps<TDatum>) {

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showLegend: props.showLegend,
    title: props.title,
    description: props.description,
    summary: props.summary,
  })

  const {
    flows,
    nodes,
    nodeIdAccessor = "id",
    xAccessor = "lon",
    yAccessor = "lat",
    valueAccessor = "value",
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
    lineType = "geo",
    flowStyle = "basic",
    areas,
    areaStyle = { fill: "#f0f0f0", stroke: "#ccc", strokeWidth: 0.5 },
    edgeColorBy,
    edgeOpacity = 0.6,
    edgeWidthRange = [1, 8],
    edgeLinecap = "round",
    colorScheme = "category10",
    showParticles,
    particleStyle,
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

  const resolvedAreas = useReferenceAreas(areas)

  // ── Selection hooks (custom for flow-aware hover) ───────────────────
  // All hooks must be called unconditionally (before any early returns)

  const hoverConfig = normalizeLinkedHover(linkedHover)

  const selectionHook = useSelection({
    name: selection?.name || "__unused__",
    fields: hoverConfig?.fields || []
  })

  const linkedHoverHook = useLinkedHover({
    name: hoverConfig?.name || "hover",
    fields: hoverConfig?.fields || []
  })

  const pushObservation = useObservationSelector(
    (state: any) => state.pushObservation
  ) as ((obs: ChartObservation) => void) | undefined

  const activeSelectionHook: SelectionHookResult | null = selection
    ? { isActive: selectionHook.isActive, predicate: selectionHook.predicate }
    : null

  const safeFlows = flows || []
  const safeNodes = (nodes || []) as Record<string, any>[]

  const colorScale = useColorScale(safeFlows, edgeColorBy, colorScheme)

  // Build node lookup
  const nodeLookup = useMemo(() => {
    const map = new Map<string, Record<string, any>>()
    for (const node of safeNodes) {
      map.set(String(node[nodeIdAccessor]), node)
    }
    return map
  }, [safeNodes, nodeIdAccessor])

  // Reverse lookup: nodeId → first flow touching that node
  // Used to emit flow-relevant fields when a point node is hovered
  const nodeFlowLookup = useMemo(() => {
    const map = new Map<string, (typeof safeFlows)[0]>()
    for (const flow of safeFlows) {
      if (!flow || typeof flow !== "object") continue
      if (flow.source != null && !map.has(flow.source)) map.set(flow.source, flow)
      if (flow.target != null && !map.has(flow.target)) map.set(flow.target, flow)
    }
    return map
  }, [safeFlows])

  // Custom hover behavior: when a point is hovered, emit the associated
  // flow's datum so that source/target fields are available for selection
  const customHoverBehavior = useCallback(
    (d: Record<string, any> | null) => {
      if (linkedHover) {
        if (d) {
          let datum = d.data || d.datum || d
          if (Array.isArray(datum)) datum = datum[0]

          if (d.type === "point") {
            // Point hovered — find an associated flow and emit it
            const nodeId = String(datum[nodeIdAccessor])
            const flow = nodeFlowLookup.get(nodeId)
            if (flow) {
              linkedHoverHook.onHover(flow)
            }
          } else {
            linkedHoverHook.onHover(datum)
          }
        } else {
          linkedHoverHook.onHover(null)
        }
      }

      // Emit observation events
      if (onObservation || pushObservation) {
        const now = Date.now()
        const base = { timestamp: now, chartType: "FlowMap" as string, chartId }
        if (d) {
          let datum = d.data || d.datum || d
          if (Array.isArray(datum)) datum = datum[0]
          const obs: ChartObservation = {
            ...base, type: "hover",
            datum: datum || {}, x: d.x ?? 0, y: d.y ?? 0,
          }
          if (onObservation) onObservation(obs)
          if (pushObservation) pushObservation(obs)
        } else {
          const obs: ChartObservation = { ...base, type: "hover-end" }
          if (onObservation) onObservation(obs)
          if (pushObservation) pushObservation(obs)
        }
      }
    },
    [linkedHover, linkedHoverHook, nodeIdAccessor, nodeFlowLookup, onObservation, chartId, pushObservation]
  )

  // Convert flows to line data
  const lineData = useMemo(() => {
    const xAcc = typeof xAccessor === "function" ? xAccessor : (d: any) => d[xAccessor as string]
    const yAcc = typeof yAccessor === "function" ? yAccessor : (d: any) => d[yAccessor as string]

    return safeFlows.map(flow => {
      if (!flow || typeof flow !== "object" || flow.source == null || flow.target == null) return null
      const src = nodeLookup.get(String(flow.source))
      const tgt = nodeLookup.get(String(flow.target))
      if (!src || !tgt) return null
      return {
        ...flow,
        coordinates: [
          { [xAccessor as string]: xAcc(src), [yAccessor as string]: yAcc(src) },
          { [xAccessor as string]: xAcc(tgt), [yAccessor as string]: yAcc(tgt) }
        ]
      }
    }).filter(Boolean) as Record<string, any>[]
  }, [safeFlows, nodeLookup, xAccessor, yAccessor])

  // Edge width scale
  const widthScale = useMemo(() => {
    const vals = safeFlows.filter(f => f && typeof f === "object").map(f => f[valueAccessor] ?? 0).filter(v => isFinite(v))
    if (vals.length === 0) return () => edgeWidthRange[0]
    return scaleLinear()
      .domain([Math.min(...vals), Math.max(...vals)])
      .range(edgeWidthRange)
  }, [safeFlows, valueAccessor, edgeWidthRange])

  const baseLineStyleFn = useMemo(() => (d: any): Style => ({
    stroke: edgeColorBy ? getColor(d, edgeColorBy, colorScale) : DEFAULT_COLOR,
    strokeWidth: widthScale(d[valueAccessor] ?? 0),
    strokeLinecap: edgeLinecap,
    opacity: edgeOpacity
  }), [edgeColorBy, colorScale, widthScale, valueAccessor, edgeOpacity, edgeLinecap])

  // Wrap line style with selection awareness so non-matching flows dim.
  // Use custom unselectedStyle that avoids setting fillOpacity — the line
  // renderer interprets fillOpacity > 0 as "fill area under the line".
  const lineStyleFn = useMemo(() => {
    if (!activeSelectionHook) return baseLineStyleFn
    return wrapStyleWithSelection(baseLineStyleFn, activeSelectionHook, {
      ...((selection as any) || {}),
      unselectedStyle: { opacity: 0.15, strokeOpacity: 0.15, fillOpacity: 0 },
    }) as (d: any) => Style
  }, [baseLineStyleFn, activeSelectionHook, selection])

  // Point style — not selection-wrapped because node datums lack flow
  // fields (source/target). Flow lines carry the selection visual signal.
  const pointStyleFn = useMemo(
    () => () => ({ fill: "#333", r: 5, fillOpacity: 0.8 } as Style & { r?: number }),
    []
  )

  const defaultTooltip = useMemo(() => (d: any) => {
    // Area hover (country/region from background geography)
    if (d?.geometry || d?.properties || d?.data?.geometry) {
      const name = d?.properties?.name || d?.properties?.NAME || d?.name || d?.NAME || d?.data?.properties?.name || d?.data?.properties?.NAME
      if (name) {
        return (
          <div style={{ background: "rgba(0,0,0,0.85)", color: "white", padding: "6px 10px", borderRadius: 4, fontSize: 12 }}>
            <div style={{ fontWeight: 600 }}>{name}</div>
          </div>
        )
      }
    }

    // Line/flow hover (has source and target)
    if (d?.source != null && d?.target != null) {
      const val = d[valueAccessor]
      return (
        <div style={{ background: "rgba(0,0,0,0.85)", color: "white", padding: "6px 10px", borderRadius: 4, fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>{d.source} → {d.target}</div>
          {val != null && <div style={{ opacity: 0.7 }}>{typeof val === "number" ? val.toLocaleString() : val}</div>}
        </div>
      )
    }

    // Point/node hover
    const name = d?.name || d?.label || d?.[nodeIdAccessor]
    if (name != null) {
      return (
        <div style={{ background: "rgba(0,0,0,0.85)", color: "white", padding: "6px 10px", borderRadius: 4, fontSize: 12 }}>
          <div style={{ fontWeight: 600 }}>{name}</div>
        </div>
      )
    }

    return null
  }, [valueAccessor, nodeIdAccessor])

  const margin = useMemo(() => ({
    top: 10, right: 10, bottom: 10, left: 10,
    ...userMargin
  }), [userMargin])

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(loading, resolved.width, resolved.height)
  const emptyEl = !loadingEl ? renderEmptyState(flows, resolved.width, resolved.height, emptyContent) : null

  const streamProps: StreamGeoFrameProps = {
    projection,
    lines: lineData,
    points: safeNodes,
    xAccessor: xAccessor as any,
    yAccessor: yAccessor as any,
    lineDataAccessor: "coordinates",
    lineType,
    flowStyle,
    lineStyle: lineStyleFn,
    pointStyle: pointStyleFn,
    ...(resolvedAreas && { areas: resolvedAreas, areaStyle }),
    ...(graticule != null && { graticule }),
    ...(fitPadding != null && { fitPadding }),
    ...(zoomable && { zoomable: true }),
    ...(zoomExtent && { zoomExtent }),
    ...(onZoomProp && { onZoom: onZoomProp }),
    ...(dragRotate != null && { dragRotate }),
    ...(showParticles && { showParticles }),
    ...(particleStyle && { particleStyle }),
    ...(tileURL && { tileURL }),
    ...(tileAttribution && { tileAttribution }),
    ...(tileCacheSize && { tileCacheSize }),
    size: [resolved.width, resolved.height],
    margin,
    enableHover: true,
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltip),
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(resolved.title && { title: resolved.title }),
    ...(resolved.description && { description: resolved.description }),
    ...(resolved.summary && { summary: resolved.summary }),
    ...(className && { className }),
    ...frameProps
  }

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl

  return (
    <SafeRender componentName="FlowMap" width={resolved.width} height={resolved.height}>
      <StreamGeoFrame {...streamProps} />
    </SafeRender>
  )
}
FlowMap.displayName = "FlowMap"
