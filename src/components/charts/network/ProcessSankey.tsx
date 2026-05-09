"use client"
import * as React from "react"
import { useMemo, useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from "react"
import { scaleTime } from "d3-scale"

import {
  computeProcessSankeyLayout,
  validateProcessSankey,
  formatProcessSankeyIssue,
  buildBandPath,
  buildRibbonPath,
  clampSamples,
} from "./processSankey/algorithm.js"
import { massHistoryRows, pickMassQuantiles } from "./processSankey/tooltipUtils"

import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useColorScale, useThemeCategorical } from "../shared/hooks"
import { getColor, COLOR_SCHEMES, DEFAULT_COLORS } from "../shared/colorUtils"
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

/**
 * ProcessSankey component props.
 */
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
   * tuple of time-likes. When present, the node's lane spans
   * `min(xExtent[0], earliestEdge)` to `max(xExtent[1], latestEdge)`.
   * Useful when a node's lifetime extends past its last edge (e.g. a
   * candidate's campaign continues after the last contribution
   * settles, so the lane should keep drawing).
   */
  xExtentAccessor?: ChartAccessor<TNode, [TimeLike, TimeLike]>
  edgeIdAccessor?: ChartAccessor<TEdge, string>

  // Coloring
  /** Node accessor used to drive the color scale. Pass a categorical
   *  field (e.g. `"category"`) so every node sharing that value gets
   *  one color — analogous to `colorBy` on every other HOC. */
  colorBy?: ChartAccessor<TNode, string>
  colorScheme?: string | string[]
  /** Show a swatch + label legend. Defaults to `true` when `colorBy`
   *  is set, `false` otherwise. */
  showLegend?: boolean
  /** Legend position. `"right"` (default) reserves margin to the right
   *  of the plot; `"bottom"` reserves margin under the time axis. */
  legendPosition?: "right" | "bottom"

  // Formatting
  /**
   * Format function for time values — applied to axis tick labels and
   * to time fields in the default tooltip (startTime, endTime,
   * xExtent endpoints, and node mass-history timestamps). Same convention as
   * `xFormat` on XY charts. If omitted, axis ticks fall back to the
   * `axisTicks[].label` strings and tooltips render raw timestamps.
   */
  timeFormat?: (d: number | Date) => string | React.ReactNode
  /**
   * Format function for the `value` field on edges, applied in the
   * default tooltip. Mirrors `yFormat` on XY charts.
   */
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
  /**
   * Tooltip content. `false` disables, `true` uses the default
   * (key/value list of the hovered datum's fields), or pass a
   * `Tooltip(...)` / custom function for full control. Hover targets
   * are node bands and edge ribbons; the hovered datum is the original
   * record from `nodes` or `edges`.
   */
  tooltip?: TooltipProp
  /** If false, hover-to-show-tooltip is disabled. Default true. */
  enableHover?: boolean
  onClick?: (datum: Datum, position?: { x: number; y: number }) => void

  // Particles
  /**
   * Animate dots flowing along ribbons over their `startTime → endTime`
   * window. Independent of the chart's wall-clock time — particles
   * loop continuously over the chart's full domain.
   */
  showParticles?: boolean
  /** Particle dot radius in px. Default 2.5. */
  particleRadius?: number
  /** Loop duration in ms — one full source→target traversal. Default 6000. */
  particleDuration?: number
  /** Particles per unit of edge value. The actual count is
   *  `clamp(round(edge.value * particleDensity), 1, particleMaxPerEdge)`.
   *  Lower values thin the stream; higher values pack it. Default 1. */
  particleDensity?: number
  /** Cap on particles per edge so very thick ribbons don't drown the
   *  canvas. Default 40. */
  particleMaxPerEdge?: number
}

const DEFAULT_DATA: Datum[] = []
const DEFAULT_NODES: Datum[] = []

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

