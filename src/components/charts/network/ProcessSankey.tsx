"use client"
import * as React from "react"
import { useMemo, useState, useRef, useCallback, useEffect } from "react"
import { scaleTime } from "d3-scale"
import { forwardRef } from "react"

import {
  computeProcessSankeyLayout,
  validateProcessSankey,
  formatProcessSankeyIssue,
  buildBandPath,
  buildRibbonPath,
  clampSamples,
} from "./processSankey/algorithm.js"
import { massHistoryRows, pickMassQuantiles } from "./processSankey/tooltipUtils"
import {
  emitProcessSankeyScenes,
  isProcessSankeyScenePayload,
  type ProcessSankeyBandSpec,
  type ProcessSankeyRibbonSpec,
  type ProcessSankeyLayoutConfig,
} from "./processSankey/streamingLayout"

import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import type { RealtimeFrameHandle, HoverData } from "../../realtime/types"
import { useColorScale, useThemeCategorical } from "../shared/hooks"
import { getColor, COLOR_SCHEMES, DEFAULT_COLORS } from "../shared/colorUtils"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type {
  StreamNetworkFrameProps,
  StreamNetworkFrameHandle,
} from "../../stream/networkTypes"
import type { LegendGroup } from "../../types/legendTypes"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"

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
  /** [tStart, tEnd] of the chart's x-axis. Required. */
  domain: [TimeLike, TimeLike]
  /** Optional axis ticks. Each tick: { date, label }. */
  axisTicks?: ProcessSankeyTick[]

  // Accessors
  nodeIdAccessor?: ChartAccessor<TNode, string>
  sourceAccessor?: ChartAccessor<TEdge, string>
  targetAccessor?: ChartAccessor<TEdge, string>
  valueAccessor?: ChartAccessor<TEdge, number>
  startTimeAccessor?: ChartAccessor<TEdge, TimeLike>
  endTimeAccessor?: ChartAccessor<TEdge, TimeLike>
  /**
   * Accessor for a node's explicit lifetime extent — a `[start, end]`
   * tuple of time-likes. Lane spans
   * `min(xExtent[0], earliestEdge)` to `max(xExtent[1], latestEdge)`.
   */
  xExtentAccessor?: ChartAccessor<TNode, [TimeLike, TimeLike]>
  edgeIdAccessor?: ChartAccessor<TEdge, string>

  // Coloring
  colorBy?: ChartAccessor<TNode, string>
  colorScheme?: string | string[]
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
  pairing?: "value" | "temporal"
  packing?: "off" | "reuse"
  laneOrder?: "insertion" | "crossing-min" | "inside-out" | "crossing-min+inside-out"
  ribbonLane?: "source" | "target" | "both"
  lifetimeMode?: "full" | "half"
  showLaneRails?: boolean
  showQualityReadout?: boolean
  edgeOpacity?: number

  // Interaction
  /** Tooltip content. `false` disables, `true` uses the default,
   *  or pass a `Tooltip(...)` / custom function for full control. */
  tooltip?: TooltipProp
  enableHover?: boolean
  onClick?: (datum: Datum, position?: { x: number; y: number }) => void

  // Particles
  showParticles?: boolean
  particleRadius?: number
  particleDuration?: number
  particleDensity?: number
  particleMaxPerEdge?: number

  /** Pass-through to the underlying StreamNetworkFrame. */
  frameProps?: Partial<Omit<StreamNetworkFrameProps,
    "nodes" | "edges" | "chartType" | "size" | "customNetworkLayout" | "layoutConfig"
  >>
}

interface NormalizedNode {
  id: string
  xExtent?: [number, number]
  __raw?: Datum
}
interface NormalizedEdge {
  id: string
  source: string
  target: string
  value: number
  startTime: number
  endTime: number
  __raw?: Datum
}

function accessor<T extends Datum, V>(a: ChartAccessor<T, V>, d: T): V {
  if (typeof a === "function") return a(d)
  return d[a as string] as V
}

