"use client"
import * as React from "react"
import { useMemo, useState, useRef, useCallback } from "react"
import { scaleTime } from "d3-scale"
import { forwardRef } from "react"

import {
  computeProcessSankeyLayout,
  validateProcessSankey,
  formatProcessSankeyIssue,
  buildBandPath,
  buildBandCutoutsForNode,
  clampSamples,
} from "./processSankey/algorithm"
import { massHistoryRows, pickMassQuantiles } from "./processSankey/tooltipUtils"
import { computeProcessSankeyRibbonInputs } from "./processSankey/ribbonInputs"
import { buildRibbonGeometry } from "../../geometry/ribbonGeometry"
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
import { getColor } from "../shared/colorUtils"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import { useNetworkChartSetup } from "../shared/useNetworkChartSetup"
import { inferNodesFromEdges } from "../shared/networkUtils"
import { filterSparseArray } from "../shared/sparseArray"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type {
  StreamNetworkFrameProps,
  StreamNetworkFrameHandle,
  ParticleStyle,
  BezierCache,
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
   * Optional accessor for the per-edge "system in" time — when
   * `value` is added to the SOURCE node's mass. Use when the
   * source node has an intake event distinct from when this edge
   * departs (e.g. a patient is admitted to the ER at 7pm and
   * transferred out at 9pm — the ER node carries the patient's
   * weight between 7pm and 9pm). Without this, the source node's
   * mass is synthesized as a flat baseline and the band reads as
   * "always there." Set it and the node band climbs / falls as
   * units arrive and depart — a true staircase profile.
   */
  systemInTimeAccessor?: ChartAccessor<TEdge, TimeLike>
  /**
   * Optional accessor for the per-edge "system out" time — when
   * `value` is removed from the TARGET node's mass. Mirror of
   * `systemInTimeAccessor` for the inbound side.
   */
  systemOutTimeAccessor?: ChartAccessor<TEdge, TimeLike>
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
  /** Render the per-band node id label at the band's left edge.
   *  Default `true`. Set `false` for dense layouts where labels
   *  would overlap, or when the legend already names every band. */
  showLabels?: boolean
  edgeOpacity?: number

  // Interaction
  /** Tooltip content. `false` disables, `true` uses the default,
   *  or pass a `Tooltip(...)` / custom function for full control. */
  tooltip?: TooltipProp
  enableHover?: boolean
  onClick?: (datum: Datum, position?: { x: number; y: number }) => void

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
  /** When set, source node mass climbs by `value` at this time
   *  (then falls by `value` at `startTime`). Lets a source ward /
   *  reservoir / branch carry inventory between distinct admit and
   *  depart times — visible as a staircase profile. */
  systemInTime?: number
  /** Mirror for the target node: mass falls by `value` at this time
   *  (after rising at `endTime`). */
  systemOutTime?: number
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
 * // Static fixture: pre-built nodes + timed edges, categorical colors.
 * <ProcessSankey
 *   nodes={[
 *     { id: "Alice", category: "Person", xExtent: ["2026-01-06", "2026-01-06"] },
 *     { id: "Bob",   category: "Person", xExtent: ["2026-02-01", "2026-02-01"] },
 *     { id: "Eng",     category: "Team" },
 *     { id: "Release", category: "Milestone", xExtent: ["2026-04-15", "2026-05-30"] },
 *   ]}
 *   edges={[
 *     { id: "alice-eng", source: "Alice", target: "Eng",     value: 8,
 *       startTime: "2026-01-20", endTime: "2026-02-10" },
 *     { id: "bob-eng",   source: "Bob",   target: "Eng",     value: 5,
 *       startTime: "2026-02-15", endTime: "2026-03-15" },
 *     { id: "eng-rel",   source: "Eng",   target: "Release", value: 13,
 *       startTime: "2026-04-15", endTime: "2026-05-15" },
 *   ]}
 *   domain={["2026-01-01", "2026-05-31"]}
 *   colorBy="category"
 *   showLegend
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Push mode: omit `edges`, mutate via the ref. Same chart shape, but
 * // edges arrive over time. Particles depict throughput.
 * const ref = useRef<RealtimeFrameHandle>(null)
 *
 * useEffect(() => {
 *   const id = setInterval(() => {
 *     ref.current?.push({
 *       source: "API", target: "DB", value: Math.random() * 10,
 *       startTime: Date.now(), endTime: Date.now() + 1500,
 *     })
 *   }, 800)
 *   return () => clearInterval(id)
 * }, [])
 *
 * return (
 *   <ProcessSankey
 *     ref={ref}
 *     domain={[t0, t0 + 60_000]}
 *     showParticles
 *     colorBy="category"
 *     showLegend
 *   />
 * )
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
    systemInTimeAccessor,
    systemOutTimeAccessor,
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
    showLabels = true,
    // Match BaseChartProps defaults so ProcessSankey shares the
    // chart-grid sizing other HOCs use; the Process Sankey-specific
    // larger default of 760×520 was confusing in dashboards that mixed
    // it with sankey/force/etc.
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
    emptyContent,
    edgeOpacity = 0.35,
    timeFormat,
    valueFormat,
    tooltip,
    enableHover = true,
    onObservation,
    onClick,
    showParticles = false,
    particleStyle,
    chartId,
    frameProps = {},
  } = props

  // ── Push API: own the edge/node lists when controlled props are absent ──
  //
  // We mirror the state in refs so the imperative handle can read the
  // current list synchronously, even when callers chain push() →
  // remove() within a single tick. React state updates are scheduled,
  // not committed, so a closure that reads `pushedEdges` directly
  // wouldn't see the items pushed earlier in the same tick — the
  // earlier `setPushedEdges(prev => …)` updater pattern compounded
  // this by deferring the entire derivation. Refs give us a
  // synchronous source of truth; `setPushedEdges`/`setPushedNodes`
  // still drive the React re-render.
  const [pushedEdges, setPushedEdges] = useState<TEdge[]>([])
  const [pushedNodes, setPushedNodes] = useState<TNode[]>([])
  const pushedEdgesRef = useRef<TEdge[]>(pushedEdges)
  const pushedNodesRef = useRef<TNode[]>(pushedNodes)
  pushedEdgesRef.current = pushedEdges
  pushedNodesRef.current = pushedNodes
  const writePushedEdges = useCallback((next: TEdge[]) => {
    pushedEdgesRef.current = next
    setPushedEdges(next)
  }, [])
  const writePushedNodes = useCallback((next: TNode[]) => {
    pushedNodesRef.current = next
    setPushedNodes(next)
  }, [])
  const isControlled = rawEdgesProp !== undefined
  const rawEdges = filterSparseArray(isControlled ? rawEdgesProp : pushedEdges)
  // Nodes can come from three sources, in order of precedence:
  //   1. Controlled `nodes` prop (filtered for sparse holes).
  //   2. Push-API additions (`ref.current.push(node)`); merged on top
  //      of #1 — id collisions resolve to the controlled record.
  //   3. Inferred from edge endpoints when neither #1 nor #2 covers
  //      a referenced id. Without this, omitting `nodes` (the docs
  //      say it's optional) emitted `missing-node` issues for every
  //      edge endpoint and the chart rendered an error instead.
  const rawNodes = useMemo<TNode[]>(() => {
    const controlled = filterSparseArray(rawNodesProp ?? []) as TNode[]
    const pushed = pushedNodes
    if (controlled.length === 0 && pushed.length === 0) {
      return inferNodesFromEdges(
        [],
        rawEdges as unknown as Datum[],
        sourceAccessor as string | ((d: Datum) => string),
        targetAccessor as string | ((d: Datum) => string),
      ) as unknown as TNode[]
    }
    const seen = new Set<string>()
    const merged: TNode[] = []
    for (const n of controlled) {
      const id = String(accessor(nodeIdAccessor, n))
      if (seen.has(id)) continue
      seen.add(id); merged.push(n)
    }
    for (const n of pushed) {
      const id = String(accessor(nodeIdAccessor, n))
      if (seen.has(id)) continue
      seen.add(id); merged.push(n)
    }
    // Fill in any edge endpoints that neither side declared.
    const inferred = inferNodesFromEdges(
      [],
      rawEdges as unknown as Datum[],
      sourceAccessor as string | ((d: Datum) => string),
      targetAccessor as string | ((d: Datum) => string),
    )
    for (const stub of inferred) {
      if (seen.has(stub.id)) continue
      seen.add(stub.id)
      merged.push(stub as unknown as TNode)
    }
    return merged
  }, [rawNodesProp, pushedNodes, rawEdges, nodeIdAccessor, sourceAccessor, targetAccessor])

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
          writePushedEdges([...pushedEdgesRef.current, item as unknown as TEdge])
        } else {
          // Nodes are always push-mode (the `nodes` prop is always
          // optional / merged with internal pushedNodes), so allow
          // node pushes even when `edges` is controlled.
          writePushedNodes([...pushedNodesRef.current, item as unknown as TNode])
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
            writePushedEdges([...pushedEdgesRef.current, ...newEdges])
          }
        }
        if (newNodes.length > 0) writePushedNodes([...pushedNodesRef.current, ...newNodes])
      },
      // remove(id | id[]) — addresses *edges* primarily (the documented
      // contract; ProcessSankey's primary data shape is edges) but
      // falls through to nodes when an id matches there. Returns the
      // removed records so callers can undo / log.
      //
      // Computes the result synchronously against the closure's view
      // of `pushedEdges`/`pushedNodes`. The earlier "push into a `let`
      // inside the setState updater" pattern would return `[]` because
      // the updater fires asynchronously — by the time the function
      // returned, the array was still empty.
      remove(id: string | string[]): Datum[] {
        const ids = new Set(Array.isArray(id) ? id : [id])
        const removed: Datum[] = []
        if (!isControlled) {
          const currentEdges = pushedEdgesRef.current
          const nextEdges: TEdge[] = []
          for (let i = 0; i < currentEdges.length; i++) {
            const e = currentEdges[i]
            if (ids.has(resolveEdgeId(e, i))) removed.push(e as Datum)
            else nextEdges.push(e)
          }
          if (nextEdges.length !== currentEdges.length) writePushedEdges(nextEdges)
        }
        const currentNodes = pushedNodesRef.current
        const nextNodes: TNode[] = []
        for (const n of currentNodes) {
          const nid = String(accessor(nodeIdAccessor, n))
          if (ids.has(nid)) removed.push(n as Datum)
          else nextNodes.push(n)
        }
        if (nextNodes.length !== currentNodes.length) writePushedNodes(nextNodes)
        return removed
      },
      // update(id, updater) — same id resolution as remove(): walks
      // edges first, then nodes. Returns previous data values for
      // undo/observation. Synchronous computation for the same reason
      // remove() does — the setState updater fires asynchronously.
      update(id: string | string[], updater: (d: Datum) => Datum): Datum[] {
        const ids = new Set(Array.isArray(id) ? id : [id])
        const previous: Datum[] = []
        if (!isControlled) {
          const currentEdges = pushedEdgesRef.current
          let touchedEdges = false
          const nextEdges = currentEdges.map((e, i) => {
            if (!ids.has(resolveEdgeId(e, i))) return e
            previous.push(e as Datum)
            touchedEdges = true
            return updater(e as Datum) as TEdge
          })
          if (touchedEdges) writePushedEdges(nextEdges)
        }
        const currentNodes = pushedNodesRef.current
        let touchedNodes = false
        const nextNodes = currentNodes.map((n) => {
          const nid = String(accessor(nodeIdAccessor, n))
          if (!ids.has(nid)) return n
          previous.push(n as Datum)
          touchedNodes = true
          return updater(n as Datum) as TNode
        })
        if (touchedNodes) writePushedNodes(nextNodes)
        return previous
      },
      clear() {
        if (!isControlled) writePushedEdges([])
        writePushedNodes([])
        frameRef.current?.clear()
      },
      // Snapshot the current edge list. `?? []` guards against a
      // consumer passing `edges={null}` — without it the ref contract
      // (`Datum[]`) would silently leak `null` to callers.
      getData: () => (rawEdges ?? []) as unknown as Datum[],
      getScales: () => null,
    },
    deps: [isControlled, looksLikeEdge, resolveEdgeId, nodeIdAccessor, rawEdges, writePushedEdges, writePushedNodes],
  })

  // Single source of truth for edge id derivation — both rendering
  // (band/ribbon scene specs) and the imperative remove/update pathway
  // resolve through the same closure, so the id used in tooltips
  // matches the id consumers pass to remove("e1") / update("e1", ...).
  const getEdgeId = resolveEdgeId

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
      // System in/out are opt-in. When the accessor is unset OR
      // the read value is non-finite, we leave the field undefined
      // so the algorithm falls back to its legacy synthetic-baseline
      // behavior on a per-edge basis.
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
    rawNodes, rawEdges, rawDomain, getNodeId, getEdgeId, xExtentAccessor,
    sourceAccessor, targetAccessor, valueAccessor, startTimeAccessor, endTimeAccessor,
    systemInTimeAccessor, systemOutTimeAccessor,
  ])

  // ── Consolidated network setup (aligned with SankeyDiagram et al). ──
  // ProcessSankey shares the standard setup pieces with every other
  // network HOC: sparse-filter, color scale, palette resolution,
  // category extraction, legend interaction, selection/linkedHover
  // wiring, and loading/empty states. The custom pieces — temporal
  // scene specs, particles, axis chrome — stay below. We pass
  // `inferNodes: false` because ProcessSankey requires explicit
  // nodes (xExtent / category metadata can't be derived from edges)
  // and `showLegend: false` so the hook skips its auto-legend
  // (ProcessSankey builds its own swatch list using `colorOf` so
  // the chart's palette-fallback behavior — visible bands when
  // colorBy is unset — stays consistent between bands and legend).
  const setup = useNetworkChartSetup({
    nodes: rawNodes,
    edges: rawEdges,
    inferNodes: false,
    nodeIdAccessor,
    sourceAccessor,
    targetAccessor,
    colorBy,
    colorScheme,
    showLegend: false,                      // ProcessSankey owns the legend (see legendNode below)
    legendPosition,
    selection: undefined,                   // selection wiring not yet exposed; reserved
    linkedHover: undefined,
    onObservation,
    onClick,
    chartType: "ProcessSankey",
    chartId,
    marginDefaults: { top: 30, right: 80, bottom: 40, left: 80 },
    userMargin,
    width, height,
    loading,
    emptyContent,
  })

  // Margin extension for the legend. The setup hook's
  // `useChartLegendAndMargin` is suppressed via `showLegend: false`
  // (ProcessSankey renders its own legend), so it never applies the
  // legend's auto-reservation. We apply that reservation here when
  // the legend is active — but ONLY for sides the user didn't set
  // explicitly. Without this guard, a caller passing
  // `margin={{ right: 30 }}` (e.g. positioning their own external
  // legend) would silently get 140 px reserved out from under them.
  const legendActive = (showLegend ?? !!colorBy) && !!colorBy
  const userMarginSet = useCallback((side: keyof typeof setup.margin): boolean => {
    if (userMargin == null) return false
    if (typeof userMargin === "number") return true
    return (userMargin as Partial<typeof setup.margin>)[side] != null
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

  // ── Algorithm + path computation ────────────────────────────────────
  const issues = useMemo(() => validateProcessSankey(nodes, edges, domain), [nodes, edges, domain])

  const layout = useMemo(() => {
    if (issues.length > 0) return null
    return computeProcessSankeyLayout(nodes, edges, { plotH, pairing, packing, laneOrder, lifetimeMode })
  }, [issues, nodes, edges, plotH, pairing, packing, laneOrder, lifetimeMode])

  const xScale = useMemo(() => scaleTime().domain(domain).range([0, plotW]), [domain, plotW])

  // ── Color resolution ────────────────────────────────────────────────
  // `colorOf` falls through to the palette when colorBy is unset so
  // each band gets a distinct color even without a categorical
  // accessor — matches ProcessSankey's per-node visual identity.
  // SankeyDiagram doesn't have this fallback (its bands collapse to
  // a single theme color when colorBy is unset); the divergence
  // is intentional because ProcessSankey is process-step coded
  // and visual differentiation per node matters more.
  const colorOf = useCallback((id: string, idx: number): string => {
    if (colorBy && rawNodes) {
      const raw = rawNodeById.get(id)
      if (raw) return getColor(raw, colorBy as ChartAccessor<Datum, string>, setup.colorScale) as string
    }
    return setup.effectivePalette[idx % setup.effectivePalette.length] || "#475569"
  }, [colorBy, rawNodes, rawNodeById, setup.colorScale, setup.effectivePalette])

  // ── Build band + ribbon scene specs from layout output. ─────────────
  // These flow to the customNetworkLayout via layoutConfig — the layout
  // fn is a thin shim that maps these to NetworkBezierEdge primitives.
  // Map node id → array index for O(1) source-color lookups in the
  // ribbon loop below. Without this, each ribbon's color resolution
  // does a linear scan over `nodes`, making layout cost
  // O(|nodes|×|edges|) — quadratic on dense graphs. Computed once
  // per layout render and reused by `sceneSpecs`.
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
      const stubs = buildBandCutoutsForNode(n.id, edges, layout, xScale, domain)
      bands.push({
        id: n.id,
        pathD: path,
        fill: c,
        stroke: c,
        strokeWidth: 0.5,
        ...(stubs.length > 0 && { gradientStubs: stubs }),
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
      // Both the visible ribbon and the centerline particle bezier
      // come from the shared `buildRibbonGeometry` helper.
      // SankeyDiagram routes through the same helper from `areaLink`,
      // so the two charts emit the same M-C-L-C-Z shape from a
      // single formula — only the control-point positions differ
      // (Sankey curvature-based vs ProcessSankey lane-based).
      const ribbonInputs = computeProcessSankeyRibbonInputs(
        srcAtt, centerlines[e.source],
        tgtAtt, centerlines[e.target],
        S, xScale, ribbonLane, domain,
      )
      const { pathD, bezier } = buildRibbonGeometry(ribbonInputs)
      const raw = rawEdgeById.get(e.id) ?? (e as Datum)
      ribbons.push({
        id: e.id,
        pathD,
        fill,
        opacity: edgeOpacity,
        rawDatum: raw,
        bezier,
      })
    })
    return { bands, ribbons }
  }, [layout, nodes, edges, xScale, domain, colorOf, rawNodeById, rawEdgeById, ribbonLane, edgeOpacity, nodeIndexById])

  const layoutConfig: ProcessSankeyLayoutConfig = useMemo(() => ({
    bands: sceneSpecs.bands,
    ribbons: sceneSpecs.ribbons,
    showLabels,
  }), [sceneSpecs, showLabels])

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
    // When `timeFormat` isn't supplied, sniff the value scale. Real
    // timestamps (ms since epoch) sit above ~1e10; small integers /
    // floats below that are "tick numbers" — day indices, week
    // counts, sequence positions — and have to print as-is or
    // they collapse into 1970-01-01. The old default ran every
    // value through `new Date(t).toISOString()`, which printed
    // every short-domain ProcessSankey (Day 0–7, Month 1–12, etc.)
    // as the Unix epoch.
    if (!Number.isFinite(t)) return ""
    if (Math.abs(t) < 1e10) {
      return Number.isInteger(t) ? String(t) : t.toFixed(2)
    }
    return new Date(t).toISOString().slice(0, 10)
  }, [timeFormat])

  const formatValue = useCallback((v: number): React.ReactNode => {
    if (valueFormat) return valueFormat(v)
    return String(v)
  }, [valueFormat])

  const tooltipContent = useCallback((d: HoverData): React.ReactNode => {
    if (!d || !d.data) return null
    const payload = d.data
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
              {/* `display.length` reflects the actual rows after
                  same-time dedup — `pickMassQuantiles` returns 5 picks
                  but collapses ties, so a flat-mass series can yield
                  fewer. Use the real count so the footer never lies. */}
              showing {display.length} of {truncated} samples
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
    // Axis follows the data, not the domain — the bands extend only as
    // far as their mass profile carries them, so when the user's
    // `domain` overshoots the latest event there's an empty stretch
    // past the last band. Anchor the axis line and gridline span to
    // the actual lane lifetimes so the chrome can't get out of step
    // with the bands. Clamp the result to `[0, plotW]` so a lane that
    // sits past `domain` (which `clampSamples` clips on the band
    // side) doesn't drag the axis line into the right/left margins —
    // d3 scales don't clamp by default, so without this the axis
    // overshoots the plot area whenever the data has a tail past the
    // chart's stated time window.
    let dataMinX: number | null = null
    let dataMaxX: number | null = null
    for (const n of nodes) {
      const lt = laneLifetime[n.id]
      if (!lt || lt.start === null || lt.end === null) continue
      const sx = xScale(lt.start as number)
      const ex = xScale(lt.end as number)
      if (dataMinX === null || sx < dataMinX) dataMinX = sx
      if (dataMaxX === null || ex > dataMaxX) dataMaxX = ex
    }
    const clampPlotX = (x: number): number => Math.max(0, Math.min(plotW, x))
    const axisLeft = clampPlotX(dataMinX ?? 0)
    const axisRight = Math.max(axisLeft, clampPlotX(dataMaxX ?? plotW))
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
          // Hide gridlines outside the actual data extent — they would
          // sit in empty space and falsely imply data continues there.
          if (x < axisLeft - 0.5 || x > axisRight + 0.5) return null
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
        <line x1={axisLeft} y1={plotH + 4} x2={axisRight} y2={plotH + 4} stroke="#94a3b8" />
        {axisTicks.map((tick, i) => {
          const t = toTime(tick.date)
          const x = xScale(t)
          if (x < axisLeft - 0.5 || x > axisRight + 0.5) return null
          // Prefer an explicit `tick.label` over the global
          // `timeFormat`. Lets a consumer set up a default formatter
          // for tooltips and most ticks while still spelling certain
          // ticks out by hand (e.g. "Q1 ★", "Election Day").
          const label = tick.label != null
            ? tick.label
            : (timeFormat ? timeFormat(new Date(t)) : "")
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

  // Particles now ride the canvas + ParticlePool path StreamNetworkFrame
  // uses for SankeyDiagram. ProcessSankey writes pre-computed bezier
  // control points onto each ribbon spec (see `sceneSpecs` above)
  // and onto each frame edge (see `safeFrameEdges` below); the frame
  // handles spawn / step / render. No SVG overlay anymore.

  // ── Frame nodes/edges ─────────────────────────────────────────────
  // Computed BEFORE the early-return gates so hook ordering stays
  // stable across renders. ProcessSankey doesn't use the frame's
  // force-layout output for positioning — bands/ribbons come from
  // `layoutConfig` — but ingestion has to fire so the SSR `buildScene`
  // gate (`if (rawNodes.length > 0 || rawEdges.length > 0)`) lets the
  // customNetworkLayout dispatch run.
  const safeFrameNodes = useMemo(
    () => (rawNodes ?? []).map((n) => ({ id: getNodeId(n), data: n as Datum })),
    [rawNodes, getNodeId],
  )
  // Build an edgeId → bezier map once per layout pass so safeFrameEdges
  // can attach the pre-computed control points without re-deriving them.
  const ribbonBezierById = useMemo(() => {
    const map = new Map<string, BezierCache>()
    for (const r of sceneSpecs.ribbons) {
      if (r.bezier) map.set(r.id, r.bezier)
    }
    return map
  }, [sceneSpecs])

  const safeFrameEdges = useMemo(
    () => (rawEdges ?? []).map((e, i) => {
      const id = getEdgeId(e, i)
      // `value` flows through so the particle pool's spawnRate can
      // scale proportionally per edge. `bezier` is the pre-computed
      // ribbon path; the pool's particle.t parameter walks the
      // cubic at the chord-direction perpendicular offset to
      // produce a fan across the band width.
      //
      // Coerce value with an explicit finite check rather than `|| 0`
      // — a legitimate edge with `value: 0` (e.g. suppressed-flow
      // marker) needs to flow through as 0, not collapse to a
      // non-zero default. `NetworkPipelineStore.ingestBounded` does
      // the same finite-check so 0 survives end-to-end through the
      // particle pipeline.
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

  // Loading / empty states come from `setup` — same gates every
  // other network HOC uses. The hook keys empty-state on the edges
  // list (default), which matches ProcessSankey's primary data
  // shape. Push-mode (edges/nodes both undefined) bypasses the
  // empty UI by design.
  const loadingEl = setup.loadingEl
  const emptyEl = setup.emptyEl

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
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl

  return (
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
      onObservation={onObservation}
      customClickBehavior={onClick ? (h) => {
        if (!h || !h.data) return
        const payload = h.data
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
