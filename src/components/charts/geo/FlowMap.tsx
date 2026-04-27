"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamGeoFrame from "../../stream/StreamGeoFrame"
import type { StreamGeoFrameProps, ProjectionProp } from "../../stream/geoTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { getColor } from "../shared/colorUtils"
import { useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import { SafeRender } from "../shared/withChartWrapper"
import { normalizeLinkedHover, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useLinkedHover } from "../../store/useSelection"
import { useObservationSelector } from "../../store/ObservationStore"
import type { ChartObservation } from "../../store/ObservationStore"
import type { Style } from "../../stream/types"
import { useChartSetup } from "../shared/useChartSetup"
import type { GeoParticleStyle } from "../../stream/GeoParticlePool"
import { scaleLinear } from "d3-scale"
import { useReferenceAreas, type AreasProp } from "../../geo/useReferenceAreas"

export interface FlowMapProps<TDatum extends Datum = Datum> extends BaseChartProps {
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
  annotations?: Datum[]
  /** Passthrough */
  frameProps?: Partial<Omit<StreamGeoFrameProps, "projection">>
}

/**
 * FlowMap - Visualize directed flows between geographic locations.
 *
 * Each `flow` connects two `nodes` by id; line width encodes
 * `valueAccessor` and (optionally) color encodes `edgeColorBy`. Use
 * `flowStyle="arc"` for curved lines or `"offset"` for bidirectional pairs
 * that don't overlap. Toggle `showParticles` for animated traffic along
 * each line.
 *
 * For static value-per-region maps use {@link ChoroplethMap}; for
 * point-size encodings use {@link ProportionalSymbolMap}.
 *
 * @example
 * ```tsx
 * // Migration flows between cities
 * <FlowMap
 *   nodes={cities}                 // [{ id, lon, lat, name }]
 *   flows={migrations}             // [{ source, target, value }]
 *   nodeIdAccessor="id"
 *   valueAccessor="value"
 *   projection="albersUsa"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Curved arcs colored by source country, particles for live feel
 * <FlowMap
 *   nodes={airports}
 *   flows={routes}
 *   valueAccessor="passengers"
 *   flowStyle="arc"
 *   edgeColorBy="origin_country"
 *   showParticles
 *   areas="world-110m"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Bidirectional offset so A→B and B→A are visible separately
 * <FlowMap
 *   nodes={hubs}
 *   flows={trades}
 *   flowStyle="offset"
 *   lineType="line"
 *   edgeOpacity={0.8}
 * />
 * ```
 */
export function FlowMap<TDatum extends Datum = Datum>(props: FlowMapProps<TDatum>) {

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
    colorScheme,
    showParticles,
    particleStyle,
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
    frameProps = {},
    legendInteraction,
    legendPosition: legendPositionProp,
    stroke,
    strokeWidth,
    opacity,
  } = props

  // Tile maps default to zoomable; non-tile maps default to not zoomable
  const zoomable = zoomableProp ?? (tileURL ? true : false)

  const resolvedAreas = useReferenceAreas(areas)

  // `nodes` is its own lookup table (not chart data) — useChartSetup
  // doesn't see it, so we have to sparse-filter it here ourselves.
  // `flows` is forwarded raw to useChartSetup, which sparse-filters
  // and exposes the result as `setup.data` (aliased below as
  // `safeFlows`) to avoid a redundant pre-setup pass.
  const safeNodes = useMemo(() => filterSparseArray(nodes), [nodes])

  // ── Shared setup (color, legend, selection, margin, loading/empty) ───
  // Setup owns categorical color (`edgeColorBy`), legend rendering, line
  // dimming via `effectiveSelectionHook`, margin, and empty/loading.
  // FlowMap keeps its own `customHoverBehavior` because point hovers need
  // to be translated into the underlying flow before the linkedHover
  // store fires — `nodeFlowLookup` is a chart-specific concern that
  // doesn't belong inside the shared hook.
  const setup = useChartSetup({
    data: flows ?? [],
    rawData: flows,
    colorBy: edgeColorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: edgeColorBy ? [typeof edgeColorBy === "string" ? edgeColorBy : ""] : [],
    unwrapData: false,
    onObservation,
    onClick,
    chartType: "FlowMap",
    chartId,
    showLegend: resolved.showLegend,
    userMargin,
    marginDefaults: { top: 10, bottom: 10, left: 10, right: 10 },
    loading,
    emptyContent,
    width: resolved.width,
    height: resolved.height,
  })

  // Alias `setup.data` (sparse-filtered by useChartSetup) so the rest
  // of this HOC body still reads `safeFlows`.
  const safeFlows = setup.data

  // FlowMap's hover handler reads the linkedHover store directly so it can
  // emit a translated *flow* datum after a point hover. Setup also wires a
  // linkedHover subscription for its own customHoverBehavior; calling the
  // hook a second time here just adds another subscriber on the same
  // store, which is cheap. We override `customHoverBehavior` below so the
  // setup's plain pass-through is never used.
  const hoverConfig = normalizeLinkedHover(linkedHover)
  const linkedHoverHook = useLinkedHover({
    name: hoverConfig?.name || "hover",
    fields: hoverConfig?.fields || []
  })

  const pushObservation = useObservationSelector(
    (state: any) => state.pushObservation
  ) as ((obs: ChartObservation) => void) | undefined

  // Build node lookup
  const nodeLookup = useMemo(() => {
    const map = new Map<string, Datum>()
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
    (d: Datum | null) => {
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

  // Click behavior is the standard pass-through — no translation needed.
  const customClickBehavior = setup.customClickBehavior

  // Convert flows to line data
  const lineData = useMemo(() => {
    const xAcc = typeof xAccessor === "function" ? xAccessor : (d: Datum) => d[xAccessor as string]
    const yAcc = typeof yAccessor === "function" ? yAccessor : (d: Datum) => d[yAccessor as string]

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
    }).filter(Boolean) as Datum[]
  }, [safeFlows, nodeLookup, xAccessor, yAccessor])

  // Edge width scale
  const widthScale = useMemo(() => {
    const vals = safeFlows.filter(f => f && typeof f === "object").map(f => f[valueAccessor] ?? 0).filter(v => isFinite(v))
    if (vals.length === 0) return () => edgeWidthRange[0]
    return scaleLinear()
      .domain([Math.min(...vals), Math.max(...vals)])
      .range(edgeWidthRange)
  }, [safeFlows, valueAccessor, edgeWidthRange])

  const baseLineStyleFn = useMemo(() => (d: Datum): Style => ({
    stroke: edgeColorBy ? getColor(d, edgeColorBy, setup.colorScale) : DEFAULT_COLOR,
    strokeWidth: widthScale(d[valueAccessor] ?? 0),
    strokeLinecap: edgeLinecap,
    opacity: edgeOpacity
  }), [edgeColorBy, setup.colorScale, widthScale, valueAccessor, edgeOpacity, edgeLinecap])

  // Wrap line style with selection awareness so non-matching flows dim.
  // `fillOpacity: 0` is load-bearing — the line renderer interprets
  // fillOpacity > 0 as "fill area under the line", which is wrong for flows.
  // opacity / strokeOpacity are left to wrapStyleWithSelection so the
  // per-chart `selection.unselectedOpacity` or theme value takes effect.
  const lineStyleFn = useMemo(() => {
    const withPrimitives = mergeShapeStyle(baseLineStyleFn, { stroke, strokeWidth, opacity }) as (d: Datum) => Style
    if (!setup.effectiveSelectionHook) return withPrimitives
    const mergedUnselectedStyle = {
      ...(setup.resolvedSelection?.unselectedStyle || {}),
      fillOpacity: 0,
    }
    return wrapStyleWithSelection(withPrimitives, setup.effectiveSelectionHook, {
      ...((setup.resolvedSelection as any) || {}),
      unselectedStyle: mergedUnselectedStyle,
    }) as (d: Datum) => Style
  }, [baseLineStyleFn, setup.effectiveSelectionHook, setup.resolvedSelection, stroke, strokeWidth, opacity])

  // Point style — not selection-wrapped because node datums lack flow
  // fields (source/target). Flow lines carry the selection visual signal.
  const pointStyleFn = useMemo(
    () => mergeShapeStyle(
      () => ({ fill: "#333", r: 5, fillOpacity: 0.8 } as Style & { r?: number }),
      { stroke, strokeWidth, opacity }
    ) as (d: Datum) => Style & { r?: number },
    [stroke, strokeWidth, opacity]
  )

  const defaultTooltip = useMemo(() => (d: Datum) => {
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
    margin: setup.margin,
    enableHover: true,
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltip),
    ...setup.legendBehaviorProps,
    ...((linkedHover || onObservation || onClick) && { customHoverBehavior }),
    ...((onObservation || onClick) && { customClickBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(resolved.title && { title: resolved.title }),
    ...(resolved.description && { description: resolved.description }),
    ...(resolved.summary && { summary: resolved.summary }),
    ...(resolved.accessibleTable !== undefined && { accessibleTable: resolved.accessibleTable }),
    ...(className && { className }),
    ...(props.animate != null && { animate: props.animate }),
    ...frameProps
  }

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (setup.earlyReturn) return setup.earlyReturn

  return (
    <SafeRender componentName="FlowMap" width={resolved.width} height={resolved.height}>
      <StreamGeoFrame {...streamProps} />
    </SafeRender>
  )
}
FlowMap.displayName = "FlowMap"
