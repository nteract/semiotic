"use client"
import * as React from "react"
import { forwardRef, useMemo } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type {
  StreamNetworkFrameProps,
  StreamNetworkFrameHandle,
} from "../../stream/networkTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { NetworkCustomLayout, NetworkLayoutSelection } from "../../stream/networkCustomLayout"
import type { Datum } from "../shared/datumTypes"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import {
  renderEmptyState,
  renderLoadingState,
  SafeRender,
} from "../shared/withChartWrapper"
import { useChartSelection, resolveMobileInteraction } from "../shared/hooks"
import { useCustomChartScaffold } from "../shared/useCustomChartSetup"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import type { ChartRecipe } from "../../ai/chartRecipes"

export interface NetworkCustomChartProps<
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
> extends BaseChartProps {
  /** Node objects with at least an `id` field. Positions are typically pre-computed by the user (e.g. from dagre / d3-flextree) and read by the layout. */
  nodes?: TNode[]
  /** Edge objects referencing node ids via `source`/`target`. */
  edges?: TEdge[]
  /** The layout function. Receives NetworkLayoutContext, returns scene primitives. */
  layout: NetworkCustomLayout<TConfig>
  /** Config blob threaded through to NetworkLayoutContext.config. */
  layoutConfig?: TConfig
  /** Receives a structured diagnostic if the layout throws. */
  onLayoutError?: StreamNetworkFrameProps["onLayoutError"]
  recipe?: ChartRecipe<TNode, TConfig>
  recipeId?: string
  /** Field name (or function) for the node id. @default "id" */
  nodeIDAccessor?: StreamNetworkFrameProps["nodeIDAccessor"]
  /** Field name for the edge source id. @default "source" */
  sourceAccessor?: StreamNetworkFrameProps["sourceAccessor"]
  /** Field name for the edge target id. @default "target" */
  targetAccessor?: StreamNetworkFrameProps["targetAccessor"]
  /** Color scheme threaded into the layout's `resolveColor` helper. */
  colorBy?: ChartAccessor<TNode, string | number>
  colorScheme?: string | string[] | Record<string, string>
  enableHover?: boolean
  /**
   * Annotations rendered over the chart. A custom network layout's marks are
   * anchorable by id: emit a scene node with `id: <foo>` and an annotation with
   * `pointId: "<foo>"` resolves to that mark's center (the editorial-callout
   * story, now unified with the built-in network charts). Data-coordinate
   * anchoring doesn't apply — custom layouts own their own geometry — so anchor
   * by `pointId`, or draw bespoke callouts with the recipe chrome kit's
   * `markCallout`.
   */
  annotations?: StreamNetworkFrameProps["annotations"]
  /** Collision-avoiding auto-placement for the annotations above. */
  autoPlaceAnnotations?: StreamNetworkFrameProps["autoPlaceAnnotations"]
  /**
   * Custom layouts own their own color resolution (the layout function
   * decides what each node looks like), so the auto-legend infrastructure
   * the built-in network HOCs use can't run. To render a legend, build a
   * `legendGroups` array yourself (see `legendGroupsFrom`) and pass it through
   * `frameProps.legend`.
   */
  /** Additional StreamNetworkFrame props for advanced customization. */
  frameProps?: Partial<Omit<StreamNetworkFrameProps,
    "nodes" | "edges" | "chartType" | "size" | "customNetworkLayout" | "layoutConfig" | "layoutSelection"
  >>
}

/**
 * NetworkCustomChart — escape hatch for bespoke network geometry.
 *
 * Wraps StreamNetworkFrame and threads a user-supplied layout function
 * into the scene-building pipeline. The layout receives raw nodes/edges,
 * dimensions, theme, and a `resolveColor` helper, and returns positioned
 * scene primitives + optional overlays.
 *
 * Pair with `flextreeLayout`, `dagreLayout`, or your own. Built-in chart
 * types (force, sankey, chord, tree, ...) should still be preferred when
 * they fit; reach for this HOC when none does.
 *
 * @example
 * ```tsx
 * import { NetworkCustomChart } from "semiotic/network"
 * import { dagreLayout } from "semiotic/recipes"
 *
 * <NetworkCustomChart
 *   nodes={positionedNodes}
 *   edges={positionedEdges}
 *   layout={dagreLayout}
 *   layoutConfig={{ edgeStyle: "smooth" }}
 *   width={800}
 *   height={500}
 * />
 * ```
 */