/**
 * ProcessSankey — temporal flow between nodes with an actual time x-axis.
 *
 * Built on top of `StreamNetworkFrame` via the `customNetworkLayout`
 * escape hatch. Bands and ribbons emit as `bezier` scene-edges; the
 * Frame handles canvas painting, hit testing, accessibility, theme
 * cascade, and the push API.
 *
 * **Differs from SankeyDiagram in three ways:**
 *
 * 1. **Edges carry time.** Each edge has `startTime` / `endTime`.
 * 2. **Nodes have lifetimes, not ranks.** A node's vertical lane spans
 *    `min(xExtent[0], earliestEdge)` to `max(xExtent[1], latestEdge)`.
 * 3. **Static-graph cycles are valid** as long as edges move forward in time.
 *
 * @example
 * ```tsx
 * const ref = useRef<RealtimeFrameHandle>(null)
 * <ProcessSankey
 *   ref={ref}
 *   nodes={nodes}
 *   edges={edges}
 *   domain={[t0, t1]}
 *   colorBy="category"
 *   showLegend
 * />
 * ```
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
    sourceAccessor = "source",
    targetAccessor = "target",
    valueAccessor = "value",
    startTimeAccessor = "startTime",
    endTimeAccessor = "endTime",
    xExtentAccessor = "xExtent",
    edgeIdAccessor = "id",
    colorBy,
    colorScheme,
    showLegend,
    legendPosition = "right",
    pairing = "temporal",
    packing = "reuse",
    laneOrder = "crossing-min",
    ribbonLane = "both",
    lifetimeMode = "half",
    showLaneRails = false,
    showQualityReadout = false,
    width = 760,
    height = 520,
    margin: userMargin,
    title,
    description,
    edgeOpacity = 0.35,
    timeFormat,
    valueFormat,
    tooltip,
    enableHover = true,
    onObservation,
    onClick,
    showParticles = false,
    particleRadius = 2.5,
    particleDuration = 6000,
    particleDensity = 1,
    particleMaxPerEdge = 40,
    chartId,
    frameProps = {},
  } = props

  // ── Push API: own the edge/node lists when controlled props are absent ──
  const [pushedEdges, setPushedEdges] = useState<TEdge[]>([])
  const [pushedNodes, setPushedNodes] = useState<TNode[]>([])
  const isControlled = rawEdgesProp !== undefined
  const rawEdges = isControlled ? rawEdgesProp : pushedEdges
  const rawNodes = (rawNodesProp ?? pushedNodes) as TNode[]

  // ── Frame ref bridges the user's ref to the inner frame's handle. ────
  // The push API methods route through StreamNetworkFrame, but
  // ProcessSankey accepts both nodes and edges via push (auto-detected
  // by source/target presence), so we override the variant defaults.
  const frameRef = useRef<StreamNetworkFrameHandle>(null)
  // Resolve an item's edge id when it's an edge — used by remove/update
  // so consumers can address edges by id (the documented contract).
  // Nodes still go through `nodeIdAccessor` for the same operation;
  // remove/update walk both lists and apply to whichever has the id.
  const resolveEdgeId = useCallback((e: TEdge, i: number): string => {
    const fromAccessor = accessor(edgeIdAccessor, e) as unknown as string | undefined
    if (fromAccessor != null) return String(fromAccessor)
    return `${accessor(sourceAccessor, e)}-${accessor(targetAccessor, e)}-${i}`
  }, [edgeIdAccessor, sourceAccessor, targetAccessor])

  const looksLikeEdge = useCallback((item: Datum | undefined | null): boolean => {
    if (item == null) return false
    const e = item as TEdge
    return (
      accessor(sourceAccessor as ChartAccessor<TEdge, string>, e) != null &&
      accessor(targetAccessor as ChartAccessor<TEdge, string>, e) != null
    )
  }, [sourceAccessor, targetAccessor])

  useFrameImperativeHandle(ref, {
    variant: "network",
    frameRef,
    overrides: {
      push(item: Datum) {
        if (looksLikeEdge(item)) {
          if (isControlled) {
            // eslint-disable-next-line no-console
            console.warn("ProcessSankey.push: edge ignored — `edges` prop is controlled.")
            return
          }
          setPushedEdges(prev => [...prev, item as unknown as TEdge])
        } else {
          // Nodes are always push-mode (the `nodes` prop is always
          // optional / merged with internal pushedNodes), so allow
          // node pushes even when `edges` is controlled.
          setPushedNodes(prev => [...prev, item as unknown as TNode])
        }
      },
      pushMany(items: Datum[]) {
        // Partition into edges + nodes. Edges respect controlled mode
        // (silently dropped with a warning if `edges` is a prop);
        // nodes always flow through, matching push()'s behavior so
        // batch-pushing mixed records doesn't lose data.
        const newEdges: TEdge[] = []
        const newNodes: TNode[] = []
        for (const item of items) {
          if (looksLikeEdge(item)) newEdges.push(item as unknown as TEdge)
          else newNodes.push(item as unknown as TNode)
        }
        if (newEdges.length > 0) {
          if (isControlled) {
            // eslint-disable-next-line no-console
            console.warn("ProcessSankey.pushMany: edges ignored — `edges` prop is controlled.")
          } else {
            setPushedEdges(prev => [...prev, ...newEdges])
          }
        }
        if (newNodes.length > 0) setPushedNodes(prev => [...prev, ...newNodes])
      },
      // remove(id | id[]) — addresses *edges* primarily (the documented
      // contract; ProcessSankey's primary data shape is edges) but
      // falls through to nodes when an id matches there. Returns the
      // removed records so callers can undo / log.
      remove(id: string | string[]): Datum[] {
        const ids = new Set(Array.isArray(id) ? id : [id])
        const removed: Datum[] = []
        if (!isControlled) {
          setPushedEdges(prev => prev.filter((e, i) => {
            const eid = resolveEdgeId(e, i)
            if (ids.has(eid)) {
              removed.push(e as Datum)
              return false
            }
            return true
          }))
        }
        // Node-side fallback — `nodeIdAccessor` resolves user nodes.
        setPushedNodes(prev => prev.filter((n) => {
          const nid = String(accessor(nodeIdAccessor, n))
          if (ids.has(nid)) {
            removed.push(n as Datum)
            return false
          }
          return true
        }))
        return removed
      },
      // update(id, updater) — same id resolution as remove(): walks
      // edges first, then nodes. Returns previous data values for
      // undo/observation.
      update(id: string | string[], updater: (d: Datum) => Datum): Datum[] {
        const ids = new Set(Array.isArray(id) ? id : [id])
        const previous: Datum[] = []
        if (!isControlled) {
          setPushedEdges(prev => prev.map((e, i) => {
            const eid = resolveEdgeId(e, i)
            if (ids.has(eid)) {
              previous.push(e as Datum)
              return updater(e as Datum) as TEdge
            }
            return e
          }))
        }
        setPushedNodes(prev => prev.map((n) => {
          const nid = String(accessor(nodeIdAccessor, n))
          if (ids.has(nid)) {
            previous.push(n as Datum)
            return updater(n as Datum) as TNode
          }
          return n
        }))
        return previous
      },
      clear() {
        if (!isControlled) setPushedEdges([])
        setPushedNodes([])
        frameRef.current?.clear()
      },
      // Snapshot the current edge list. `?? []` guards against a
      // consumer passing `edges={null}` — without it the ref contract
      // (`Datum[]`) would silently leak `null` to callers.
      getData: () => (rawEdges ?? []) as unknown as Datum[],
      getScales: () => null,
    },
    deps: [isControlled, looksLikeEdge, resolveEdgeId, nodeIdAccessor, rawEdges],
  })

  const getEdgeId = useCallback((e: TEdge, i: number): string => {
    const fromAccessor = accessor(edgeIdAccessor, e) as unknown as string | undefined
    if (fromAccessor != null) return String(fromAccessor)
    return `${accessor(sourceAccessor, e)}-${accessor(targetAccessor, e)}-${i}`
  }, [edgeIdAccessor, sourceAccessor, targetAccessor])

  const getNodeId = useCallback((n: TNode): string => String(accessor(nodeIdAccessor, n)),
    [nodeIdAccessor])

  // ── Normalize to algorithm-internal shape. Single useMemo, all inputs deps. ──
  const { nodes, edges, domain, rawNodeById, rawEdgeById } = useMemo(() => {
    const ns: NormalizedNode[] = (rawNodes ?? []).map((n) => {
      const id = getNodeId(n)
      const o: NormalizedNode = { id, __raw: n as Datum }
      const xExtent = xExtentAccessor ? accessor(xExtentAccessor, n) : null
      if (Array.isArray(xExtent) && xExtent.length === 2) {
        const a = toTime(xExtent[0] as TimeLike)
        const b = toTime(xExtent[1] as TimeLike)
        if (Number.isFinite(a) && Number.isFinite(b)) o.xExtent = [a, b]
      }
      return o
    })
    const es: NormalizedEdge[] = (rawEdges ?? []).map((e, i) => ({
      id: getEdgeId(e, i),
      source: String(accessor(sourceAccessor, e)),
      target: String(accessor(targetAccessor, e)),
      value: Number(accessor(valueAccessor, e)),
      startTime: toTime(accessor(startTimeAccessor, e) as TimeLike),
      endTime: toTime(accessor(endTimeAccessor, e) as TimeLike),
      __raw: e as Datum,
    }))
    const dom: [number, number] = [toTime(rawDomain[0]), toTime(rawDomain[1])]
    const nodeMap = new Map<string, Datum>()
    for (const n of ns) if (n.__raw != null) nodeMap.set(n.id, n.__raw)
    const edgeMap = new Map<string, Datum>()
    for (const e of es) if (e.__raw != null) edgeMap.set(e.id, e.__raw)
    return { nodes: ns, edges: es, domain: dom, rawNodeById: nodeMap, rawEdgeById: edgeMap }
  }, [
    rawNodes, rawEdges, rawDomain, getNodeId, getEdgeId, xExtentAccessor,
    sourceAccessor, targetAccessor, valueAccessor, startTimeAccessor, endTimeAccessor,
  ])

  // ── Margin: extend right/bottom for the legend just like the auto-legend hook does. ──
  const legendActive = (showLegend ?? !!colorBy) && !!colorBy

  const margin = useMemo(() => {
    const base = { top: 30, right: 80, bottom: 40, left: 80 }
    const merged = userMargin
      ? { ...base, ...(userMargin as Record<string, number>) }
      : base
    if (legendActive) {
      if (legendPosition === "right" && merged.right < 140) merged.right = 140
      else if (legendPosition === "bottom" && merged.bottom < 80) merged.bottom = 80
    }
    return merged
  }, [userMargin, legendActive, legendPosition])

  const plotW = width - margin.left - margin.right
  const plotH = height - margin.top - margin.bottom

  // ── Algorithm + path computation ────────────────────────────────────
  const issues = useMemo(() => validateProcessSankey(nodes, edges, domain), [nodes, edges, domain])

  const layout = useMemo(() => {
    if (issues.length > 0) return null
    return computeProcessSankeyLayout(nodes, edges, { plotH, pairing, packing, laneOrder, lifetimeMode })
  }, [issues, nodes, edges, plotH, pairing, packing, laneOrder, lifetimeMode])

  const xScale = useMemo(() => scaleTime().domain(domain).range([0, plotW]), [domain, plotW])

  // ── Color resolution ────────────────────────────────────────────────
  const themeCategorical = useThemeCategorical()
  const colorScale = useColorScale((rawNodes ?? []) as Datum[], colorBy as ChartAccessor<Datum, string> | undefined, colorScheme)
  const palette = useMemo(() => {
    if (Array.isArray(colorScheme)) return colorScheme
    if (themeCategorical && themeCategorical.length > 0) return themeCategorical
    const resolved = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES]
    return Array.isArray(resolved) ? resolved as string[] : DEFAULT_COLORS as unknown as string[]
  }, [colorScheme, themeCategorical])

  const colorOf = useCallback((id: string, idx: number): string => {
    if (colorBy && rawNodes) {
      const raw = rawNodeById.get(id)
      if (raw) return getColor(raw, colorBy as ChartAccessor<Datum, string>, colorScale) as string
    }
    return palette[idx % palette.length] || "#475569"
  }, [colorBy, rawNodes, rawNodeById, colorScale, palette])

  // ── Build band + ribbon scene specs from layout output. ─────────────
  // These flow to the customNetworkLayout via layoutConfig — the layout
  // fn is a thin shim that maps these to NetworkBezierEdge primitives.
  // Map node id → array index for O(1) source-color lookups in the
  // ribbon and particle loops below. Without this, each ribbon's color
  // resolution does a linear scan over `nodes`, making layout cost
  // O(|nodes|×|edges|) — quadratic on dense graphs. Computed once per
  // layout render and reused by `sceneSpecs` and `foregroundGraphics`.
  const nodeIndexById = useMemo(() => {
    const m = new Map<string, number>()
    nodes.forEach((n, i) => m.set(n.id, i))
    return m
  }, [nodes])

  const sceneSpecs = useMemo(() => {
    const empty: { bands: ProcessSankeyBandSpec[]; ribbons: ProcessSankeyRibbonSpec[] } = { bands: [], ribbons: [] }
    if (!layout) return empty
    const { centerlines, nodeData, valueScale: S } = layout
    const bands: ProcessSankeyBandSpec[] = []
    const ribbons: ProcessSankeyRibbonSpec[] = []
    nodes.forEach((n, idx) => {
      const data = nodeData[n.id]
      if (!data || data.samples.length === 0) return
      const path = buildBandPath(data.samples, centerlines[n.id], S, xScale, domain)
      if (!path) return
      const smSamples = clampSamples(data.samples, domain)
      const firstNonZero = smSamples.find((s: { topMass: number; botMass: number }) => s.topMass + s.botMass > 0) || smSamples[0]
      const visualOffset = ((firstNonZero.botMass - firstNonZero.topMass) * S) / 2
      const labelY = centerlines[n.id] + visualOffset
      const c = colorOf(n.id, idx)
      const raw = rawNodeById.get(n.id) ?? (n as Datum)
      bands.push({
        id: n.id,
        pathD: path,
        fill: c,
        stroke: c,
        strokeWidth: 0.5,
        rawDatum: raw,
        labelX: xScale(firstNonZero.t) - 4,
        labelY,
        labelText: n.id,
      })
    })
    edges.forEach((e) => {
      const srcAtt = nodeData[e.source]?.localAttachments.get(e.id)
      const tgtAtt = nodeData[e.target]?.localAttachments.get(e.id)
      if (!srcAtt || !tgtAtt) return
      const sourceIdx = nodeIndexById.get(e.source) ?? 0
      const fill = colorOf(e.source, sourceIdx)
      const d = buildRibbonPath(
        srcAtt, centerlines[e.source],
        tgtAtt, centerlines[e.target],
        S, xScale, ribbonLane, domain
      )
      const raw = rawEdgeById.get(e.id) ?? (e as Datum)
      ribbons.push({
        id: e.id,
        pathD: d,
        fill,
        opacity: edgeOpacity,
        rawDatum: raw,
      })
    })
    return { bands, ribbons }
  }, [layout, nodes, edges, xScale, domain, colorOf, rawNodeById, rawEdgeById, ribbonLane, edgeOpacity, nodeIndexById])

  const layoutConfig: ProcessSankeyLayoutConfig = useMemo(() => ({
    bands: sceneSpecs.bands,
    ribbons: sceneSpecs.ribbons,
    showLabels: true,
  }), [sceneSpecs])

  // ── Legend groups (mirror the auto-legend's shape; pass via frame's `legend` prop). ──
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
      type: "fill",
      label: "",
      items,
      styleFn: (d: { color?: string }) => {
        const c = d.color || "#333"
        return { fill: c, stroke: c }
      },
    }]
    return { legendGroups }
  }, [legendActive, colorBy, rawNodes, colorOf, getNodeId])

  // ── Tooltip content. Reuses the existing default body builders;
  //    custom `tooltip` prop overrides everything when supplied. ──
  const customTooltipFn = useMemo(() => {
    if (tooltip === false || !enableHover) return null
    if (tooltip === undefined || tooltip === true) return null
    return normalizeTooltip(tooltip) || null
  }, [tooltip, enableHover])

  const formatTime = useCallback((t: number): React.ReactNode => {
    if (timeFormat) return timeFormat(new Date(t))
    return new Date(t).toISOString().slice(0, 10)
  }, [timeFormat])

  const formatValue = useCallback((v: number): React.ReactNode => {
    if (valueFormat) return valueFormat(v)
    return String(v)
  }, [valueFormat])

  const tooltipContent = useCallback((d: HoverData): React.ReactNode => {
    if (!d || !d.data) return null
    const payload = d.data as unknown
    if (!isProcessSankeyScenePayload(payload)) {
      // Fallthrough — should not happen for ProcessSankey scenes, but
      // guard so a bad datum can't crash the tooltip pipeline.
      return null
    }
    const userDatum = payload.data
    if (customTooltipFn) return customTooltipFn(userDatum)

    if (payload.__kind === "band") {
      const nodeId = payload.id
      const rows = layout ? massHistoryRows(layout.nodeData[nodeId]) : []
      const MAX = 5
      const truncated = rows.length > MAX ? rows.length : null
      const display = pickMassQuantiles(rows, MAX)
      return (
        <div style={{ minWidth: 160 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{nodeId}</div>
          {display.length > 0 && (
            <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
              <thead>
                <tr style={{ opacity: 0.6 }}>
                  <th style={{ textAlign: "left", fontWeight: 500, paddingRight: 8 }}>Time</th>
                  <th style={{ textAlign: "right", fontWeight: 500 }}>Mass</th>
                  {truncated != null && <th />}
                </tr>
              </thead>
              <tbody>
                {display.map((r, i) => (
                  <tr key={i}>
                    <td style={{ paddingRight: 8 }}>{formatTime(r.t)}</td>
                    <td style={{ textAlign: "right" }}>{formatValue(r.total)}</td>
                    {truncated != null && (
                      <td style={{ textAlign: "right", paddingLeft: 8, opacity: 0.55 }}>{r.mark}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {truncated != null && (
            <div style={{ marginTop: 4, fontSize: 10, opacity: 0.55 }}>
              showing 5 of {truncated} samples
            </div>
          )}
        </div>
      )
    }

    // Ribbon (edge) default tooltip. Goes through the accessor helper
    // so function-form accessors work — the previous direct
    // `e[acc as string]` lookup returned undefined whenever a consumer
    // passed `sourceAccessor={(e) => e.source}` or similar.
    const e = userDatum as TEdge
    const src = accessor(sourceAccessor as ChartAccessor<TEdge, string>, e)
    const tgt = accessor(targetAccessor as ChartAccessor<TEdge, string>, e)
    const val = accessor(valueAccessor as ChartAccessor<TEdge, number>, e)
    const start = accessor(startTimeAccessor as ChartAccessor<TEdge, TimeLike>, e)
    const end = accessor(endTimeAccessor as ChartAccessor<TEdge, TimeLike>, e)
    return (
      <div style={{ minWidth: 160 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {String(src)} → {String(tgt)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 8, fontSize: 11 }}>
          {val != null && (<><span style={{ opacity: 0.6 }}>value</span>
            <span style={{ textAlign: "right" }}>{formatValue(Number(val))}</span></>)}
          {start != null && (<><span style={{ opacity: 0.6 }}>start</span>
            <span style={{ textAlign: "right" }}>{formatTime(toTime(start as TimeLike))}</span></>)}
          {end != null && (<><span style={{ opacity: 0.6 }}>end</span>
            <span style={{ textAlign: "right" }}>{formatTime(toTime(end as TimeLike))}</span></>)}
        </div>
      </div>
    )
  }, [layout, customTooltipFn, formatTime, formatValue, sourceAccessor, targetAccessor, valueAccessor, startTimeAccessor, endTimeAccessor])

  // ── Background graphics: time axis, gridlines, lane rails, quality readout.
  //    All live behind the data layer so bands/ribbons paint over them. ──
  const backgroundGraphics = useMemo(() => {
    if (!layout) return null
    const { centerlines, laneLifetime, nodeData, valueScale: S, compressedPadding,
      crossingsBefore, crossingsAfter, lengthBefore, lengthAfter } = layout
    return (
      <g>
        {showQualityReadout && (crossingsAfter ?? null) !== null && (
          <text x={plotW} y={-12} fontSize={10} fill="#94a3b8" textAnchor="end">
            crossings: {crossingsBefore} → {crossingsAfter}
            {"   "}edge length: {Math.round(lengthBefore!)} → {Math.round(lengthAfter!)}
          </text>
        )}
        {compressedPadding && (
          <text x={plotW} y={2} fontSize={10} fill="#94a3b8" textAnchor="end">
            dense layout: lane gaps compressed
          </text>
        )}
        {axisTicks.map((tick, i) => {
          const x = xScale(toTime(tick.date))
          return (
            <line key={`grid-${i}`} x1={x} y1={0} x2={x} y2={plotH}
              stroke="#94a3b8" strokeOpacity={0.15} strokeDasharray="2 4" />
          )
        })}
        {showLaneRails && nodes.map((n, idx) => {
          const lt = laneLifetime[n.id]
          if (!lt || lt.start === null) return null
          const cl = centerlines[n.id]
          const data = nodeData[n.id]
          const peak = data ? { topPeak: data.topPeak, botPeak: data.botPeak } : { topPeak: 0, botPeak: 0 }
          const visualMid = cl + ((peak.botPeak - peak.topPeak) * S) / 2
          const x0 = xScale(lt.start as number)
          const x1 = xScale(lt.end as number)
          const c = colorOf(n.id, idx)
          return (
            <g key={`lane-${n.id}`}>
              <line x1={x0} y1={visualMid} x2={x1} y2={visualMid}
                stroke={c} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 3" />
              <line x1={x0} y1={visualMid - 4} x2={x0} y2={visualMid + 4} stroke={c} strokeOpacity={0.5} />
              <line x1={x1} y1={visualMid - 4} x2={x1} y2={visualMid + 4} stroke={c} strokeOpacity={0.5} />
            </g>
          )
        })}
        <line x1={0} y1={plotH + 4} x2={plotW} y2={plotH + 4} stroke="#94a3b8" />
        {axisTicks.map((tick, i) => {
          const t = toTime(tick.date)
          const x = xScale(t)
          const label = timeFormat ? timeFormat(new Date(t)) : tick.label
          return (
            <g key={i} transform={`translate(${x},${plotH + 4})`}>
              <line y2={6} stroke="#94a3b8" />
              <text y={20} textAnchor="middle" fontSize={11} fill="#475569">{label as React.ReactNode}</text>
            </g>
          )
        })}
      </g>
    )
  }, [layout, axisTicks, xScale, plotW, plotH, showLaneRails, nodes, colorOf, showQualityReadout, timeFormat])

  // ── Particle overlay. rAF-driven; renders over the data layer. ──
  const [particleProgress, setParticleProgress] = useState(0)
  useEffect(() => {
    if (!showParticles) return
    // Guard against a bogus particleDuration prop (0, negative, NaN).
    // Using one as the divisor below would produce NaN coordinates and
    // particles would silently disappear; fall back to the default.
    const cycleMs = Number.isFinite(particleDuration) && particleDuration > 0
      ? particleDuration
      : 6000
    let raf = 0
    let mounted = true
    const start = performance.now()
    const tick = (now: number) => {
      if (!mounted) return
      const t = ((now - start) % cycleMs) / cycleMs
      setParticleProgress(t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      mounted = false
      cancelAnimationFrame(raf)
    }
  }, [showParticles, particleDuration])

  const foregroundGraphics = useMemo(() => {
    if (!showParticles || !layout) return null
    const { centerlines, nodeData, valueScale: S } = layout
    const dots: React.ReactNode[] = []
    edges.forEach((e) => {
      const srcAtt = nodeData[e.source]?.localAttachments.get(e.id)
      const tgtAtt = nodeData[e.target]?.localAttachments.get(e.id)
      if (!srcAtt || !tgtAtt) return
      const sx = xScale(Math.max(domain[0], Math.min(domain[1], srcAtt.time)))
      const tx = xScale(Math.max(domain[0], Math.min(domain[1], tgtAtt.time)))
      const cx = ribbonLane === "source" ? sx + (tx - sx) * 0.85
              : ribbonLane === "target" ? sx + (tx - sx) * 0.15
              : (sx + tx) / 2
      const sCl = centerlines[e.source]
      const tCl = centerlines[e.target]
      const sCenter = srcAtt.side === "top"
        ? sCl - (srcAtt.sideMassBefore - srcAtt.value / 2) * S
        : sCl + (srcAtt.sideMassBefore - srcAtt.value / 2) * S
      const tCenter = tgtAtt.side === "top"
        ? tCl - (tgtAtt.sideMassAfter - tgtAtt.value / 2) * S
        : tCl + (tgtAtt.sideMassAfter - tgtAtt.value / 2) * S
      const target = Math.round(e.value * particleDensity)
      const n = Math.max(1, Math.min(particleMaxPerEdge, target))
      const sourceIdx = nodeIndexById.get(e.source) ?? 0
      const fill = colorOf(e.source, sourceIdx)
      for (let i = 0; i < n; i++) {
        const phase = (particleProgress + i / n) % 1
        const u = 1 - phase
        const x = u * u * u * sx + 3 * u * u * phase * cx + 3 * u * phase * phase * cx + phase * phase * phase * tx
        const y = u * u * u * sCenter + 3 * u * u * phase * sCenter + 3 * u * phase * phase * tCenter + phase * phase * phase * tCenter
        dots.push(
          <circle
            key={`p-${e.id}-${i}`}
            cx={x} cy={y} r={particleRadius}
            fill={fill}
            // Outline against the chart background so a particle that
            // happens to land on a same-colored ribbon still reads.
            // `--semiotic-bg` is the documented theme token; the
            // `--surface-1` we used previously was a docs-page CSS
            // variable that didn't resolve under ThemeProvider and
            // always fell back to the literal color.
            stroke="var(--semiotic-bg, #111827)"
            strokeWidth={0.5}
            pointerEvents="none"
          />
        )
      }
    })
    return <g>{dots}</g>
  }, [showParticles, layout, edges, xScale, domain, ribbonLane, colorOf, particleDensity, particleMaxPerEdge, particleProgress, particleRadius, nodeIndexById])

  // ── Validation gate ──
  if (issues.length > 0) {
    return (
      <svg width={width} height={height} role="img" aria-label={title ?? "Process Sankey validation failed"}>
        <text x={20} y={30} fontSize={13} fontWeight={600} fill="var(--semiotic-danger, #dc2626)">
          ProcessSankey: data invalid
        </text>
        {issues.map((i, k) => (
          <text key={k} x={20} y={56 + k * 18} fontSize={12} fill="#64748b">
            {`• ${formatProcessSankeyIssue(i)}`}
          </text>
        ))}
      </svg>
    )
  }

  // ── Frame integration ──────────────────────────────────────────────
  // We pass empty `nodes` and `edges` to the frame because ProcessSankey
  // emits its own scene primitives via `customNetworkLayout`. The frame's
  // own layout plugins would otherwise try to position our data with
  // sankey/force/etc. semantics, which doesn't apply here.
  // Pass the user's raw nodes/edges through so the frame's SSR path
  // (which gates `buildScene` on `nodes.length > 0 || edges.length > 0`)
  // actually runs the customNetworkLayout. ProcessSankey doesn't use
  // the frame's force-layout output for positioning — bands/ribbons
  // come from `layoutConfig` — but the ingestion step has to fire so
  // SSR snapshots match the CSR canvas pipeline.
  const safeFrameNodes = useMemo(
    () => (rawNodes ?? []).map((n) => ({ id: getNodeId(n), data: n as Datum })),
    [rawNodes, getNodeId],
  )
  const safeFrameEdges = useMemo(
    () => (rawEdges ?? []).map((e, i) => ({
      id: getEdgeId(e, i),
      source: String(accessor(sourceAccessor, e)),
      target: String(accessor(targetAccessor, e)),
      data: e as Datum,
    })),
    [rawEdges, getEdgeId, sourceAccessor, targetAccessor],
  )

  return (
    <StreamNetworkFrame
      ref={frameRef}
      chartType="force"
      nodes={safeFrameNodes}
      edges={safeFrameEdges}
      customNetworkLayout={emitProcessSankeyScenes as unknown as StreamNetworkFrameProps["customNetworkLayout"]}
      layoutConfig={layoutConfig as unknown as Record<string, unknown>}
      size={[width, height]}
      margin={margin}
      title={title}
      description={description ?? "Temporal process flow with lifetime-bounded node lanes, mass bands, and value-scaled ribbons."}
      enableHover={enableHover}
      tooltipContent={tooltip === false ? () => null : tooltipContent}
      backgroundGraphics={backgroundGraphics}
      foregroundGraphics={foregroundGraphics}
      legend={legendNode}
      legendPosition={legendPosition}
      onObservation={onObservation}
      customClickBehavior={onClick ? (h) => {
        if (!h || !h.data) return
        const payload = h.data as unknown
        if (!isProcessSankeyScenePayload(payload)) return
        onClick(payload.data, { x: h.x, y: h.y })
      } : undefined}
      chartId={chartId}
      colorScheme={Array.isArray(colorScheme) ? colorScheme : undefined}
      {...frameProps}
    />
  )
}) as unknown as {
  <TNode extends Datum = Datum, TEdge extends Datum = Datum>(
    props: ProcessSankeyProps<TNode, TEdge> & React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

;(ProcessSankey as unknown as { displayName?: string }).displayName = "ProcessSankey"

export default ProcessSankey
