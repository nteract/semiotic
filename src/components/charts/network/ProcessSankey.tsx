"use client"
import * as React from "react"
import { forwardRef, useMemo, useRef, useCallback, useEffect } from "react"
import { scaleTime } from "d3-scale"

import { formatProcessSankeyIssue } from "./processSankey/algorithm"
import { resolveProcessSankeyMarginDefaults } from "./processSankey/frameMargins"
import { buildProcessSankeyBackgroundGraphics } from "./processSankey/axisChrome"
import type { ProcessSankeyOrientation } from "./processSankey/orientation"
import {
  type BuildScenesInput,
  type ProcessSankeyNormalizedNode as NormalizedNode,
  type ProcessSankeyNormalizedEdge as NormalizedEdge,
} from "./processSankey/buildScenes"
import { useProcessSankeyScenes } from "./processSankey/useProcessSankeyScenes"
import { useProcessSankeyPush } from "./processSankey/useProcessSankeyPush"
import { useProcessSankeyTooltipContent } from "./processSankey/processSankeyTooltip"
import type { ProcessSankeyLayoutExecution } from "./processSankey/processSankeyLayoutWorkerClient"
import { renderLoadingState } from "../shared/withChartWrapper"
import {
  emitProcessSankeyScenes,
  isProcessSankeyScenePayload,
  type ProcessSankeyLayoutConfig,
} from "./processSankey/streamingLayout"
import type { StyleRule } from "../shared/styleRules"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import type { Datum } from "../shared/datumTypes"
import type {
  BaseChartProps,
  ChartAccessor,
  SelectionConfig,
  LinkedHoverProp,
} from "../shared/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor } from "../shared/colorUtils"
import { useNetworkChartSetup } from "../shared/useNetworkChartSetup"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type {
  StreamNetworkFrameProps,
  ParticleStyle,
  BezierCache,
} from "../../stream/networkTypes"
import type { LegendGroup } from "../../types/legendTypes"
import type { TooltipProp } from "../../Tooltip/Tooltip"

type MarginSide = "top" | "right" | "bottom" | "left"
type TimeLike = number | Date | string

function toTime(value: TimeLike | undefined | null): number {
  if (value == null) return NaN
  if (value instanceof Date) return value.getTime()
  if (typeof value === "number") return value
  return new Date(value).getTime()
}

export interface ProcessSankeyTick {
  date: TimeLike
  label: string
}

export interface ProcessSankeyProps<TNode extends Datum = Datum, TEdge extends Datum = Datum> extends BaseChartProps {
  nodes?: TNode[]
  edges?: TEdge[]
  /** [tStart, tEnd] of the chart's time axis. Required. */
  domain: [TimeLike, TimeLike]
  /** Optional axis ticks. Each tick: { date, label }. */
  axisTicks?: ProcessSankeyTick[]

  // Accessors
  nodeIdAccessor?: ChartAccessor<TNode, string>
  nodeLabel?: ChartAccessor<TNode, string> // visible lane label; defaults to nodeIdAccessor
  sourceAccessor?: ChartAccessor<TEdge, string>
  targetAccessor?: ChartAccessor<TEdge, string>
  valueAccessor?: ChartAccessor<TEdge, number>
  startTimeAccessor?: ChartAccessor<TEdge, TimeLike>
  endTimeAccessor?: ChartAccessor<TEdge, TimeLike>
  /** Optional source-side inventory arrival time (before ribbon departs). */
  systemInTimeAccessor?: ChartAccessor<TEdge, TimeLike>
  /** Optional target-side inventory departure time (after ribbon arrives). */
  systemOutTimeAccessor?: ChartAccessor<TEdge, TimeLike>
  /**
   * Accessor for a node's explicit lifetime extent — a `[start, end]`
   * tuple of time-likes. Lane spans
   * `min(xExtent[0], earliestEdge)` to `max(xExtent[1], latestEdge)`.
   */
  xExtentAccessor?: ChartAccessor<TNode, [TimeLike, TimeLike]>
  /** Optional node accessor that bonds equal, non-empty values into one
   * contiguous stream-like lane block. Use `"category"` to bond an existing
   * categorical field without coupling grouping to color. */
  groupBy?: ChartAccessor<TNode, string | number>
  edgeIdAccessor?: ChartAccessor<TEdge, string>

