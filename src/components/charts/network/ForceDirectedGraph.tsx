"use client"
import type { Datum } from "../shared/datumTypes"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps, StreamNetworkFrameHandle } from "../../stream/networkTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor } from "../shared/colorUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useChartMode, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import { useNetworkChartSetup } from "../shared/useNetworkChartSetup"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import { composeStyleRules, makeNodeRuleContext, type StyleRule } from "../shared/styleRules"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateNetworkData } from "../shared/validateChartData"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"

/**
 * ForceDirectedGraph component props
 */
export interface ForceDirectedGraphProps<TNode extends Datum = Datum, TEdge extends Datum = Datum> extends BaseChartProps {
  /**
   * Array of node objects. Each node must have a unique id (or other field
   * named by `nodeIdAccessor`).
   *
   * **Required for static rendering**: when `edges` is provided, `nodes`
   * must be too — even if it could be inferred from edge endpoints, pass
   * an explicit list so layout can run.
   *
   * **Push mode**: omit BOTH `nodes` and `edges` to opt into ref-based
   * push mode. Validation skips both arrays in that case and the chart
   * accumulates topology from `ref.current.push(...)` calls.
   * @example
   * ```ts
   * [{ id: "A", group: "core" }, { id: "B", group: "leaf" }]
   * ```
   */
  nodes?: TNode[]
  /**
   * Array of edge objects. Each edge must reference two node ids via
   * `sourceAccessor` and `targetAccessor`. Required for static rendering;
   * omit together with `nodes` for push mode (see above).
   * @example
   * ```ts
   * [{ source: "A", target: "B", weight: 3 }]
   * ```
   */
  edges?: TEdge[]
  /**
   * Field name or function returning the node's unique id. Edge sources
   * and targets reference this value.
   * @default "id"
   */
  nodeIdAccessor?: ChartAccessor<TNode, string>
  /**
   * @deprecated Use `nodeIdAccessor` (camelCase) instead. Removed in
   * 4.0. The other network HOCs (`SankeyDiagram`, `ChordDiagram`,
   * `TreeDiagram`, `OrbitDiagram`) all use the camelCase form;
   * `nodeIDAccessor` (uppercase ID) was a casing inconsistency in
   * `ForceDirectedGraph` that the SSR demo's verification matrix
   * surfaced.
   */
  nodeIDAccessor?: ChartAccessor<TNode, string>
  /** @default "source" */
  sourceAccessor?: ChartAccessor<TEdge, string>
  /** @default "target" */
  targetAccessor?: ChartAccessor<TEdge, string>
  /**
   * Field or function for the label text rendered next to a node when
   * `showLabels` is true.
   * @default nodeIdAccessor
   */
  nodeLabel?: ChartAccessor<TNode, string>
  /**
   * Field or function that determines node color. Set together with
   * `showLegend` for a legend.
   */
  colorBy?: ChartAccessor<TNode, string>
  /** d3 scheme name or explicit color array; falls back to theme. */
  colorScheme?: string | string[] | Record<string, string>
  /**
   * Declarative, threshold-aware node styling. Ordered `{ when, style }`
   * rules; the last applicable rule wins per property. `when` accepts a
   * predicate `(node, ctx) => boolean` (rules see the raw node object; `ctx` =
   * `{ value, category }` where `category` is the `colorBy` group), a
   * declarative threshold (`{ field, gt, eq, in, … }`), or `true` — so you can
   * style whole groups of nodes (`{ field: "type", eq: "db" }`). A rule's
   * `fill` may be a color or a HatchFill. Layers over the resolved node color.
   */
  styleRules?: StyleRule[]
  /**
   * Constant pixel radius, or a function/field returning a numeric value
   * scaled into `nodeSizeRange`.
   * @default 8
   */
  nodeSize?: number | ChartAccessor<TNode, number>
  /**
   * Min/max pixel radius when `nodeSize` is data-driven.
   * @default [5, 20]
   */
  nodeSizeRange?: [number, number]
  /**
   * Outline color for **node** marks only, leaving edges untouched — the
   * node half of independent node/edge stroking (the edge half is
   * {@link ForceDirectedGraphProps.edgeColor}). Overrides the generic
   * {@link BaseChartProps.stroke} for nodes; pass `"none"` to remove the
   * default node outline. Precedence per property: `nodeStroke` > `stroke`
   * > the built-in node outline.
   * @example
   * ```tsx
   * // Ringless nodes, blue edges — styled separately
   * <ForceDirectedGraph nodeStroke="none" edgeColor="#4c78a8" />
   * // White node ring, unchanged edges
   * <ForceDirectedGraph nodeStroke="#fff" nodeStrokeWidth={1.5} />
   * ```
   */
  nodeStroke?: string
  /**
   * Outline width for **node** marks only. Overrides the generic
   * {@link BaseChartProps.strokeWidth} for nodes.
   * @default the generic `strokeWidth`
   */
  nodeStrokeWidth?: number
  /**
   * Constant pixel width, or a function/field returning a numeric value
   * scaled to a default width range. The **edge** stroke width; overrides
   * the generic `strokeWidth` for edges.
   * @default 1
   */
  edgeWidth?: number | ChartAccessor<TEdge, number>
  /**
   * Stroke color for **edge** marks only, leaving nodes untouched — the edge
   * half of independent node/edge stroking (the node half is
   * {@link ForceDirectedGraphProps.nodeStroke}). Overrides the generic
   * {@link BaseChartProps.stroke} for edges. Precedence per property:
   * `edgeColor` > `stroke` > the built-in `#999`.
   * @default "#999"
   */
  edgeColor?: string
  /**
   * Opacity for **edge** marks only. Overrides the generic `opacity` for edges.
   * @default 0.6
   */
  edgeOpacity?: number
  /**
   * Number of force-simulation ticks before the layout settles.
   * @default 300
   */
  iterations?: number
  /**
   * Link-attraction multiplier. Lower values produce a looser, more
   * spread-out graph; higher values pull connected nodes together.
   * @default 0.1
   */
  forceStrength?: number
  /**
   * Execute layout synchronously, in a Web Worker, or automatically choose
   * based on estimated graph cost.
   * @default "auto"
   */
  layoutExecution?: "auto" | "worker" | "sync"
  /** Content rendered in the chart slot while worker layout is pending. */
  layoutLoadingContent?: React.ReactNode | false
  /** Called when internally-managed worker layout changes state. */
  onLayoutStateChange?: (state: "pending" | "ready" | "error") => void
  /**
   * Render labels next to nodes. Uses `nodeLabel` accessor (defaulting to
   * `nodeIdAccessor`).
   */
  showLabels?: boolean
  enableHover?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: LegendPosition
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamNetworkFrameProps, "nodes" | "edges" | "size">>
}

