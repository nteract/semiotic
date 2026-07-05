"use client"
import type { Datum } from "../shared/datumTypes"
import { EMPTY_ARRAY, filterSparseArray } from "../shared/sparseArray"
import * as React from "react"
import { useMemo, useCallback, useRef, forwardRef } from "react"
import StreamGeoFrame from "../../stream/StreamGeoFrame"
import type { StreamGeoFrameProps, ProjectionProp, StreamGeoFrameHandle } from "../../stream/geoTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import { getMinMax } from "../shared/minMax"

// Stable internal keys for synthesized line-coord objects. The
// frame's xAccessor / yAccessor would otherwise need to know how to
// read user-supplied function accessors against synthesized objects
// (which have no user-controlled shape). By writing coords with
// these fixed keys and passing hybrid accessors that prefer them,
// FlowMap supports both string and function user accessors.
const COORD_X_KEY = "__semiotic_x"
const COORD_Y_KEY = "__semiotic_y"
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
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
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
  colorScheme?: string | string[] | Record<string, string>
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
  /**
   * ID accessor on flow records — required for `ref.current.remove(id)`
   * and `ref.current.update(id, …)`. The accessor reads the same field
   * the user supplies on each flow; the field is preserved on the
   * resolved line entry so the frame's `removeLine` can match by id.
   */
  lineIdAccessor?: string | ((d: Datum) => string)
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
export const FlowMap = forwardRef(function FlowMap<TDatum extends Datum = Datum>(
  props: FlowMapProps<TDatum>,
  ref: React.Ref<RealtimeFrameHandle>,
) {

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showLegend: props.showLegend,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
      mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
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
    loadingContent,
    emptyContent,
    frameProps = {},
    legendInteraction,
    legendPosition: legendPositionProp,
    stroke,
    strokeWidth,
    opacity,
    lineIdAccessor,
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
    // Stable empty fallback for push mode (`flows === undefined`) — see
    // matching note on ProportionalSymbolMap. Avoids fresh-array
    // churn on every parent render.
    data: flows ?? (EMPTY_ARRAY as Datum[]),
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
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "FlowMap",
    chartId,
    showLegend: resolved.showLegend,
    userMargin,
    marginDefaults: { top: 10, bottom: 10, left: 10, right: 10 },
    loading,
    loadingContent,
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

  // Push API. Flows arrive shaped `{ source, target, value, ... }`; the
  // frame stores resolved line records `{ ...flow, coordinates: [...] }`.
  // The translation needs the current `nodeLookup` + accessors, which
  // change when their props change, so we route them through refs to
  // keep the imperative handle reference-stable across renders.
  const frameRef = useRef<StreamGeoFrameHandle>(null)
  const nodeLookupRef = useRef(nodeLookup)
  nodeLookupRef.current = nodeLookup
  const xAccessorRef = useRef(xAccessor)
  xAccessorRef.current = xAccessor
  const yAccessorRef = useRef(yAccessor)
  yAccessorRef.current = yAccessor

  const resolveFlowToLine = useCallback((flow: Datum): Datum | null => {
    if (!flow || typeof flow !== "object" || flow.source == null || flow.target == null) return null
    const map = nodeLookupRef.current
    const src = map.get(String(flow.source))
    const tgt = map.get(String(flow.target))
    if (!src || !tgt) return null
    const xAcc = typeof xAccessorRef.current === "function"
      ? xAccessorRef.current
      : (d: Datum) => d[xAccessorRef.current as string]
    const yAcc = typeof yAccessorRef.current === "function"
      ? yAccessorRef.current
      : (d: Datum) => d[yAccessorRef.current as string]
    // Synthesized coords use stable keys. The frame reads them via
    // the hybrid `xReader` / `yReader` defined below, which prefer
    // these stable keys on coord objects and fall back to the
    // user's accessor on nodes — supports both string and function
    // user accessors.
    return {
      ...flow,
      coordinates: [
        { [COORD_X_KEY]: xAcc(src), [COORD_Y_KEY]: yAcc(src) },
        { [COORD_X_KEY]: xAcc(tgt), [COORD_Y_KEY]: yAcc(tgt) },
      ],
    }
  }, [])

  useFrameImperativeHandle(ref, {
    variant: "geo-lines",
    frameRef,
    overrides: {
      push: (flow) => {
        const line = resolveFlowToLine(flow)
        if (line) frameRef.current?.pushLine(line)
      },
      pushMany: (flows) => {
        const lines: Datum[] = []
        for (const flow of flows) {
          const line = resolveFlowToLine(flow)
          if (line) lines.push(line)
        }
        if (lines.length > 0) frameRef.current?.pushManyLines(lines)
      },
    },
  })

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

  // Convert flows to line data. Coords use stable internal keys
  // (see resolveFlowToLine for the same pattern in the push path).
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
          { [COORD_X_KEY]: xAcc(src), [COORD_Y_KEY]: yAcc(src) },
          { [COORD_X_KEY]: xAcc(tgt), [COORD_Y_KEY]: yAcc(tgt) },
        ]
      }
    }).filter(Boolean) as Datum[]
  }, [safeFlows, nodeLookup, xAccessor, yAccessor])

  // Hybrid x/y readers passed to the frame as `xAccessor` /
  // `yAccessor`. On synthesized line-coord objects (which carry
  // `COORD_X_KEY` / `COORD_Y_KEY`) we read the stable keys; on
  // anything else (nodes / user-shaped data) we fall back to the
  // user's accessor. This is the integration point that lets
  // FlowMap accept function accessors — the synthesized coords
  // never have to satisfy a user-defined function shape.
  const xReader = useMemo(() => {
    const userRead = typeof xAccessor === "function"
      ? xAccessor
      : (d: Datum) => d[xAccessor as string]
    return (d: Datum) => {
      if (d != null && typeof d === "object" && COORD_X_KEY in d) return d[COORD_X_KEY]
      return userRead(d)
    }
  }, [xAccessor])

  const yReader = useMemo(() => {
    const userRead = typeof yAccessor === "function"
      ? yAccessor
      : (d: Datum) => d[yAccessor as string]
    return (d: Datum) => {
      if (d != null && typeof d === "object" && COORD_Y_KEY in d) return d[COORD_Y_KEY]
      return userRead(d)
    }
  }, [yAccessor])

  // Edge width scale
  const widthScale = useMemo(() => {
    const vals = safeFlows.filter(f => f && typeof f === "object").map(f => f[valueAccessor] ?? 0).filter(v => isFinite(v))
    if (vals.length === 0) return () => edgeWidthRange[0]
    return scaleLinear()
      .domain(getMinMax(vals))
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
      ...(setup.resolvedSelection || {}),
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

  // Loading / empty state — returned only after every hook above has run, so
  // the hook count is identical whether or not data is present. Mounting empty
  // (loading skeleton, no flows) and then streaming in data must not change the
  // number of hooks between renders, or React throws "Rendered more hooks than
  // during the previous render."
  if (setup.earlyReturn) return setup.earlyReturn

  const streamProps: StreamGeoFrameProps = {
    projection,
    // Push-mode entry: when `flows` is undefined the user is driving
    // the chart through `ref.current.push()`; omit `lines` so the frame
    // doesn't reset its store on every parent re-render. With `flows`
    // supplied we hand the translated `lineData` over as usual.
    ...(flows != null && { lines: lineData }),
    points: safeNodes,
    xAccessor: xReader,
    yAccessor: yReader,
    lineDataAccessor: "coordinates",
    ...(lineIdAccessor != null && { lineIdAccessor }),
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
    ...buildCustomBehaviorProps({
      linkedHover,
      selection,
      onObservation,
      onClick,
      mobileInteraction: setup.mobileInteraction,
      customHoverBehavior,
      customClickBehavior,
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
    <SafeRender componentName="FlowMap" width={resolved.width} height={resolved.height}>
      <StreamGeoFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <TDatum extends Datum = Datum>(
    props: FlowMapProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>,
  ): React.ReactElement | null
  displayName?: string
}
FlowMap.displayName = "FlowMap"