  // Coloring
  colorBy?: ChartAccessor<TNode, string>
  colorScheme?: string | string[] | Record<string, string>
  /** Show a swatch + label legend. Defaults to `true` when `colorBy` is set. */
  showLegend?: boolean
  /** Legend position. Default `"right"`. */
  legendPosition?: "right" | "left" | "top" | "bottom"

  // Formatting
  /**
   * Format function for time values — applied to axis tick labels and
   * to time fields in the default tooltip. Same convention as
   * `xFormat` on XY charts.
   */
  timeFormat?: (d: number | Date) => string | React.ReactNode
  /** Format function for the `value` field. Mirrors `yFormat` on XY charts. */
  valueFormat?: (d: number) => string | React.ReactNode

  // Layout config
  /** Direction of time. Horizontal (default) reads left-to-right;
   * vertical reads top-to-bottom while lanes occupy the x-axis. */
  orientation?: ProcessSankeyOrientation
  pairing?: "value" | "temporal"
  packing?: "off" | "reuse"
  laneOrder?: "insertion" | "crossing-min" | "inside-out" | "crossing-min+inside-out"
  /** Maximum pixels per value unit. Set this to keep sparse lanes from
   * inflating until they fill the plot. Unset preserves legacy scaling. */
  maxValueScale?: number
  /** Vertical coordinate assignment. `"hug"` uses any scale-cap slack to
   * pull connected lane attachments together while preserving order/gaps. */
  lanePlacement?: "stack" | "hug"
  /** Pixel gutter inside a bonded node group. Defaults to `0`, so adjacent
   * band silhouettes touch without overlapping. */
  groupPadding?: number
  ribbonLane?: "source" | "target" | "both"
  /**
   * Minimum rendered run along the time axis for **source-only feeder**
   * ribbons (not a general minimum ribbon length). A number is a pixel
   * minimum; `"auto"` adapts to lateral lane distance. Only source-only
   * feeders with proven xExtent/systemInTime runway are affected.
   * Authored event times and mass accounting remain unchanged.
   * Default `0` preserves exact temporal endpoints.
   */
  ribbonMinRun?: number | "auto"
  lifetimeMode?: "full" | "half"
  showLaneRails?: boolean
  showQualityReadout?: boolean
  /** Render the per-band node id label at the band's opening edge.
   *  Default `true`. Set `false` for dense layouts, or `"auto"` for a
   *  density-budgeted subset shared by CSR/SSR. */
  showLabels?: boolean | "auto"
  /**
   * Author priority for `showLabels="auto"`. Higher values survive density
   * shedding first. Field name or function over the raw node datum.
   * Shed labels reappear under selection without a layout recompute.
   */
  labelPriorityAccessor?: string | ((d: TNode) => number)
  /** Optional hard cap on visible auto labels (after the area budget). */
  maxLabels?: number
  /**
   * Which datum shape selection / linkedHover predicates receive.
   * `"raw"` (default) unwraps author records from the scene payload so field
   * matchers work without knowing ProcessSankey's `{ __kind, data, id }` shape.
   * `"scene"` keeps the full payload for tooling that needs `__kind`.
   */
  selectionDatum?: "raw" | "scene"
  edgeOpacity?: number
  /** Declarative threshold-aware styling for node bands (raw node datum). */
  styleRules?: StyleRule[]
  /** Layout execution: auto (cost threshold), worker, or sync. SSR always sync. */
  layoutExecution?: ProcessSankeyLayoutExecution
  /** Override auto worker cost threshold (see estimateProcessSankeyLayoutCost). */
  layoutWorkerThreshold?: number
  /** Content while worker layout is pending. `false` suppresses. */
  layoutLoadingContent?: React.ReactNode | false
  /** Called when worker/async layout changes state. */
  onLayoutStateChange?: (state: "pending" | "ready" | "error") => void

  // Interaction
  /** Tooltip content. `false` disables, `true` uses the default,
   *  or pass a `Tooltip(...)` / custom function for full control. */
  tooltip?: TooltipProp
  enableHover?: boolean
  onClick?: (datum: Datum, position?: { x: number; y: number }) => void
  selection?: SelectionConfig
  linkedHover?: LinkedHoverProp

