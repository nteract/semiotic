"use client"
import * as React from "react"
import { forwardRef, useMemo, useRef, useCallback, useEffect } from "react"
import { scaleTime } from "d3-scale"

import { formatProcessSankeyIssue } from "./processSankey/algorithm"
import { resolveProcessSankeyMarginDefaults } from "./processSankey/frameMargins"
import { buildProcessSankeyBackgroundGraphics } from "./processSankey/axisChrome"
import {
  type BuildScenesInput,
  type ProcessSankeyNormalizedNode as NormalizedNode,
  type ProcessSankeyNormalizedEdge as NormalizedEdge
} from "./processSankey/buildScenes"
import { useProcessSankeyScenes } from "./processSankey/useProcessSankeyScenes"
import { useProcessSankeyPush } from "./processSankey/useProcessSankeyPush"
import { useProcessSankeyTooltipContent } from "./processSankey/processSankeyTooltip"
import { readChartAccessor } from "./processSankey/accessors"
import {
  toProcessSankeyTime,
  type ProcessSankeyTimeLike
} from "./processSankey/time"
import { renderLoadingState } from "../shared/withChartWrapper"
import {
  emitProcessSankeyScenes,
  isProcessSankeyScenePayload,
  type ProcessSankeyLayoutConfig
} from "./processSankey/streamingLayout"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import type { Datum } from "../shared/datumTypes"
import type {
  ChartAccessor
} from "../shared/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor } from "../shared/colorUtils"
import { useNetworkChartSetup } from "../shared/useNetworkChartSetup"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type {
  StreamNetworkFrameProps,
  BezierCache
} from "../../stream/networkTypes"
import type { LegendGroup } from "../../types/legendTypes"
import type { ProcessSankeyProps } from "./ProcessSankeyProps"

export type {
  ProcessSankeyProps,
  ProcessSankeyTick
} from "./ProcessSankeyProps"

type MarginSide = "top" | "right" | "bottom" | "left"
type TimeLike = ProcessSankeyTimeLike


/**
 * ProcessSankey draws timed process flow as lane bands and ribbons on a real time axis.
 *
 * Prefer this over {@link SankeyDiagram} when edges carry `startTime`/`endTime`
 * and node lifetime matters (optional `xExtent`). Static graph cycles are fine
 * as long as edges move forward in time. Layout path: normalize → scenes
 * (sync or worker) → frame + shared chrome.
 *
 * @example
 * ```tsx
 * // Operational hospital handoffs (horizontal time)
 * <ProcessSankey
 *   domain={[0, 48]}
 *   nodes={[
 *     { id: "ER", xExtent: [0, 48] },
 *     { id: "ICU", xExtent: [4, 48] },
 *     { id: "Ward", xExtent: [12, 48] },
 *   ]}
 *   edges={[
 *     { id: "e1", source: "ER", target: "ICU", value: 12, startTime: 2, endTime: 6 },
 *     { id: "e2", source: "ICU", target: "Ward", value: 8, startTime: 14, endTime: 20 },
 *   ]}
 *   packing="reuse"
 *   laneOrder="crossing-min+inside-out"
 *   showLabels
 * />
 * ```
 *
 * @example
 * ```tsx
 * // History river (vertical time, hug placement, style rules)
 * <ProcessSankey
 *   domain={[1763, 2025]}
 *   orientation="vertical"
 *   nodes={institutions}
 *   edges={jurisdictionEvents}
 *   nodeLabel="shortLabel"
 *   colorBy="category"
 *   groupBy="group"
 *   systemInTimeAccessor="systemInTime"
 *   systemOutTimeAccessor="systemOutTime"
 *   packing="reuse"
 *   laneOrder="crossing-min+inside-out"
 *   lanePlacement="hug"
 *   ribbonMinRun="auto"
 *   lifetimeMode="full"
 *   showLabels="auto"
 * />
 * ```
 */
