/**
 * useNetworkChartSetup — shared setup pipeline for all HOC network charts.
 *
 * The 8 network HOCs (ChordDiagram, CirclePack, ForceDirectedGraph,
 * OrbitDiagram, ProcessSankey, SankeyDiagram, TreeDiagram, Treemap)
 * each hand-roll the same pattern: sparse-filter nodes/edges,
 * optionally infer nodes from edges, build a color scale, derive
 * categories for legend interaction, resolve the effective palette,
 * wire selection / linked-hover, compose margin + legend, and gate
 * loading/empty UI. This hook does it once.
 *
 * Mirrors `useChartSetup` (the row-array equivalent for XY/ordinal
 * HOCs) but accepts the network data model. Pure consolidation — no
 * behavior change. Each adopter drops ~40-80 lines of orchestration.
 *
 * Dependencies:
 *   hooks.ts            — useColorScale, useChartSelection,
 *                         useChartLegendAndMargin, useLegendInteraction,
 *                         useThemeCategorical
 *   networkUtils.ts     — inferNodesFromEdges
 *   sparseArray.ts      — filterSparseArray
 *   colorUtils.ts       — COLOR_SCHEMES, DEFAULT_COLORS
 *   withChartWrapper.tsx — renderEmptyState, renderLoadingState
 *
 * Consumed by: all network HOCs.
 */
"use client"
import { useMemo } from "react"
import type { ReactNode, ReactElement } from "react"
import type { Datum } from "./datumTypes"
import type { Accessor, ChartAccessor, SelectionConfig, LinkedHoverProp } from "./types"
import type { OnObservationCallback } from "../../store/ObservationStore"
import type { PartialMargin, MarginType } from "../../types/marginType"
import {
  useColorScale,
  useChartSelection,
  useChartLegendAndMargin,
  useLegendInteraction,
  useThemeCategorical,
} from "./hooks"
import type { LegendInteractionMode, LegendPosition, LegendInteractionState } from "./hooks"
import { COLOR_SCHEMES, DEFAULT_COLORS } from "./colorUtils"
import { inferNodesFromEdges } from "./networkUtils"
import { filterSparseArray } from "./sparseArray"
import { renderEmptyState, renderLoadingState } from "./withChartWrapper"

export interface NetworkChartSetupInput<TNode extends Datum = Datum, TEdge extends Datum = Datum> {
  /** Raw `nodes` prop (may be undefined). */
  nodes: TNode[] | undefined
  /** Raw `edges` prop (may be undefined). */
  edges: TEdge[] | undefined
  /**
   * When `true`, missing nodes are inferred from edge endpoints via
   * `inferNodesFromEdges`. Sankey/Chord set this; ForceDirected leaves
   * it `false` and treats both as required. Default: `true`.
   */
  inferNodes?: boolean
  /** Node id accessor for inference + tooltip identity. */
  nodeIdAccessor?: ChartAccessor<TNode, string>
  /** Edge source accessor (used by `inferNodesFromEdges`). */
  sourceAccessor?: ChartAccessor<TEdge, string>
  /** Edge target accessor (used by `inferNodesFromEdges`). */
  targetAccessor?: ChartAccessor<TEdge, string>

  // ── Color ────────────────────────────────────────────────────────
  colorBy?: Accessor<string>
  colorScheme?: string | string[]

  // ── Legend ───────────────────────────────────────────────────────
  /** `undefined` defaults to "auto" (on when colorBy is set). */
  showLegend?: boolean
  legendPosition?: LegendPosition
  legendInteraction?: LegendInteractionMode

  // ── Interaction ──────────────────────────────────────────────────
  selection?: SelectionConfig
  linkedHover?: LinkedHoverProp
  onObservation?: OnObservationCallback
  onClick?: (datum: Datum, event: { x: number; y: number }) => void
  /** Used by useChartSelection for chart-type-stamped observation events. */
  chartType: string
  chartId?: string

  // ── Layout ───────────────────────────────────────────────────────
  /** Mode-resolved margin defaults from useChartMode. */
  marginDefaults: MarginType
  /** User-provided margin override. */
  userMargin?: PartialMargin
  width: number
  height: number

  // ── Loading / empty states ───────────────────────────────────────
  loading?: boolean
  emptyContent?: ReactNode | false
  /**
   * Which array drives the empty-state check. `"edges"` (default)
   * fits Sankey/Chord/ProcessSankey where edges are the primary
   * data shape and nodes are optional/inferred. `"nodes"` fits
   * ForceDirectedGraph where both nodes and edges are required and
   * empty-state should fire when the user supplied a sparse-only
   * node list. The undefined-vs-empty distinction is preserved
   * either way: undefined = push mode (don't show empty UI);
   * present-but-empty = user supplied empty data (show empty UI).
   */
  emptyDataKey?: "edges" | "nodes"
}