  // Particles — same canvas + ParticlePool surface SankeyDiagram
  // uses. The HOC writes bezier control points onto each ribbon
  // edge before push so the frame's particle pipeline (spawnRate
  // proportional to value, pool-recycled, continuous flow) drives
  // them through unchanged.
  showParticles?: boolean
  /** Style config for the particle overlay — same shape
   *  StreamNetworkFrame consumes from SankeyDiagram. Defaults
   *  (radius 3, opacity 0.7, spawnRate 0.1, maxPerEdge 50) live in
   *  `DEFAULT_PARTICLE_STYLE`. */
  particleStyle?: ParticleStyle

  /** Pass-through to the underlying StreamNetworkFrame. */
  frameProps?: Partial<Omit<StreamNetworkFrameProps,
    "nodes" | "edges" | "chartType" | "size" | "customNetworkLayout" | "layoutConfig"
  >>
}

function accessor<T extends Datum, V>(a: ChartAccessor<T, V>, d: T): V {
  if (typeof a === "function") return a(d)
  return d[a as string] as V
}

/**
 * ProcessSankey — temporal flow between nodes with a real time axis.
 *
 * Built on `StreamNetworkFrame` via `customNetworkLayout`. Edges carry
 * `startTime`/`endTime`; nodes have lifetimes (optional `xExtent`); static
 * cycles are OK when edges move forward in time. Layout path: normalize →
 * scenes (sync or worker) → frame + shared chrome.
 */