export const ProcessSankey = forwardRef(function ProcessSankey<
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum
>(
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
    nodeSizing = "temporal",
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
    frameProps = {}
  } = props

  const scalesRef = useRef<{
    time: ReturnType<typeof scaleTime>
    centerlines?: Record<string, number>
  } | null>(null)
  const layoutSnapshotRef = useRef<unknown>(null)

  const { rawNodes, rawEdges, frameRef, getNodeId, getEdgeId } =
    useProcessSankeyPush<TNode, TEdge>({
      ref,
      rawNodesProp,
      rawEdgesProp,
      nodeIdAccessor,
      edgeIdAccessor,
      sourceAccessor,
      targetAccessor,
      scalesRef,
      layoutSnapshotRef
    })

  // Normalize to algorithm-internal shape.
  const { nodes, edges, domain, rawNodeById, rawEdgeById } = useMemo(() => {
    const ns: NormalizedNode[] = (rawNodes ?? []).map((n) => {
      const id = getNodeId(n)
      const labelValue = nodeLabel ? readChartAccessor(nodeLabel, n) : id
      const o: NormalizedNode = {
        id,
        label: labelValue == null ? id : String(labelValue),
        __raw: n as Datum
      }
      const groupValue = groupBy ? readChartAccessor(groupBy, n) : null
      if (groupValue != null && String(groupValue) !== "")
        o.group = String(groupValue)
      const xExtent = xExtentAccessor
        ? readChartAccessor(xExtentAccessor, n)
        : null
      if (Array.isArray(xExtent) && xExtent.length === 2) {
        const a = toProcessSankeyTime(xExtent[0] as TimeLike)
        const b = toProcessSankeyTime(xExtent[1] as TimeLike)
        if (Number.isFinite(a) && Number.isFinite(b)) o.xExtent = [a, b]
      }
      return o
    })
    const es: NormalizedEdge[] = (rawEdges ?? []).map((e, i) => {
      const out: NormalizedEdge = {
        id: getEdgeId(e, i),
        source: String(readChartAccessor(sourceAccessor, e)),
        target: String(readChartAccessor(targetAccessor, e)),
        value: Number(readChartAccessor(valueAccessor, e)),
        startTime: toProcessSankeyTime(
          readChartAccessor(startTimeAccessor, e) as TimeLike
        ),
        endTime: toProcessSankeyTime(
          readChartAccessor(endTimeAccessor, e) as TimeLike
        ),
        __raw: e as Datum
      }
      if (systemInTimeAccessor) {
        const v = toProcessSankeyTime(
          readChartAccessor(systemInTimeAccessor, e) as TimeLike
        )
        if (Number.isFinite(v)) out.systemInTime = v
      }
      if (systemOutTimeAccessor) {
        const v = toProcessSankeyTime(
          readChartAccessor(systemOutTimeAccessor, e) as TimeLike
        )
        if (Number.isFinite(v)) out.systemOutTime = v
      }
      return out
    })
    const dom: [number, number] = [
      toProcessSankeyTime(rawDomain[0]),
      toProcessSankeyTime(rawDomain[1])
    ]
    const nodeMap = new Map<string, Datum>()
    for (const n of ns) if (n.__raw != null) nodeMap.set(n.id, n.__raw)
    const edgeMap = new Map<string, Datum>()
    for (const e of es) if (e.__raw != null) edgeMap.set(e.id, e.__raw)
    return {
      nodes: ns,
      edges: es,
      domain: dom,
      rawNodeById: nodeMap,
      rawEdgeById: edgeMap
    }
  }, [
    rawNodes,
    rawEdges,
    rawDomain,
    getNodeId,
    getEdgeId,
    nodeLabel,
    xExtentAccessor,
    groupBy,
    sourceAccessor,
    targetAccessor,
    valueAccessor,
    startTimeAccessor,
    endTimeAccessor,
    systemInTimeAccessor,
    systemOutTimeAccessor
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
      !!title,
      showQualityReadout,
      axisTicks.length > 0,
      orientation
    ),
    userMargin,
    width,
    height,
    hasTitle: !!title,
    loading,
    loadingContent,
    emptyContent
  })

  const legendActive = (showLegend ?? !!colorBy) && !!colorBy
  const userMarginSet = useCallback(
    (side: MarginSide): boolean => {
      if (userMargin == null) return false
      if (typeof userMargin === "number") return true
      return (userMargin as Partial<Record<MarginSide, number>>)[side] != null
    },
    [userMargin]
  )
  const margin = useMemo(() => {
    const merged = { ...setup.margin }
    if (legendActive) {
      if (
        legendPosition === "right" &&
        !userMarginSet("right") &&
        merged.right < 140
      )
        merged.right = 140
      else if (
        legendPosition === "bottom" &&
        !userMarginSet("bottom") &&
        merged.bottom < 80
      )
        merged.bottom = 80
    }
    return merged
  }, [setup.margin, legendActive, legendPosition, userMarginSet])

  const plotW = width - margin.left - margin.right
  const plotH = height - margin.top - margin.bottom
  const timelineExtent = orientation === "vertical" ? plotH : plotW

  const colorOf = useCallback(
    (id: string, idx: number): string => {
      if (colorBy && rawNodes) {
        const raw = rawNodeById.get(id)
        if (raw)
          return getColor(
            raw,
            colorBy as ChartAccessor<Datum, string>,
            setup.colorScale
          ) as string
      }
      return (
        setup.effectivePalette[idx % setup.effectivePalette.length] || "#475569"
      )
    },
    [colorBy, rawNodes, rawNodeById, setup.colorScale, setup.effectivePalette]
  )

  const sceneInput: BuildScenesInput | null = useMemo(() => {
    if (plotW <= 0 || plotH <= 0) return null
    return {
      nodes,
      edges,
      domain,
      plotW,
      plotH,
      orientation,
      ribbonLane,
      ribbonMinRun,
      edgeOpacity:
        typeof edgeOpacity === "function"
          ? (edge: Datum) => edgeOpacity(edge as TEdge)
          : edgeOpacity,
      colorOf,
      showLabels,
      labelPriorityAccessor: labelPriorityAccessor as
        string | ((d: Datum) => number) | undefined,
      maxLabels,
      selectionDatum,
      styleRules,
      // Live React surface: warn on duplicate ids, strip bad system times (M6).
      usageMode: "push",
      colorBy: colorBy as string | ((d: Datum) => unknown) | undefined,
      valueAccessor: valueAccessor as
        string | ((d: Datum) => unknown) | undefined,
      layoutOpts: {
        pairing,
        packing,
        laneOrder,
        lifetimeMode,
        maxValueScale,
        lanePlacement,
        nodeSizing,
        groupPadding
      }
    }
  }, [
    nodes,
    edges,
    domain,
    plotW,
    plotH,
    orientation,
    ribbonLane,
    ribbonMinRun,
    edgeOpacity,
    colorOf,
    showLabels,
    labelPriorityAccessor,
    maxLabels,
    selectionDatum,
    styleRules,
    colorBy,
    valueAccessor,
    pairing,
    packing,
    laneOrder,
    lifetimeMode,
    maxValueScale,
    lanePlacement,
    nodeSizing,
    groupPadding
  ])

  const colorById = useMemo(() => {
    return Object.fromEntries(
      nodes.map((node, index) => [node.id, colorOf(node.id, index)])
    )
  }, [nodes, colorOf])

  const sceneResult = useProcessSankeyScenes(sceneInput, {
    execution: layoutExecution,
    workerThreshold: layoutWorkerThreshold,
    colorById,
    fallbackPalette: setup.effectivePalette,
    rawNodeById,
    rawEdgeById
  })

  const { issues, warnings, layout, xScale } = sceneResult
  const layoutConfig: ProcessSankeyLayoutConfig = sceneResult.layoutConfig
  const layoutStatus = sceneResult.status

  scalesRef.current = layout
    ? { time: xScale, centerlines: layout.centerlines }
    : { time: xScale }
  layoutSnapshotRef.current = layout
    ? {
        layout,
        nodes,
        edges,
        bands: layoutConfig.bands,
        ribbons: layoutConfig.ribbons,
        warnings,
        status: layoutStatus
      }
    : null

  const onLayoutStateChangeRef = useRef(onLayoutStateChange)
  onLayoutStateChangeRef.current = onLayoutStateChange
  useEffect(() => {
    onLayoutStateChangeRef.current?.(layoutStatus)
  }, [layoutStatus])
  useEffect(() => {
    if (warnings.length === 0) return
    console.warn(
      "ProcessSankey warnings:",
      warnings.map(formatProcessSankeyIssue).join("; ")
    )
  }, [warnings])

  const legendNode = useMemo(() => {
    if (!legendActive || !colorBy) return undefined
    const seen = new Map<string, { label: string; color: string }>()
    ;(rawNodes ?? []).forEach((n, i) => {
      const v = readChartAccessor(colorBy as ChartAccessor<TNode, string>, n)
      const label = v == null ? "" : String(v)
      if (!label || seen.has(label)) return
      seen.set(label, { label, color: colorOf(getNodeId(n), i) })
    })
    const items = Array.from(seen.values())
    if (items.length === 0) return undefined
    const legendGroups: LegendGroup[] = [
      {
        type: "fill",
        label: "",
        items,
        styleFn: (d: { color?: string }) => {
          const c = d.color || "#333"
          return { fill: c, stroke: c }
        }
      }
    ]
    return { legendGroups }
  }, [legendActive, colorBy, rawNodes, colorOf, getNodeId])

  const tooltipContent = useProcessSankeyTooltipContent<TNode, TEdge>({
    tooltip,
    enableHover,
    layout,
    timeFormat,
    valueFormat,
    sourceAccessor,
    targetAccessor,
    valueAccessor,
    startTimeAccessor,
    endTimeAccessor
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
      toTime: toProcessSankeyTime,
      xScale: (t) => Number(xScale(t))
    })
  }, [
    layout,
    nodes,
    orientation,
    plotW,
    plotH,
    timelineExtent,
    axisTicks,
    showQualityReadout,
    showLaneRails,
    warnings,
    timeFormat,
    colorOf,
    xScale
  ])

  const safeFrameNodes = useMemo(
    () => (rawNodes ?? []).map((n) => ({ id: getNodeId(n), data: n as Datum })),
    [rawNodes, getNodeId]
  )
  const ribbonBezierById = useMemo(() => {
    const map = new Map<string, BezierCache>()
    for (const r of layoutConfig.ribbons) {
      if (r.bezier) map.set(r.id, r.bezier)
    }
    return map
  }, [layoutConfig])
  const safeFrameEdges = useMemo(
    () =>
      (rawEdges ?? []).map((e, i) => {
        const id = getEdgeId(e, i)
        const rawValue = Number(readChartAccessor(valueAccessor, e))
        return {
          id,
          source: String(readChartAccessor(sourceAccessor, e)),
          target: String(readChartAccessor(targetAccessor, e)),
          value: Number.isFinite(rawValue) ? rawValue : 0,
          bezier: ribbonBezierById.get(id),
          data: e as Datum
        }
      }),
    [
      rawEdges,
      getEdgeId,
      sourceAccessor,
      targetAccessor,
      valueAccessor,
      ribbonBezierById
    ]
  )

  if (issues.length > 0) {
    return (
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={title ?? "Process Sankey validation failed"}
      >
        <text
          x={20}
          y={30}
          fontSize={13}
          fontWeight={600}
          fill="var(--semiotic-danger, #dc2626)"
        >
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
    layoutStatus === "pending" && layoutLoadingContent !== false && !layout

  return (
    <div style={{ position: "relative", width, height }}>
      {showLayoutLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            background: "var(--semiotic-bg, #fff)"
          }}
        >
          {renderLoadingState(true, width, height, layoutLoadingContent)}
        </div>
      )}
      <StreamNetworkFrame
        ref={frameRef}
        chartType="force"
        nodes={safeFrameNodes}
        edges={safeFrameEdges}
        customNetworkLayout={
          emitProcessSankeyScenes as unknown as StreamNetworkFrameProps["customNetworkLayout"]
        }
        layoutConfig={layoutConfig as unknown as Record<string, unknown>}
        size={[width, height]}
        responsiveWidth={responsiveWidth}
        responsiveHeight={responsiveHeight}
        maxDevicePixelRatio={props.maxDevicePixelRatio}
        margin={margin}
        title={title}
        description={
          description ??
          "Temporal process flow with lifetime-bounded node lanes, mass bands, and value-scaled ribbons."
        }
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
          linkedHover,
          selection,
          onObservation,
          onClick,
          mobileInteraction: setup.mobileInteraction,
          customHoverBehavior: setup.customHoverBehavior,
          customClickBehavior: setup.customClickBehavior,
          linkedHoverInClickPredicate: false
        })}
        chartId={chartId}
        colorScheme={Array.isArray(colorScheme) ? colorScheme : undefined}
        // ProcessSankey emits a custom scene. Forward the resolved named
        // selection so its bands/ribbons can dim in place without a relayout.
        layoutSelection={setup.activeSelectionHook}
        {...frameProps}
      />
    </div>
  )
}) as unknown as {
  <TNode extends Datum = Datum, TEdge extends Datum = Datum>(
    props: ProcessSankeyProps<TNode, TEdge> &
      React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

;(ProcessSankey as unknown as { displayName?: string }).displayName =
  "ProcessSankey"

export default ProcessSankey