/**
 * ForceDirectedGraph - Visualize network relationships with a force-directed layout.
 *
 * Nodes are positioned by simulating degree-aware attraction and repulsion
 * with radius-aware collision; the layout settles after `iterations` ticks.
 * Wraps {@link StreamNetworkFrame} (canvas-first rendering for large graphs).
 *
 * For ordered hierarchical data prefer {@link TreeDiagram}; for flow
 * relationships prefer {@link SankeyDiagram}; for nested grouping prefer
 * {@link CirclePack} or {@link Treemap}.
 *
 * @example
 * ```tsx
 * // Simple network with explicit nodes and edges
 * <ForceDirectedGraph
 *   nodes={[{ id: "A" }, { id: "B" }, { id: "C" }]}
 *   edges={[
 *     { source: "A", target: "B" },
 *     { source: "B", target: "C" },
 *   ]}
 *   showLabels
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color by group, edge width from weight, sized nodes
 * <ForceDirectedGraph
 *   nodes={nodes}
 *   edges={edges}
 *   colorBy="group"
 *   nodeSize="degree"
 *   nodeSizeRange={[6, 24]}
 *   edgeWidth="weight"
 *   showLegend
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Tighter clustering for dense graphs
 * <ForceDirectedGraph
 *   nodes={nodes}
 *   edges={edges}
 *   forceStrength={0.4}
 *   iterations={500}
 * />
 * ```
 *
 * @remarks
 * Force simulation runs synchronously to `iterations`; for very large
 * graphs (>2k nodes) consider lowering `iterations` so layout settles in
 * a reasonable frame budget. Hover, click, and selection wiring follow
 * the same patterns as the rest of the library.
 */