export const ProcessSankey = forwardRef(function ProcessSankey<TNode extends Datum = Datum, TEdge extends Datum = Datum>(
  props: ProcessSankeyProps<TNode, TEdge>,
  ref: React.Ref<RealtimeFrameHandle>
) {
  const {
    nodes: rawNodesProp,
    edges: rawEdgesProp,
    domain: rawDomain,
    axisTicks = [],
    nodeIdAccessor = "id",
    nodeLabel,
    sourceAccessor = "source",
    targetAccessor = "target",
    valueAccessor = "value",
    startTimeAccessor = "startTime",
    endTimeAccessor = "endTime",
    systemInTimeAccessor,
    systemOutTimeAccessor,
    xExtentAccessor = "xExtent",
    groupBy,
    edgeIdAccessor = "id",
    colorBy,
    colorScheme,
    showLegend,
    legendPosition = "right",
    orientation = "horizontal",
    pairing = "temporal",
    packing = "reuse",
    laneOrder = "crossing-min",
    maxValueScale,
    lanePlacement = "stack",
    groupPadding = 0,
    ribbonLane = "both",
    ribbonMinRun = 0,
    lifetimeMode = "half",
    showLaneRails = false,
    showQualityReadout = false,
    showLabels = true,
    labelPriorityAccessor,
    maxLabels,
    selectionDatum = "raw",
    styleRules,
    layoutExecution = "auto",
    layoutWorkerThreshold,
    layoutLoadingContent,
    onLayoutStateChange,
    width = 600,
    height = 400,
    margin: userMargin,
    title,
    description,
    summary,
    accessibleTable,
    responsiveWidth,
    responsiveHeight,
    loading,
    loadingContent,
    emptyContent,
    edgeOpacity = 0.35,
    timeFormat,
    valueFormat,
    tooltip,
    enableHover = true,
    onObservation,
    onClick,
    selection,
    linkedHover,
    showParticles = false,
    particleStyle,
    chartId,
    frameProps = {},
  } = props

  const scalesRef = useRef<{ time: ReturnType<typeof scaleTime>; centerlines?: Record<string, number> } | null>(null)
  const layoutSnapshotRef = useRef<unknown>(null)

  const { rawNodes, rawEdges, frameRef, getNodeId, getEdgeId } = useProcessSankeyPush<TNode, TEdge>({
    ref,
    rawNodesProp,
    rawEdgesProp,
    nodeIdAccessor,
    edgeIdAccessor,
    sourceAccessor,
    targetAccessor,
    scalesRef,
    layoutSnapshotRef,
  })

  // Normalize to algorithm-internal shape.
  const { nodes, edges, domain, rawNodeById, rawEdgeById } = useMemo(() => {
    const ns: NormalizedNode[] = (rawNodes ?? []).map((n) => {
      const id = getNodeId(n)
      const labelValue = nodeLabel ? accessor(nodeLabel, n) : id
      const o: NormalizedNode = { id, label: labelValue == null ? id : String(labelValue), __raw: n as Datum }
      const groupValue = groupBy ? accessor(groupBy, n) : null
      if (groupValue != null && String(groupValue) !== "") o.group = String(groupValue)
      const xExtent = xExtentAccessor ? accessor(xExtentAccessor, n) : null
      if (Array.isArray(xExtent) && xExtent.length === 2) {
        const a = toTime(xExtent[0] as TimeLike)
        const b = toTime(xExtent[1] as TimeLike)
        if (Number.isFinite(a) && Number.isFinite(b)) o.xExtent = [a, b]
      }
      return o
    })
    const es: NormalizedEdge[] = (rawEdges ?? []).map((e, i) => {
      const out: NormalizedEdge = {
        id: getEdgeId(e, i),
        source: String(accessor(sourceAccessor, e)),
        target: String(accessor(targetAccessor, e)),
        value: Number(accessor(valueAccessor, e)),
        startTime: toTime(accessor(startTimeAccessor, e) as TimeLike),
        endTime: toTime(accessor(endTimeAccessor, e) as TimeLike),
        __raw: e as Datum,
      }
      if (systemInTimeAccessor) {
        const v = toTime(accessor(systemInTimeAccessor, e) as TimeLike)
        if (Number.isFinite(v)) out.systemInTime = v
      }
      if (systemOutTimeAccessor) {
        const v = toTime(accessor(systemOutTimeAccessor, e) as TimeLike)
        if (Number.isFinite(v)) out.systemOutTime = v
      }
      return out
    })
    const dom: [number, number] = [toTime(rawDomain[0]), toTime(rawDomain[1])]
    const nodeMap = new Map<string, Datum>()
    for (const n of ns) if (n.__raw != null) nodeMap.set(n.id, n.__raw)
    const edgeMap = new Map<string, Datum>()
    for (const e of es) if (e.__raw != null) edgeMap.set(e.id, e.__raw)
    return { nodes: ns, edges: es, domain: dom, rawNodeById: nodeMap, rawEdgeById: edgeMap }
  }, [
    rawNodes, rawEdges, rawDomain, getNodeId, getEdgeId, nodeLabel, xExtentAccessor, groupBy,
    sourceAccessor, targetAccessor, valueAccessor, startTimeAccessor, endTimeAccessor,
    systemInTimeAccessor, systemOutTimeAccessor,
  ])

  const setup = useNetworkChartSetup({
    nodes: rawNodes,
    edges: rawEdges,
    inferNodes: false,
    nodeIdAccessor,
    sourceAccessor,
    targetAccessor,
    colorBy,
    colorScheme,
    showLegend: false,
    legendPosition,
    selection,
    linkedHover,
    onObservation,
    onClick: onClick
      ? (datum: Datum, position?: { x: number; y: number }) => {
          if (isProcessSankeyScenePayload(datum)) onClick(datum.data, position)
          else onClick(datum, position)
        }
      : undefined,
    mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    chartType: "ProcessSankey",
    chartId,
    marginDefaults: resolveProcessSankeyMarginDefaults(
      !!title, showQualityReadout, axisTicks.length > 0, orientation,
    ),
    userMargin,
    width, height,
    hasTitle: !!title,
    loading, loadingContent, emptyContent,
  })

  const legendActive = (showLegend ?? !!colorBy) && !!colorBy
  const userMarginSet = useCallback((side: MarginSide): boolean => {
    if (userMargin == null) return false
    if (typeof userMargin === "number") return true
    return (userMargin as Partial<Record<MarginSide, number>>)[side] != null
  }, [userMargin])
  const margin = useMemo(() => {
    const merged = { ...setup.margin }
    if (legendActive) {
      if (legendPosition === "right" && !userMarginSet("right") && merged.right < 140) merged.right = 140
      else if (legendPosition === "bottom" && !userMarginSet("bottom") && merged.bottom < 80) merged.bottom = 80
    }
    return merged
  }, [setup.margin, legendActive, legendPosition, userMarginSet])

  const plotW = width - margin.left - margin.right
  const plotH = height - margin.top - margin.bottom
  const timelineExtent = orientation === "vertical" ? plotH : plotW

  const colorOf = useCallback((id: string, idx: number): string => {
    if (colorBy && rawNodes) {
      const raw = rawNodeById.get(id)
      if (raw) return getColor(raw, colorBy as ChartAccessor<Datum, string>, setup.colorScale) as string
    }
    return setup.effectivePalette[idx % setup.effectivePalette.length] || "#475569"
  }, [colorBy, rawNodes, rawNodeById, setup.colorScale, setup.effectivePalette])

  const sceneInput: BuildScenesInput | null = useMemo(() => {
    if (plotW <= 0 || plotH <= 0) return null
    return {
      nodes, edges, domain, plotW, plotH, orientation, ribbonLane, ribbonMinRun,
      edgeOpacity, colorOf, showLabels, labelPriorityAccessor: labelPriorityAccessor as
        string | ((d: Datum) => number) | undefined,
      maxLabels, selectionDatum, styleRules,
      // Live React surface: warn on duplicate ids, strip bad system times (M6).
      usageMode: "push",
      colorBy: colorBy as string | ((d: Datum) => unknown) | undefined,
      valueAccessor: valueAccessor as string | ((d: Datum) => unknown) | undefined,
      layoutOpts: {
        pairing, packing, laneOrder, lifetimeMode, maxValueScale, lanePlacement, groupPadding,
      },
    }
  }, [
    nodes, edges, domain, plotW, plotH, orientation, ribbonLane, ribbonMinRun,
    edgeOpacity, colorOf, showLabels, labelPriorityAccessor, maxLabels, selectionDatum,
    styleRules, colorBy, valueAccessor,
    pairing, packing, laneOrder, lifetimeMode, maxValueScale, lanePlacement, groupPadding,
  ])

  const colorById = useMemo(() => {
    const map: Record<string, string> = {}
    nodes.forEach((n, idx) => { map[n.id] = colorOf(n.id, idx) })
    return map
  }, [nodes, colorOf])

  const sceneResult = useProcessSankeyScenes(sceneInput, {
    execution: layoutExecution,
    workerThreshold: layoutWorkerThreshold,
    colorById,
    fallbackPalette: setup.effectivePalette,
    rawNodeById,
    rawEdgeById,
  })

  const { issues, warnings, layout, xScale } = sceneResult
  const layoutConfig: ProcessSankeyLayoutConfig = sceneResult.layoutConfig
  const layoutStatus = sceneResult.status

  scalesRef.current = layout
    ? { time: xScale, centerlines: layout.centerlines }
    : { time: xScale }
  layoutSnapshotRef.current = layout
    ? { layout, nodes, edges, bands: layoutConfig.bands, ribbons: layoutConfig.ribbons, warnings, status: layoutStatus }
    : null

  const onLayoutStateChangeRef = useRef(onLayoutStateChange)
  onLayoutStateChangeRef.current = onLayoutStateChange
  useEffect(() => { onLayoutStateChangeRef.current?.(layoutStatus) }, [layoutStatus])
  useEffect(() => {
    if (warnings.length === 0) return
    console.warn("ProcessSankey warnings:", warnings.map(formatProcessSankeyIssue).join("; "))
  }, [warnings])

  const legendNode = useMemo(() => {
    if (!legendActive || !colorBy) return undefined
    const seen = new Map<string, { label: string; color: string }>()
    ;(rawNodes ?? []).forEach((n, i) => {
      const v = accessor(colorBy as ChartAccessor<TNode, string>, n)
      const label = v == null ? "" : String(v)
      if (!label || seen.has(label)) return
      seen.set(label, { label, color: colorOf(getNodeId(n), i) })
    })
    const items = Array.from(seen.values())
    if (items.length === 0) return undefined
    const legendGroups: LegendGroup[] = [{
      type: "fill", label: "", items,
      styleFn: (d: { color?: string }) => {
        const c = d.color || "#333"
        return { fill: c, stroke: c }
      },
    }]
    return { legendGroups }
  }, [legendActive, colorBy, rawNodes, colorOf, getNodeId])

  const tooltipContent = useProcessSankeyTooltipContent<TNode, TEdge>({
    tooltip, enableHover, layout, timeFormat, valueFormat,
    sourceAccessor, targetAccessor, valueAccessor, startTimeAccessor, endTimeAccessor,
  })

  const backgroundGraphics = useMemo(() => {
    if (!layout) return null
    const warningText = warnings.map((issue) => formatProcessSankeyIssue(issue))
    return buildProcessSankeyBackgroundGraphics({
      layout,
      nodes,
      orientation,
      plotW,
      plotH,
      timelineExtent,
      axisTicks,
      showQualityReadout,
      showLaneRails,
      warnings: warningText,
      timeFormat: timeFormat ? (d) => timeFormat(d) : undefined,
      colorOf,
      toTime,
      xScale: (t) => Number(xScale(t)),
    })
  }, [
    layout, nodes, orientation, plotW, plotH, timelineExtent, axisTicks,
    showQualityReadout, showLaneRails, warnings, timeFormat, colorOf, xScale,
  ])

  const safeFrameNodes = useMemo(
    () => (rawNodes ?? []).map((n) => ({ id: getNodeId(n), data: n as Datum })),
    [rawNodes, getNodeId],
  )
  const ribbonBezierById = useMemo(() => {
    const map = new Map<string, BezierCache>()
    for (const r of layoutConfig.ribbons) {
      if (r.bezier) map.set(r.id, r.bezier)
    }
    return map
  }, [layoutConfig])
  const safeFrameEdges = useMemo(
    () => (rawEdges ?? []).map((e, i) => {
      const id = getEdgeId(e, i)
      const rawValue = Number(accessor(valueAccessor, e))
      return {
        id,
        source: String(accessor(sourceAccessor, e)),
        target: String(accessor(targetAccessor, e)),
        value: Number.isFinite(rawValue) ? rawValue : 0,
        bezier: ribbonBezierById.get(id),
        data: e as Datum,
      }
    }),
    [rawEdges, getEdgeId, sourceAccessor, targetAccessor, valueAccessor, ribbonBezierById],
  )

  if (issues.length > 0) {
    return (
      <svg width={width} height={height} role="img" aria-label={title ?? "Process Sankey validation failed"}>
        <text x={20} y={30} fontSize={13} fontWeight={600} fill="var(--semiotic-danger, #dc2626)">
          ProcessSankey: data invalid
        </text>
        {issues.map((issue, k) => (
          <text key={k} x={20} y={56 + k * 18} fontSize={12} fill="#64748b">
            {`• ${formatProcessSankeyIssue(issue)}`}
          </text>
        ))}
      </svg>
    )
  }
  if (setup.loadingEl) return setup.loadingEl
  if (setup.emptyEl) return setup.emptyEl

  // Keep a still-valid previous layout painted during worker re-layouts
  // (useProcessSankeyScenes retains the last ready scene while pending).
  // Only cover when there is nothing paint-able yet (first load).
  // layoutLoadingContent={false} suppresses first-paint chrome entirely.
  const showLayoutLoading =
    layoutStatus === "pending" &&
    layoutLoadingContent !== false &&
    !layout

  return (
    <div style={{ position: "relative", width, height }}>
      {showLayoutLoading && (
        <div style={{ position: "absolute", inset: 0, zIndex: 3, background: "var(--semiotic-bg, #fff)" }}>
          {renderLoadingState(true, width, height, layoutLoadingContent)}
        </div>
      )}
      <StreamNetworkFrame
        ref={frameRef}
        chartType="force"
        nodes={safeFrameNodes}
        edges={safeFrameEdges}
        customNetworkLayout={emitProcessSankeyScenes as unknown as StreamNetworkFrameProps["customNetworkLayout"]}
        layoutConfig={layoutConfig as unknown as Record<string, unknown>}
        size={[width, height]}
        responsiveWidth={responsiveWidth}
        responsiveHeight={responsiveHeight}
        margin={margin}
        title={title}
        description={description ?? "Temporal process flow with lifetime-bounded node lanes, mass bands, and value-scaled ribbons."}
        summary={summary}
        accessibleTable={accessibleTable}
        enableHover={enableHover}
        tooltipContent={tooltip === false ? () => null : tooltipContent}
        backgroundGraphics={backgroundGraphics}
        showParticles={showParticles}
        particleStyle={particleStyle}
        legend={legendNode}
        legendPosition={legendPosition}
        {...buildCustomBehaviorProps({
          linkedHover, selection, onObservation, onClick,
          mobileInteraction: setup.mobileInteraction,
          customHoverBehavior: setup.customHoverBehavior,
          customClickBehavior: setup.customClickBehavior,
          linkedHoverInClickPredicate: false,
        })}
        chartId={chartId}
        colorScheme={Array.isArray(colorScheme) ? colorScheme : undefined}
        {...frameProps}
      />
    </div>
  )
}) as unknown as {
  <TNode extends Datum = Datum, TEdge extends Datum = Datum>(
    props: ProcessSankeyProps<TNode, TEdge> & React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

;(ProcessSankey as unknown as { displayName?: string }).displayName = "ProcessSankey"

export default ProcessSankey
