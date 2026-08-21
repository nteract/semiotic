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
import { useCallback, useMemo, useState } from "react"
import type { ReactNode, ReactElement } from "react"
import type { Datum } from "./datumTypes"
import type {
  Accessor,
  ChartAccessor,
  SelectionConfig,
  LinkedHoverProp,
  MobileInteractionProp,
  ResolvedMobileInteractionConfig,
} from "./types"
import type { MobileVisualizationContract } from "./auditMobileVisualization"
import type { OnObservationCallback } from "../../store/ObservationStore"
import type { PartialMargin, MarginType } from "../../types/marginType"
import {
  useColorScale,
  useChartSelection,
  useChartLegendAndMargin,
  useLegendInteraction,
  useThemeCategorical,
  resolveMobileInteraction,
  distinctCategories,
} from "./hooks"
import type {
  FrameLegendOverrides,
  LegendInteractionMode,
  LegendPosition,
  LegendInteractionState
} from "./hooks"
import {
  createColorScale,
  DEFAULT_COLORS,
  resolveCategoricalPalette,
} from "./colorUtils"
import { inferNodesFromEdges } from "./networkUtils"
import { filterSparseArray } from "./sparseArray"
import type { SelectionHookResult } from "./selectionUtils"
import { useResolvedSelection } from "./useResolvedSelection"
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
  colorScheme?: string | string[] | Record<string, string>

  // ── Legend ───────────────────────────────────────────────────────
  /** `undefined` defaults to "auto" (on when colorBy is set). */
  showLegend?: boolean
  legendPosition?: LegendPosition
  legendInteraction?: LegendInteractionMode
  /** Frame-level legend fields which take precedence in the rendered frame. */
  frameLegend?: FrameLegendOverrides

  // ── Interaction ──────────────────────────────────────────────────
  selection?: SelectionConfig
  linkedHover?: LinkedHoverProp
  onObservation?: OnObservationCallback
  onClick?: (datum: Datum, event: { x: number; y: number }) => void
  mobileInteraction?: MobileInteractionProp
  mobileSemantics?: MobileVisualizationContract
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
  hasTitle?: boolean

  // ── Loading / empty states ───────────────────────────────────────
  loading?: boolean
  /** Custom content rendered in place of the default skeleton while `loading` is true. */
  loadingContent?: ReactNode | false
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

  /** Distinct category values from bounded data or the live push-mode frame. */
  allCategories: string[]
  legendState: LegendInteractionState

  // ── Frame chrome ─────────────────────────────────────────────────
  legend: ReturnType<typeof useChartLegendAndMargin>["legend"]
  margin: MarginType
  legendPosition: LegendPosition
  /** Internal hand-off which prevents duplicate Stream-frame reservation. */
  legendBehaviorProps: Record<string, unknown>

  // ── Interaction ──────────────────────────────────────────────────
  mobileInteraction: ResolvedMobileInteractionConfig
  customHoverBehavior: ReturnType<typeof useChartSelection>["customHoverBehavior"]
  customClickBehavior: ReturnType<typeof useChartSelection>["customClickBehavior"]
  /**
   * The full selection-hook output. Most network HOCs only need the
   * resolved hover/click behaviors above, but hierarchy charts
   * Custom network layouts can consume the underlying shared selection
   * directly. Built-in charts normally use `effectiveSelectionHook`, which
   * also includes hover and legend interaction.
   */
  activeSelectionHook: ReturnType<typeof useChartSelection>["activeSelectionHook"]
  hoverSelectionHook: ReturnType<typeof useChartSelection>["hoverSelectionHook"]
  /** Hover, legend, or shared selection in precedence order. */
  effectiveSelectionHook: SelectionHookResult | null
  /** Selection styling with the active theme's default dim opacity. */
  resolvedSelection: SelectionConfig | undefined
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
    frameLegend,
    selection,
    linkedHover,
    onObservation,
    onClick,
    mobileInteraction,
    mobileSemantics,
    chartType,
    chartId,
    marginDefaults,
    userMargin,
    width,
    height,
    hasTitle,
    loading,
    loadingContent,
    emptyContent,
    emptyDataKey = "edges",
  } = input

  // ── Sparse data filtering ───────────────────────────────────────
  // Identity-preserving: when nothing's dropped, the returned array
  // is === to the input so downstream memo caches stay warm.
  const safeEdges = useMemo(() => filterSparseArray(edges), [edges])
  const safeInputNodes = useMemo(() => filterSparseArray(nodes), [nodes])
  const isPushMode = nodes === undefined && edges === undefined
  const [frameCategories, setFrameCategories] = useState<string[]>([])
  const onCategoriesChange = useCallback((categories: string[]) => {
    setFrameCategories((previous) => {
      if (
        previous.length === categories.length &&
        previous.every((category, index) => category === categories[index])
      )
        return previous
      return categories
    })
  }, [])

  // ── Loading / empty states ──────────────────────────────────────
  // Computed up front so the caller can early-return AFTER all hooks.
  const loadingEl = renderLoadingState(loading, width, height, loadingContent)
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
  const boundedColorScale = useColorScale(safeNodes, colorBy, colorScheme)
  const themeCategorical = useThemeCategorical()

  const effectivePalette = useMemo<string[]>(() => {
    // Array colorScheme passes through by reference (no copy) — a consumer
    // test asserts identity here, and resolveCategoricalPalette's own array
    // branch (colorUtils.ts) already returns the input array unchanged, so
    // spreading it below would needlessly break that identity.
    if (Array.isArray(colorScheme) && colorScheme.length > 0) return colorScheme
    return [...resolveCategoricalPalette(colorScheme, themeCategorical, DEFAULT_COLORS)]
  }, [colorScheme, themeCategorical])

  // ── Categories for legend interaction ───────────────────────────
  const boundedCategories = useMemo<string[]>(
    () => distinctCategories(safeNodes, colorBy),
    [safeNodes, colorBy]
  )

  const allCategories = useMemo(
    () => isPushMode && frameCategories.length > 0
      ? frameCategories
      : boundedCategories,
    [isPushMode, frameCategories, boundedCategories],
  )

  // Push-mode nodes are discovered inside StreamNetworkFrame. Once their
  // category domain comes back, synthesize the same ordinal scale used by the
  // frame so both the legend swatches and HOC-authored mark styles agree.
  const colorScale = useMemo<((value: string) => string) | undefined>(() => {
    if (boundedColorScale) return boundedColorScale
    if (!colorBy || allCategories.length === 0) return undefined
    const syntheticField = "__streamNetworkCategory"
    return createColorScale(
      allCategories.map((category) => ({ [syntheticField]: category })),
      syntheticField,
      effectivePalette,
    )
  }, [boundedColorScale, colorBy, allCategories, effectivePalette])

  const legendState = useLegendInteraction(legendInteraction, colorBy, allCategories)

  // ── Legend + margin ─────────────────────────────────────────────
  const { legend, margin, legendPosition, legendMarginReserved } = useChartLegendAndMargin({
    data: safeNodes,
    colorBy,
    colorScale,
    showLegend,
    legendPosition: legendPositionProp,
    userMargin,
    defaults: marginDefaults,
    categories: allCategories,
    chartWidth: width,
    chartHeight: height,
    frameLegend,
    hasTitle,
  })
  const legendBehaviorProps = useMemo<Record<string, unknown>>(() => {
    const behavior: Record<string, unknown> = {}
    if (legend && legendMarginReserved)
      behavior.__legendMarginReservedFor = legend
    if (isPushMode && colorBy) {
      behavior.legendCategoryAccessor = colorBy
      behavior.onCategoriesChange = onCategoriesChange
    }
    return behavior
  }, [legend, legendMarginReserved, isPushMode, colorBy, onCategoriesChange])
  const resolvedMobileInteraction = useMemo(
    () => resolveMobileInteraction(mobileInteraction, { width, mobileSemantics }),
    [mobileInteraction, width, mobileSemantics],
  )

  // ── Selection / linked hover ────────────────────────────────────
  // Pass the full selection result through so custom layouts can consume the
  // raw shared selection while built-in charts use the effective
  // hover/legend/shared selection assembled below.
  const selectionResult = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: true,           // deprecated / no-op, kept for clarity
    onObservation,
    onClick,
    mobileInteraction: resolvedMobileInteraction,
    chartType,
    chartId,
  })
  const { customHoverBehavior, customClickBehavior, activeSelectionHook, hoverSelectionHook, crosshairSourceId } = selectionResult
  const effectiveSelectionHook = useMemo(() => {
    if (hoverSelectionHook) return hoverSelectionHook
    if (legendState.legendSelectionHook) return legendState.legendSelectionHook
    return activeSelectionHook
  }, [hoverSelectionHook, legendState.legendSelectionHook, activeSelectionHook])
  const resolvedSelection = useResolvedSelection(selection)

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
    legendBehaviorProps,
    mobileInteraction: resolvedMobileInteraction,
    customHoverBehavior,
    customClickBehavior,
    activeSelectionHook,
    hoverSelectionHook,
    effectiveSelectionHook,
    resolvedSelection,
    crosshairSourceId,
    loadingEl,
    emptyEl,
  }
}