export const ForceDirectedGraph = forwardRef(function ForceDirectedGraph<TNode extends Datum = Datum, TEdge extends Datum = Datum>(props: ForceDirectedGraphProps<TNode, TEdge>, ref: React.Ref<RealtimeFrameHandle>) {
  const frameRef = useRef<StreamNetworkFrameHandle>(null)
  useFrameImperativeHandle(ref, { variant: "network", frameRef })

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    showLabels: props.showLabels,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
      mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
}, { width: 600, height: 600 })

  const {
    nodes,
    edges,
    margin: userMargin,
    className,
    // Accept both casings; the camelCase one wins. `nodeIDAccessor`
    // (uppercase ID) is the deprecated alias that shipped historically
    // — kept for backwards compat and removed in 4.0.
    nodeIdAccessor: nodeIdAccessorProp,
    nodeIDAccessor: nodeIDAccessorLegacy,
    sourceAccessor = "source",
    targetAccessor = "target",
    nodeLabel,
    colorBy,
    colorScheme,
    styleRules,
    nodeSize = 8,
    nodeSizeRange = [5, 20],
    nodeStroke,
    nodeStrokeWidth,
    // Edge stroke props default to `undefined` (not their built-in values) so
    // we can resolve precedence explicitly: an edge-specific prop wins over the
    // generic `stroke`/`strokeWidth`/`opacity`, which win over the built-in
    // default. See `resolvedEdge*` below.
    edgeWidth,
    edgeColor,
    edgeOpacity,
    iterations = 300,
    forceStrength = 0.1,
    layoutExecution = "auto",
    layoutLoadingContent,
    onLayoutStateChange,
    tooltip,
    frameProps = {},
    onObservation,
    onClick,
    chartId,
    selection,
    linkedHover,
    loading,
    loadingContent,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    stroke,
    strokeWidth,
    opacity,
  } = props

  // Resolve the canonical name first, fall back to the legacy alias,
  // default to "id". `nodeIDAccessor` (uppercase ID) is the deprecated
  // alias, removed in 4.0 — see the prop's JSDoc for context.
  const nodeIDAccessor = nodeIdAccessorProp ?? nodeIDAccessorLegacy ?? "id"

  const { width, height, enableHover, showLegend, showLabels = false, title, description, summary, accessibleTable } = resolved

  // Consolidated network setup. ForceDirected requires explicit
  // nodes (no inference from edges) and keys empty-state off nodes
  // — pass `inferNodes: false` and `emptyDataKey: "nodes"` to match
  // the pre-migration behavior.
  const setup = useNetworkChartSetup({
    nodes,
    edges,
    inferNodes: false,
    nodeIdAccessor: nodeIDAccessor,
    sourceAccessor,
    targetAccessor,
    colorBy,
    colorScheme,
    showLegend,
    legendPosition: legendPositionProp,
    legendInteraction,
    selection,
    linkedHover,
    onObservation,
    onClick,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "ForceDirectedGraph",
    chartId,
    marginDefaults: resolved.marginDefaults,
    userMargin,
    width, height,
    loading,
    loadingContent,
    emptyContent,
    emptyDataKey: "nodes",
  })

  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  // Node style function — d is a RealtimeNode, user data on d.data
  const baseNodeStyle = useMemo(() => {
    return (d: Datum) => {
      const baseStyle: Record<string, string | number> = {}
      if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy, setup.colorScale)
      } else {
        baseStyle.fill = resolveDefaultFill(undefined, setup.themeCategorical, colorScheme, undefined, categoryIndexMap)
      }
      if (typeof nodeSize === "number") {
        baseStyle.r = nodeSize
      }
      return baseStyle
    }
  }, [colorBy, setup.colorScale, nodeSize, setup.themeCategorical, colorScheme, categoryIndexMap])

  // Declarative style rules resolve against the raw node (unwrap the
  // RealtimeNode's `.data`) and layer over the base color, before the
  // top-level primitive overlay wins.
  const nodeRuleContext = useMemo(
    () => makeNodeRuleContext(
      colorBy as string | ((d: Datum) => unknown) | undefined,
      typeof nodeSize === "number" ? undefined : (nodeSize as string | ((d: Datum) => unknown)),
    ),
    [colorBy, nodeSize],
  )

  // Overlay primitive props onto nodeStyle. Node-specific `nodeStroke` /
  // `nodeStrokeWidth` win over the generic `stroke` / `strokeWidth` for nodes,
  // so nodes and edges can be stroked independently; both still win over base.
  const nodeStyle = useMemo(
    () => mergeShapeStyle(
      composeStyleRules(baseNodeStyle, styleRules, nodeRuleContext, (d) => d.data || d),
      { stroke: nodeStroke ?? stroke, strokeWidth: nodeStrokeWidth ?? strokeWidth, opacity },
    ),
    [baseNodeStyle, styleRules, nodeRuleContext, nodeStroke, stroke, nodeStrokeWidth, strokeWidth, opacity]
  )

  // Edge stroke resolves precedence in one place: an edge-specific prop wins
  // over the generic primitive, which wins over the built-in default. This is
  // what lets `stroke` style everything by default yet an explicit `edgeColor`
  // (or `nodeStroke`) target edges (or nodes) alone.
  const resolvedEdgeColor = edgeColor ?? stroke ?? "#999"
  const resolvedEdgeOpacity = edgeOpacity ?? opacity ?? 0.6
  const fallbackEdgeWidth = strokeWidth ?? 1

  // Edge style function — d is a RealtimeEdge wrapper; user data lives on
  // d.data (mirrors baseNodeStyle's `d.data || d`). A field/function
  // accessor must resolve against the raw edge, not the wrapper, or the
  // weight is never read and edge width silently falls back to the default.
  const edgeStyle = useMemo(() => {
    return (d: Datum) => {
      const edge = d.data || d
      let resolvedWidth: number
      if (edgeWidth === undefined) {
        resolvedWidth = fallbackEdgeWidth
      } else if (typeof edgeWidth === "number") {
        resolvedWidth = edgeWidth
      } else if (typeof edgeWidth === "function") {
        resolvedWidth = edgeWidth(edge)
      } else {
        const raw = edge[edgeWidth]
        const n = typeof raw === "number" ? raw : Number(raw)
        resolvedWidth = Number.isFinite(n) && n > 0 ? n : fallbackEdgeWidth
      }
      return {
        stroke: resolvedEdgeColor,
        strokeWidth: resolvedWidth,
        opacity: resolvedEdgeOpacity
      }
    }
  }, [edgeWidth, resolvedEdgeColor, resolvedEdgeOpacity, fallbackEdgeWidth])

  // Node label function
  const nodeLabelFn = useMemo(() => {
    if (!showLabels || !nodeLabel) return undefined
    if (typeof nodeLabel === "function") return nodeLabel
    // d is a RealtimeNode — user data lives at d.data, fall back to d.id
    return (d: Datum) => d.data?.[nodeLabel] ?? d[nodeLabel] ?? d.id
  }, [showLabels, nodeLabel])

  // Validate
  const error = validateNetworkData({
    componentName: "ForceDirectedGraph",
    nodes,
    edges,
    nodesRequired: true,
    edgesRequired: true,
    accessors: { nodeIDAccessor },
  })
  if (error) return <ChartError componentName="ForceDirectedGraph" message={error} width={width} height={height} />

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (setup.loadingEl) return setup.loadingEl
  if (setup.emptyEl) return setup.emptyEl

  return (
    <SafeRender componentName="ForceDirectedGraph" width={width} height={height}>
    <StreamNetworkFrame
      ref={frameRef}
      chartType="force"
      {...(nodes != null && { nodes: setup.safeNodes })}
      {...(edges != null && { edges: setup.safeEdges })}
      size={[width, height]}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      margin={setup.margin}
      nodeIDAccessor={nodeIDAccessor}
      sourceAccessor={sourceAccessor}
      targetAccessor={targetAccessor}
      iterations={iterations}
      forceStrength={forceStrength}
      layoutExecution={layoutExecution}
      layoutLoadingContent={layoutLoadingContent}
      onLayoutStateChange={onLayoutStateChange}
      nodeStyle={nodeStyle}
      edgeStyle={edgeStyle}
      colorBy={colorBy}
      colorScheme={setup.effectivePalette}
      nodeSize={nodeSize}
      nodeSizeRange={nodeSizeRange}
      nodeLabel={nodeLabelFn}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip === false ? () => null : (normalizeTooltip(tooltip) || undefined)}
      {...buildCustomBehaviorProps({
        linkedHover,
        selection,
        onObservation,
        onClick,
        mobileInteraction: setup.mobileInteraction,
        customHoverBehavior: setup.customHoverBehavior,
        customClickBehavior: setup.customClickBehavior,
        linkedHoverInClickPredicate: false,
      })}
      legend={setup.legend}
      legendPosition={setup.legendPosition}
      {...(legendInteraction && legendInteraction !== "none" && {
        legendHoverBehavior: setup.legendState.onLegendHover,
        legendClickBehavior: setup.legendState.onLegendClick,
        legendHighlightedCategory: setup.legendState.highlightedCategory,
        legendIsolatedCategories: setup.legendState.isolatedCategories,
      })}
      className={className}
      title={title}
      description={description}
      summary={summary}
      accessibleTable={accessibleTable}
      {...(props.animate != null && { animate: props.animate })}
      {...frameProps}
    />
  </SafeRender>)
}) as unknown as {
  <TNode extends Datum = Datum, TEdge extends Datum = Datum>(props: ForceDirectedGraphProps<TNode, TEdge> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
ForceDirectedGraph.displayName = "ForceDirectedGraph"