export interface NetworkChartSetupResult {
  /**
   * Sparse-filtered nodes. When `inferNodes` was `true` and the
   * caller didn't supply nodes, this is the inferred `[{id}]` array
   * derived from edge endpoints. Otherwise it's just the input
   * `nodes` with sparse holes removed.
   */
  safeNodes: Datum[]
  /** Sparse-filtered edges. Identity-equal to input when nothing was dropped. */
  safeEdges: Datum[]

  /**
   * Color scale built from `(safeNodes, colorBy, colorScheme)`.
   * `undefined` when colorBy is unset.
   */
  colorScale: ((v: string) => string) | undefined
  /**
   * Effective palette array. Resolved as:
   * 1. `colorScheme` if it's an array.
   * 2. ThemeProvider categorical if non-empty.
   * 3. Named scheme lookup in `COLOR_SCHEMES`.
   * 4. `DEFAULT_COLORS` fallback.
   *
   * Pass this to the frame's `colorScheme` prop so its internal
   * `getNodeColor` (used for particles, hover, interactions) matches
   * what the HOC's nodeStyle resolves.
   */
  effectivePalette: string[]
  themeCategorical: string[] | undefined

  /** Distinct category values from `(safeNodes, colorBy)`, for legend interaction. */
  allCategories: string[]
  legendState: LegendInteractionState

  // ── Frame chrome ─────────────────────────────────────────────────
  legend: ReturnType<typeof useChartLegendAndMargin>["legend"]
  margin: MarginType
  legendPosition: LegendPosition

  // ── Interaction ──────────────────────────────────────────────────
  customHoverBehavior: ReturnType<typeof useChartSelection>["customHoverBehavior"]
  customClickBehavior: ReturnType<typeof useChartSelection>["customClickBehavior"]
  /**
   * The full selection-hook output. Most network HOCs only need the
   * resolved hover/click behaviors above, but hierarchy charts
   * (Treemap, CirclePack, TreeDiagram, OrbitDiagram) wrap node styles
   * with selection state via `activeSelectionHook.isActive` /
   * `.predicate`. Passed through verbatim so those charts don't need
   * a parallel `useChartSelection` call.
   */
  activeSelectionHook: ReturnType<typeof useChartSelection>["activeSelectionHook"]
  hoverSelectionHook: ReturnType<typeof useChartSelection>["hoverSelectionHook"]
  crosshairSourceId: ReturnType<typeof useChartSelection>["crosshairSourceId"]

  // ── Render gates ─────────────────────────────────────────────────
  /** When non-null, render this element instead of the chart. */
  loadingEl: ReactElement | null
  /** When non-null, render this element instead of the chart. */
  emptyEl: ReactElement | null
}

/**
 * Run the consolidated network-HOC setup pipeline. Call this once
 * after `useChartMode` and before any chart-specific logic. The
 * returned `loadingEl`/`emptyEl` are early-exit slots — when either
 * is non-null, return it before the frame.
 *
 * @example
 * ```tsx
 * const setup = useNetworkChartSetup({
 *   nodes, edges,
 *   inferNodes: true,
 *   nodeIdAccessor, sourceAccessor, targetAccessor,
 *   colorBy, colorScheme, showLegend, legendPosition, legendInteraction,
 *   selection, linkedHover, onObservation, onClick,
 *   chartType: "SankeyDiagram", chartId,
 *   marginDefaults, userMargin, width, height,
 *   loading, emptyContent,
 * })
 * if (setup.loadingEl) return setup.loadingEl
 * if (setup.emptyEl) return setup.emptyEl
 * return (
 *   <StreamNetworkFrame
 *     nodes={setup.safeNodes}
 *     edges={setup.safeEdges}
 *     colorScheme={setup.effectivePalette}
 *     legend={setup.legend}
 *     legendPosition={setup.legendPosition}
 *     margin={setup.margin}
 *     customHoverBehavior={setup.customHoverBehavior}
 *     customClickBehavior={setup.customClickBehavior}
 *     ...
 *   />
 * )
 * ```
 */
