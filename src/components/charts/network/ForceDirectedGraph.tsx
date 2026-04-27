"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import * as React from "react"
import { useMemo, forwardRef, useRef, useImperativeHandle } from "react"
import StreamNetworkFrame from "../../stream/StreamNetworkFrame"
import type { StreamNetworkFrameProps, StreamNetworkFrameHandle, EdgePush } from "../../stream/networkTypes"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor, COLOR_SCHEMES, DEFAULT_COLORS } from "../shared/colorUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { useColorScale, useChartLegendAndMargin, useChartMode, useChartSelection, useLegendInteraction, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateNetworkData } from "../shared/validateChartData"

/**
 * ForceDirectedGraph component props
 */
export interface ForceDirectedGraphProps<TNode extends Datum = Datum, TEdge extends Datum = Datum> extends BaseChartProps {
  /**
   * Array of node objects. Each node must have a unique id (or other field
   * named by `nodeIDAccessor`).
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
  nodeIDAccessor?: ChartAccessor<TNode, string>
  /** @default "source" */
  sourceAccessor?: ChartAccessor<TEdge, string>
  /** @default "target" */
  targetAccessor?: ChartAccessor<TEdge, string>
  /**
   * Field or function for the label text rendered next to a node when
   * `showLabels` is true.
   * @default nodeIDAccessor
   */
  nodeLabel?: ChartAccessor<TNode, string>
  /**
   * Field or function that determines node color. Set together with
   * `showLegend` for a legend.
   */
  colorBy?: ChartAccessor<TNode, string>
  /** d3 scheme name or explicit color array; falls back to theme. */
  colorScheme?: string | string[]
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
   * Constant pixel width, or a function/field returning a numeric value
   * scaled to a default width range.
   * @default 1
   */
  edgeWidth?: number | ChartAccessor<TEdge, number>
  edgeColor?: string
  edgeOpacity?: number
  /**
   * Number of force-simulation ticks before the layout settles.
   * @default 300
   */
  iterations?: number
  /**
   * Magnitude of the repulsion force between nodes; higher values spread
   * the graph more.
   * @default 0.1
   */
  forceStrength?: number
  /**
   * Render labels next to nodes. Uses `nodeLabel` accessor (defaulting to
   * `nodeIDAccessor`).
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
 * Nodes are positioned by simulating attraction along edges and repulsion
 * between unconnected nodes; the layout settles after `iterations` ticks.
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
  useImperativeHandle(ref, () => ({
    push: (point) => frameRef.current?.push(point as EdgePush),
    pushMany: (points) => frameRef.current?.pushMany(points as EdgePush[]),
    remove: (id) => {
      const ids = Array.isArray(id) ? id : [id]
      const nodes = frameRef.current?.getTopology()?.nodes ?? []
      const results: Datum[] = []
      for (const nodeId of ids) {
        const node = nodes.find(n => n.id === nodeId)
        if (node) results.push({ ...(node.data ?? {}), id: nodeId })
        frameRef.current?.removeNode(nodeId)
      }
      return results
    },
    update: (id, updater) => {
      const ids = Array.isArray(id) ? id : [id]
      return ids.flatMap(nodeId => {
        const prev = frameRef.current?.updateNode(nodeId, updater)
        return prev ? [{ ...prev, id: nodeId }] : []
      })
    },
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getTopology()?.nodes?.map((n: any) => n.data) ?? []
  }))

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
  }, { width: 600, height: 600 })

  const {
    nodes,
    edges,
    margin: userMargin,
    className,
    nodeIDAccessor = "id",
    sourceAccessor = "source",
    targetAccessor = "target",
    nodeLabel,
    colorBy,
    colorScheme,
    nodeSize = 8,
    nodeSizeRange = [5, 20],
    edgeWidth = 1,
    edgeColor = "#999",
    edgeOpacity = 0.6,
    iterations = 300,
    forceStrength = 0.1,
    tooltip,
    frameProps = {},
    onObservation,
    onClick,
    chartId,
    selection,
    linkedHover,
    loading,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    stroke,
    strokeWidth,
    opacity,
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showLegend = resolved.showLegend
  const showLabels = resolved.showLabels ?? false
  const title = resolved.title
  const description = resolved.description
  const summary = resolved.summary
  const accessibleTable = resolved.accessibleTable

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(loading, width, height)
  const emptyEl = !loadingEl ? renderEmptyState(nodes, width, height, emptyContent) : null

  // Identity-preserving sparse-array filter: drop `null`/non-object
  // entries before any iteration. CSV/loader pipelines commonly emit
  // such interlopers, and the network color/legend/scene paths read
  // `n.id` / `e.source` without null-checks.
  const safeNodes = useMemo(() => filterSparseArray(nodes), [nodes])
  const safeEdges = useMemo(() => filterSparseArray(edges), [edges])

  const colorScale = useColorScale(safeNodes, colorBy, colorScheme)

  // Legend interaction
  const allCategories = useMemo(() => {
    if (!colorBy) return []
    const vals = new Set<string>()
    for (const d of safeNodes as Datum[]) {
      const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [safeNodes, colorBy])

  const legendState = useLegendInteraction(legendInteraction, colorBy, allCategories)

  // Theme-aware default fill: ThemeProvider categorical > colorScheme > DEFAULT_COLOR
  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  const effectivePalette = useMemo(() => {
    if (Array.isArray(colorScheme)) return colorScheme
    if (themeCategorical && themeCategorical.length > 0) return themeCategorical
    const resolved = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES]
    return Array.isArray(resolved) ? resolved as string[] : DEFAULT_COLORS as unknown as string[]
  }, [colorScheme, themeCategorical])

  // Node style function — d is a RealtimeNode, user data on d.data
  const baseNodeStyle = useMemo(() => {
    return (d: Datum) => {
      const baseStyle: Record<string, string | number> = {}
      if (colorBy) {
        baseStyle.fill = getColor(d.data || d, colorBy, colorScale)
      } else {
        baseStyle.fill = resolveDefaultFill(undefined, themeCategorical, colorScheme, undefined, categoryIndexMap)
      }
      if (typeof nodeSize === "number") {
        baseStyle.r = nodeSize
      }
      return baseStyle
    }
  }, [colorBy, colorScale, nodeSize, themeCategorical, colorScheme, categoryIndexMap])

  // Overlay top-level primitive props onto nodeStyle; top-level wins over base.
  const nodeStyle = useMemo(
    () => mergeShapeStyle(baseNodeStyle, { stroke, strokeWidth, opacity }),
    [baseNodeStyle, stroke, strokeWidth, opacity]
  )

  // Edge style function
  const baseEdgeStyle = useMemo(() => {
    return (d: Datum) => ({
      stroke: edgeColor,
      strokeWidth: typeof edgeWidth === "number" ? edgeWidth : typeof edgeWidth === "function" ? edgeWidth(d) : d[edgeWidth] || 1,
      opacity: edgeOpacity
    })
  }, [edgeWidth, edgeColor, edgeOpacity])

  // Top-level primitive props also apply to edges (stroke color, width, opacity).
  const edgeStyle = useMemo(
    () => mergeShapeStyle(baseEdgeStyle, { stroke, strokeWidth, opacity }),
    [baseEdgeStyle, stroke, strokeWidth, opacity]
  )

  // Node label function
  const nodeLabelFn = useMemo(() => {
    if (!showLabels || !nodeLabel) return undefined
    if (typeof nodeLabel === "function") return nodeLabel
    // d is a RealtimeNode — user data lives at d.data, fall back to d.id
    return (d: Datum) => d.data?.[nodeLabel] ?? d[nodeLabel] ?? d.id
  }, [showLabels, nodeLabel])

  // Legend & margin
  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: safeNodes,
    colorBy,
    colorScale,
    showLegend,
    legendPosition: legendPositionProp,
    userMargin,
    defaults: resolved.marginDefaults
  })

  const { customHoverBehavior, customClickBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: true,
    onObservation, onClick, chartType: "ForceDirectedGraph", chartId,
  })

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
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl

  return (
    <SafeRender componentName="ForceDirectedGraph" width={width} height={height}>
    <StreamNetworkFrame
      ref={frameRef}
      chartType="force"
      {...(nodes != null && { nodes: safeNodes })}
      {...(edges != null && { edges: safeEdges })}
      size={[width, height]}
      responsiveWidth={props.responsiveWidth}
      responsiveHeight={props.responsiveHeight}
      margin={margin}
      nodeIDAccessor={nodeIDAccessor}
      sourceAccessor={sourceAccessor}
      targetAccessor={targetAccessor}
      iterations={iterations}
      forceStrength={forceStrength}
      nodeStyle={nodeStyle}
      edgeStyle={edgeStyle}
      colorBy={colorBy}
      colorScheme={effectivePalette}
      nodeSize={nodeSize}
      nodeSizeRange={nodeSizeRange}
      nodeLabel={nodeLabelFn}
      showLabels={showLabels}
      enableHover={enableHover}
      tooltipContent={tooltip === false ? () => null : (normalizeTooltip(tooltip) || undefined)}
      customHoverBehavior={(linkedHover || onObservation || onClick) ? customHoverBehavior : undefined}
      customClickBehavior={(onObservation || onClick) ? customClickBehavior : undefined}
      legend={legend}
      legendPosition={legendPosition}
      {...(legendInteraction && legendInteraction !== "none" && {
        legendHoverBehavior: legendState.onLegendHover,
        legendClickBehavior: legendState.onLegendClick,
        legendHighlightedCategory: legendState.highlightedCategory,
        legendIsolatedCategories: legendState.isolatedCategories,
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