export const NetworkCustomChart = forwardRef(function NetworkCustomChart<
  TNode extends Datum = Datum,
  TEdge extends Datum = Datum,
  TConfig extends object = Record<string, unknown>
>(props: NetworkCustomChartProps<TNode, TEdge, TConfig>, ref: React.Ref<RealtimeFrameHandle>) {
  const {
    nodes,
    edges,
    layout,
    layoutConfig,
    onLayoutError,
    nodeIDAccessor = "id",
    sourceAccessor = "source",
    targetAccessor = "target",
    margin: userMargin,
    className,
    colorBy,
    colorScheme,
    selection,
    linkedHover,
    onObservation,
    onClick,
    chartId,
    annotations,
    autoPlaceAnnotations,
    frameProps = {},
  } = props

  const { frameRef, resolved, normalizedMargin } = useCustomChartScaffold<StreamNetworkFrameHandle>({
    imperativeRef: ref,
    imperativeVariant: "network",
    margin: userMargin,
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    title: props.title,
    description: props.description,
    summary: props.summary,
    accessibleTable: props.accessibleTable,
    mode: props.mode,
    mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
  })

  // `filterSparseArray(undefined)` returns the shared empty singleton, so
  // push-mode renders keep stable inputs instead of allocating a fresh [] on
  // every parent render. Keep the undefined-vs-empty distinction below: an
  // omitted pair is push mode, while explicitly supplied empty arrays deserve
  // the same empty-state treatment as the other chart HOCs.
  const safeNodes = useMemo(() => filterSparseArray(nodes), [nodes])
  const safeEdges = useMemo(() => filterSparseArray(edges), [edges])
  const boundedRows = useMemo(
    () => (nodes === undefined && edges === undefined ? undefined : [...safeNodes, ...safeEdges]),
    [edges, nodes, safeEdges, safeNodes],
  )
  const resolvedMobileInteraction = resolveMobileInteraction(props.mobileInteraction, {
    mode: props.mode,
    width: resolved.width,
    mobileSemantics: props.mobileSemantics,
  })

  // Selection / linked-hover wiring — the custom-chart scaffold is the
  // light variant (no useChartSetup), so call useChartSelection directly,
  // exactly as the built-in network HOCs do through useNetworkChartSetup.
  // `customHoverBehavior` emits into the shared selection store on hover;
  // `activeSelectionHook` carries the consume-side predicate.
  const { customHoverBehavior, customClickBehavior, activeSelectionHook } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: typeof colorBy === "string" ? [colorBy] : [],
    onObservation,
    onClick,
    chartType: "NetworkCustomChart",
    chartId,
    colorByField: typeof colorBy === "string" ? colorBy : undefined,
    mobileInteraction: resolvedMobileInteraction,
  })

  // Project the shared selection into the layout context so a custom
  // layout can dim/highlight by the cross-chart selection. Memoized on
  // (isActive, predicate) — both are stable until the selection changes
  // (useSelection memoizes the predicate) — so this only sheds a fresh
  // identity, re-running buildScene, on a real selection change, never
  // per render. That keeps it out of any update loop.
  const layoutSelection = useMemo<NetworkLayoutSelection | null>(
    () =>
      activeSelectionHook?.isActive
        ? { isActive: true, predicate: activeSelectionHook.predicate }
        : null,
    [activeSelectionHook?.isActive, activeSelectionHook?.predicate]
  )

  const { width, height, enableHover, title, description, summary, accessibleTable } = resolved
  const loadingEl = renderLoadingState(props.loading, width, height, props.loadingContent)
  const emptyEl = loadingEl
    ? null
    : renderEmptyState(boundedRows, width, height, props.emptyContent)

  if (loadingEl || emptyEl) return loadingEl || emptyEl

  const streamProps: StreamNetworkFrameProps = {
    chartType: "force",
    ...(nodes != null && { nodes: safeNodes }),
    ...(edges != null && { edges: safeEdges }),
    customNetworkLayout: layout as NetworkCustomLayout,
    layoutConfig,
    onLayoutError,
    nodeIDAccessor,
    sourceAccessor,
    targetAccessor,
    colorBy: colorBy as StreamNetworkFrameProps["colorBy"],
    colorScheme,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: normalizedMargin,
    enableHover,
    ...buildBaseMetadataProps({
      title,
      description,
      summary,
      accessibleTable,
      className,
      animate: props.animate,
      autoPlaceAnnotations,
    }),
    // Emit hover/click into the shared selection store (and fire
    // onObservation/onClick) only when something consumes them — mirrors
    // the built-in network HOC gating while still honoring mobile
    // tap-to-select / tap-to-lock predicates.
    ...buildCustomBehaviorProps({
      linkedHover,
      selection,
      onObservation,
      onClick,
      mobileInteraction: resolvedMobileInteraction,
      customHoverBehavior,
      customClickBehavior,
      linkedHoverInClickPredicate: false,
    }),
    // Consume side: the resolved predicate the layout reads as ctx.selection.
    layoutSelection,
    // Annotations anchor to emitted marks by `pointId` (the scene node's id);
    // `frameProps` can still override if a caller needs the raw frame prop.
    ...(annotations != null && { annotations }),
    // No `showLegend` pass-through: custom layouts own color resolution,
    // so the auto-legend infrastructure can't run. Pass a real legend
    // through `frameProps.legend` if you want one.
    ...frameProps,
  }

  return (
    <SafeRender componentName="NetworkCustomChart" width={width} height={height}>
      <StreamNetworkFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <
    TNode extends Datum = Datum,
    TEdge extends Datum = Datum,
    TConfig extends object = Record<string, unknown>
  >(
    props: NetworkCustomChartProps<TNode, TEdge, TConfig> & React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  displayName?: string
}

;(NetworkCustomChart as { displayName?: string }).displayName = "NetworkCustomChart"