export function useNetworkChartSetup<TNode extends Datum = Datum, TEdge extends Datum = Datum>(
  input: NetworkChartSetupInput<TNode, TEdge>,
): NetworkChartSetupResult {
  const {
    nodes,
    edges,
    inferNodes = true,
    sourceAccessor = "source",
    targetAccessor = "target",
    colorBy,
    colorScheme,
    showLegend,
    legendPosition: legendPositionProp,
    legendInteraction,
    selection,
    linkedHover,
    onObservation,
    onClick,
    chartType,
    chartId,
    marginDefaults,
    userMargin,
    width,
    height,
    loading,
    emptyContent,
    emptyDataKey = "edges",
  } = input

  // ── Sparse data filtering ───────────────────────────────────────
  // Identity-preserving: when nothing's dropped, the returned array
  // is === to the input so downstream memo caches stay warm.
  const safeEdges = useMemo(() => filterSparseArray(edges), [edges])
  const safeInputNodes = useMemo(() => filterSparseArray(nodes), [nodes])

  // ── Loading / empty states ──────────────────────────────────────
  // Computed up front so the caller can early-return AFTER all hooks.
  const loadingEl = renderLoadingState(loading, width, height)
  // Empty state defaults to keying off edges (Sankey/Chord/PSankey
  // shape) but switches to nodes for charts where node presence is
  // the user-data signal (ForceDirectedGraph). The undefined-vs-empty
  // distinction is preserved: undefined raw prop = push mode (no
  // empty UI), sparse-cleaned-to-zero = user supplied empty.
  const emptyEl = !loadingEl
    ? renderEmptyState(
        emptyDataKey === "nodes"
          ? (nodes === undefined ? undefined : safeInputNodes)
          : (edges === undefined ? undefined : safeEdges),
        width, height, emptyContent,
      )
    : null

  // ── Node resolution ─────────────────────────────────────────────
  // When `inferNodes`, a missing/empty `nodes` prop derives stubs
  // from edge endpoints. Sankey/Chord rely on this; ForceDirected
  // requires explicit nodes and disables inference.
  const safeNodes = useMemo<Datum[]>(() => {
    if (!inferNodes) return safeInputNodes as Datum[]
    return inferNodesFromEdges(
      safeInputNodes as Datum[],
      safeEdges as Datum[],
      sourceAccessor as string | ((d: Datum) => string),
      targetAccessor as string | ((d: Datum) => string),
    ) as Datum[]
  }, [inferNodes, safeInputNodes, safeEdges, sourceAccessor, targetAccessor])

  // ── Color scale + theme ─────────────────────────────────────────
  const colorScale = useColorScale(safeNodes, colorBy, colorScheme)
  const themeCategorical = useThemeCategorical()

  const effectivePalette = useMemo<string[]>(() => {
    if (Array.isArray(colorScheme)) return colorScheme
    if (themeCategorical && themeCategorical.length > 0) return themeCategorical
    if (typeof colorScheme === "string") {
      const named = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES]
      if (Array.isArray(named) && named.length > 0) return named as string[]
    }
    return DEFAULT_COLORS as unknown as string[]
  }, [colorScheme, themeCategorical])

  // ── Categories for legend interaction ───────────────────────────
  const allCategories = useMemo<string[]>(() => {
    if (!colorBy) return []
    const vals = new Set<string>()
    for (const d of safeNodes) {
      const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [safeNodes, colorBy])

  const legendState = useLegendInteraction(legendInteraction, colorBy, allCategories)

  // ── Legend + margin ─────────────────────────────────────────────
  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: safeNodes,
    colorBy,
    colorScale,
    showLegend,
    legendPosition: legendPositionProp,
    userMargin,
    defaults: marginDefaults,
    categories: allCategories,
  })

  // ── Selection / linked hover ────────────────────────────────────
  // Pass the full selection result through; hierarchy charts read
  // `activeSelectionHook` to wrap node styles with selected/dimmed
  // overlays, which the `customHoverBehavior` shorthand alone doesn't
  // expose.
  const selectionResult = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: true,           // deprecated / no-op since hooks.ts:207, kept for clarity
    onObservation,
    onClick,
    chartType,
    chartId,
  })
  const { customHoverBehavior, customClickBehavior, activeSelectionHook, hoverSelectionHook, crosshairSourceId } = selectionResult

  return {
    safeNodes,
    safeEdges: safeEdges as Datum[],
    colorScale,
    effectivePalette,
    themeCategorical,
    allCategories,
    legendState,
    legend,
    margin,
    legendPosition,
    customHoverBehavior,
    customClickBehavior,
    activeSelectionHook,
    hoverSelectionHook,
    crosshairSourceId,
    loadingEl,
    emptyEl,
  }
}