/**
 * ProcessSankey — temporal flow between nodes with an actual time x-axis.
 *
 * **Differs from SankeyDiagram in three ways:**
 *
 * 1. **Edges carry time.** Each edge has a `startTime` (when it leaves
 *    the source) and `endTime` (when it arrives at the target).
 *    Standard sankey treats edges as instantaneous; here they have
 *    duration, and a single (source, target) pair can have multiple
 *    edges at different times.
 *
 * 2. **Nodes have lifetimes, not ranks.** A node's vertical lane
 *    spans the union of its edges' time windows. Optionally a node
 *    may carry an `xExtent: [start, end]` to extend the lane outward
 *    — e.g. a candidate that exists before the first contribution
 *    arrives or stays open after the last spend settles.
 *
 * 3. **Static-graph cycles are valid.** If A sends to B and B later
 *    sends back to A, the directed graph has a cycle but every edge
 *    still moves forward in time. ProcessSankey accepts this; standard
 *    sankey rejects it as a DAG violation.
 *
 * **When to use this vs `SankeyDiagram`:** if you have flow events
 * with timestamps (PR commits over time, campaign-finance contributions,
 * supply-chain shipments), use ProcessSankey. If you have a static
 * total-flow snapshot (Q3 user funnel), use SankeyDiagram.
 *
 * **Push API:** wrap a ref to push edges live. Omit `edges` from props
 * to enter push mode; the component manages internal edge state.
 *
 * @example
 * ```tsx
 * const ref = useRef<RealtimeFrameHandle>(null)
 *
 * // Live mode — omit edges, push via ref
 * <ProcessSankey
 *   ref={ref}
 *   nodes={nodes}
 *   domain={[t0, t1]}
 * />
 *
 * ref.current?.push({ id: "e1", source: "Alice", target: "Eng", value: 8,
 *                     startTime: Date.now(), endTime: Date.now() + 86400e3 })
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
  } = props

  // Effective `showLegend` — auto-on when `colorBy` is set, unless the
  // user explicitly opts out. Mirrors the every-other-HOC default.
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

  // Push API state. When `edges` prop is set, props win (controlled mode);
  // when omitted, the component owns its edge list and the ref methods
  // mutate that internal state. Same pattern as the rest of the catalog.
  const [pushedEdges, setPushedEdges] = useState<TEdge[]>([])
  const [pushedNodes, setPushedNodes] = useState<TNode[]>([])
  const isControlled = rawEdgesProp !== undefined

  const rawEdges = isControlled ? rawEdgesProp : pushedEdges
  const rawNodes = (rawNodesProp ?? pushedNodes) as TNode[]

  const accessor = useCallback(<T extends Datum, V>(a: ChartAccessor<T, V>, d: T): V => {
    if (typeof a === "function") return a(d)
    return d[a as string] as V
  }, [])

  const getEdgeId = useCallback((e: TEdge, i: number): string => {
    const fromAccessor = accessor(edgeIdAccessor, e) as unknown as string | undefined
    if (fromAccessor != null) return String(fromAccessor)
    return `${accessor(sourceAccessor, e)}-${accessor(targetAccessor, e)}-${i}`
  }, [accessor, edgeIdAccessor, sourceAccessor, targetAccessor])

  const getNodeId = useCallback((n: TNode): string => {
    return String(accessor(nodeIdAccessor, n))
  }, [accessor, nodeIdAccessor])

  // Push API ref methods. Edges are the primary data shape; nodes
  // can also be pushed for completeness (some flows want to add a
  // new node before the first edge that references it arrives).
  useImperativeHandle(ref, () => ({
    push(item: Datum) {
      const candidate = item as TEdge
      // Heuristic: if it has source+target+value+timing, treat as edge.
      const looksLikeEdge =
        candidate != null &&
        accessor(sourceAccessor, candidate) != null &&
        accessor(targetAccessor, candidate) != null
      if (looksLikeEdge) {
        if (isControlled) {
          // eslint-disable-next-line no-console
          console.warn("ProcessSankey.push: ignored — `edges` prop is controlled. Omit `edges` to enable push mode.")
          return
        }
        setPushedEdges(prev => [...prev, candidate])
      } else {
        setPushedNodes(prev => [...prev, candidate as unknown as TNode])
      }
    },
    pushMany(items: Datum[]) {
      if (isControlled) {
        // eslint-disable-next-line no-console
        console.warn("ProcessSankey.pushMany: ignored — `edges` prop is controlled.")
        return
      }
      setPushedEdges(prev => [...prev, ...(items as unknown as TEdge[])])
    },
    remove(id: string | string[]) {
      if (isControlled) return []
      const ids = new Set(Array.isArray(id) ? id : [id])
      const removed: Datum[] = []
      setPushedEdges(prev => prev.filter((e, i) => {
        const eid = getEdgeId(e, i)
        if (ids.has(eid)) {
          removed.push(e as Datum)
          return false
        }
        return true
      }))
      return removed
    },
    update(id: string | string[], updater: (d: Datum) => Datum) {
      if (isControlled) return []
      const ids = new Set(Array.isArray(id) ? id : [id])
      const previous: Datum[] = []
      setPushedEdges(prev => prev.map((e, i) => {
        const eid = getEdgeId(e, i)
        if (ids.has(eid)) {
          previous.push(e as Datum)
          return updater(e as Datum) as TEdge
        }
        return e
      }))
      return previous
    },
    clear() {
      if (isControlled) return
      setPushedEdges([])
      setPushedNodes([])
    },
    getData() {
      return rawEdges as unknown as Datum[]
    },
    // ProcessSankey scales aren't generic enough to expose meaningfully
    getScales: () => null,
  }), [accessor, sourceAccessor, targetAccessor, isControlled, getEdgeId, rawEdges])

  // Normalize to algorithm-internal shape.
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
  }, [rawNodes, rawEdges, rawDomain, getNodeId, getEdgeId, accessor, xExtentAccessor, sourceAccessor, targetAccessor, valueAccessor, startTimeAccessor, endTimeAccessor])

  const plotW = width - margin.left - margin.right
  const plotH = height - margin.top - margin.bottom

  const issues = useMemo(() => validateProcessSankey(nodes, edges, domain), [nodes, edges, domain])

  // Color resolution
  const themeCategorical = useThemeCategorical()
  const colorScale = useColorScale((rawNodes ?? DEFAULT_NODES) as Datum[], colorBy as ChartAccessor<Datum, string> | undefined, colorScheme)
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

  // Distinct legend items. Walks rawNodes once, picks the first node
  // for each colorBy value, and reads the same color the band renders
  // with via `colorOf`. Suppressed when `colorBy` is unset.
  const legendItems = useMemo<{ label: string; color: string }[]>(() => {
    if (!legendActive || !colorBy) return []
    const seen = new Map<string, { label: string; color: string }>()
    ;(rawNodes ?? []).forEach((n, i) => {
      const v = accessor(colorBy as ChartAccessor<TNode, string>, n)
      const label = v == null ? "" : String(v)
      if (!label || seen.has(label)) return
      seen.set(label, { label, color: colorOf(getNodeId(n), i) })
    })
    return Array.from(seen.values())
  }, [legendActive, colorBy, rawNodes, accessor, colorOf, getNodeId])

  const xScale = useMemo(() => scaleTime().domain(domain).range([0, plotW]), [domain, plotW])

  const layout = useMemo(() => {
    if (issues.length > 0) return null
    return computeProcessSankeyLayout(nodes, edges, { plotH, pairing, packing, laneOrder, lifetimeMode })
  }, [issues, nodes, edges, plotH, pairing, packing, laneOrder, lifetimeMode])

  // Hover state for tooltips. Wraps the SVG in a relative-positioned
  // div so tooltip absolute-positioning can anchor next to the cursor.
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoverState, setHoverState] = useState<{
    datum: Datum
    target: "node" | "edge"
    pageX: number
    pageY: number
  } | null>(null)

  // User-supplied custom tooltip function, normalized. When set, this
  // overrides both node and edge default tooltips. When null, the
  // tooltip overlay falls back to defaults that differentiate by
  // hover target and apply the time/value formatters.
  const customTooltipFn = useMemo(() => {
    if (tooltip === false || !enableHover) return null
    if (tooltip === undefined || tooltip === true) return null
    return normalizeTooltip(tooltip) || null
  }, [tooltip, enableHover])

  const tooltipsEnabled = enableHover && tooltip !== false

  // Time / value formatters applied in the default tooltips and on axis
  // ticks. `timeFormat` is invoked with a Date instance (mirrors XY
  // chart `xFormat` convention).
  const formatTime = useCallback((t: number): string | React.ReactNode => {
    if (timeFormat) return timeFormat(new Date(t))
    return new Date(t).toISOString().slice(0, 10)
  }, [timeFormat])

  const formatValue = useCallback((v: number): string | React.ReactNode => {
    if (valueFormat) return valueFormat(v)
    return String(v)
  }, [valueFormat])

  const fireHover = useCallback((datum: Datum | null, target: "node" | "edge", evt?: React.PointerEvent) => {
    if (datum && tooltipsEnabled && evt) {
      setHoverState({ datum, target, pageX: evt.clientX, pageY: evt.clientY })
      onObservation?.({
        type: "hover", datum,
        x: evt.clientX, y: evt.clientY,
        timestamp: Date.now(), chartType: "process-sankey", chartId,
      })
    } else {
      if (hoverState) {
        onObservation?.({
          type: "hover-end",
          timestamp: Date.now(), chartType: "process-sankey", chartId,
        })
      }
      setHoverState(null)
    }
  }, [tooltipsEnabled, onObservation, chartId, hoverState])

  const handleClick = useCallback((datum: Datum, _target: "node" | "edge", evt: React.MouseEvent) => {
    onClick?.(datum, { x: evt.clientX, y: evt.clientY })
    onObservation?.({
      type: "click", datum,
      x: evt.clientX, y: evt.clientY,
      timestamp: Date.now(), chartType: "process-sankey", chartId,
    })
  }, [onClick, onObservation, chartId])

  // Particle animation. Run a rAF loop that advances a chart-time
  // cursor across `domain` over `particleDuration` ms, then loops.
  // Each ribbon path's particle position derives from its own
  // [startTime, endTime] window relative to the cursor.
  const [particleProgress, setParticleProgress] = useState(0)
  useEffect(() => {
    if (!showParticles) return
    let raf = 0
    let mounted = true
    const start = performance.now()
    const tick = (now: number) => {
      if (!mounted) return
      const t = ((now - start) % particleDuration) / particleDuration
      setParticleProgress(t)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      mounted = false
      cancelAnimationFrame(raf)
    }
  }, [showParticles, particleDuration])

  // Validation gate after all hooks.
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

  if (!layout) return null

  const {
    centerlines, laneLifetime, nodeData,
    valueScale: S, compressedPadding,
    crossingsBefore, crossingsAfter, lengthBefore, lengthAfter,
  } = layout

  // Particles helper. Returns N points along the ribbon's bezier where
  // N is proportional to edge value (clamped). Particles are phased
  // uniformly along [0..1) and all advance together using the global
  // `particleProgress` cycle, so each ribbon shows a constant flow of
  // dots traveling from source to target. The temporal extent of the
  // edge governs the band geometry, not the particles — particles
  // persist on every edge so the chart reads as a continuously-flowing
  // system rather than a sweep that lights up one edge at a time.
  const particlesFor = (e: NormalizedEdge): { x: number; y: number }[] => {
    const srcAtt = nodeData[e.source]?.localAttachments.get(e.id)
    const tgtAtt = nodeData[e.target]?.localAttachments.get(e.id)
    if (!srcAtt || !tgtAtt) return []
    const sx = xScale(Math.max(domain[0], Math.min(domain[1], srcAtt.time)))
    const tx = xScale(Math.max(domain[0], Math.min(domain[1], tgtAtt.time)))
    const cx = ribbonLane === "source" ? sx + (tx - sx) * 0.85
            : ribbonLane === "target" ? sx + (tx - sx) * 0.15
            : (sx + tx) / 2
    // The ribbon's source attachment is the outermost value-thick slice
    // before the OUT, so the band edge sits at `cl ± sideMassBefore*S`
    // and the slice extends inward by `value*S`. Center: `cl ± (sideMassBefore - value/2) * S`.
    // Target is the analogous slice on the post-IN band edge, so
    // `cl ± (sideMassAfter - value/2) * S`. Both share the same form;
    // the earlier source variant added value/2 by mistake, putting
    // particles above/below the band's outer edge.
    const sCl = centerlines[e.source]
    const tCl = centerlines[e.target]
    const sCenter = srcAtt.side === "top"
      ? sCl - (srcAtt.sideMassBefore - srcAtt.value / 2) * S
      : sCl + (srcAtt.sideMassBefore - srcAtt.value / 2) * S
    const tCenter = tgtAtt.side === "top"
      ? tCl - (tgtAtt.sideMassAfter - tgtAtt.value / 2) * S
      : tCl + (tgtAtt.sideMassAfter - tgtAtt.value / 2) * S

    // Particle count constrained to edge magnitude. One particle per
    // unit of value, capped to keep big bundles from drowning the
    // canvas. `particleDensity` lets the user thin or thicken the
    // stream uniformly.
    const target = Math.round(e.value * particleDensity)
    const n = Math.max(1, Math.min(particleMaxPerEdge, target))

    const points: { x: number; y: number }[] = []
    for (let i = 0; i < n; i++) {
      const phase = (particleProgress + i / n) % 1
      const u = 1 - phase
      const x = u * u * u * sx + 3 * u * u * phase * cx + 3 * u * phase * phase * cx + phase * phase * phase * tx
      const y = u * u * u * sCenter + 3 * u * u * phase * sCenter + 3 * u * phase * phase * tCenter + phase * phase * phase * tCenter
      points.push({ x, y })
    }
    return points
  }

  const sourceColorOf = (e: NormalizedEdge): string => {
    const sourceIdx = nodes.findIndex((n) => n.id === e.source)
    return colorOf(e.source, sourceIdx)
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width, height }}
      onPointerLeave={() => fireHover(null, "node")}
    >
      <svg
        width={width}
        height={height}
        role="img"
        aria-labelledby="process-sankey-title process-sankey-desc"
      >
        <title id="process-sankey-title">{title ?? "Process Sankey"}</title>
        <desc id="process-sankey-desc">
          {description ?? "Temporal process flow with lifetime-bounded node lanes, mass bands, and value-scaled ribbons."}
        </desc>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {showQualityReadout && (crossingsAfter ?? null) !== null && (
            <text x={plotW} y={-12} fontSize={10} fill="#94a3b8" textAnchor="end">
              crossings: {crossingsBefore} → {crossingsAfter}
              {"   "}
              edge length: {Math.round(lengthBefore!)} → {Math.round(lengthAfter!)}
            </text>
          )}
          {compressedPadding && (
            <text x={plotW} y={2} fontSize={10} fill="#94a3b8" textAnchor="end">
              dense layout: lane gaps compressed
            </text>
          )}

          {/* Vertical gridlines */}
          {axisTicks.map((tick, i) => {
            const x = xScale(toTime(tick.date))
            return (
              <line key={`grid-${i}`} x1={x} y1={0} x2={x} y2={plotH}
                stroke="#94a3b8" strokeOpacity={0.15} strokeDasharray="2 4" />
            )
          })}

          {/* Lane rails */}
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

          {/* Time axis. `timeFormat`, when present, overrides the
              tick.label string — same rule the XY charts apply when
              both are set. */}
          <line x1={0} y1={plotH + 4} x2={plotW} y2={plotH + 4} stroke="#94a3b8" />
          {axisTicks.map((tick, i) => {
            const t = toTime(tick.date)
            const x = xScale(t)
            const label = timeFormat ? timeFormat(new Date(t)) : tick.label
            return (
              <g key={i} transform={`translate(${x},${plotH + 4})`}>
                <line y2={6} stroke="#94a3b8" />
                <text y={20} textAnchor="middle" fontSize={11} fill="#475569">{label}</text>
              </g>
            )
          })}

          {/* Edge ribbons */}
          {edges.map((e) => {
            const srcAtt = nodeData[e.source]?.localAttachments.get(e.id)
            const tgtAtt = nodeData[e.target]?.localAttachments.get(e.id)
            if (!srcAtt || !tgtAtt) return null
            const sourceColor = sourceColorOf(e)
            const d = buildRibbonPath(
              srcAtt, centerlines[e.source],
              tgtAtt, centerlines[e.target],
              S, xScale, ribbonLane, domain
            )
            const raw = rawEdgeById.get(e.id) ?? (e as Datum)
            return (
              <path
                key={e.id}
                d={d}
                fill={sourceColor}
                fillOpacity={edgeOpacity}
                style={{ cursor: enableHover ? "pointer" : "default" }}
                onPointerEnter={enableHover ? (evt) => fireHover(raw, "edge", evt) : undefined}
                onPointerMove={enableHover ? (evt) => fireHover(raw, "edge", evt) : undefined}
                onPointerLeave={enableHover ? () => fireHover(null, "edge") : undefined}
                onClick={(onClick || onObservation) ? (evt) => handleClick(raw, "edge", evt) : undefined}
              />
            )
          })}

          {/* Node bands */}
          {nodes.map((n, idx) => {
            const data = nodeData[n.id]
            if (!data || data.samples.length === 0) return null
            const path = buildBandPath(data.samples, centerlines[n.id], S, xScale, domain)
            if (!path) return null
            const smSamples = clampSamples(data.samples, domain)
            const firstNonZero = smSamples.find((s: { topMass: number; botMass: number }) => s.topMass + s.botMass > 0) || smSamples[0]
            // Anchor the label at the first non-zero-mass sample, not
            // the first sample overall. With xExtent prepending leading
            // zero-mass samples (lane open but empty), `samples[0].t`
            // would float the label outside the visible band.
            const startX = xScale(firstNonZero.t)
            const visualOffset = ((firstNonZero.botMass - firstNonZero.topMass) * S) / 2
            const labelY = centerlines[n.id] + visualOffset
            const c = colorOf(n.id, idx)
            const raw = rawNodeById.get(n.id) ?? (n as Datum)
            return (
              <g key={n.id}>
                <path d={path} fill="var(--surface-1, #111827)" stroke="var(--surface-1, #111827)" strokeWidth={2} />
                <path
                  d={path}
                  fill={c}
                  fillOpacity={0.86}
                  stroke={c}
                  strokeWidth={0.5}
                  style={{ cursor: enableHover ? "pointer" : "default" }}
                  onPointerEnter={enableHover ? (evt) => fireHover(raw, "node", evt) : undefined}
                  onPointerMove={enableHover ? (evt) => fireHover(raw, "node", evt) : undefined}
                  onPointerLeave={enableHover ? () => fireHover(null, "node") : undefined}
                  onClick={(onClick || onObservation) ? (evt) => handleClick(raw, "node", evt) : undefined}
                />
                <text
                  x={startX - 4}
                  y={labelY}
                  fontSize={11}
                  fontWeight={600}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="#1e293b"
                  pointerEvents="none"
                >
                  {n.id}
                </text>
              </g>
            )
          })}

          {/* Legend. Rendered inside the same translated <g> so swatch
              coordinates are plot-relative — `right` parks the column
              just outside plotW; `bottom` parks a single horizontal
              row under the time axis. */}
          {legendActive && legendItems.length > 0 && (() => {
            if (legendPosition === "right") {
              const x0 = plotW + 16
              return (
                <g key="ps-legend" aria-label="Legend">
                  {legendItems.map((item, i) => {
                    const y = i * 18
                    return (
                      <g key={item.label} transform={`translate(${x0}, ${y})`}>
                        <rect width={10} height={10} fill={item.color} rx={2} />
                        <text x={16} y={9} fontSize={11} fill="#1e293b">
                          {item.label}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )
            }
            const yRow = plotH + 36
            let xCursor = 0
            return (
              <g key="ps-legend" aria-label="Legend">
                {legendItems.map((item) => {
                  const labelW = Math.max(40, item.label.length * 6.5)
                  const node = (
                    <g key={item.label} transform={`translate(${xCursor}, ${yRow})`}>
                      <rect width={10} height={10} fill={item.color} rx={2} />
                      <text x={16} y={9} fontSize={11} fill="#1e293b">
                        {item.label}
                      </text>
                    </g>
                  )
                  xCursor += 22 + labelW
                  return node
                })}
              </g>
            )
          })()}

          {/* Particles — rendered on top so they're not occluded by
              ribbons. Each edge emits N particles (proportional to
              value) phased uniformly along the bezier so the ribbon
              reads as a continuous stream. */}
          {showParticles && edges.flatMap((e) => {
            const pts = particlesFor(e)
            if (pts.length === 0) return []
            const fill = sourceColorOf(e)
            return pts.map((p, j) => (
              <circle
                key={`particle-${e.id}-${j}`}
                cx={p.x}
                cy={p.y}
                r={particleRadius}
                fill={fill}
                stroke="var(--surface-1, #111827)"
                strokeWidth={0.5}
                pointerEvents="none"
              />
            ))
          })}
        </g>
      </svg>

      {/* Tooltip overlay. Absolutely positioned next to the cursor;
          flips horizontally if it would clip the right edge. The
          default content branches on hover target — node tooltips
          show id + the mass-history series; edge tooltips show
          source/target/value/start/end with formatters applied. */}
      {hoverState && tooltipsEnabled && (() => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return null
        const localX = hoverState.pageX - rect.left
        const localY = hoverState.pageY - rect.top
        const flipRight = localX > width - 240

        let body: React.ReactNode = null
        if (customTooltipFn) {
          body = customTooltipFn(hoverState.datum)
        } else if (hoverState.target === "node") {
          const nodeId = String((hoverState.datum as Datum)[nodeIdAccessor as string] ?? "")
          const rows = massHistoryRows(nodeData[nodeId])
          // Cap the default tooltip at 5 rows; above that, condense to
          // mass-quantile picks (min, q25, median, q75, max) re-sorted
          // by time. Devs override the entire body via the `tooltip`
          // prop — pure helpers in `processSankey/tooltipUtils.ts`.
          const MAX_ROWS = 5
          const truncatedFromN = rows.length > MAX_ROWS ? rows.length : null
          const displayRows = pickMassQuantiles(rows, MAX_ROWS)
          body = (
            <div style={{ minWidth: 160 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{nodeId}</div>
              {displayRows.length > 0 && (
                <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
                  <thead>
                    <tr style={{ opacity: 0.6 }}>
                      <th style={{ textAlign: "left", fontWeight: 500, paddingRight: 8 }}>Time</th>
                      <th style={{ textAlign: "right", fontWeight: 500 }}>Mass</th>
                      {truncatedFromN != null && (
                        <th style={{ textAlign: "right", fontWeight: 500, paddingLeft: 8 }}></th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ paddingRight: 8 }}>{formatTime(r.t)}</td>
                        <td style={{ textAlign: "right" }}>{formatValue(r.total)}</td>
                        {truncatedFromN != null && (
                          <td style={{ textAlign: "right", paddingLeft: 8, opacity: 0.55 }}>
                            {r.mark}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {truncatedFromN != null && (
                <div style={{ marginTop: 4, fontSize: 10, opacity: 0.55 }}>
                  showing 5 of {truncatedFromN} samples
                </div>
              )}
            </div>
          )
        } else {
          // Edge default: source → target, value, time window.
          const e = hoverState.datum as Datum
          const src = e[sourceAccessor as string]
          const tgt = e[targetAccessor as string]
          const val = e[valueAccessor as string]
          const start = e[startTimeAccessor as string]
          const end = e[endTimeAccessor as string]
          body = (
            <div style={{ minWidth: 160 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {String(src)} → {String(tgt)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 8, fontSize: 11 }}>
                {val != null && (
                  <>
                    <span style={{ opacity: 0.6 }}>value</span>
                    <span style={{ textAlign: "right" }}>{formatValue(Number(val))}</span>
                  </>
                )}
                {start != null && (
                  <>
                    <span style={{ opacity: 0.6 }}>start</span>
                    <span style={{ textAlign: "right" }}>{formatTime(toTime(start as TimeLike))}</span>
                  </>
                )}
                {end != null && (
                  <>
                    <span style={{ opacity: 0.6 }}>end</span>
                    <span style={{ textAlign: "right" }}>{formatTime(toTime(end as TimeLike))}</span>
                  </>
                )}
              </div>
            </div>
          )
        }

        return (
          <div
            style={{
              position: "absolute",
              left: flipRight ? undefined : localX + 12,
              right: flipRight ? width - localX + 12 : undefined,
              top: localY + 12,
              padding: "6px 8px",
              fontSize: 11,
              background: "var(--semiotic-tooltip-bg, rgba(15, 23, 42, 0.95))",
              color: "var(--semiotic-tooltip-text, #fff)",
              borderRadius: "var(--semiotic-tooltip-radius, 4px)",
              boxShadow: "var(--semiotic-tooltip-shadow, 0 2px 8px rgba(0,0,0,0.3))",
              pointerEvents: "none",
              zIndex: 1000,
              maxWidth: 280,
            }}
          >
            {body}
          </div>
        )
      })()}
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
